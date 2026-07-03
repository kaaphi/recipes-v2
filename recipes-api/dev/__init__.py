import logging
import os
import tomllib
from pathlib import Path

from pydantic import BaseModel

from app.schemas.dynamodb_models import User

logger = logging.getLogger(__name__)


class PostgresConfig(BaseModel):
    host: str
    database: str
    user: str
    password: str


class Config(BaseModel):
    """
    Config for the data migration
    """

    load_from_file: bool
    """Whether to load the legacy config data from a file or postgres"""
    base_directory: Path = Path(os.getcwd())
    """The base directory for reading/writing input and output files when they are relative paths"""
    legacy_data_file: Path
    """The file to read/write legacy data to"""
    output_data_file: Path
    """The file to write v2  output to"""
    postgres: PostgresConfig
    """Config for the postgres connection"""
    users: dict[int, User]
    """Map of legacy user ID to v2 User data"""


def get_default_config_path() -> str:
    config_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(config_dir, "migrate_config.toml")


def load_migration_config(file: Path) -> Config:
    logger.info(f"Loading config from {file}")
    with open(file, "rb") as f:
        data = tomllib.load(f)
    return Config.model_validate(data)
