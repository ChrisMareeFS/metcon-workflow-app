#!/bin/bash

# METCON Quick Deploy Script
# This script helps prepare your app for deployment

set -e

echo "🚀 METCON Deployment Preparation"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ docker-compose is installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "📝 Creating .env from env.production.example..."
    cp env.production.example .env
    echo ""
    echo "✏️  Please edit .env file with your actual credentials:"
    echo "   - MONGODB_URI (MongoDB Atlas connection string)"
    echo "   - JWT_SECRET (run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
    echo "   - VITE_API_URL (your backend URL)"
    echo ""
    read -p "Press Enter after you've updated .env file..."
fi

echo "✅ .env file exists"
echo ""

# Validate essential environment variables
if ! grep -q "MONGODB_URI=" .env || grep -q "mongodb+srv://username:password" .env; then
    echo "⚠️  MONGODB_URI not configured properly in .env"
    echo "   Please update it with your MongoDB Atlas connection string"
    exit 1
fi

if ! grep -q "JWT_SECRET=" .env || grep -q "your-super-secret" .env; then
    echo "⚠️  JWT_SECRET not configured properly in .env"
    echo "   Run this to generate a secure secret:"
    echo "   node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "✅ Docker images built successfully!"
echo ""

# Ask to start services
read -p "🚀 Start services now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎬 Starting services..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "🌐 Access your app:"
    echo "   Frontend: http://localhost"
    echo "   Backend:  http://localhost:3000"
    echo ""
    echo "📝 View logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🔧 Seed database (if needed):"
    echo "   docker-compose exec backend npm run seed"
    echo ""
else
    echo ""
    echo "✅ Build complete! Start services later with:"
    echo "   docker-compose up -d"
    echo ""
fi

echo "📚 For full deployment guide, see: DEPLOYMENT.md"

