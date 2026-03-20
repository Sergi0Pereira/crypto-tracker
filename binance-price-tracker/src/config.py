from __future__ import annotations

from typing import Literal, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


SinkType = Literal["stdout", "postgres"]
DbTarget = Literal["local", "cloudsql"]


class Settings(BaseSettings):
    """
    Centralized configuration.

    Clean Code:
      - Config via env vars (12-factor).
      - Defaults allow local dev to run with ZERO setup.
      - Production config is injected by runtime (Cloud Run/GKE/etc.)
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Core
    symbols_file: str = "./symbols.txt"
    quote_asset: str = "USDT"
    throttle_seconds: int = 3

    # Binance
    binance_ws_base: str = "wss://stream.binance.com:9443"
    binance_rest_base: str = "https://api.binance.com"

    # Output control (the “topics”)
    sink: SinkType = "stdout"
    db_target: DbTarget = "local"

    # Local Postgres via TCP URL (SQLAlchemy format)
    database_url: Optional[str] = None

    # Cloud SQL Postgres
    instance_connection_name: Optional[str] = None
    db_name: Optional[str] = None
    db_user: Optional[str] = None
    db_pass: Optional[str] = None

    log_level: str = "INFO"

