from datetime import datetime
from typing import Annotated, Union

from pydantic import BaseModel, Tag, Discriminator, computed_field, field_validator


def dynamodb_dump_args(additional_exclude: set[str] = set()) -> dict:
    return {
        "mode": "json",
        "exclude": {"is_archived", "recipe_id", "user_id"} | additional_exclude,
    }


class BaseRecipes(BaseModel):
    pk: str
    sk: str

    @computed_field
    @property
    def user_id(self) -> str:
        return self.pk.split("#")[1]

    @field_validator("pk", mode="after")
    @classmethod
    def validate_pk(cls, pk: str) -> str:
        if "#" not in pk:
            return f"u#{pk}"

        if not pk.startswith("u#"):
            raise ValueError(f'pk must start with "u#": "{pk}"!')

        return pk

    def dump_key(self):
        return self.model_dump(include=BaseRecipes.model_fields.keys())

    def dump_for_dynamodb(self, additional_exclude: set[str] = set()) -> dict:
        return self.model_dump(**dynamodb_dump_args(additional_exclude))


class SharedUser(BaseModel):
    id: str
    display_name: str


class User(BaseRecipes):
    display_name: str
    users_shared: list[SharedUser]
    sk: str = "#m"

    @field_validator("sk", mode="after")
    @classmethod
    def validate_sk(cls, sk: str) -> str:
        if sk != "#m":
            raise ValueError(f'User sk must be "#m": "{sk}"!')
        return sk


class EditableRecipe(BaseRecipes):
    title: str
    method: str
    sources: list[str] = []
    ingredientLists: list[IngredientList] = []
    updated_at: datetime = datetime.now()

    @field_validator("sk", mode="after")
    @classmethod
    def validate_sk(cls, sk: str) -> str:
        if "#" not in sk:
            return f"r#{sk}"

        if not (sk.startswith("r#") or sk.startswith("zr#")):
            raise ValueError('Recipe sk must start with "r#" or "zr#"!')
        return sk

    def dump_for_dynamodb_update(self, additional_exclude: set[str] = set()) -> dict:
        return super().dump_for_dynamodb(
            additional_exclude=additional_exclude | {"pk", "sk"}
        )


class Recipe(EditableRecipe):
    created_at: datetime = datetime.now()

    @computed_field
    @property
    def is_archived(self) -> bool:
        return self.sk.startswith("zr#")

    @computed_field
    @property
    def recipe_id(self) -> str:
        return self.sk.split("#")[1]


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
