# Crypto Tracker Dashboard

A real-time cryptocurrency price tracking and charting platform. This project operates as a proxy to fetch live trade data from the Binance WebSocket and REST APIs, and serves a high-performance web dashboard using FastAPI and TradingView's Lightweight Charts, with zero local database dependencies.

## Features
- Real-Time Data Streaming: Connects to Binance WebSockets to stream live spot pairs directly to the client.
- Zero Database Dependency: Stateless architecture fetches historical data on-demand without local storage overhead.
- REST API: FastAPI-powered endpoints for symbol resolution and history retrieval.
- Interactive Charts: Responsive frontend charting using vanilla JavaScript and TradingView Lightweight Charts.

## Technologies Used
- Backend: Python 3.x, FastAPI, websockets
- Frontend: HTML5, CSS3, Vanilla JavaScript, Lightweight Charts
- Deployment: Docker, Uvicorn, NGINX

## Project Structure
```text
binance-price-tracker/
├── Dockerfile            # Container configuration
├── requirements.txt      # Python dependencies
├── symbols.txt           # Configured crypto pairs
├── src/                  # Backend application source
│   ├── api.py            # FastAPI endpoints and WebSocket proxy
│   ├── main.py           # Application entry point
│   ├── config.py         # Application configuration
│   └── infrastructure/   # External API integrations
├── static/               # Frontend assets
│   ├── index.html        # Main dashboard
│   ├── css/              # Stylesheets
│   └── js/               # Frontend scripts, UI, and chart managers
└── tests/                # Unit and integration tests
```

## Prerequisites
- Docker and Docker Compose (For production deployment)
- Python 3.10+ (For local development)
- Node.js / npm (Optional, for frontend CSS bundling)

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/crypto-tracker.git
   cd crypto-tracker/binance-price-tracker
   ```

2. Set up a Virtual Environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install Backend Dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install Frontend Dependencies & Build CSS:
   ```bash
   cd static
   npm install
   npx @tailwindcss/cli -i ./src/input.css -o ./css/output.css --minify
   cd ..
   ```

5. Run the Application:
   ```bash
   python -m src.main
   # Or directly via uvicorn:
   # uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
   ```

6. View the Dashboard:
   Open your browser and navigate to `http://localhost:8000`.

## Docker Deployment Guide

This guide provides step-by-step instructions for containerizing and deploying the Crypto Tracker application.

### 1. Build the Docker Image
From the `binance-price-tracker` directory, build the image using the provided Dockerfile:
```bash
docker build -t your-registry/crypto-tracker:latest .
```

### 2. Push to a Private Registry
If you are deploying to a remote VM, push the image to a container registry (e.g., Docker Hub, AWS ECR, or Google Artifact Registry):
```bash
docker login
docker push your-registry/crypto-tracker:latest
```

### 3. Run the Container on your VM
On your target server, pull the image and run it in detached mode. This maps port 8000 on the host to port 8000 on the container:
```bash
docker run -d -p 8000:8000 --name crypto-app your-registry/crypto-tracker:latest
```

### 4. Configure NGINX Reverse Proxy
To securely serve your application and route external traffic to your Docker container, install and configure NGINX on your VM.

Install NGINX:
```bash
sudo apt update && sudo apt install nginx -y
```

Create a new NGINX configuration file:
```bash
sudo nano /etc/nginx/sites-available/crypto-tracker
```

Add the following configuration to proxy traffic to the Docker container running on port 8000:
```nginx
# Rate limiting zone for API protection
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss://stream.binance.com:9443 https://api.binance.com;" always;

    # Forward all standard requests to the Docker container
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
    }

    # Proxy WebSocket connections to backend
    location /ws {
        proxy_pass http://127.0.0.1:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart NGINX:
```bash
sudo ln -s /etc/nginx/sites-available/crypto-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Monitoring and Logs
To check the logs of your running container:
```bash
docker logs -f crypto-app
```

To monitor NGINX errors:
```bash
sudo tail -f /var/log/nginx/error.log
```
