# Migration Script
# Run this script to apply database migrations

Write-Host "Applying database migrations..." -ForegroundColor Yellow

# Stop the container
docker-compose down

# Run migrations using a temporary container
docker run --rm `
  --network db-net `
  --env-file .env `
  -v "${PWD}:/app" `
  -w /app `
  node:22-alpine `
  sh -c "npm install -g prisma && prisma db push --skip-generate"

# Restart the application
docker-compose up -d

Write-Host "Migrations applied successfully!" -ForegroundColor Green
Write-Host "You can now try logging in again." -ForegroundColor Cyan
