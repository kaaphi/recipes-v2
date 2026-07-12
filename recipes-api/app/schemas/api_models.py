from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.schemas.dynamodb_models import (
    User,
    IngredientList,
    EditableRecipe,
    Recipe,
    SharedUser,
)


class RecipeStub(BaseModel):
    title: str
    id: str


class RecipeSearchMatchType(str, Enum):
    title = "title"
    ingredient = "ingredient"
    method = "method"


class RecipeSearchResult(BaseModel):
    title: str
    id: str
    match_context: str
    match_type: RecipeSearchMatchType
    score: float


class SharedUserRecipes(BaseModel):
    user: SharedUser
    recipes: list[RecipeStub]


class UserRecipes(BaseModel):
    user: User
    recipes: list[RecipeStub]


class PlainTextWrapper(BaseModel):
    recipe: str


class PlainTextRecipe(BaseModel):
    title: str
    method: str
    sources: list[str] = []
    ingredientLists: list[IngredientList] = []

    def to_editable_recipe(self, pk: str, sk: str) -> EditableRecipe:
        return EditableRecipe(
            pk=pk,
            sk=sk,
            title=self.title,
            method=self.method,
            sources=self.sources,
            ingredientLists=self.ingredientLists,
            updated_at=datetime.now(),
        )

    def to_recipe(self, pk: str, sk: str) -> Recipe:
        return Recipe(
            pk=pk,
            sk=sk,
            title=self.title,
            method=self.method,
            sources=self.sources,
            ingredientLists=self.ingredientLists,
            created_at=datetime.now(),
            updated_at=None,
        )
