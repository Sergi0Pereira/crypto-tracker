#!/bin/bash
set -e

export DOMAIN_NAME="${DOMAIN_NAME:-localhost}"
echo "Configuring NGINX for domain: $DOMAIN_NAME"

# envsubst requires variables to be explicitly listed to avoid clashing with other NGINX variables like $host
envsubst '${DOMAIN_NAME}' < ./nginx.conf.template > /etc/nginx/nginx.conf

echo "Starting Uvicorn backend..."
uvicorn src.api:app --host 127.0.0.1 --port 8000 --proxy-headers &
UVICORN_PID=$!

echo "Starting NGINX..."
nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n $UVICORN_PID $NGINX_PID
exit $?
