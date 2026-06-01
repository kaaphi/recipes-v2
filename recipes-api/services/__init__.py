import logging
import threading
from typing import Callable

import boto3
from boto3.dynamodb.conditions import Key, Attr
from cachetools import TTLCache, cachedmethod
from pydantic import TypeAdapter
from ulid import ULID

from schemas.api_models import UserRecipes, RecipeStub, PlainTextRecipe
from schemas.config import RecipesConfig
from schemas.dynamodb_models import (
    Recipe as Recipe,
    BaseRecipes,
    DynamoDbItem,
    User,
)

logger = logging.getLogger(__name__)


class RecipeService:
    def __init__(self, config: RecipesConfig | None = None, table=None):
        if table is not None:
            self.table = table
        elif config is not None:
            dynamodb_resource = boto3.resource(
                "dynamodb", **config.boto_config_override
            )
            self.table = dynamodb_resource.Table(config.table_name)
        else:
            raise Exception(
                "Recipe service requires either a dynamodb table or a config"
            )
        self._user_lock = threading.Lock()
        self._user_cache = TTLCache(maxsize=10, ttl=18000)
        self._recipe_lock = threading.Lock()
        self._recipe_cache = TTLCache(maxsize=1024, ttl=18000)

    def _invalidate_user(self, user_id: str):
        if user_id.startswith("u#"):
            user_id = user_id[2:]
        key = self._query_user.cache_key(user_id)
        with self._query_user.cache_lock:
            self._query_user.cache.pop(key, None)

    def _invalidate_recipe(self, recipe_id: str):
        recipe_id = recipe_id.removeprefix("r#").removeprefix("zr#")

        key = self.read_recipe.cache_key(recipe_id)
        with self.read_recipe.cache_lock:
            self.read_recipe.cache.pop(key, None)

    def _cache_recipe(self, recipe: Recipe) -> None:
        key = self.read_recipe.cache_key(recipe.recipe_id)
        with self.read_recipe.cache_lock:
            self.read_recipe.cache[key] = recipe

    def save_item(self, item: BaseRecipes):
        self._invalidate_user(item.pk)
        if isinstance(item, Recipe):
            self._invalidate_recipe(item.sk)
        to_put = item.dump_for_dynamodb()
        logger.info(to_put)
        self.table.put_item(Item=to_put)

    def save_items(self, items: list[BaseRecipes]):
        with self.table.batch_writer() as batch:
            for item in items:
                self._invalidate_user(item.pk)
                if isinstance(item, Recipe):
                    self._invalidate_recipe(item.sk)
                batch.put_item(Item=item.dump_for_dynamodb())

    @cachedmethod(lambda self: self._user_cache, lock=lambda self: self._user_lock)
    def _query_user(self, user_id) -> tuple[User | None, list[Recipe]]:
        logger.info("Quering DynamoDB for user %s", user_id)
        pk = f"u#{user_id}"
        result = self.table.query(KeyConditionExpression=Key("pk").eq(pk))
        adapter = TypeAdapter(list[DynamoDbItem])
        items = adapter.validate_python(result["Items"])

        if len(items) == 0:
            return None, []
        user = items[0]
        recipe_list: list[Recipe] = items[1:]
        for recipe in recipe_list:
            self._cache_recipe(recipe)

        if not isinstance(user, User):
            raise TypeError(f"No user metadata record for pk {pk}!")

        return user, recipe_list

    @cachedmethod(lambda self: self._recipe_cache, lock=lambda self: self._recipe_lock)
    def read_recipe(self, recipe_id) -> Recipe | None:
        logger.info(f"Reading recipe for recipe id {recipe_id}")
        response = self.table.query(
            IndexName="RecipeId", KeyConditionExpression=Key("recipe_id").eq(recipe_id)
        )
        items = response.get("Items", [])
        if len(items) == 0:
            return None

        response = self.table.get_item(Key={"pk": items[0]["pk"], "sk": items[0]["sk"]})

        if "Item" in response:
            return Recipe.model_validate(response["Item"])
        else:
            return None

    def query_user(self, user_id: str) -> UserRecipes | None:
        user: User
        recipes_raw: list[Recipe]
        user, recipes_raw = self._query_user(user_id)
        recipes = [RecipeStub(title=r.title, id=r.recipe_id) for r in recipes_raw]
        recipes.sort(key=lambda r: r.title)

        return UserRecipes(user=user, recipes=recipes)

    def create_recipe(self, user_id: str, text_recipe: PlainTextRecipe) -> Recipe:
        recipe = text_recipe.to_recipe(user_id, str(ULID()))
        self.save_item(recipe)
        return recipe

    def edit_recipe(
        self, user_id: str, recipe_id: str, text_recipe: PlainTextRecipe
    ) -> None:
        recipe = text_recipe.to_editable_recipe(user_id, recipe_id)

        model = recipe.dump_for_dynamodb_update()
        key = recipe.dump_key()

        logger.info(f"Updating recipe {key}")

        update_expression = (
            f"SET {', '.join([f'#{key} = :{key}' for key in model.keys()])}"
        )
        expression_attribute_names = {f"#{key}": key for key in model.keys()}
        expression_attribute_values = {f":{key}": value for key, value in model.items()}

        self.table.update_item(
            Key=key,
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ConditionExpression=Attr("pk").exists(),
        )
        self._invalidate_recipe(recipe_id)
        self._invalidate_user(user_id)


class ScopedRecipeService:
    def __init__(
        self,
        recipe_service: RecipeService,
        user_id: str,
        on_scope_error: Callable[[str], Exception],
        on_not_found: Callable[[str | None], Exception | None] = None,
    ) -> None:
        self._service = recipe_service
        self.user_id = user_id
        self._on_scope_error = on_scope_error
        self._on_not_found = on_not_found

    def _raise_scope_error(self, msg: str):
        error = self._on_scope_error(msg)
        if error:
            raise error

    def _raise_not_found_error[T](self, resource: T) -> T | None:
        if resource is None:
            error = self._on_not_found(None) if self._on_not_found else None
            if error:
                raise error
        return resource

    def read_recipe(self, recipe_id: str) -> Recipe | None:
        recipe = self._service.read_recipe(recipe_id)
        if recipe is not None and recipe.user_id != self.user_id:
            raise self._on_scope_error(recipe_id)
        return self._raise_not_found_error(recipe)

    def query_user(self) -> UserRecipes:
        user = self._service.query_user(self.user_id)
        if user is None:
            raise self._on_scope_error(f"Bad user {self.user_id}!")
        return user

    def create_recipe(self, plain_text_recipe: PlainTextRecipe) -> Recipe:
        return self._service.create_recipe(self.user_id, plain_text_recipe)

    def edit_recipe(self, recipe_id: str, plain_text_recipe: PlainTextRecipe) -> None:
        self._service.edit_recipe(self.user_id, recipe_id, plain_text_recipe)
