import argparse
import datetime
import json
import logging
import os
import tomllib
import uuid
from pathlib import Path

import psycopg2
import psycopg2.extras
from pydantic import BaseModel, TypeAdapter
from app.schemas.dynamodb_models import Recipe, IngredientList, User, BaseRecipes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PostgresConfig(BaseModel):
    host: str
    database: str
    user: str
    password: str


class Config(BaseModel):
    """
    Config for the data migration
    """

    load_from_file: bool
    """Whether to load the legacy config data from a file or postgres"""
    base_directory: Path = Path(os.getcwd())
    """The base directory for reading/writing input and output files when they are relative paths"""
    legacy_data_file: Path
    """The file to read/write legacy data to"""
    output_data_file: Path
    """The file to write v2  output to"""
    postgres: PostgresConfig
    """Config for the postgres connection"""
    users: dict[int, User]
    """Map of legacy user ID to v2 User data"""


class LegacyIngredient(BaseModel):
    name: str
    quantity: str | None = None


class LegacyIngredientList(BaseModel):
    name: str | None = None
    ingredients: list[LegacyIngredient]


class LegacyRecipe(BaseModel):
    title: str
    method: str
    sources: list[str] | None = []
    ingredientLists: list[LegacyIngredientList]
    pass


class LegacyRecipeContainer(BaseModel):
    id: uuid.UUID
    userid: int
    recipe: LegacyRecipe
    createdtime: datetime.datetime
    updatedtime: datetime.datetime | None
    isarchived: bool


config: Config


def convert_legacy_recipe(
    legacy: LegacyRecipeContainer, user_map: dict[int, User]
) -> Recipe:
    return Recipe(
        pk=user_map[legacy.userid].pk,
        sk=f"{'r' if not legacy.isarchived else 'zr'}#{legacy.id}",
        title=legacy.recipe.title,
        method=legacy.recipe.method,
        sources=legacy.recipe.sources,
        ingredientLists=[
            IngredientList(
                name=legacy_recipe.name,
                ingredients=[
                    f"{i.quantity} {i.name}" if i.quantity else i.name
                    for i in legacy_recipe.ingredients
                ],
            )
            for legacy_recipe in legacy.recipe.ingredientLists
        ],
    )


def load_legacy_from_postgres() -> list[LegacyRecipeContainer]:
    logger.info(
        f"Loading legacy data from postgres {config.postgres.host}:{config.postgres.database} and writing to {config.legacy_data_file}"
    )

    conn = psycopg2.connect(
        host=config.postgres.host,
        database=config.postgres.database,
        user=config.postgres.user,
        password=config.postgres.password,
    )
    with conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Execute query with parameter binding
            cur.execute("SELECT * FROM recipes", (1,))
            # Fetch result

            raw_rows = cur.fetchall()
            with open(
                config.legacy_data_file,
                "w",
            ) as f:
                json.dump(raw_rows, f, default=str)

    legacy_adapter = TypeAdapter(list[LegacyRecipeContainer])
    containers = legacy_adapter.validate_python(raw_rows)

    return containers


def load_legacy_from_json() -> list[LegacyRecipeContainer]:
    logger.info(f"Loading legacy data from {config.legacy_data_file}")

    legacy_adapter = TypeAdapter(list[LegacyRecipeContainer])
    with open(
        config.legacy_data_file,
        "r",
    ) as f:
        containers = legacy_adapter.validate_json(f.read())

    return containers


def get_default_config_path() -> str:
    config_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(config_dir, "migrate_config.toml")


def main():
    parser = argparse.ArgumentParser(description="Migrate v1 postgres data to v2.")
    parser.add_argument("-c", "--config", type=str, default=get_default_config_path())
    args = parser.parse_args()

    logger.info(f"Loading config from {args.config}")
    with open(args.config, "rb") as f:
        data = tomllib.load(f)
    global config
    config = Config.model_validate(data)

    os.chdir(config.base_directory)
    logger.info(f"Working in directory {os.getcwd()}")

    if config.load_from_file:
        containers = load_legacy_from_json()
    else:
        containers = load_legacy_from_postgres()

    recipes: list[BaseRecipes] = [
        convert_legacy_recipe(r, config.users) for r in containers
    ]

    for u in config.users.values():
        recipes.append(u)

    logger.info(f"Writing v2 data to {config.output_data_file}")
    v2_adapter = TypeAdapter(list[BaseRecipes])
    with open(
        config.output_data_file,
        "wb",
    ) as f:
        f.write(v2_adapter.dump_json(recipes, polymorphic_serialization=True))


if __name__ == "__main__":
    main()
