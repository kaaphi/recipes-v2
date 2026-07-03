# Migrate data from legacy V1 to V2

## Restoring legacy backup to local Postgres in Docker

### Starting the local postgres
```shell
docker run --name recipe-postgres -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgres
```

### Restoring the backup
```shell
cat recipes.dump | docker exec -i recipe-postgres psql -U postgres --set ON_ERROR_STOP=on postgres
```

## Converting the legacy data to V2 format

### Config file

Create a config file that looks something like this:

```toml
load_from_file = false
base_directory = 'C:\dev\recipesv2\recipes-api\test-data'
legacy_data_file = "recipes_legacy.json"
output_data_file = "recipes_v2_b.json"

[postgres]
host="localhost"
database="postgres"
user="postgres"
password="mysecretpassword"

[users]
[users."1"]
pk = "u#28d123d0-5071-706f-8316-9c8d66e043c3"
display_name = "joe"
users_shared = [
    { id = "d8513370-a0c1-7006-a35d-0d28324d39b3", display_name = "nicole" }
]

[users."4"]
pk = "u#d8513370-a0c1-7006-a35d-0d28324d39b3"
display_name = "nicole"
```

### Migrate data

```shell
uv run migrate_data
```