from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class PriceTick:
    """
    Domain object representing a single price observation.
    """
    symbol: str            # e.g., BTCUSDT
    last_price: float      # "c" in Binance ticker payload :contentReference[oaicite:4]{index=4}
    event_time: datetime   # event time from Binance (ms -> datetime UTC)

    @staticmethod
    def utc_now() -> datetime:
        return datetime.now(timezone.utc)
