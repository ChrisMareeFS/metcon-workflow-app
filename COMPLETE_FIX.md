# Complete Fix - Run This on Droplet

## Run These Commands on Your Droplet (copy all at once):

```bash
cd ~/metcon-workflow-app

# 1. Pull latest code
git pull origin main

# 2. Fix .env with correct values
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000

# MongoDB Atlas - URL encoded password
MONGODB_URI=mongodb+srv://ChrisMaree:Rasper270%21@metconflowsapp.duojvmx.mongodb.net/?appName=MetConFlowsapp

# JWT Secret
JWT_SECRET=66feefd44aa81c6ebf98b857f002637295aab8bec81985d8e6304ecdb29a45a3d7e4a209466676d55c1b27f24ecb0111d9fd470643120271a74e5bf00d5ad455

# CORS - Allow droplet IP
CORS_ORIGIN=http://142.93.224.115
ENVEOF

# 3. Update nginx to proxy API requests
cat > frontend/nginx.conf << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF

# 4. Stop all containers
docker-compose -f docker-compose.prod.yml down

# 5. Remove old images to force clean rebuild
docker-compose -f docker-compose.prod.yml rm -f

# 6. Rebuild everything from scratch
docker-compose -f docker-compose.prod.yml build --no-cache

# 7. Start services
docker-compose -f docker-compose.prod.yml up -d

# 8. Wait for services to start
echo "Waiting 10 seconds for services to start..."
sleep 10

# 9. Check status
docker-compose -f docker-compose.prod.yml ps

# 10. Show backend logs
echo "=== Backend Logs ==="
docker-compose -f docker-compose.prod.yml logs backend --tail 20

echo ""
echo "✅ Done! Test login at: http://142.93.224.115"
echo "   Username: admin"
echo "   Password: admin123"
```

## What This Does:

1. **Pulls latest code** with API URL fix (`/api` instead of `localhost:3000`)
2. **Fixes .env** with URL-encoded MongoDB password and correct CORS
3. **Updates nginx** to proxy `/api/*` requests to backend
4. **Clean rebuild** with `--no-cache` to ensure no old code remains
5. **Restarts everything** fresh
6. **Shows status** to confirm it's working

## Expected Output:

```
✅ MongoDB connected successfully
✅ Server running on port 3000
```

**Copy ALL the commands above and paste them into your droplet SSH session!**

