# Crypto Tracker Dashboard

A real-time cryptocurrency price tracking and charting platform. This project ingests live trade data from the Binance WebSocket & REST APIs, stores the ticks in a PostgreSQL/CloudSQL database, and serves a high-performance web dashboard using FastAPI and TradingView's Lightweight Charts.

##  Features
- **Real-Time Data Ingestion:** Connects to Binance WebSockets to track live spot pairs.
- **Data Persistence:** Reliable storage using PostgreSQL and Google Cloud SQL.
- **REST API:** FastAPI-powered endpoints for symbol resolution and history retrieval.
- **Interactive Charts:** Beautiful, highly responsive frontend charting using vanilla JavaScript and TradingView Lightweight Charts.

##  Technologies Used
- **Backend:** Python 3.x, FastAPI, SQLAlchemy, websockets, psycopg
- **Database:** PostgreSQL / Google Cloud SQL
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Lightweight Charts
- **Server / Deployment:** Uvicorn, NGINX

##  Project Structure
```text
binance-price-tracker/
├── requirements.txt      # Python dependencies
├── symbols.txt           # Configured crypto pairs
├── src/                  # Backend application source
│   ├── api.py            # FastAPI endpoints
│   ├── main.py           # Data ingestion daemon entry point
│   ├── application/      # Core business logic and ingestion services
│   ├── domain/           # Domain models
│   └── infrastructure/   # DB, external API integrations, WebSockets
├── static/               # Frontend assets
│   ├── index.html        # Main dashboard
│   ├── css/              # Stylesheets
│   └── js/               # Frontend scripts, UI, and chart managers
└── tests/                # Unit and integration tests
```

##  Prerequisites
- **Python 3.8+**
- **PostgreSQL** (Running locally or via Docker)
- **Node.js / npm** (Optional, if any frontend bundling tools are introduced later)

##  Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/crypto-tracker.git
   cd crypto-tracker/binance-price-tracker
   ```

2. **Set up a Virtual Environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install Backend Dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install fastapi uvicorn  # If not implicitly available
   ```

4. **Install Frontend Dependencies & Build CSS:**
   The frontend utilizes Tailwind CSS and local npm packages (DOMPurify, Lightweight Charts). To build them:
   ```bash
   cd static
   npm install
   npx @tailwindcss/cli -i ./src/input.css -o ./css/output.css --minify
   cd ..
   ```

5. **Environment Variables:**
   Create a `.env` file in the `binance-price-tracker` directory based on your local DB setup. (See `.env.example` if available).
   ```env
   SINK=postgres
   DB_TARGET=local
   DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/crypto_db
   ```

6. **Run the Application:**
   Start the FastAPI server:
   ```bash
   uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
   ```
   Start the background data ingestion daemon:
   ```bash
   python -m src.main
   ```

7. **View the Dashboard:**
   Open your browser and navigate to `http://localhost:8000`.

##  Production Deployment (NGINX)

To host this application on a Virtual Machine (VM) running Linux (e.g., Ubuntu/Debian), we recommend running the Python backend as a `systemd` service and using NGINX as a reverse proxy and static file server.

### 1. Configure the Backend Service
Use `gunicorn` with `uvicorn` workers to serve the API securely:
```bash
pip install gunicorn
gunicorn -k uvicorn.workers.UvicornWorker src.api:app --bind 127.0.0.1:8000
```
*(You should wrap this in a `/etc/systemd/system/crypto-api.service` file for persistent uptime).*

### 2. Configure NGINX
Install NGINX:
```bash
sudo apt update
sudo apt install nginx
```

Create a new configuration file for the app:
```bash
sudo nano /etc/nginx/sites-available/crypto-tracker
```

### Sample NGINX Configuration
```nginx
# Security: Enforce Rate Limiting to prevent scraping and DDoS
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Note: If gzip is already enabled globally in /etc/nginx/nginx.conf, 
# you can remove these 3 gzip lines below to prevent "duplicate directive" errors.
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve static assets directly
    location /static/ {
        alias /path/to/your/crypto-tracker/binance-price-tracker/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        
        # Security headers (Content-Security-Policy)
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443;" always;
    }

    # Serve SPA index.html for root and unknown routes
    location / {
        root /path/to/your/crypto-tracker/binance-price-tracker/static;
        try_files $uri $uri/ /index.html;
        
        # Apply Rate Limiting
        limit_req zone=api_limit burst=20 nodelay;
    }

    # Proxy API requests to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Handle WebSocket connections securely
    location /ws {
        proxy_pass http://127.0.0.1:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable and Restart NGINX
```bash
sudo ln -s /etc/nginx/sites-available/crypto-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

##  Security Notes
- Never commit `.env` files or API keys. The `.gitignore` has been updated to prevent this.
- If using Google Cloud SQL, securely inject the credentials via IAM roles or environment variable referencing rather than hardcoding.
