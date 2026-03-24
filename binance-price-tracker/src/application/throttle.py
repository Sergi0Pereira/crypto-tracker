from __future__ import annotations

import time


class PerSymbolThrottle:
    """
    Enforces: at most 1 emitted tick per symbol per interval.

    Binance can push ticker events at ~1000ms cadence. :contentReference[oaicite:6]{index=6}
    This throttle reduces write load and makes your downstream storage sane.
    """

    def __init__(self, interval_seconds: float) -> None:
        if interval_seconds <= 0:
            raise ValueError("interval_seconds must be > 0")
        self._interval = float(interval_seconds)
        self._last_emit: dict[str, float] = {}

    def should_emit(self, symbol: str) -> bool:
        now = time.monotonic()
        last = self._last_emit.get(symbol)

        if last is None or (now - last) >= self._interval:
            self._last_emit[symbol] = now
            return True

        return False