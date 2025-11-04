#!/bin/bash

# Quick deployment script for Digital Ocean Droplet
# Run this ON your droplet after connecting via SSH

DROPLET_IP="142.93.224.115"
PROJECT_DIR="metcon-workflow-app"

echo "🚀 METCON Droplet Deployment Script"
echo "=================================="
echo ""
echo "Droplet IP: $DROPLET_IP"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or use sudo"
    exit 1
fi

# Step 1: Update system
echo "📦 Step 1: Updating system..."
apt update && apt upgrade -y

# Step 2: Install essential tools
echo ""
echo "📦 Step 2: Installing essential tools..."
apt install -y git curl wget nano ufw

# Step 3: Install Docker
echo ""
echo "🐳 Step 3: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Step 4: Install Docker Compose
echo ""
echo "🐳 Step 4: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    apt install docker-compose-plugin -y
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Step 5: Clone repository
echo ""
echo "📥 Step 5: Cloning repository..."
cd ~
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  Directory exists, pulling latest changes..."
    cd $PROJECT_DIR
    git pull origin main
else
    git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git $PROJECT_DIR
    cd $PROJECT_DIR
fi

# Step 6: Check for .env file
echo ""
echo "⚙️  Step 6: Checking environment configuration..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Please create .env file with:"
    echo "  nano .env"
    echo ""
    echo "Required variables:"
    echo "  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/metcon"
    echo "  JWT_SECRET=$(openssl rand -hex 64)"
    echo "  VITE_API_URL=http://$DROPLET_IP:3000"
    echo ""
    read -p "Press Enter after creating .env file, or Ctrl+C to exit..."
else
    echo "✅ .env file found"
fi

# Step 7: Build and start services
echo ""
echo "🔨 Step 7: Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo ""
echo "🚀 Step 8: Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Step 8: Wait for services
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Step 9: Check status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

# Step 10: Seed database
echo ""
read -p "🌱 Seed database now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    docker compose -f docker-compose.prod.yml exec backend npm run seed
    echo "✅ Database seeded"
else
    echo "⏭️  Skipping database seed. Run later with:"
    echo "   docker compose -f docker-compose.prod.yml exec backend npm run seed"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your app:"
echo "   Frontend: http://$DROPLET_IP"
echo "   Backend:  http://$DROPLET_IP:3000"
echo ""
echo "📝 View logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🔐 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   ⚠️  Change this immediately!"

