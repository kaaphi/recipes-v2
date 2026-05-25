import logging

from fastapi import FastAPI

from schemas.api_models import UserRecipes
from schemas.config import load_config
from services import RecipeService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

config = load_config()
service = RecipeService(config)


app: FastAPI = FastAPI()


@app.get("/user/recipes/{user_id}")
def get_recipes(user_id: str) -> UserRecipes:
    return service.query_user(user_id)