import boto3
from boto3.dynamodb.conditions import Key
from pydantic import TypeAdapter

from schemas.api_models import UserRecipes
from schemas.config import RecipesConfig
from schemas.dynamodb_models import (
    Recipe,
    dynamodb_mode_context,
    BaseRecipes,
    DynamoDbItem,
    User,
    dynamodb_dump_args,
)


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

    def save_item(self, item: BaseRecipes):
        self.table.put_item(Item=item.model_dump(**dynamodb_dump_args()))

    def query_user(self, user_id: str) -> UserRecipes|None:
        pk = f"u#{user_id}"
        result = self.table.query(KeyConditionExpression=Key("pk").eq(pk))
        adapter = TypeAdapter(list[DynamoDbItem])
        items = adapter.validate_python(
            result["Items"], context=dynamodb_mode_context()
        )

        if len(items) == 0:
            return None
        user = items[0]
        recipes = items[1:]

        if not isinstance(user, User):
            raise TypeError(f"No user metadata record for pk {pk}!")

        return UserRecipes(user=user, recipes=recipes)
