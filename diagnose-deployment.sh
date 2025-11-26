#!/bin/bash
# METCON Deployment Diagnostic Script
# Run this on your Digital Ocean droplet to diagnose issues

set -e

echo "🔍 METCON Deployment Diagnostic"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Docker installation
echo "1️⃣  Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker installed: $(docker --version)${NC}"
else
    echo -e "${RED}❌ Docker not installed${NC}"
    exit 1
fi

if command -v docker compose &> /dev/null; then
    echo -e "${GREEN}✅ Docker Compose installed: $(docker compose version)${NC}"
else
    echo -e "${RED}❌ Docker Compose not installed${NC}"
    exit 1
fi
echo ""

# Check 2: Project directory
echo "2️⃣  Checking project directory..."
if [ -d "~/metcon-workflow-app" ] || [ -d "./metcon-workflow-app" ] || [ -f "docker-compose.prod.yml" ]; then
    if [ -f "docker-compose.prod.yml" ]; then
        cd .
    elif [ -d "metcon-workflow-app" ]; then
        cd metcon-workflow-app
    elif [ -d "~/metcon-workflow-app" ]; then
        cd ~/metcon-workflow-app
    fi
    echo -e "${GREEN}✅ Project directory found${NC}"
    echo "   Current directory: $(pwd)"
else
    echo -e "${RED}❌ Project directory not found${NC}"
    echo "   Please navigate to the project directory first"
    exit 1
fi
echo ""

# Check 3: Environment file
echo "3️⃣  Checking .env file..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check for required variables
    if grep -q "MONGODB_URI=" .env && ! grep -q "MONGODB_URI=mongodb+srv://username:password" .env; then
        echo -e "${GREEN}✅ MONGODB_URI is set${NC}"
    else
        echo -e "${YELLOW}⚠️  MONGODB_URI may not be configured correctly${NC}"
    fi
    
    if grep -q "JWT_SECRET=" .env && ! grep -q "JWT_SECRET=your-generated-secret" .env; then
        echo -e "${GREEN}✅ JWT_SECRET is set${NC}"
    else
        echo -e "${YELLOW}⚠️  JWT_SECRET may not be configured correctly${NC}"
    fi
    
    if grep -q "VITE_API_URL=" .env; then
        echo -e "${GREEN}✅ VITE_API_URL is set${NC}"
    else
        echo -e "${YELLOW}⚠️  VITE_API_URL is not set${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Create it with: nano .env"
fi
echo ""

# Check 4: Docker containers
echo "4️⃣  Checking Docker containers..."
if docker compose -f docker-compose.prod.yml ps &> /dev/null; then
    CONTAINERS=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | jq -r '.[].Name' 2>/dev/null || docker compose -f docker-compose.prod.yml ps | grep -E "backend|frontend" | awk '{print $1}')
    
    if [ -z "$CONTAINERS" ]; then
        echo -e "${YELLOW}⚠️  No containers running${NC}"
        echo "   Start with: docker compose -f docker-compose.prod.yml up -d"
    else
        echo -e "${GREEN}✅ Containers found:${NC}"
        docker compose -f docker-compose.prod.yml ps
    fi
else
    echo -e "${YELLOW}⚠️  Could not check containers (they may not be running)${NC}"
fi
echo ""

# Check 5: Container health
echo "5️⃣  Checking container health..."
BACKEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:3000/health 2>/dev/null || echo "FAILED")
if [ "$BACKEND_HEALTH" != "FAILED" ] && echo "$BACKEND_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "   Checking backend logs..."
    docker compose -f docker-compose.prod.yml logs --tail=20 backend 2>/dev/null || echo "   Could not retrieve logs"
fi

