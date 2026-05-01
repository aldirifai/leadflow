from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    api_key: str

    openrouter_api_key: str = ""
    openrouter_model: str = "anthropic/claude-3.5-haiku"

    daily_ingest_limit: int = 200
    cooldown_days: int = 30

    cors_origins: str = "http://localhost:3000"
    environment: str = "production"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
