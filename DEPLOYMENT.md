# 🚀 METCON Deployment Guide - Digital Ocean

Complete guide to deploy the METCON Workflow App to Digital Ocean.

---

## 📋 Prerequisites

1. **Digital Ocean Account** - [Sign up here](https://www.digitalocean.com/)
2. **MongoDB Atlas Account** - [Sign up here](https://www.mongodb.com/cloud/atlas) (Free tier works)
3. **GitHub Repository** - Push your code to GitHub
4. **Domain Name** (optional) - For custom domain

---

## 🎯 Deployment Options

### Option A: Digital Ocean App Platform (Recommended)
**Best for:** Easy deployment, automatic scaling, managed infrastructure

### Option B: Docker on a Droplet
**Best for:** More control, cost-effective for fixed workloads

---

## 🚢 Option A: App Platform Deployment

### Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free M0 tier works for MVP)
3. **Create Database User:**
   - Database Access → Add New Database User
   - Username: `metcon_user`
   - Password: (generate secure password)
   - Role: `Atlas admin` or `Read and write to any database`
4. **Whitelist IP Addresses:**
   - Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
5. **Get Connection String:**
   - Clusters → Connect → Connect your application
   - Copy connection string (looks like):
     ```
     mongodb+srv://metcon_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Add database name: `mongodb+srv://metcon_user:password@cluster0.xxxxx.mongodb.net/metcon?retryWrites=true&w=majority`

### Step 2: Generate JWT Secret

Run this command to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output - you'll need it for environment variables.

### Step 3: Push Code to GitHub

1. Create a new GitHub repository
2. Push your code:

```bash
git init
git add .
git commit -m "Initial commit - METCON app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

### Step 4: Deploy to Digital Ocean App Platform

#### Method 1: Using the Dashboard

1. Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
2. Click **Create App**
3. **Connect GitHub:**
   - Select your repository
   - Choose branch: `main`
   - Autodeploy: ✅ Enabled
4. **Configure Services:**

   **Backend Service:**
   - Name: `backend`
   - Source Directory: `/backend`
   - Build Command: `npm ci && npm run build`
   - Run Command: `npm start`
   - HTTP Port: `3000`
   - HTTP Routes: `/api`
   - Instance Size: `Basic (512MB RAM / 1 vCPU) - $5/month`

   **Frontend Service:**
   - Name: `frontend`
   - Source Directory: `/frontend`
   - Build Command: `npm ci && npm run build`
   - Run Command: (nginx handles this)
   - HTTP Port: `80`
   - HTTP Routes: `/`
   - Instance Size: `Basic (512MB RAM / 1 vCPU) - $5/month`

5. **Set Environment Variables:**

   **Backend Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=<your-mongodb-atlas-connection-string>
   JWT_SECRET=<your-generated-jwt-secret>
   JWT_EXPIRES_IN=24h
   ```

   **Frontend Environment Variables:**
   ```
   VITE_API_URL=${backend.PUBLIC_URL}
   ```

6. Click **Next** → Review → **Create Resources**

7. **Wait for Deployment** (5-10 minutes)

#### Method 2: Using App Spec YAML

1. Update `.do/app.yaml` with your GitHub repo details
2. Use DigitalOcean CLI:

```bash
# Install doctl
brew install doctl  # macOS
# or
snap install doctl  # Linux

# Authenticate
doctl auth init

# Create app from spec
doctl apps create --spec .do/app.yaml

# Set secrets via CLI
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Step 5: Seed Production Database

Once deployed, seed your production database:

```bash
# SSH into backend container (via DO dashboard terminal)
npm run seed
```

Or run seed script locally pointing to production DB:

```bash
MONGODB_URI="your-production-db-uri" npm run seed
```

### Step 6: Verify Deployment

1. Visit your app URL (e.g., `https://metcon-app-xxxxx.ondigitalocean.app`)
2. Test login with default credentials:
   - Username: `admin`
   - Password: `admin123`
3. Check all features work
4. Monitor logs in Digital Ocean dashboard

---

## 🐳 Option B: Docker on Droplet Deployment

### Step 1: Create Droplet

1. Go to Digital Ocean → Create → Droplet
2. **Choose Image:** Docker on Ubuntu 22.04
3. **Choose Plan:** Basic - $12/month (2GB RAM recommended)
4. **Add SSH Keys** (recommended)
5. **Choose Region:** Closest to your users
6. Create Droplet

### Step 2: Connect to Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 3: Set Up Environment

```bash
# Clone your repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO

# Create .env file
nano .env
```

Add your environment variables:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/metcon
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
VITE_API_URL=http://YOUR_DROPLET_IP
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure-password
```

### Step 4: Build and Run with Docker Compose

```bash
# Build and start services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Seed database
docker-compose exec backend npm run seed
```

### Step 5: Set Up Nginx Reverse Proxy (Optional)

For custom domain and SSL:

```bash
# Install Nginx
apt update
apt install nginx

# Configure Nginx
nano /etc/nginx/sites-available/metcon
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/metcon /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 6: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

---

## 🔧 Post-Deployment Configuration

### 1. Update DNS (if using custom domain)

Point your domain to Digital Ocean:

- **App Platform:** Add custom domain in settings
- **Droplet:** Update A record to droplet IP

### 2. Set Up Backups

**MongoDB Atlas:**
- Automatic backups included in free tier

**Droplet:**
- Enable automatic backups ($2.40/month)
- Or set up manual backup scripts

### 3. Configure Monitoring

**App Platform:**
- Built-in metrics and alerts
- View in Digital Ocean dashboard

**Droplet:**
- Install monitoring agent:
  ```bash
  curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
  ```

### 4. Update Environment Variables

To update environment variables after deployment:

**App Platform:**
- Settings → Environment Variables → Edit → Save → Redeploy

**Droplet:**
- Edit `.env` file
- Restart containers: `docker-compose restart`

---

## 📊 Cost Estimation

### App Platform (Recommended for MVP)
- Backend: $5/month (Basic - 512MB RAM)
- Frontend: $5/month (Basic - 512MB RAM)
- **Total: ~$10/month**

### Droplet + Docker
- Droplet: $12/month (2GB RAM)
- **Total: ~$12/month**

### Additional Costs
- MongoDB Atlas: Free (M0 tier, 512MB storage)
- Custom Domain: $10-15/year (optional)
- Backups: $2.40/month (droplet only)

---

## 🧪 Testing Production

### Health Checks

```bash
# Backend health
curl https://your-app-url.ondigitalocean.app/api/health

# Frontend
curl https://your-app-url.ondigitalocean.app/
```

### Load Testing

```bash
# Install Apache Bench
apt install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 https://your-app-url/api/batches
```

---

## 🔐 Security Checklist

- ✅ Use HTTPS (automatic with App Platform, manual with Droplet)
- ✅ Strong JWT secret (64+ character random string)
- ✅ MongoDB Atlas IP whitelist configured
- ✅ Environment variables as secrets (not committed to Git)
- ✅ Regular security updates
- ✅ Enable 2FA on Digital Ocean account
- ✅ Use strong passwords for MongoDB users
- ✅ Rate limiting enabled (already in code)
- ✅ Helmet.js security headers (already in code)

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
doctl apps logs YOUR_APP_ID backend

# Or in droplet
docker-compose logs backend
```

Common issues:
- Invalid MongoDB URI
- Missing environment variables
- Port already in use

### Frontend shows blank page

- Check VITE_API_URL is correct
- Verify backend is running
- Check browser console for errors

### Database connection fails

- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user has correct permissions

### App is slow

- Scale up instance size
- Add more instances (horizontal scaling)
- Check MongoDB Atlas metrics

---

## 📱 Mobile Testing

Your app is mobile-first. Test on:
- iOS Safari
- Android Chrome
- Tablet views (operators' primary device)

---

## 🚀 Continuous Deployment

With GitHub connected:
1. Push to `main` branch
2. App Platform auto-deploys
3. Zero downtime deployments
4. Automatic rollback on failure

---

## 📞 Support

- **Digital Ocean Docs:** https://docs.digitalocean.com/products/app-platform/
- **MongoDB Atlas Support:** https://www.mongodb.com/cloud/atlas/support
- **Project Issues:** Create GitHub issue in your repo

---

## 🎉 You're Live!

Once deployed, your METCON app will be accessible at:
- **App Platform:** `https://metcon-app-xxxxx.ondigitalocean.app`
- **Custom Domain:** `https://your-domain.com` (if configured)

**Default Login:**
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT:** Change default admin password immediately after first login!

---

*Last updated: 2025-11-04*

