import json

from aws_cdk import (
    Duration,
    Stack,
    aws_cognito as cognito, CfnOutput,
)
from constructs import Construct

from infrastructure import Config


class RecipeStack(Stack):
    def __init__(self, scope: Construct, config: Config, **kwargs) -> None:
        super().__init__(scope, "RecipeStack", **kwargs)

        user_pool = cognito.UserPool(self, "RecipeUserPool",
                                     account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
                                     email=cognito.UserPoolEmail.with_cognito(reply_to=config.cognito.reply_to_email)
                                     )

        call_back_urls = []
        if config.is_dev:
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

        user_pool_domain = user_pool.add_domain("RecipeDomain", cognito_domain=cognito.CognitoDomainOptions("recipes"), managed_login_version=cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN)

        oauth_details = {
            "user_pool_id": user_pool.user_pool_id,
            "authority": user_pool.user_pool_provider_url,
            "client_id": user_pool_client.user_pool_client_id,
            "cloud_front_endpoint": user_pool_domain.cloud_front_endpoint,
        }

        CfnOutput(self, "OAuthDetails", value=json.dumps(oauth_details))
