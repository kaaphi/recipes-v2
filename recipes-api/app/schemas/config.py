import os
import tomllib

from fastapi_cognito import CognitoSettings
from pydantic_settings import BaseSettings


def load_config(
    file: str | None = os.getenv("RECIPES_CONFIG", "config.toml"),
) -> RecipesConfig:
    with open(file, "rb") as f:
        data = tomllib.load(f)

    return RecipesConfig.model_validate(data)


class RecipesCognitoSettings(CognitoSettings):
    check_expiration: bool = True
    jwt_header_name: str = "Authorization"
    jwt_header_prefix: str = "Bearer"


class RecipesConfig(BaseSettings):
    table_name: str
    boto_config_override: dict[str, str] = {}

    cognito_auth: RecipesCognitoSettings
