from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://wealthwise:wealthwise@localhost:5432/wealthwise"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-in-production-use-256-bit-random-value"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TTL: int = 900        # 15 minutes
    JWT_REFRESH_TTL: int = 604800    # 7 days

    # Object storage (MinIO / S3)
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_BUCKET: str = "wealthwise"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"

    # App
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    DEBUG: bool = False

    # Email (optional)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

    # Sentry (optional)
    SENTRY_DSN: str = ""


settings = Settings()
