import logging
import os
import tomllib
from functools import cached_property

import boto3
from fastapi_cognito import CognitoSettings
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


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
    client_secret_param: str
    authority: str
    domain: str

    redirect_uri: str

    @cached_property
    def client_secret(self) -> str:
        if self.client_secret_param.startswith("secret:"):
            logger.info("Read client secret directly from client_secret_param value.")
            return self.client_secret_param.removeprefix("secret:")

        client = boto3.client("ssm", region_name=self.region)
        response = client.get_parameter(
            Name=self.client_secret_param, WithDecryption=True
        )
        secret = response["Parameter"]["Value"]
        logger.info(f"Read client secret from {self.client_secret_param}")
        return secret

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
