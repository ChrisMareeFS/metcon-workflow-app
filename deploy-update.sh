#!/bin/bash
# Quick deployment update script
# Run this on your droplet after connecting via SSH

set -e

echo "🚀 Updating METCON deployment..."
echo ""

# Navigate to project
cd ~/metcon-workflow-app

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Update .env if needed
if ! grep -q "VITE_API_URL=/api" .env 2>/dev/null; then
    echo ""
    echo "⚙️  Updating .env file..."
    if grep -q "VITE_API_URL=" .env; then
        sed -i 's|VITE_API_URL=.*|VITE_API_URL=/api|' .env
    else
        echo "VITE_API_URL=/api" >> .env
    fi
    echo "✅ Updated VITE_API_URL to /api"
fi

# Rebuild frontend (nginx config changed)
echo ""
echo "🔨 Rebuilding frontend..."
docker compose -f docker-compose.prod.yml build frontend

# Start services
echo ""
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait a moment
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "📊 Service status:"
docker compose -f docker-compose.prod.yml ps

# Test endpoints
echo ""
echo "🧪 Testing endpoints..."
echo -n "Frontend: "
if curl -s http://localhost:80 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ Failed"
fi

echo -n "API (via proxy): "
if curl -s http://localhost:80/api/health | grep -q "ok"; then
    echo "✅ OK"
else
    echo "❌ Failed"
fi

echo ""
echo "=========================================="
echo "✅ Deployment update complete!"
echo "=========================================="
echo ""
echo "🌐 Your app is accessible at:"
DROPLET_IP=$(curl -s ifconfig.me || echo "142.93.224.115")
echo "   http://$DROPLET_IP"
echo ""
echo "📝 View logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""