FRONTEND_HEALTH=$(curl -s http://localhost:80 2>/dev/null | head -n 1 || echo "FAILED")
if [ "$FRONTEND_HEALTH" != "FAILED" ]; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend not responding${NC}"
    echo "   Checking frontend logs..."
    docker compose -f docker-compose.prod.yml logs --tail=20 frontend 2>/dev/null || echo "   Could not retrieve logs"
fi
echo ""

# Check 6: Port availability
echo "6️⃣  Checking port availability..."
if netstat -tuln 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}✅ Port 3000 is in use (backend should be running)${NC}"
else
    echo -e "${YELLOW}⚠️  Port 3000 is not in use${NC}"
fi

if netstat -tuln 2>/dev/null | grep -q ":80"; then
    echo -e "${GREEN}✅ Port 80 is in use (frontend should be running)${NC}"
else
    echo -e "${YELLOW}⚠️  Port 80 is not in use${NC}"
fi
echo ""

# Check 7: Recent logs
echo "7️⃣  Recent error logs (last 10 lines)..."
echo ""
echo "Backend errors:"
docker compose -f docker-compose.prod.yml logs --tail=10 backend 2>/dev/null | grep -i error || echo "   No errors found or container not running"
echo ""
echo "Frontend errors:"
docker compose -f docker-compose.prod.yml logs --tail=10 frontend 2>/dev/null | grep -i error || echo "   No errors found or container not running"
echo ""

# Check 8: Network connectivity
echo "8️⃣  Checking network connectivity..."
DROPLET_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "UNKNOWN")
echo "   Droplet IP: $DROPLET_IP"

# Check if MongoDB Atlas is reachable (if URI is set)
if [ -f ".env" ] && grep -q "MONGODB_URI=" .env; then
    MONGO_URI=$(grep "MONGODB_URI=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$MONGO_URI" ] && [[ "$MONGO_URI" != "mongodb+srv://username:password"* ]]; then
        echo -e "${GREEN}✅ MongoDB URI configured${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB URI may need configuration${NC}"
    fi
fi
echo ""

# Check 9: Firewall
echo "9️⃣  Checking firewall..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -n 1)
    echo "   $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "inactive"; then
        echo -e "${YELLOW}⚠️  Firewall is inactive (ports should be accessible)${NC}"
    else
        echo -e "${GREEN}✅ Firewall is active${NC}"
        ufw status | grep -E "80|3000" || echo "   Ports 80/3000 may not be explicitly allowed"
    fi
else
    echo -e "${YELLOW}⚠️  UFW not installed (check iptables if needed)${NC}"
fi
echo ""

# Summary and recommendations
echo "=========================================="
echo "📋 SUMMARY & RECOMMENDATIONS"
echo "=========================================="
echo ""

# Generate recommendations
RECOMMENDATIONS=()

if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    RECOMMENDATIONS+=("Start containers: docker compose -f docker-compose.prod.yml up -d")
fi

if [ ! -f ".env" ]; then
    RECOMMENDATIONS+=("Create .env file with required environment variables")
fi

if ! netstat -tuln 2>/dev/null | grep -q ":80"; then
    RECOMMENDATIONS+=("Frontend container may not be running - check logs")
fi

if ! netstat -tuln 2>/dev/null | grep -q ":3000"; then
    RECOMMENDATIONS+=("Backend container may not be running - check logs")
fi

if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Everything looks good!${NC}"
    echo ""
    echo "Your app should be accessible at:"
    echo "   http://$DROPLET_IP"
    echo ""
    echo "If it's still not loading, check:"
    echo "   1. Digital Ocean firewall settings (in dashboard)"
    echo "   2. Browser console for errors"
    echo "   3. Full logs: docker compose -f docker-compose.prod.yml logs -f"
else
    echo -e "${YELLOW}⚠️  Issues found. Recommended actions:${NC}"
    echo ""
    for i in "${!RECOMMENDATIONS[@]}"; do
        echo "   $((i+1)). ${RECOMMENDATIONS[$i]}"
    done
fi

echo ""
echo "=========================================="
echo "For detailed logs, run:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo "=========================================="

