import logging
import threading

import boto3
from boto3.dynamodb.conditions import Key
from cachetools import TTLCache, cachedmethod
from pydantic import TypeAdapter

from schemas.api_models import UserRecipes, RecipeStub
from schemas.config import RecipesConfig
from schemas.dynamodb_models import (
    Recipe as Recipe,
    dynamodb_mode_context,
    BaseRecipes,
    DynamoDbItem,
    User,
    dynamodb_dump_args,
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

    def _invalidate_user(self, user_id):
        if user_id.startswith("u#"):
            user_id = user_id[2:]
        key = self._query_user.cache_key(user_id)
        with self._query_user.cache_lock:
            self._query_user.cache.pop(key, None)

    def _cache_recipe(self, recipe: Recipe) -> None:
        key = self.read_recipe.cache_key(recipe.id)
        with self.read_recipe.cache_lock:
            self.read_recipe.cache[key] = recipe

    def save_item(self, item: BaseRecipes):
        self._invalidate_user(item.pk)
        self.table.put_item(Item=item.model_dump(**dynamodb_dump_args()))

    def save_items(self, items: list[BaseRecipes]):
        with self.table.batch_writer() as batch:
            for item in items:
                self._invalidate_user(item.pk)
                batch.put_item(Item=item.model_dump(**dynamodb_dump_args()))

    @cachedmethod(lambda self: self._user_cache, lock=lambda self: self._user_lock)
    def _query_user(self, user_id) -> tuple[User | None, list[Recipe]]:
        logger.info("Quering DynamoDB for user %s", user_id)
        pk = f"u#{user_id}"
        result = self.table.query(KeyConditionExpression=Key("pk").eq(pk))
        adapter = TypeAdapter(list[DynamoDbItem])
        items = adapter.validate_python(
            result["Items"], context=dynamodb_mode_context()
        )

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
        # TODO right now, we're assuming they always get cached from querying the user, will need to add GSI or change
        # schema to improve this
        logger.info(f"Reading recipe for recipe id {recipe_id}")
        response = self.table.scan(
            FilterExpression=Key("sk").eq(f"r#{recipe_id}")
            or Key("sk").eq(f"zr#{recipe_id}")
        )
        items = response.get("Items", [])
        if len(items) == 0:
            return None
        else:
            return Recipe.model_validate(items[0])

    def query_user(self, user_id: str) -> UserRecipes | None:
        user: User
        recipes_raw: list[Recipe]
        user, recipes_raw = self._query_user(user_id)
        recipes = [RecipeStub(title=r.title, id=r.id) for r in recipes_raw]
        recipes.sort(key=lambda r: r.title)

        return UserRecipes(user=user, recipes=recipes)
