# Local development

## DynamoDB Local

Start:
```shell
docker compose -f dynamodb-local-docker-compose.yml up -d
uv run tests/dynamodb_local.py
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