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
From the `binance-price-tracker` directory, build the image using the provided multi-stage Dockerfile:
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
On your target server, pull the image and run it in detached mode. The container internally runs NGINX on port 8080. You can map it to port 80 (HTTP) on your host VM:
```bash
docker run -d -p 80:8080 --name crypto-app your-registry/crypto-tracker:latest
```

Once running, you can access the application directly via your VM's public IP or domain name at `http://your-vm-ip`.

### 4. Monitoring and Logs
The container runs both the FastAPI backend and NGINX reverse proxy managed by `supervisord`. To check the consolidated logs:
```bash
docker logs -f crypto-app
```
