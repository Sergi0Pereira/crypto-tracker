# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/static

# Install dependencies and build CSS
COPY static/package*.json ./
RUN npm ci

COPY static/ ./
RUN npx @tailwindcss/cli -i ./src/input.css -o ./css/output.css --minify

# Stage 2: Production environment (Python + NGINX)
FROM python:3.13-slim
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Default Domain fallback (used if none passed at runtime)
ENV DOMAIN_NAME="localhost"

# Install NGINX, envsubst (gettext-base), and clean up
RUN apt-get update && apt-get install -y nginx gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and setup permissions
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /var/lib/nginx \
    && chown -R appuser:appuser /var/log/nginx \
    && chown -R appuser:appuser /etc/nginx/

# Copy Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY src/ ./src/
COPY symbols.txt ./

# Copy built frontend assets from the builder stage
COPY --from=frontend-builder /app/static /app/static

# Copy NGINX template and entrypoint script
COPY nginx.conf.template ./
COPY start.sh ./
RUN chmod +x ./start.sh && chown appuser:appuser ./start.sh

# Set non-root user
USER appuser

# Expose port 8080 (NGINX reverse proxy)
EXPOSE 8080

# Start script manages envsubst, Uvicorn, and NGINX
CMD ["./start.sh"]
