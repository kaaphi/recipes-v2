import logging

from fastapi import FastAPI, Depends
from fastapi_cognito import CognitoAuth, CognitoToken

from schemas.api_models import UserRecipes
from schemas.config import load_config, RecipesConfig
from schemas.dynamodb_models import Recipe
from services import RecipeService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

config: RecipesConfig = load_config()
service = RecipeService(config)


app: FastAPI = FastAPI()

cognito: CognitoAuth = CognitoAuth(settings=config.cognito_auth)


@app.get("/user/recipes")
def get_recipes(auth: CognitoToken = Depends(cognito.auth_required)) -> UserRecipes:
    return service.query_user(auth.cognito_id)


@app.get("/recipe/{recipe_id}")
def get_recipe(recipe_id: str) -> Recipe:
    return service.read_recipe(recipe_id)
