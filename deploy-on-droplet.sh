#!/bin/bash
# METCON Deployment Script - Run this ON your droplet
# Copy and paste this entire script into your droplet terminal

set -e

DROPLET_IP="142.93.224.115"
PROJECT_DIR="metcon-workflow-app"

echo "🚀 METCON Deployment Script"
echo "=========================="
echo ""

# Step 1: Update system
echo "📦 Step 1: Updating system..."
apt update -qq
apt upgrade -y -qq
echo "✅ System updated"

# Step 2: Install Docker
echo ""
echo "🐳 Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Step 3: Install Docker Compose
echo ""
echo "🐳 Step 3: Installing Docker Compose..."
apt install -y docker-compose-plugin > /dev/null 2>&1
echo "✅ Docker Compose installed"

# Step 4: Install other tools
echo ""
echo "📦 Step 4: Installing tools..."
apt install -y git curl wget nano openssl > /dev/null 2>&1
echo "✅ Tools installed"

# Step 5: Clone repository
echo ""
echo "📥 Step 5: Cloning repository..."
cd ~
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  Directory exists, removing..."
    rm -rf $PROJECT_DIR
fi

# Try cloning - if it fails, we'll create manually
echo "Attempting to clone repository..."
if git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git $PROJECT_DIR 2>/dev/null; then
    echo "✅ Repository cloned"
    cd $PROJECT_DIR
else
    echo "⚠️  Git clone failed (authentication issue)"
    echo ""
    echo "Creating project directory manually..."
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    
    echo "Downloading essential files..."
    # Download docker-compose.prod.yml
    curl -fsSL https://raw.githubusercontent.com/ChrisMareeFS/metcon-workflow-app/main/docker-compose.prod.yml -o docker-compose.prod.yml || {
        echo "⚠️  Could not download docker-compose.prod.yml"
        echo "Creating minimal version..."
        cat > docker-compose.prod.yml << 'EOF'
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=24h
    env_file:
      - .env
    restart: unless-stopped
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=${VITE_API_URL}
    depends_on:
      - backend
    restart: unless-stopped
EOF
    }
    
    echo "⚠️  You'll need to manually copy backend/ and frontend/ directories"
    echo "Or make the repository public temporarily"
    echo ""
    read -p "Press Enter to continue with manual setup, or Ctrl+C to exit..."
fi

# Step 6: Generate JWT Secret
echo ""
echo "🔐 Step 6: Generating JWT secret..."
JWT_SECRET=$(openssl rand -hex 64)
echo "✅ JWT Secret generated"

# Step 7: Create .env file
echo ""
echo "⚙️  Step 7: Creating .env file..."
if [ ! -f .env ]; then
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
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your MongoDB Atlas connection string!"
    echo "   Run: nano .env"
    read -p "Press Enter after you've updated .env with your MongoDB URI..."
else
    echo "✅ .env file already exists"
fi

# Check if backend and frontend directories exist
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo ""
    echo "⚠️  Backend or frontend directories not found!"
    echo ""
    echo "You have two options:"
    echo "1. Make repository public temporarily, then run:"
    echo "   cd ~ && rm -rf $PROJECT_DIR && git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git && cd $PROJECT_DIR"
    echo ""
    echo "2. Upload files manually via SCP from your local machine:"
    echo "   scp -r backend root@$DROPLET_IP:~/metcon-workflow-app/"
    echo "   scp -r frontend root@$DROPLET_IP:~/metcon-workflow-app/"
    echo ""
    read -p "Press Enter when ready to continue..."
fi

# Step 8: Build Docker images
echo ""
echo "🔨 Step 8: Building Docker images..."
echo "This may take 5-10 minutes..."
docker compose -f docker-compose.prod.yml build
echo "✅ Docker images built"

# Step 9: Start services
echo ""
echo "🚀 Step 9: Starting services..."
docker compose -f docker-compose.prod.yml up -d
echo "✅ Services started"

# Step 10: Wait and check status
echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

# Step 11: Seed database
echo ""
read -p "🌱 Seed database? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    docker compose -f docker-compose.prod.yml exec -T backend npm run seed || echo "⚠️  Seed may have issues"
    echo "✅ Database seeding attempted"
fi

# Summary
echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Access your app:"
echo "   http://$DROPLET_IP"
echo ""
echo "🔐 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   ⚠️  CHANGE THIS IMMEDIATELY!"
echo ""
echo "📝 View logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""

