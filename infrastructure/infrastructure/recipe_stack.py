import json
from pathlib import Path

from aws_cdk import (
    Stack,
    aws_cognito as cognito,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_backup as backup,
    aws_events as events,
    RemovalPolicy,
    aws_iam as iam,
    Duration,
    custom_resources as cr,
    aws_logs as logs,
)
from aws_cdk.aws_cognito import UserPoolClient
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

        CfnOutput(self, "ProfileConfigJson", value=config.model_dump_json())

    def setup_user(self, table: dynamodb.Table):
        policy = iam.Policy(self, "RecipeAccessPolicy")
        table.grant_read_write_data(policy)

        user = iam.User(self, "RecipeAccessUser")
        policy.attach_to_user(user)

    def setup_dynamodb(self) -> dynamodb.Table:
        removal_policy = (
            RemovalPolicy.DESTROY if self.config.is_dev else RemovalPolicy.RETAIN
        )

        table = dynamodb.Table(
            self,
            "Recipes",
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

        table.add_global_secondary_index(
            index_name="RecipesIndex",
            partition_key=dynamodb.Attribute(
                name="recipe_id",
                type=dynamodb.AttributeType.STRING,
            ),
        )

        if not self.config.is_dev:
            vault = backup.BackupVault(self, "RecipeVault")

            # Create the Main Backup Plan
            backup_plan = backup.BackupPlan(self, "TieredBackupPlan")

            # RULE A: Short-term Daily Backups
            backup_plan.add_rule(
                backup.BackupPlanRule(
                    backup_vault=vault,
                    rule_name="DailyShortTerm",
                    schedule_expression=events.Schedule.cron(
                        minute="0", hour="2"
                    ),  # Every day at 2 AM
                    delete_after=Duration.days(3),  # Automatically delete after 3 days
                )
            )

            # RULE B: Long-term Monthly Backups
            backup_plan.add_rule(
                backup.BackupPlanRule(
                    backup_vault=vault,
                    rule_name="MonthlyLongTerm",
                    # Runs at 3 AM only on the 1st day of every month
                    schedule_expression=events.Schedule.cron(
                        minute="0", hour="3", day="1"
                    ),
                    delete_after=Duration.days(
                        90
                    ),  # Automatically delete after ~3 months
                )
            )

            # Assign the table to the tiered plan
            backup_plan.add_selection(
                "Selection",
                resources=[backup.BackupResource.from_dynamo_db_table(table)],
            )

        return table

    def setup_cognito(self):
        callback_urls = []
        logout_urls = []

        for host in self.config.hosts:
            scheme = "https"
            if self.config.is_dev and host.startswith("localhost"):
                scheme = "http"

            callback_urls.append(f"{scheme}://{host}/oidc_callback")
            callback_urls.append(f"{scheme}://{host}/api/oidc_callback")
            logout_urls.append(f"{scheme}://{host}/")

        if self.config.is_dev:
            password_policy = cognito.PasswordPolicy(
                min_length=8,
                require_digits=False,
                require_lowercase=False,
                require_symbols=False,
                require_uppercase=False,
            )
        else:
            password_policy = cognito.PasswordPolicy(
                min_length=8,
                require_digits=True,
                require_lowercase=False,
                require_symbols=False,
                require_uppercase=True,
            )

        user_pool = cognito.UserPool(
            self,
            "RecipeUserPool",
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            email=cognito.UserPoolEmail.with_cognito(
                reply_to=self.config.cognito.reply_to_email
            ),
            password_policy=password_policy,
        )

        # TODO remove this once we move the UI to use session cookies instead of tokens directly
        user_pool_client = user_pool.add_client(
            "RecipeUiClient",
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,
                ),
                scopes=[cognito.OAuthScope.OPENID],
                callback_urls=callback_urls,
                logout_urls=logout_urls,
            ),
            auth_flows=cognito.AuthFlow(user=True, user_srp=True),
        )

        bff_client = user_pool.add_client(
            "BffRecipeClient",
            generate_secret=True,  # Mandates a secret
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(authorization_code_grant=True),
                scopes=[cognito.OAuthScope.OPENID],
                callback_urls=callback_urls,
                logout_urls=logout_urls,
            ),
        )

        client_secret_param_name = self.store_client_secret(bff_client)

        domain_prefix = f"kaaphi-recipes-{self.config.id.lower()}"

        user_pool.add_domain(
            "RecipeDomain",
            cognito_domain=cognito.CognitoDomainOptions(domain_prefix=domain_prefix),
            managed_login_version=cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
        )

        with open(
            Path(__file__).parent.joinpath("managed_login_settings.json"), "rb"
        ) as f:
            managed_login_settings = json.load(f)

        cognito.CfnManagedLoginBranding(
            self,
            "RecipeBranding",
            user_pool_id=user_pool.user_pool_id,
            client_id=bff_client.user_pool_client_id,
            assets=[],
            settings=managed_login_settings,
            return_merged_resources=False,
            use_cognito_provided_values=False,
        )

        oauth_details = {
            "user_pool_id": user_pool.user_pool_id,
            "authority": user_pool.user_pool_provider_url,
            "spa_client_id": user_pool_client.user_pool_client_id,
            "bff_client_id": bff_client.user_pool_client_id,
            "bff_client_secret_param": client_secret_param_name,
            "domain": f"{domain_prefix}.auth.{self.region}.amazoncognito.com",
        }

        CfnOutput(self, "OAuthDetails", value=json.dumps(oauth_details))

    def store_client_secret(self, bff_client: UserPoolClient) -> str:
        parameter_name = f"/{self.stack_name}/bff/client_secret"

        custom_resource_log_group = logs.LogGroup(
            self,
            "CustomResourceLogGroup",
            retention=logs.RetentionDays.ONE_DAY,  # Deletes log data after 24 hours
            removal_policy=RemovalPolicy.DESTROY,  # Deletes the group if you destroy the stack
        )

        # Use an AwsCustomResource to push the secret to SSM Parameter Store as a SecureString
        cr.AwsCustomResource(
            self,
            "InjectSecretToSSM",
            log_group=custom_resource_log_group,
            on_create=cr.AwsSdkCall(
                service="SSM",
                action="putParameter",
                parameters={
                    "Name": parameter_name,
                    "Value": bff_client.user_pool_client_secret.unsafe_unwrap(),
                    "Type": "SecureString",
                    "Overwrite": True,
                },
                physical_resource_id=cr.PhysicalResourceId.of("BffSecretSSMInjection"),
            ),
            on_update=cr.AwsSdkCall(
                service="SSM",
                action="putParameter",
                parameters={
                    "Name": parameter_name,
                    "Value": bff_client.user_pool_client_secret.unsafe_unwrap(),
                    "Type": "SecureString",
                    "Overwrite": True,
                },
                physical_resource_id=cr.PhysicalResourceId.of("BffSecretSSMInjection"),
            ),
            # Deletes the parameter automatically if you destroy the stack
            on_delete=cr.AwsSdkCall(
                service="SSM",
                action="deleteParameter",
                parameters={"Name": parameter_name},
            ),
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE
            ),
        )

        return parameter_name
