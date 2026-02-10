# crypto-tracker

To Run postgres locally

docker run --rm -d \
  --name pg-crypto \
  -e POSTGRES_DB=crypto \
  -e POSTGRES_USER=crypto \
  -e POSTGRES_PASSWORD=crypto \
  -p 5432:5432 \
  postgres:16
