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


class RecipesCognitoSettings(BaseSettings):
    check_expiration: bool = True
    jwt_header_name: str = "Authorization"
    jwt_header_prefix: str = "Bearer"

    region: str
    userpool_id: str
    client_id: str
    client_secret: str
    authority: str
    domain: str

    redirect_uri: str

    def get_cognito_settings(self) -> CognitoSettings:
        return CognitoSettings(
            check_expiration=True,
            jwt_header_name="Authorization",
            jwt_header_prefix="Bearer",
            userpools={
                "main": {
                    "region": self.region,
                    "userpool_id": self.userpool_id,
                    "app_client_id": self.client_id,
                }
            },
        )


class RecipesConfig(BaseSettings):
    table_name: str
    boto_config_override: dict[str, str] = {}
    session_cache_dir: str = "./.cache/sessions"

    cognito_auth: RecipesCognitoSettings
