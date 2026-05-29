from pydantic import BaseModel

from schemas.dynamodb_models import User, IngredientList


class RecipeStub(BaseModel):
    title: str
    id: str


class UserRecipes(BaseModel):
    user: User
    recipes: list[RecipeStub]


class PlainTextRecipe(BaseModel):
    title: str
    method: str
    sources: list[str] = []
    ingredientLists: list[IngredientList] = []
