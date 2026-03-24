from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Centralized configuration.

    Clean Code:
      - Config via env vars (12-factor).
      - Defaults allow local dev to run with ZERO setup.
      - Production config is injected by runtime.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core
    symbols_file: str = "./symbols.txt"
    quote_asset: str = "USDT"
    throttle_seconds: int = 3

    # Binance
    binance_ws_base: str = "wss://stream.binance.com:9443"
    binance_rest_base: str = "https://api.binance.com"

    log_level: str = "INFO"

