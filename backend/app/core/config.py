from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "EduFDE Core API"
    app_version: str = "0.1.0"
    environment: str = Field(default="local", alias="ENVIRONMENT")

    api_v1_prefix: str = "/api/v1"
    frontend_origin: str = Field(default="http://localhost:3000", alias="FRONTEND_ORIGIN")

    database_url: str = Field(
        default="postgresql+psycopg://edufde:edufde@localhost:5432/edufde",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    s3_endpoint_url: str = Field(default="http://localhost:9000", alias="S3_ENDPOINT_URL")
    s3_bucket_name: str = Field(default="edufde-local", alias="S3_BUCKET_NAME")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
