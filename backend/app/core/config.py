"""Application settings, loaded from environment variables / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "FoodVerse API"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./foodverse.db"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cookie_secure: bool = False

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    max_image_mb: int = 10
    max_audio_mb: int = 20
    max_video_mb: int = 100

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def validate_for_runtime(self) -> None:
        if self.environment == "production" and (
            self.jwt_secret == "change-me" or len(self.jwt_secret) < 32
        ):
            raise RuntimeError("Set JWT_SECRET to a random string of 32+ characters in production.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
