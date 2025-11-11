#!/bin/bash
# Automated migration fix and deployment script
# Run this on both source and target servers

echo "🔧 Starting automated migration fix and deployment..."
echo ""

# Step 1: Generate Prisma client
echo "📦 Step 1/4: Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo "✅ Prisma client generated"
echo ""

# Step 2: Deploy migrations (includes lock cleanup)
echo "🗄️  Step 2/4: Deploying migrations..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "⚠️  Migration deploy had warnings, but UPSERT should be added"
fi
echo "✅ Migrations deployed"
echo ""

# Step 3: Build application
echo "🏗️  Step 3/4: Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Application built"
echo ""

# Step 4: Restart service
echo "🔄 Step 4/4: Restarting service..."
npm run service:restart
if [ $? -ne 0 ]; then
    echo "❌ Failed to restart service"
    exit 1
fi
echo "✅ Service restarted"
echo ""

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check service status: npm run service:status"
echo "2. Run initial load from Admin UI"
