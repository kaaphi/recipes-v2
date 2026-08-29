# Local development

## Sample `config.toml` for Local Dev

```toml
table_name = "Recipes"

[boto_config_override]
endpoint_url = "http://localhost:8000"
region_name = "us-west-2"
aws_access_key_id = "dummy"
aws_secret_access_key = "dummy"

[cognito_auth]
#this info can be retrieved from the CloudFormation output (secret will be in a secure param specified in that output)
region = "us-west-2"
userpool_id = "us-west-2_MyUserPoolId1234"
client_id = "MyClientId"
client_secret = "MyClientSecret"
authority = "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_MyUserPoolId1234"
domain = "https://my-custom-domain.auth.us-west-2.amazoncognito.com"
redirect_uri = "http://localhost:5173/api/oidc_callback"
```

## DynamoDB Local

### Start:
```shell
docker compose -f dynamodb-local-docker-compose.yml up -d
```

### Create table and load data:
You will need a `migrate_config.toml` in [dev](dev) that points to a valid json file with migrated data.
See [migrate data](MIGRATE_DATA.md) for more details about the format of that file and how to migrate old data to get
a valid JSON file.
```shell
uv run dynamodb_loader --local
```

### Stop:
```shell
docker compose -p dynamodb-local down 
```

### Delete data (must be stopped):
Bash:
```bash
rm -rf docker/dynamodb
```
PowerShell:
```powershell
rmdir -Recurse .\docker\dynamodb\
```

## Running the server

```shell
uv run fastapi dev --port 8080
```

# Deployment

## Build and push image

```shell
aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/u3d2w9n9
docker build -t kaaphi/recipes-v2-api .
docker tag kaaphi/recipes-v2-api:latest public.ecr.aws/u3d2w9n9/kaaphi/recipes-v2-api:latest
docker push public.ecr.aws/u3d2w9n9/kaaphi/recipes-v2-api:latest
```

## Configuration

```toml
#can find in CloudFormation output
table_name = "prod-RecipeStack-RecipesABCD1234-ABCDEF1234567"

[boto_config_override]
region_name = "us-west-2"

[cognito_auth.userpools.main]
#most of this info can be retrieved from the CloudFormation output (secret will be in a secure param specified in that output)
region = "us-west-2"
userpool_id = "us-west-2_MyUserPoolId1234"
client_id = "MyClientId"
client_secret = "MyClientSecret"
authority = "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_MyUserPoolId1234"
domain = "my-custom-domain.auth.us-west-2.amazoncognito.com"
#this needs to point to your actual production domain
redirect_uri = "http://my.production.domain/api/oidc_callback"
```