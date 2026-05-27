from pydantic import BaseModel

from schemas.dynamodb_models import User


class RecipeStub(BaseModel):
    title: str
    id: str


class UserRecipes(BaseModel):
    user: User
    recipes: list[RecipeStub]
