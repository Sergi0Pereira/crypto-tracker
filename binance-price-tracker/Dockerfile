# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/static

# Install dependencies and build CSS
COPY static/package*.json ./
RUN npm ci

COPY static/ ./
RUN npx @tailwindcss/cli -i ./src/input.css -o ./css/output.css --minify

# Stage 2: Production environment (Python + NGINX + Supervisord)
FROM python:3.13-slim
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install NGINX and Supervisor
RUN apt-get update && apt-get install -y nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and setup permissions
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /var/lib/nginx \
    && chown -R appuser:appuser /var/log/nginx

# Copy Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY src/ ./src/
COPY symbols.txt ./

# Copy built frontend assets from the builder stage
COPY --from=frontend-builder /app/static /app/static

# Configure NGINX and Supervisor
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set non-root user
USER appuser

# Expose port 8080 (NGINX reverse proxy)
EXPOSE 8080

# Start supervisord to manage both NGINX and Uvicorn
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
