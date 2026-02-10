import asyncio
import json
from datetime import datetime, timezone

import websockets

SYMBOLS = ["btcusdt", "ethusdt", "solusdt"]
STREAMS = "/".join(f"{s}@ticker" for s in SYMBOLS)

# Binance's WebSocket endpoint for combined streams
# Check doc here: https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
WS_URL = f"wss://stream.binance.com:9443/stream?streams={STREAMS}"

# function to convert milliseconds timestamp to ISO format
def ts_ms_to_iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()

async def main():
    print(f"Connecting to: {WS_URL}")
    async with websockets.connect(WS_URL, ping_interval=20, ping_timeout=20) as ws:
        async for raw in ws:
            msg = json.loads(raw)

            # combined streams comes like that: {"stream":"btcusdt@bookTicker","data":{...}}
            data = msg.get("data", {})
            #  typical tickers: s(symbol), c(last price), E(event time)
            out = {
                "symbol": data.get("s"), # coin
                "price": data.get("c"),  # last price
                "event_time": ts_ms_to_iso(data.get("E")) if data.get("E") else None,
            }
            print(json.dumps(out, separators=(",", ":")))

if __name__ == "__main__":
    asyncio.run(main())
