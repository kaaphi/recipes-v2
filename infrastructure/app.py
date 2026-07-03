#!/usr/bin/env python3
import logging
import tomllib
from pathlib import Path
from typing import Sequence

import aws_cdk as cdk
from constructs import Construct

from infrastructure import Config
from infrastructure.recipe_stack import RecipeStack

logging.basicConfig(level=logging.INFO)


class DeploymentStage(cdk.Stage):
    def __init__(self, scope: Construct, config: Config, **kwargs) -> None:
        super().__init__(scope, config.id)
        RecipeStack(
            self,
            config=config,
            env=cdk.Environment(account=config.aws_account, region=config.aws_region),
        )


def load_profiles() -> Sequence[Config]:
    configs = []
    for profile in Path(__file__).parent.joinpath("profiles").glob("*.toml"):
        print(f"Loading profile {profile}")
        with open(profile, "rb") as f:
            data = tomllib.load(f)
            configs.append(Config.model_validate(data))

    return configs


def create_app() -> cdk.App:
    app = cdk.App()
    for profile in load_profiles():
        DeploymentStage(app, config=profile)
    return app


create_app().synth()
