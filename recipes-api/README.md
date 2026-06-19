# Local development

## Sample `config.toml` for Local Dev

```toml
table_name = "Recipes"

[boto_config_override]
    endpoint_url = "http://localhost:8000"
    region_name = "us-west-2"
    aws_access_key_id = "dummy"
    aws_secret_access_key = "dummy"
```

## DynamoDB Local

Start:
```shell
docker compose -f dynamodb-local-docker-compose.yml up -d
uv run dynamodb_local
```

Stop:
```shell
docker compose -p dynamodb-local down 
```

Delete data (must be stopped):
```bash
rm -rf docker/dynamodb
```

```powershell
rmdir -Recurse .\docker\dynamodb\
```

## Running the server

```shell
uv run fastapi dev --port 8080
```