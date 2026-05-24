from boto3.dynamodb.conditions import Key
from pydantic import TypeAdapter

from schemas.dynamodb_models import Recipe, dynamodb_mode_context, BaseRecipes, DynamoDbItem, User, dynamodb_dump_args


class RecipeService:
    def __init__(self, table):
        self.table = table

    def save_item(self, item: BaseRecipes):
        self.table.put_item(Item=item.model_dump(**dynamodb_dump_args()))

    def query_user(self, user_id: str) -> tuple[User | None, list[Recipe]]:
        pk = f"u#{user_id}"
        result = self.table.query(KeyConditionExpression=Key("pk").eq(pk))
        adapter = TypeAdapter(list[DynamoDbItem])
        items = adapter.validate_python(result["Items"], context=dynamodb_mode_context())

        if len(items) == 0:
            return None, []
        user = items[0]
        recipes = items[1:]

        if not isinstance(user, User):
            raise TypeError(f"No user metadata record for pk {pk}!")

        return user, recipes
