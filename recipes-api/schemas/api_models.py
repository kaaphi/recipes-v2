from pydantic import BaseModel

from schemas.dynamodb_models import User, Recipe


class UserRecipes(BaseModel):
    user: User
    recipes: list[Recipe]
