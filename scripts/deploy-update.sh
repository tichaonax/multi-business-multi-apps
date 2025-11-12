#!/bin/bash

# Deployment script for updating remote sync nodes
# This script pulls the latest code, updates dependencies, and migrates the database

set -e  # Exit on any error

echo "🚀 Starting deployment update..."

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗃️ Running database migrations..."
npx prisma db push

# Build the application
echo "🔨 Building application..."
npm run build

# Restart services (adjust these commands based on your deployment setup)
echo "🔄 Restarting services..."
# Example commands - adjust based on your setup:
# sudo systemctl restart sync-service
# sudo systemctl restart nextjs-app
# Or if using PM2:
# pm2 restart all
# Or if using Docker:
# docker-compose restart

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Verify the sync service is running: check logs for 'InitialLoadManager: Successfully loaded X active sessions'"
echo "2. Test backup transfer functionality between nodes"
echo "3. Monitor for any remaining schema compatibility issues"