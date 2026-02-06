from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra="ignore",
        env_ignore_empty = True,
    )
    ENVIRONMENT: Literal["local", "production"] = "local"
    JWT_SECRET_KEY: str
    DATABASE_URL: str
    PROJECT_NAME: str
    # use to define other environment config this is just an example for now

settings = Settings()