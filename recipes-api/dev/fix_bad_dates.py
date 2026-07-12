import argparse
import logging

from boto3.dynamodb.conditions import Attr
from pydantic import TypeAdapter

from app.schemas.dynamodb_models import DynamoDbItem, Recipe
from dev import get_default_config_path, load_migration_config, Config
from dev.dynamodb_loader import DynamoDBLoader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

config: Config


class BadDateFixer:
    def __init__(self, db: DynamoDBLoader, bad_updated_date: str):
        self.db = db
        self.bad_updated_date = bad_updated_date
        self.skipped_updated_at = 0

    def fix_bad_date(self, recipe: Recipe):
        # Always fix the created_at
        self.db.table.update_item(
            Key={"pk": recipe.pk, "sk": recipe.sk},
            UpdateExpression="SET created_at = :val",
            ExpressionAttributeValues={":val": str(recipe.created_at)},
        )
        # Only fix the updated_at if it is the "bad" date
        try:
            update_expression = (
                "SET updated_at = :val" if recipe.updated_at else "REMOVE updated_at"
            )
            expression_values = (
                {":val": str(recipe.updated_at)} if recipe.updated_at else {}
            )
            self.db.table.update_item(
                Key={"pk": recipe.pk, "sk": recipe.sk},
                UpdateExpression=update_expression,
                ConditionExpression=Attr("updated_at").eq(self.bad_updated_date),
                ExpressionAttributeValues=expression_values,
            )
        except self.db.table.meta.client.exceptions.ConditionalCheckFailedException:
            logger.debug(
                f"No updated_at required for {recipe.recipe_id} ({recipe.title})"
            )
            self.skipped_updated_at += 1


def main():
    parser = argparse.ArgumentParser(
        description="Fix bad created/updated dates in DynamoDB."
    )
    parser.add_argument("-c", "--config", type=str, default=get_default_config_path())
    parser.add_argument("bad_updated_date", type=str)
    DynamoDBLoader.add_arguments(parser)
    args = parser.parse_args()

    global config
    config = load_migration_config(args.config)

    db = DynamoDBLoader.from_args(args)

    fixer = BadDateFixer(db, args.bad_updated_date)

    with open(
        config.base_directory.joinpath(config.output_data_file),
        "rb",
    ) as f:
        adapter = TypeAdapter(list[DynamoDbItem])
        items = [
            item for item in adapter.validate_json(f.read()) if isinstance(item, Recipe)
        ]

    logger.info(f"Updating {len(items)} items in DynamoDB")
    for idx, item in enumerate(items):
        try:
            fixer.fix_bad_date(item)
            if (idx + 1) % 50 == 0:
                logger.info(
                    f"Updated {idx + 1}/{len(items)} items. Skipped {fixer.skipped_updated_at} for updated_at."
                )
        except Exception as e:
            logger.error(f"Failed to fix item {idx + 1}: {item}")
            raise e

    logger.info(
        f"Finished updating {len(items)} items in DynamoDB. Skipped {fixer.skipped_updated_at} for updated_at."
    )


if __name__ == "__main__":
    main()
