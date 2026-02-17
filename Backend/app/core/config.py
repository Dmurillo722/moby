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
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    PROJECT_NAME: str = "Moby Backend"
    ALPACA_API_KEY: str
    ALPACA_API_SECRET: str
    # use to define other environment config this is just an example for now

settings = Settings()