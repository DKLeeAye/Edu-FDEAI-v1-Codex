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
    frontend_origin: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3001,http://127.0.0.1:3002",
        alias="FRONTEND_ORIGIN",
    )

    database_url: str = Field(
        default="postgresql+psycopg://edufde:edufde@localhost:5432/edufde",
        alias="DATABASE_URL",
    )
    database_echo: bool = Field(default=False, alias="DATABASE_ECHO")
    jwt_secret_key: str = Field(default="dev-only-change-me", alias="JWT_SECRET_KEY")
    jwt_access_token_expire_minutes: int = Field(
        default=60,
        alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    s3_endpoint_url: str = Field(default="http://localhost:9000", alias="S3_ENDPOINT_URL")
    s3_bucket_name: str = Field(default="edufde-local", alias="S3_BUCKET_NAME")

    ai_provider: str = Field(default="siliconflow", alias="AI_PROVIDER")
    siliconflow_api_key: str = Field(default="", alias="SILICONFLOW_API_KEY")
    siliconflow_base_url: str = Field(default="", alias="SILICONFLOW_BASE_URL")
    siliconflow_model: str = Field(default="", alias="SILICONFLOW_MODEL")
    siliconflow_customer_model: str = Field(default="", alias="SILICONFLOW_CUSTOMER_MODEL")
    siliconflow_reasoning_model: str = Field(default="", alias="SILICONFLOW_REASONING_MODEL")
    ai_timeout_seconds: int = Field(default=30, alias="AI_TIMEOUT_SECONDS", gt=0)

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
