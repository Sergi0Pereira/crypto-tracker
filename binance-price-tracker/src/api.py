from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import asyncio
import websockets
import json

from src.config import Settings
from src.infrastructure.symbols_loader import SymbolsFileLoader
from src.infrastructure.binance_rest import BinanceRestClient

app = FastAPI(title="Crypto Tracker Dashboard")
settings = Settings()

# Setup static files directory
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/api/symbols")
async def get_symbols():
    # Load tickers
    tickers = SymbolsFileLoader().load(settings.symbols_file)
    rest = BinanceRestClient(settings.binance_rest_base)
    # Get valid pairs
    symbols = await rest.resolve_spot_usdt_pairs(tickers, settings.quote_asset)
    return {"symbols": symbols}

@app.get("/api/klines")
async def get_klines(symbol: str, interval: str = "1h", limit: int = 100, endTime: int = None):
    """
    Security Proxy: Route Binance Kline requests through our backend 
    to prevent exposing API credentials/logic and protect client IPs.
    """
    import httpx
    from fastapi import HTTPException
    
    # Input sanitization
    symbol = ''.join(e for e in symbol if e.isalnum())
    
    url = f"{settings.binance_rest_base}/api/v3/klines"
    params = {
        "symbol": symbol.upper(),
        "interval": interval,
        "limit": min(limit, 1000) # Hard limit to prevent abuse
    }
    if endTime:
        params["endTime"] = endTime
        
    async with httpx.AsyncClient() as client:
        try:
            # If an API key was needed, it would be added here securely from env vars:
            # headers = {"X-MBX-APIKEY": settings.binance_api_key}
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="Error fetching data from upstream API")
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal Server Error")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Get symbols from query parameters or use default
        symbols = websocket.query_params.get('symbols', 'btcusdt,ethusdt').split(',')
        streams = [f"{symbol.lower()}@ticker" for symbol in symbols]
        binance_url = f"wss://stream.binance.com:9443/stream?streams={'/'.join(streams)}"

        async with websockets.connect(binance_url) as binance_ws:
            async def forward_to_client():
                try:
                    async for message in binance_ws:
                        await websocket.send_text(message)
                except Exception as e:
                    print(f"Error forwarding to client: {e}")

            async def forward_to_binance():
                try:
                    while True:
                        data = await websocket.receive_text()
                        # If client sends data, forward to Binance (though typically not needed for ticker streams)
                        await binance_ws.send(data)
                except Exception as e:
                    print(f"Error forwarding to Binance: {e}")

            # Run both forwarding tasks concurrently
            await asyncio.gather(
                forward_to_client(),
                forward_to_binance()
            )
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

@app.get("/", response_class=HTMLResponse)
async def read_root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return index_file.read_text()
    return "<h1>Dashboard is missing index.html</h1>"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=True)
