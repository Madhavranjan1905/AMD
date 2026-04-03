#!/bin/bash

# Install dependencies
npm install

# Build Docker image
docker build -t doctor-patient-backend:latest .

# Start services with docker-compose
docker compose up --pull always

echo "Application started!"
echo "API available at http://localhost:3000"
echo "Postgres available at localhost:5432"
