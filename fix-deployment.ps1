$DROPLET_IP = '142.93.224.115'

Write-Host ' Connecting to droplet and fixing nginx configuration...' -ForegroundColor Green

ssh root@$DROPLET_IP @'
cd ~/metcon-workflow-app

echo " Updating nginx configuration..."
cat > frontend/nginx.conf << '\''NGINXEOF'\''
server {
    listen 80;
    server_name _;

    # Serve frontend files
    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend routing - return index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF

echo " Rebuilding frontend with new nginx config..."
docker-compose -f docker-compose.prod.yml build frontend

echo "  Restarting services..."
docker-compose -f docker-compose.prod.yml restart

echo " Waiting for services to start..."
sleep 5

echo " Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo " Done! Your app should be accessible at http://142.93.224.115"
echo " Try logging in with: admin / admin123"
'@
