from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import asdict

from src.domain.models import PriceTick


class PriceTickSink(ABC):
    """
    SOLID: Abstraction for “where ticks go”.
    - High-level ingestion service depends on this interface, not concrete DB/console.
    """

    async def start(self) -> None:
        """Initialize resources or background tasks."""
        pass

    async def stop(self) -> None:
        """Clean up resources or flush pending data."""
        pass

    @abstractmethod
    async def write(self, tick: PriceTick) -> None:
        """Persist or emit one tick."""
        raise NotImplementedError


class StdoutSink(PriceTickSink):
    """
    Writes one JSON object per line to stdout.
    Cloud-native friendly: stdout -> logs -> export to BigQuery if desired.
    """

    async def write(self, tick: PriceTick) -> None:
        payload = asdict(tick)
        payload["event_time"] = tick.event_time.isoformat()
        print(json.dumps(payload, separators=(",", ":")))
