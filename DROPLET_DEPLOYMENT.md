# 🚀 Digital Ocean Droplet Deployment Guide

Step-by-step guide to deploy METCON to a Digital Ocean Droplet.

---

## 📋 Prerequisites

1. **Digital Ocean Account** - [Sign up](https://www.digitalocean.com/)
2. **MongoDB Atlas Account** - [Sign up](https://www.mongodb.com/cloud/atlas) (Free tier works)
3. **GitHub Repository** - ✅ Already set up: `ChrisMareeFS/metcon-workflow-app`
4. **Domain Name** (optional) - For custom domain with SSL

---

## Step 1: Create Droplet

1. **Go to Digital Ocean Dashboard:**
   - https://cloud.digitalocean.com/droplets/new

2. **Choose Image:**
   - **Ubuntu 22.04 (LTS) x64** (recommended)
   - Or: **Docker on Ubuntu 22.04** (if available)

3. **Choose Plan:**
   - **Basic** plan
   - **Regular Intel with SSD**
   - **$12/month** - 2GB RAM / 1 vCPU (recommended minimum)
   - Or **$6/month** - 1GB RAM / 1 vCPU (for testing)

4. **Choose Datacenter:**
   - Select region closest to your users

5. **Authentication:**
   - **SSH Keys** (recommended) - Add your SSH public key
   - Or **Password** - You'll receive root password via email

6. **Additional Options:**
   - ✅ Enable **Monitoring** (free)
   - ✅ Enable **Backups** ($2.40/month) - Optional but recommended

7. **Finalize:**
   - Choose hostname: `metcon-production` (or your choice)
   - Click **"Create Droplet"**

8. **Wait 30-60 seconds** for droplet to be created
9. **Copy the IP address** (you'll need it)

---

## Step 2: Connect to Droplet

### Windows (PowerShell/CMD):

```powershell
# Replace YOUR_DROPLET_IP with your actual IP
ssh root@YOUR_DROPLET_IP

# If using password, you'll be prompted
# If using SSH key, it should connect automatically
```

### Or use Git Bash / WSL:

```bash
ssh root@YOUR_DROPLET_IP
```

---

## Step 3: Initial Server Setup

Once connected to your droplet, run:

```bash
# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y git curl wget nano

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify Docker installation
docker --version
docker compose version

# Add your user to docker group (optional, for non-root docker)
# usermod -aG docker $USER
```

---

## Step 4: Clone Your Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git

# Navigate to project
cd metcon-workflow-app
```

---

## Step 5: Set Up MongoDB Atlas

1. **Go to MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
2. **Create Cluster** (if not done):
   - Free M0 tier (512MB storage)
   - Choose region closest to your droplet
3. **Create Database User:**
   - Database Access → Add New Database User
   - Username: `metcon_user`
   - Password: (generate secure password, save it!)
   - Role: `Atlas admin`
4. **Whitelist IP:**
   - Network Access → Add IP Address
   - Add your **droplet IP address**
   - Or temporarily: `0.0.0.0/0` (allows all IPs - less secure)
5. **Get Connection String:**
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your actual password
   - Add database name: `?retryWrites=true&w=majority` → `metcon?retryWrites=true&w=majority`
   - Example: `mongodb+srv://metcon_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/metcon?retryWrites=true&w=majority`

---

## Step 6: Generate JWT Secret

On your droplet, run:

```bash
# Generate secure JWT secret
openssl rand -hex 64
```

**Copy the output** - you'll need it for environment variables.

---

## Step 7: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following (replace with your actual values):

```env
NODE_ENV=production
PORT=3000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://metcon_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/metcon?retryWrites=true&w=majority

# JWT Secret (from Step 6)
JWT_SECRET=your-generated-jwt-secret-here-64-characters-long
JWT_EXPIRES_IN=24h

# Frontend API URL (use your droplet IP for now, or domain later)
VITE_API_URL=http://YOUR_DROPLET_IP:3000

# Optional: Only if running MongoDB locally (we're using Atlas, so skip these)
# MONGO_ROOT_USERNAME=admin
# MONGO_ROOT_PASSWORD=secure-password
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

## Step 8: Update Docker Compose for Production

Since we're using MongoDB Atlas (cloud), we don't need the local MongoDB container. Let's create a production docker-compose:

```bash
# Create production docker-compose file
nano docker-compose.prod.yml
```

Add:

```yaml
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
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"]
      interval: 30s
      timeout: 3s
      retries: 3

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
```

Save: `Ctrl+X`, `Y`, `Enter`

---

## Step 9: Build and Start Services

```bash
# Build Docker images
docker compose -f docker-compose.prod.yml build

# Start services in background
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

**Wait 1-2 minutes** for services to start.

---

## Step 10: Seed Database

```bash
# Seed the database
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

This will create:
- Default users (admin, operators)
- Sample flows
- Station templates

---

## Step 11: Verify Deployment

1. **Check Backend:**
   ```bash
   curl http://localhost:3000
   ```
   Should return HTML or JSON response

2. **Check Frontend:**
   ```bash
   curl http://localhost:80
   ```
   Should return HTML

3. **Access from Browser:**
   - Open: `http://YOUR_DROPLET_IP`
   - You should see the login page
   - Default login: `admin` / `admin123`

---

## Step 12: Set Up Nginx Reverse Proxy (Recommended)

This will:
- Route `/api` to backend (port 3000)
- Route `/` to frontend (port 80)
- Enable HTTPS/SSL

```bash
# Install Nginx
apt install nginx -y

# Create Nginx configuration
nano /etc/nginx/sites-available/metcon
```

Add this configuration (replace `YOUR_DROPLET_IP` with your actual IP):

```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save: `Ctrl+X`, `Y`, `Enter`

Enable site:

```bash
# Enable site
ln -s /etc/nginx/sites-available/metcon /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

**Update docker-compose to remove port 80 from frontend** (since Nginx handles it):

```bash
nano docker-compose.prod.yml
```

Change frontend ports from `"80:80"` to `"8080:80"` (internal only)

Update Nginx to proxy to `localhost:8080` instead of `localhost:80`

Or simpler: **Keep as is** - Nginx will proxy to port 80, and frontend container listens on 80.

---

## Step 13: Set Up SSL (Let's Encrypt)

**Only if you have a domain name:**

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal test
certbot renew --dry-run
```

**If you don't have a domain:**
- Access via IP: `http://YOUR_DROPLET_IP`
- For production, consider getting a domain for HTTPS

---

## Step 14: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Check status
ufw status
```

---

## ✅ Deployment Complete!

Your app should now be accessible at:
- **Frontend:** `http://YOUR_DROPLET_IP` (or `https://your-domain.com` if SSL configured)
- **Backend API:** `http://YOUR_DROPLET_IP/api` (or `https://your-domain.com/api`)

### Default Login:
- **Username:** `admin`
- **Password:** `admin123`

**⚠️ IMPORTANT:** Change the default admin password immediately!

---

## 🔄 Updates and Maintenance

### Pull Latest Code:

```bash
cd ~/metcon-workflow-app
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### View Logs:

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Backend only
docker compose -f docker-compose.prod.yml logs -f backend

# Frontend only
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Restart Services:

```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Services:

```bash
docker compose -f docker-compose.prod.yml down
```

---

## 🐛 Troubleshooting

### Services won't start:
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check container status
docker ps -a

# Rebuild from scratch
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Can't connect to MongoDB:
- Verify MongoDB Atlas IP whitelist includes your droplet IP
- Check connection string in `.env` file
- Test connection: `curl https://your-mongodb-cluster.mongodb.net`

### Frontend shows blank page:
- Check browser console for errors
- Verify `VITE_API_URL` in `.env` matches your backend URL
- Check Nginx logs: `tail -f /var/log/nginx/error.log`

### Port already in use:
```bash
# Find what's using the port
netstat -tulpn | grep :3000

# Kill process if needed
kill -9 PID
```

---

## 💰 Cost Breakdown

- **Droplet:** $12/month (2GB RAM) or $6/month (1GB RAM)
- **Backups:** $2.40/month (optional)
- **MongoDB Atlas:** Free (M0 tier)
- **Domain:** $10-15/year (optional)
- **Total:** ~$12-15/month

---

## 📞 Next Steps

1. ✅ **Change default admin password**
2. ✅ **Set up monitoring** (Digital Ocean provides basic monitoring)
3. ✅ **Configure backups** (if enabled)
4. ✅ **Set up domain** (if you have one)
5. ✅ **Test all features** thoroughly

---

**Need help?** Check `DEPLOYMENT.md` for more detailed troubleshooting or create an issue in your GitHub repo.

