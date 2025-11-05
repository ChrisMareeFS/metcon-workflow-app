#!/bin/bash
# Quick fix for Docker Compose installation

echo "🔧 Fixing Docker Compose installation..."

# Try installing as plugin first
if apt install -y docker-compose-plugin 2>/dev/null; then
    echo "✅ Docker Compose installed as plugin"
    docker compose version
else
    echo "⚠️  Plugin not available, installing standalone binary..."
    
    # Install standalone Docker Compose
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Verify
    if docker-compose --version; then
        echo "✅ Docker Compose installed successfully"
    else
        echo "❌ Installation failed"
        exit 1
    fi
fi

echo ""
echo "✅ Docker Compose is ready!"
echo "You can now continue with:"
echo "  cd ~/metcon-workflow-app"
echo "  docker-compose -f docker-compose.prod.yml up -d --build"
echo "Or use: docker compose (newer syntax)"

