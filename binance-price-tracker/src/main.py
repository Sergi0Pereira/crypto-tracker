from __future__ import annotations

import asyncio
import signal
import logging
from dotenv import load_dotenv
from pathlib import Path

from src.config import Settings
from src.application.throttle import PerSymbolThrottle
from src.application.service import PriceIngestionService
from src.application.sinks import StdoutSink, PriceTickSink
from src.infrastructure.symbols_loader import SymbolsFileLoader
from src.infrastructure.binance_rest import BinanceRestClient
from src.infrastructure.binance_ws import BinanceTickerStream
from src.infrastructure.postgres_sink import PostgresSink, build_engine_local
from src.infrastructure.cloudsql_engine import build_engine_cloudsql


def _build_sink(settings: Settings, log: logging.Logger) -> PriceTickSink:
    if settings.sink == "stdout":
        log.info("Sink selected: stdout")
        return StdoutSink()

    if settings.sink == "postgres":
        if settings.db_target == "local":
            if not settings.database_url:
                raise RuntimeError("SINK=postgres DB_TARGET=local requires DATABASE_URL")
            log.info("Sink selected: postgres (local)")
            engine = build_engine_local(settings.database_url)

        elif settings.db_target == "cloudsql":
            missing = [k for k in ["instance_connection_name", "db_user", "db_pass", "db_name"]
                       if getattr(settings, k) in (None, "",)]
            if missing:
                raise RuntimeError(f"SINK=postgres DB_TARGET=cloudsql missing: {', '.join(missing)}")

            log.info("Sink selected: postgres (cloudsql)")
            engine = build_engine_cloudsql(
                instance_connection_name=settings.instance_connection_name,  # type: ignore[arg-type]
                db_user=settings.db_user,  # type: ignore[arg-type]
                db_pass=settings.db_pass,  # type: ignore[arg-type]
                db_name=settings.db_name,  # type: ignore[arg-type]
            )
        else:
            raise RuntimeError(f"Unknown DB_TARGET: {settings.db_target}")

        sink = PostgresSink(engine)
        sink.init_schema()
        return sink

    raise RuntimeError(f"Unknown SINK: {settings.sink}")


async def main() -> None:
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")
    settings = Settings()

    logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
    log = logging.getLogger("binance-price-tracker")

    # Load tickers
    tickers = SymbolsFileLoader().load(settings.symbols_file)
    log.info("Loaded %d tickers from %s", len(tickers), settings.symbols_file)

    # Resolve to valid Spot symbols with quote asset
    rest = BinanceRestClient(settings.binance_rest_base)
    symbols = await rest.resolve_spot_usdt_pairs(tickers, settings.quote_asset)
    log.info("Resolved %d valid Spot symbols with quote=%s", len(symbols), settings.quote_asset)

    if not symbols:
        raise RuntimeError("No valid symbols found on Binance Spot for the given tickers + quote asset.")

    # Build sink (stdout / postgres local / postgres cloudsql)
    sink = _build_sink(settings, log)

    # Run ingestion
    stream = BinanceTickerStream(settings.binance_ws_base)
    throttle = PerSymbolThrottle(settings.throttle_seconds)
    service = PriceIngestionService(stream=stream, sink=sink, throttle=throttle, logger=log)

    loop = asyncio.get_running_loop()
    task = asyncio.create_task(service.run(symbols))

    def _shutdown(sig: signal.Signals) -> None:
        log.info(f"Received signal {sig.name}, initiating shutdown...")
        task.cancel()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _shutdown, sig)

    try:
        await task
    except asyncio.CancelledError:
        pass

    log.info("Shutdown complete.")

if __name__ == "__main__":
    asyncio.run(main())
