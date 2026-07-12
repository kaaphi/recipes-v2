import argparse
import logging

import boto3
from botocore.exceptions import ClientError
from pydantic import TypeAdapter

from app.schemas.dynamodb_models import DynamoDbItem
from app.services import RecipeService
from dev import get_default_config_path, load_migration_config

DEFAULT_TABLE_NAME = "Recipes"

DYNAMO_DB_LOCAL_CONFIG = {
    "endpoint_url": "http://localhost:8000",
    "region_name": "us-west-2",
    "aws_access_key_id": "dummy",
    "aws_secret_access_key": "dummy",
}

logger = logging.getLogger(__name__)


class DynamoDBLoader:
    def __init__(
        self,
        table_name: str = DEFAULT_TABLE_NAME,
        config: dict = DYNAMO_DB_LOCAL_CONFIG,
    ):
        self.config = config
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
        if self.config != DYNAMO_DB_LOCAL_CONFIG:
            raise Exception("Cannot create table if config is not DynamoDB local!")

        if self.table_exists():
            logger.info(f"Table {self.table_name} already exists.")
            pass
        else:
            logger.info(f"Table {self.table_name} does not exist. Will create it.")
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
                    {"AttributeName": "recipe_id", "AttributeType": "S"},
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "RecipeId",
                        "KeySchema": [
                            {"AttributeName": "recipe_id", "KeyType": "HASH"},
                        ],
                        "Projection": {
                            "ProjectionType": "KEYS_ONLY",
                        },
                    }
                ],
                BillingMode="PAY_PER_REQUEST",
            )

            logger.info(f"Waiting to create table {self.table_name}.")
            table.wait_until_exists()
            logger.info(f"Table {self.table_name} created.")


def main():
    parser = argparse.ArgumentParser(description="Load JSON data into DynamoDB.")
    parser.add_argument("-c", "--config", type=str, default=get_default_config_path())
    parser.add_argument("-t", "--table", type=str, default=DEFAULT_TABLE_NAME)
    environment_group = parser.add_mutually_exclusive_group()
    environment_group.add_argument("--local", action="store_true")
    environment_group.add_argument("--aws", nargs="+", type=str)
    args = parser.parse_args()
    migration_config = load_migration_config(args.config)

    logging.basicConfig(level=logging.INFO)

    if not args.local:
        aws_config = {k: v for s in args.aws for k, v in [s.split("=", 1)]}
        db = DynamoDBLoader(table_name=args.table, config=aws_config)
        confirm = input(
            f"You will be writing to table {db.table_name}, type YES to confirm: "
        )
        if not confirm == "YES":
            logger.warning("Canceled writing to table.")
            return
    else:
        db = DynamoDBLoader(table_name=args.table, config=DYNAMO_DB_LOCAL_CONFIG)
        db.create_table()

    if not db.table_exists():
        raise Exception(f"Table {db.table_name} does not exist!")

    service = RecipeService(table=db.table)

    with open(
        migration_config.base_directory.joinpath(migration_config.output_data_file),
        "rb",
    ) as f:
        adapter = TypeAdapter(list[DynamoDbItem])
        items = adapter.validate_json(f.read())
        service.save_items(items)


if __name__ == "__main__":
    main()
