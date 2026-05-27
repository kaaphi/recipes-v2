from datetime import datetime
from typing import Any, Annotated, Union

from pydantic import BaseModel, field_serializer, Tag, Discriminator, computed_field
from pydantic_core.core_schema import FieldSerializationInfo

DYNAMODB_MODE = "dynamo_db_mode"


def dynamodb_mode_context(**kwargs) -> dict:
    return kwargs | {DYNAMODB_MODE: True}


def dynamodb_dump_args() -> dict:
    return {
        "exclude": {"is_archived"},
        "context": dynamodb_mode_context(),
    }


class BaseRecipes(BaseModel):
    pk: str
    sk: str


class User(BaseRecipes):
    display_name: str
    sk: str = "#m"

    @property
    def id(self) -> str:
        return self.pk.split("#")[1]


class Recipe(BaseRecipes):
    title: str
    method: str
    sources: list[str] = []
    ingredientLists: list[IngredientList] = []
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    @computed_field
    @property
    def is_archived(self) -> bool:
        return self.sk.startswith("zr#")

    @property
    def id(self) -> str:
        return self.sk.split("#")[1]

    @field_serializer("created_at", "updated_at", mode="wrap")
    def ser_datetime(self, value: datetime, handler: Any, info: FieldSerializationInfo):
        dynamo_db_mode = (
            info.context.get(DYNAMODB_MODE, False) if info.context else False
        )
        return value.isoformat() if dynamo_db_mode else handler(value)


class IngredientList(BaseModel):
    name: str | None = None
    ingredients: list[str]


def dynamo_db_item_discriminator(v):
    if isinstance(v, dict):
        # pk = v["pk"]
        sk = v["sk"]
    else:
        # pk = getattr(v, "pk")
        sk = getattr(v, "sk")

    match sk:
        case "#m":
            return "User"
        case str() if sk.startswith("r#") or sk.startswith("zr#"):
            return "Recipe"
        case _:
            raise Exception(f"Invalid sk: {sk}")


DynamoDbItem = Annotated[
    Union[Annotated[User, Tag("User")], Annotated[Recipe, Tag("Recipe")]],
    Discriminator(dynamo_db_item_discriminator),
]
