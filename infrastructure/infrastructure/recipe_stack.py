import json
from pathlib import Path

from aws_cdk import (
    Duration,
    Stack,
    aws_cognito as cognito, CfnOutput,
    aws_dynamodb as dynamodb, RemovalPolicy,
    aws_iam as iam,
)
from constructs import Construct

from infrastructure import Config

STACK_ID = "RecipeStack"


class RecipeStack(Stack):
    def __init__(self, scope: Construct, config: Config, **kwargs) -> None:
        super().__init__(scope, STACK_ID, **kwargs)
        self.config = config
        self.setup_cognito()
        table = self.setup_dynamodb()
        self.setup_user(table)

    def setup_user(self, table: dynamodb.Table):
        policy = iam.Policy(self, "RecipeAccessPolicy")
        table.grant_read_write_data(policy)

        user = iam.User(self, "RecipeAccessUser")
        policy.attach_to_user(user)

    def setup_dynamodb(self) -> dynamodb.Table:
        removal_policy = RemovalPolicy.DESTROY if self.config.is_dev else RemovalPolicy.RETAIN

        table = dynamodb.Table(
            self, "Recipes",
            partition_key=dynamodb.Attribute(
                name="pk",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="sk",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=removal_policy,
        )

        return table

    def setup_cognito(self):
        user_pool = cognito.UserPool(self, "RecipeUserPool",
                                     account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
                                     email=cognito.UserPoolEmail.with_cognito(reply_to=self.config.cognito.reply_to_email)
                                     )

        call_back_urls = []
        if self.config.is_dev:
            call_back_urls.append("http://localhost:5173/oidc_callback")
        else:
            raise Exception("non-dev environments not supported yet!")

        user_pool_client = user_pool.add_client("RecipeUiClient",
                                                o_auth=cognito.OAuthSettings(
                                                    flows=cognito.OAuthFlows(
                                                        authorization_code_grant=True,
                                                    ),
                                                    scopes=[cognito.OAuthScope.OPENID],
                                                    callback_urls=call_back_urls,
                                                ),
                                                auth_flows=cognito.AuthFlow(user=True, user_srp=True)
                                                )

        domain_prefix = f"kaaphi-recipes-{self.config.id.lower()}"

        user_pool_domain = user_pool.add_domain("RecipeDomain", cognito_domain=cognito.CognitoDomainOptions(
            domain_prefix=domain_prefix), managed_login_version=cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN)

        with open(Path(__file__).parent.joinpath("managed_login_settings.json"), 'rb') as f:
            managed_login_settings = json.load(f)

        managed_login_branding = cognito.CfnManagedLoginBranding(self, "RecipeBranding",
                                                                 user_pool_id=user_pool.user_pool_id,
                                                                 client_id=user_pool_client.user_pool_client_id,
                                                                 assets=[],
                                                                 settings=managed_login_settings,
                                                                 return_merged_resources=False,
                                                                 use_cognito_provided_values=False,
                                                                 )

        oauth_details = {
            "user_pool_id": user_pool.user_pool_id,
            "authority": user_pool.user_pool_provider_url,
            "client_id": user_pool_client.user_pool_client_id,
            "domain": f"{domain_prefix}.auth.{self.region}.amazoncognito.com",
        }

        CfnOutput(self, "OAuthDetails", value=json.dumps(oauth_details))