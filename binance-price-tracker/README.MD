# Binance Price Tracker

A real-time cryptocurrency price tracker that streams live price data from Binance WebSocket API. Supports multiple output destinations: console (stdout), local PostgreSQL, or Google Cloud SQL.

## Project Overview

This application:
- Loads cryptocurrency symbols from a configuration file
- Validates trading pairs against Binance Spot API (USDT quote)
- Streams real-time price updates via Binance WebSocket
- Outputs price data to configurable sinks (stdout, local Postgres, or Cloud SQL)

## Prerequisites

- **Python 3.8+**
- **pip** or your preferred package manager

### For Option 2 (Local Postgres):
- **Docker** (to run PostgreSQL container)

### For Option 3 (Cloud SQL):
- **Google Cloud Project** with Cloud SQL PostgreSQL instance
- **Cloud SQL Auth Proxy** (or use `cloud-sql-python-connector`)

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd binance-price-tracker
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

---

## Running the Application

Choose one of the three methods below based on your needs:

### **Option 1: Console Output (Simplest)**

Perfect for testing and local development. Streams price data directly to stdout with zero database setup.

**Configuration (`.env` file):**
```env
# Output to console
SINK=stdout

# Symbols and Binance
SYMBOLS_FILE=./symbols.txt
QUOTE_ASSET=USDT
THROTTLE_SECONDS=3
BINANCE_WS_BASE=wss://stream.binance.com:9443
BINANCE_REST_BASE=https://api.binance.com

LOG_LEVEL=INFO
```

**Run:**
```bash
python -m src.main
```

**Output Example:**
```
Price update for BTCUSDT: $42500.50
Price update for ETHUSDT: $2250.30
...
```

---

### **Option 2: Local PostgreSQL Database**

Stores price data in a local PostgreSQL instance running in Docker. Use this for local development with data persistence.

**Step 1: Start PostgreSQL container:**
```bash
docker run --rm -d \
  --name pg-crypto \
  -e POSTGRES_DB=your_db \
  -e POSTGRES_USER=your_user \
  -e POSTGRES_PASSWORD=your_pass \
  -p 5432:5432 \
  postgres:16
```

Verify PostgreSQL is running:
```bash
docker ps | grep pg-crypto
```

**Step 2: Create `.env` file:**
```env
# Output to local Postgres
SINK=postgres
DB_TARGET=local
DATABASE_URL=postgresql+psycopg://crypto:crypto@127.0.0.1:5432/crypto

# Symbols and Binance
SYMBOLS_FILE=./symbols.txt
QUOTE_ASSET=USDT
THROTTLE_SECONDS=3
BINANCE_WS_BASE=wss://stream.binance.com:9443
BINANCE_REST_BASE=https://api.binance.com

LOG_LEVEL=INFO
```

**Step 3: Run the application:**
```bash
python -m src.main
```

The application will automatically create the necessary schema on first run.

**Step 4: Query the database (optional):**
```bash
docker exec -it pg-crypto psql -U crypto -d crypto
```

**Stop PostgreSQL when done:**
```bash
docker stop pg-crypto
```

---

### **Option 3: Google Cloud SQL**

Persist data in a managed Google Cloud SQL PostgreSQL instance. Use this for production deployments.

**Step 1: Setup Google Cloud SQL instance**

Create a Cloud SQL PostgreSQL instance:
```bash
gcloud sql instances create crypto-tracker-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1
```

Create a database and user:
```bash
gcloud sql databases create crypto --instance=crypto-tracker-db
gcloud sql users create crypto_ingestor --instance=crypto-tracker-db --password=[YOUR_PASSWORD]
```

Get your instance connection name:
```bash
gcloud sql instances describe crypto-tracker-db --format="value(connectionName)"
```

**Step 2: Create `.env` file:**
```env
# Output to Cloud SQL
SINK=postgres
DB_TARGET=cloudsql
INSTANCE_CONNECTION_NAME=your-project:us-central1:crypto-tracker-db
DB_NAME=crypto
DB_USER=crypto_ingestor
DB_PASS=your_secure_password

# Symbols and Binance
SYMBOLS_FILE=./symbols.txt
QUOTE_ASSET=USDT
THROTTLE_SECONDS=3
BINANCE_WS_BASE=wss://stream.binance.com:9443
BINANCE_REST_BASE=https://api.binance.com

LOG_LEVEL=INFO
```

**Step 3: Authenticate with Google Cloud:**
```bash
gcloud auth application-default login
```

**Step 4: Run the application:**
```bash
python -m src.main
```

The application uses `cloud-sql-python-connector` to securely connect to Cloud SQL.

---

## Configuration Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SINK` | `stdout` | Output destination: `stdout` or `postgres` |
| `DB_TARGET` | `local` | Database target: `local` or `cloudsql` (only for postgres sink) |
| `SYMBOLS_FILE` | `./symbols.txt` | Path to cryptocurrency symbols file |
| `QUOTE_ASSET` | `USDT` | Quote currency for trading pairs |
| `THROTTLE_SECONDS` | `3` | Minimum seconds between price updates per symbol |
| `BINANCE_WS_BASE` | `wss://stream.binance.com:9443` | Binance WebSocket endpoint |
| `BINANCE_REST_BASE` | `https://api.binance.com` | Binance REST API endpoint |
| `LOG_LEVEL` | `INFO` | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `DATABASE_URL` | (optional) | PostgreSQL connection string for local (e.g., `postgresql+psycopg://user:pass@host:5432/db`) |
| `INSTANCE_CONNECTION_NAME` | (optional) | Cloud SQL instance name (e.g., `project:region:instance`) |
| `DB_NAME` | (optional) | Cloud SQL database name |
| `DB_USER` | (optional) | Cloud SQL username |
| `DB_PASS` | (optional) | Cloud SQL password |

---

## Troubleshooting

**"No valid symbols found on Binance Spot"**
- Check that `symbols.txt` contains valid cryptocurrency tickers
- Verify internet connection to Binance API
- Ensure `QUOTE_ASSET` matches available pairs

**PostgreSQL connection refused (Option 2)**
- Verify Docker is running: `docker ps`
- Check credentials in `DATABASE_URL`
- Ensure port 5432 is not blocked

**Cloud SQL connection timeout (Option 3)**
- Verify `INSTANCE_CONNECTION_NAME` is correct
- Check credentials are valid
- Ensure Google Cloud authentication: `gcloud auth application-default login`
- Verify firewall rules allow your IP

**Import errors**
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
- Verify virtual environment is activated

---

## Development

**Project Structure:**
```
src/
├── main.py                 # Entry point
├── config.py              # Configuration (Pydantic Settings)
├── application/           # Business logic
│   ├── service.py        # Price ingestion service
│   ├── sinks.py          # Output handlers (stdout, postgres)
│   └── throttle.py       # Rate limiting
├── domain/               # Domain models
│   └── models.py         # Data structures
└── infrastructure/       # External integrations
    ├── binance_rest.py   # Binance REST client
    ├── binance_ws.py     # Binance WebSocket client
    ├── postgres_sink.py  # PostgreSQL persistence
    ├── cloudsql_engine.py # Cloud SQL connections
    └── symbols_loader.py # Symbol file parser
```
