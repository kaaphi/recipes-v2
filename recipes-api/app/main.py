import logging

from fastapi import FastAPI, Depends, Response, HTTPException, status
from fastapi_cognito import CognitoAuth, CognitoToken

from app.schemas.api_models import (
    UserRecipes,
    PlainTextWrapper,
    RecipeSearchResult,
    SharedUserRecipes,
)
from app.schemas.config import load_config, RecipesConfig
from app.schemas.dynamodb_models import Recipe
from app.schemas.plain_text_format import to_plain_text, from_plain_text
from app.services import RecipeService, ScopedRecipeService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

config: RecipesConfig = load_config()
service = RecipeService(config)

cognito: CognitoAuth = CognitoAuth(settings=config.cognito_auth)

app: FastAPI = FastAPI(dependencies=[Depends(cognito.auth_required)])


class PlainTextRecipeResponse(Response):
    media_type = "text/x-recipe"


def scoped_recipe_service(
    auth: CognitoToken = Depends(cognito.auth_required),
) -> ScopedRecipeService:
    return ScopedRecipeService(
        service,
        auth.cognito_id,
        on_scope_error=lambda msg: HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=msg
        ),
        on_not_found=lambda msg: HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=msg
        ),
    )


@app.get("/user/recipes")
def get_recipes(
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> UserRecipes:
    return scoped_service.query_user()


@app.get("/shared/{user_id}/recipes")
def get_shared_recipes(
    user_id: str,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> SharedUserRecipes:
    return scoped_service.query_shared_user(user_id)


@app.get("/user/recipes/search")
def search_recipes(
    q: str,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> list[RecipeSearchResult]:
    return scoped_service.search_recipes(q)


@app.get("/recipe/{recipe_id}")
def get_recipe(
    recipe_id: str, scoped_service: ScopedRecipeService = Depends(scoped_recipe_service)
) -> Recipe:
    return scoped_service.read_recipe(recipe_id)


@app.get("/recipe/edit/{recipe_id}")
def get_edit_recipe(
    recipe_id: str, scoped_service: ScopedRecipeService = Depends(scoped_recipe_service)
) -> PlainTextWrapper:
    return PlainTextWrapper(recipe=to_plain_text(scoped_service.read_recipe(recipe_id)))


@app.post("/recipe/edit")
def post_edit_recipe(
    recipe_text: PlainTextWrapper,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> Recipe:
    plain_text_recipe = from_plain_text(recipe_text.recipe)
    return scoped_service.create_recipe(plain_text_recipe)


@app.put("/recipe/edit/{recipe_id}")
def put_edit_recipe(
    recipe_id: str,
    recipe_text: PlainTextWrapper,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> None:
    plain_text_recipe = from_plain_text(recipe_text.recipe)
    scoped_service.edit_recipe(recipe_id, plain_text_recipe)
