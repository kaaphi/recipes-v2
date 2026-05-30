from pydantic import BaseModel

from schemas.dynamodb_models import User, IngredientList, EditableRecipe, Recipe


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

    def to_editable_recipe(self, pk: str, sk: str) -> EditableRecipe:
        return EditableRecipe(
            pk=pk,
            sk=sk,
            title=self.title,
            method=self.method,
            sources=self.sources,
            ingredientLists=self.ingredientLists,
        )

    def to_recipe(self, pk: str, sk: str) -> Recipe:
        return Recipe(
            pk=pk,
            sk=sk,
            title=self.title,
            method=self.method,
            sources=self.sources,
            ingredientLists=self.ingredientLists,
        )
