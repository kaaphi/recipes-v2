import logging

import boto3
from botocore.exceptions import ClientError

from schemas.dynamodb_models import Recipe, IngredientList, User
from services import RecipeService

DEFAULT_TABLE_NAME = "Recipes"

DEFAULT_CONFIG = {
    "endpoint_url": "http://localhost:8000",
    "region_name": "us-west-2",
    "aws_access_key_id": "dummy",
    "aws_secret_access_key": "dummy",
}

logger = logging.getLogger(__name__)


class DynamoDBLocal:
    def __init__(
        self, table_name: str = DEFAULT_TABLE_NAME, config: dict = DEFAULT_CONFIG
    ):
        self.table_name = table_name
        self.dynamodb_resource = boto3.resource("dynamodb", **config)
        self.table = self.dynamodb_resource.Table(self.table_name)
        self.dynamodb_client = boto3.client("dynamodb", **config)

    def table_exists(self):
        try:
            self.table.load()
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                return False
            else:
                raise  # Re-raise if it's a different error

    def create_table(self):
        if self.table_exists():
            logger.info(f"Table {self.table_name} already exists.")
            pass
        else:
            table = self.dynamodb_resource.create_table(
                TableName=self.table_name,
                KeySchema=[
                    {
                        "AttributeName": "pk",
                        "KeyType": "HASH",  # Partition key
                    },
                    {
                        "AttributeName": "sk",
                        "KeyType": "RANGE",  # Sort key
                    },
                ],
                AttributeDefinitions=[
                    {"AttributeName": "pk", "AttributeType": "S"},
                    {"AttributeName": "sk", "AttributeType": "S"},
                ],
                BillingMode="PAY_PER_REQUEST",
            )

            logger.info(f"Waiting to create table {self.table_name}.")
            table.wait_until_exists()
            logger.info(f"Table {self.table_name} created.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    db = DynamoDBLocal()
    db.create_table()
    service = RecipeService(db.table)
    service.save_item(
        Recipe(
            pk="u#1234",
            sk="r#1234",
            title="My Recipe",
            method="My Method",
            ingredientLists=[
                IngredientList(ingredients=["one", "two", "three"]),
                IngredientList(name="other", ingredients=["one", "two", "three"]),
            ],
        )
    )
    service.save_item(User(pk="u#1234", sk="#m", display_name="Bob"))

    print(service.query_user("1234"))
