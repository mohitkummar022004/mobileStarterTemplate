#!/bin/sh

# This script runs database migrations and starts the production server
set -e

cd /app/project

echo "Running database migrations..."
pnpm db:push

echo "Running db seed..."
node dist/prisma/seed.js


echo "Starting production server..."
exec node dist/index.js