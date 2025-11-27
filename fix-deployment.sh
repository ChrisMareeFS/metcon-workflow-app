#!/bin/bash
# METCON Quick Fix Script
# Automatically fixes common deployment issues

set -e

echo "🔧 METCON Quick Fix Script"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Navigate to project directory
if [ -f "docker-compose.prod.yml" ]; then
    echo -e "${GREEN}✅ Found project directory${NC}"
elif [ -d "metcon-workflow-app" ]; then
    cd metcon-workflow-app
    echo -e "${GREEN}✅ Navigated to project directory${NC}"
elif [ -d "~/metcon-workflow-app" ]; then
    cd ~/metcon-workflow-app
    echo -e "${GREEN}✅ Navigated to project directory${NC}"
else
    echo -e "${YELLOW}⚠️  Project directory not found. Please run this from the project root.${NC}"
    exit 1
fi

# Step 1: Ensure .env file exists
echo ""
echo "1️⃣  Checking .env file..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    DROPLET_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "YOUR_DROPLET_IP")
    JWT_SECRET=$(openssl rand -hex 64)
    
    cat > .env << EOF
NODE_ENV=production
PORT=3000

# MongoDB Atlas - REPLACE WITH YOUR ACTUAL CONNECTION STRING
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metcon?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Frontend API URL
VITE_API_URL=http://$DROPLET_IP:3000
EOF
    
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and add your MongoDB Atlas connection string!${NC}"
    echo "   Run: nano .env"
    read -p "Press Enter after updating .env file..."
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Step 2: Stop existing containers
echo ""
echo "2️⃣  Stopping existing containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
echo -e "${GREEN}✅ Containers stopped${NC}"

# Step 3: Clean up old images (optional)
read -p "Rebuild from scratch? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "3️⃣  Removing old images..."
    docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true
    docker system prune -f
    echo -e "${GREEN}✅ Cleanup complete${NC}"
fi

# Step 4: Build images
echo ""
echo "4️⃣  Building Docker images..."
echo "This may take 5-10 minutes..."
docker compose -f docker-compose.prod.yml build
echo -e "${GREEN}✅ Images built${NC}"

# Step 5: Start services
echo ""
echo "5️⃣  Starting services..."
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✅ Services started${NC}"

# Step 6: Wait for services
echo ""
echo "6️⃣  Waiting for services to initialize (30 seconds)..."
sleep 30

# Step 7: Check status
echo ""
echo "7️⃣  Checking service status..."
docker compose -f docker-compose.prod.yml ps

# Step 8: Health checks
echo ""
echo "8️⃣  Running health checks..."

# Backend health
echo -n "Backend: "
BACKEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:3000/health 2>/dev/null || echo "FAILED")
if echo "$BACKEND_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Not responding (may still be starting)${NC}"
    echo "   Check logs: docker compose -f docker-compose.prod.yml logs backend"
fi

# Frontend health
echo -n "Frontend: "
FRONTEND_HEALTH=$(curl -s http://localhost:80 2>/dev/null | head -n 1 || echo "FAILED")
if [ "$FRONTEND_HEALTH" != "FAILED" ]; then
    echo -e "${GREEN}✅ Responding${NC}"
else
    echo -e "${YELLOW}⚠️  Not responding (may still be starting)${NC}"
    echo "   Check logs: docker compose -f docker-compose.prod.yml logs frontend"
fi

# Step 9: Show logs
echo ""
echo "9️⃣  Recent logs (last 5 lines each):"
echo ""
echo "Backend:"
docker compose -f docker-compose.prod.yml logs --tail=5 backend 2>/dev/null || echo "   Could not retrieve logs"
echo ""
echo "Frontend:"
docker compose -f docker-compose.prod.yml logs --tail=5 frontend 2>/dev/null || echo "   Could not retrieve logs"

# Summary
echo ""
echo "=========================================="
echo "✅ Fix script complete!"
echo "=========================================="
echo ""
DROPLET_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "YOUR_DROPLET_IP")
echo "🌐 Access your app:"
echo "   http://$DROPLET_IP"
echo ""
echo "📝 View all logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🔄 If services aren't healthy, wait 1-2 minutes and check again."
echo "   Or run: ./diagnose-deployment.sh"
echo ""


