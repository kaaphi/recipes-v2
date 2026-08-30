import logging
import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi_cognito import CognitoAuth, CognitoToken
from starlette.middleware.sessions import SessionMiddleware

from app.schemas.api_models import (
    AuthorizedUser,
    PlainTextWrapper,
    RecipeSearchResult,
    RecipeUpdate,
    SharedUserRecipes,
    TitledPlainTextWrapper,
    UserRecipes,
)
from app.schemas.config import RecipesConfig, load_config
from app.schemas.dynamodb_models import Recipe
from app.schemas.plain_text_format import from_plain_text, to_plain_text
from app.services import RecipeService, ScopedRecipeService
from app.services.auth import BffAuth, BffMiddleware
from dev_routes import conditionally_add_dev_routes

LOGGING_LEVEL = os.getenv("LOGGING_LEVEL", "INFO")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
app_logger = logging.getLogger("app")
app_logger.setLevel(LOGGING_LEVEL)

logger = logging.getLogger(__name__)

config: RecipesConfig = load_config()
service = RecipeService(config)

cognito: CognitoAuth = CognitoAuth(settings=config.cognito_auth.get_cognito_settings())

bff_auth: BffAuth = BffAuth(
    config=config.cognito_auth, session_cache_dir=config.session_cache_dir
)

app = FastAPI()

auth_app = FastAPI()
auth_app.add_middleware(SessionMiddleware, secret_key=config.cognito_auth.client_secret)

api_app = FastAPI(dependencies=[Depends(cognito.auth_required)])
api_app.add_middleware(BffMiddleware, bff_auth=bff_auth)

app.mount("/auth", auth_app)
app.mount("/api", api_app)

conditionally_add_dev_routes(api_app, bff_auth)


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


@auth_app.get("/login")
async def login(request: Request):
    return await bff_auth.login(request)


@auth_app.get("/logout")
async def logout(
    request: Request,
    logout_redirect_uri: str | None = None,
    logout_cognito: bool = True,
):
    return await bff_auth.logout(
        request, logout_redirect_uri=logout_redirect_uri, logout_cognito=logout_cognito
    )


@auth_app.get("/oidc_callback")
async def auth_callback(request: Request, response: Response):
    return await bff_auth.auth_callback(request, response)


@api_app.get("/authorizedUser")
async def authorized_user(
    auth: CognitoToken = Depends(cognito.auth_required),
) -> AuthorizedUser:
    return AuthorizedUser(id=auth.cognito_id, username=auth.username)


@api_app.get("/user/recipes")
def get_recipes(
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> UserRecipes:
    return scoped_service.query_user()


@api_app.get("/user/archive")
def get_archive_recipes(
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> UserRecipes:
    return scoped_service.query_archive()


@api_app.get("/shared/{user_id}/recipes")
def get_shared_recipes(
    user_id: str,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> SharedUserRecipes:
    return scoped_service.query_shared_user(user_id)


@api_app.get("/user/recipes/search")
def search_recipes(
    q: str,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> list[RecipeSearchResult]:
    if q == "":
        return []
    return scoped_service.search_recipes(q)


@api_app.get("/recipe/{recipe_id}")
def get_recipe(
    recipe_id: str, scoped_service: ScopedRecipeService = Depends(scoped_recipe_service)
) -> Recipe:
    return scoped_service.read_recipe(recipe_id)


@api_app.put("/recipe/{recipe_id}")
def put_recipe(
    recipe_id: str,
    recipe_update: RecipeUpdate,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> None:
    scoped_service.update_recipe(recipe_id, recipe_update)


@api_app.get("/recipe/edit/{recipe_id}")
def get_edit_recipe(
    recipe_id: str, scoped_service: ScopedRecipeService = Depends(scoped_recipe_service)
) -> TitledPlainTextWrapper:
    recipe = scoped_service.read_recipe(recipe_id)
    return TitledPlainTextWrapper(
        title=recipe.title, recipe=to_plain_text(recipe), is_archived=recipe.is_archived
    )


@api_app.post("/recipe/edit")
def post_edit_recipe(
    recipe_text: PlainTextWrapper,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> Recipe:
    plain_text_recipe = from_plain_text(recipe_text.recipe)
    return scoped_service.create_recipe(plain_text_recipe)


@api_app.put("/recipe/edit/{recipe_id}")
def put_edit_recipe(
    recipe_id: str,
    recipe_text: PlainTextWrapper,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> None:
    plain_text_recipe = from_plain_text(recipe_text.recipe)
    scoped_service.edit_recipe(recipe_id, plain_text_recipe)


@api_app.delete("/recipe/{recipe_id}")
def delete_recipe(
    recipe_id: str,
    is_archived: bool = False,
    scoped_service: ScopedRecipeService = Depends(scoped_recipe_service),
) -> None:
    scoped_service.delete_recipe(recipe_id, is_archived)
