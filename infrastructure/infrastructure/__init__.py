from pydantic import BaseModel
from pydantic_settings import BaseSettings


class CognitoSettings(BaseModel):
    reply_to_email: str


class Config(BaseSettings):
    id: str
    aws_account: str
    aws_region: str
    is_dev: bool = False
    hosts: list[str]

    cognito: CognitoSettings
