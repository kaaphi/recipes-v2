from pydantic import BaseModel


class CognitoSettings(BaseModel):
    reply_to_email: str


class Config(BaseModel):
    id: str
    aws_account: str
    aws_region: str
    is_dev: bool = False
    host_names: list[str]

    cognito: CognitoSettings
