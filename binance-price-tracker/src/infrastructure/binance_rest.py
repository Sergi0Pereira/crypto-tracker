from __future__ import annotations

from dataclasses import dataclass
import httpx


@dataclass(frozen=True)
class BinanceSymbolInfo:
    symbol: str
    base_asset: str
    quote_asset: str
    status: str


class BinanceRestClient:
    """
    Minimal REST client used only to:
      - resolve + validate symbols (e.g., BTCUSDT exists on Spot and is TRADING)
    """

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def fetch_exchange_info(self) -> dict:
        # /api/v3/exchangeInfo is the canonical place to get symbol rules/availability :contentReference[oaicite:5]{index=5}
        url = f"{self._base_url}/api/v3/exchangeInfo"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()

    async def resolve_spot_usdt_pairs(self, tickers: list[str], quote_asset: str) -> list[str]:
        """
        Maps base tickers (e.g., BTC, ETH) to valid Binance Spot symbols with the given quote asset (e.g., USDT).

        Robust approach:
          - Uses baseAsset/quoteAsset instead of assuming SYMBOL == BASE+QUOTE exists in `permissions`.
          - Requires status == TRADING.
        """
        exchange_info = await self.fetch_exchange_info()
        symbols = exchange_info.get("symbols", [])

        wanted_bases = {t.upper() for t in tickers}
        wanted_quote = quote_asset.upper()

        valid: list[str] = []
        for s in symbols:
            base = str(s.get("baseAsset", "")).upper()
            quote = str(s.get("quoteAsset", "")).upper()
            status = str(s.get("status", "")).upper()
            sym = str(s.get("symbol", "")).upper()

            if base in wanted_bases and quote == wanted_quote and status == "TRADING":
                valid.append(sym)

        return valid
