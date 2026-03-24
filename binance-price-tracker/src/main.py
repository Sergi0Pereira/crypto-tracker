import uvicorn
from src.api import app

def main() -> None:
    """
    Entry point for the Crypto Tracker application.
    Runs the FastAPI server which acts as a proxy for Binance REST and WebSocket APIs.
    """
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
