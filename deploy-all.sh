#!/bin/bash

# METCON - Complete Droplet Deployment Script
# Run this ON your Digital Ocean droplet after connecting via SSH
# Copy and paste this entire script into your droplet terminal

set -e  # Exit on error

DROPLET_IP="142.93.224.115"
PROJECT_DIR="metcon-workflow-app"

echo "🚀 METCON Complete Deployment Script"
echo "====================================="
echo "Droplet IP: $DROPLET_IP"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or use sudo"
    exit 1
fi

# Step 1: Update system
echo "📦 Step 1/10: Updating system packages..."
apt update -qq
apt upgrade -y -qq
echo "✅ System updated"

# Step 2: Install essential tools
echo ""
echo "📦 Step 2/10: Installing essential tools..."
apt install -y git curl wget nano ufw openssl > /dev/null 2>&1
echo "✅ Tools installed"

# Step 3: Install Docker
echo ""
echo "🐳 Step 3/10: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Step 4: Install Docker Compose
echo ""
echo "🐳 Step 4/10: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    apt install docker-compose-plugin -y > /dev/null 2>&1
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Step 5: Clone or update repository
echo ""
echo "📥 Step 5/10: Setting up repository..."
cd ~
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  Directory exists, updating..."
    cd $PROJECT_DIR
    git pull origin main > /dev/null 2>&1 || echo "⚠️  Git pull had issues, continuing..."
else
    git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git $PROJECT_DIR
    cd $PROJECT_DIR
fi
echo "✅ Repository ready"

# Step 6: Generate JWT Secret
echo ""
echo "🔐 Step 6/10: Generating JWT secret..."
JWT_SECRET=$(openssl rand -hex 64)
echo "Generated JWT Secret: $JWT_SECRET"
echo ""

# Step 7: Create .env file if it doesn't exist
echo "⚙️  Step 7/10: Setting up environment variables..."
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=3000

# MongoDB Atlas - REPLACE WITH YOUR ACTUAL CONNECTION STRING
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metcon?retryWrites=true&w=majority

# JWT Secret (auto-generated)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Frontend API URL
VITE_API_URL=http://$DROPLET_IP:3000
EOF
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: You MUST edit .env file and add your MongoDB Atlas connection string!"
    echo "   Run: nano .env"
    echo "   Replace MONGODB_URI with your actual MongoDB Atlas connection string"
    echo ""
    read -p "Press Enter after you've updated the .env file with your MongoDB URI, or Ctrl+C to exit..."
else
    echo "✅ .env file already exists"
    echo "⚠️  Make sure it contains your MongoDB Atlas connection string!"
fi

# Step 8: Build Docker images
echo ""
echo "🔨 Step 8/10: Building Docker images..."
echo "This may take 3-5 minutes..."
docker compose -f docker-compose.prod.yml build
echo "✅ Docker images built"

# Step 9: Start services
echo ""
echo "🚀 Step 9/10: Starting services..."
docker compose -f docker-compose.prod.yml up -d
echo "✅ Services started"
echo ""
echo "⏳ Waiting for services to initialize (30 seconds)..."
sleep 30

# Step 10: Check status
echo ""
echo "📊 Step 10/10: Checking service status..."
docker compose -f docker-compose.prod.yml ps

# Check if services are running
BACKEND_RUNNING=$(docker compose -f docker-compose.prod.yml ps | grep backend | grep -c "Up" || echo "0")
FRONTEND_RUNNING=$(docker compose -f docker-compose.prod.yml ps | grep frontend | grep -c "Up" || echo "0")

echo ""
if [ "$BACKEND_RUNNING" -gt 0 ] && [ "$FRONTEND_RUNNING" -gt 0 ]; then
    echo "✅ Both services are running!"
else
    echo "⚠️  Some services may not be running. Check logs:"
    echo "   docker compose -f docker-compose.prod.yml logs"
fi

# Optional: Seed database
echo ""
read -p "🌱 Seed database with initial data? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    docker compose -f docker-compose.prod.yml exec -T backend npm run seed || echo "⚠️  Seed script may have issues, check logs"
    echo "✅ Database seeding attempted"
else
    echo "⏭️  Skipping database seed. Run later with:"
    echo "   docker compose -f docker-compose.prod.yml exec backend npm run seed"
fi

# Summary
echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Access your app:"
echo "   Frontend: http://$DROPLET_IP"
echo "   Backend:  http://$DROPLET_IP:3000"
echo ""
echo "🔐 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   ⚠️  CHANGE THIS IMMEDIATELY!"
echo ""
echo "📝 Useful commands:"
echo "   View logs:     docker compose -f docker-compose.prod.yml logs -f"
echo "   Restart:       docker compose -f docker-compose.prod.yml restart"
echo "   Stop:          docker compose -f docker-compose.prod.yml down"
echo "   Update code:   cd ~/$PROJECT_DIR && git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "📚 Full guide: See DROPLET_DEPLOYMENT.md"
echo ""

