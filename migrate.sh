#!/bin/sh
# This script runs inside a temporary container to apply migrations

echo "Installing Prisma CLI..."
npm install -g prisma@6.19.0

echo "Applying database migrations..."
cd /app
prisma db push --accept-data-loss

echo "Migration completed!"
