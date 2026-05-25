import json
import tomllib
from pathlib import Path

from botocore import config as boto_config
import sys

import boto3

from infrastructure import Config, recipe_stack

BOTO_CONFIG = None


def get_managed_login_settings(user_pool_id: str, client_id: str) -> dict:
    client = boto3.client("cognito-idp", config=BOTO_CONFIG)

    response = client.describe_managed_login_branding_by_client(
        ClientId=client_id, UserPoolId=user_pool_id, ReturnMergedResources=True
    )

    return response["ManagedLoginBranding"]["Settings"]


def get_stack_oauth_details(stack_name: str):
    client = boto3.client("cloudformation", config=BOTO_CONFIG)

    response = client.describe_stacks()  # StackName=stack_name)

    outputs = response["Stacks"][0]["Outputs"]
    return json.loads(
        next(
            output["OutputValue"]
            for output in outputs
            if output["OutputKey"] == "OAuthDetails"
        )
    )


def load_config(profile: str) -> Config:
    profile_file = Path(__file__).parent.joinpath("profiles", f"{profile}.toml")
    print(f"Loading profile from {profile_file}")
    with open(profile_file, "rb") as f:
        data = tomllib.load(f)
        return Config.model_validate(data)


def main(config: Config) -> None:
    stack_name = f"{config.id}-{recipe_stack.STACK_ID}"

    oauth_details = get_stack_oauth_details(stack_name)
    managed_login_settings = get_managed_login_settings(
        oauth_details["user_pool_id"], oauth_details["client_id"]
    )
    with open(
        Path(__file__).parent.joinpath("infrastructure", "managed_login_settings.json"),
        "w",
    ) as f:
        json.dump(managed_login_settings, f, sort_keys=True, indent=2)


if __name__ == "__main__":
    config = load_config(sys.argv[1])
    BOTO_CONFIG = boto_config.Config(region_name=config.aws_region)
    main(config)
