# 🚀 Quick Deploy - Your Droplet

**Droplet IP:** `142.93.224.115`

---

## Step 1: Connect to Droplet

Open PowerShell or Git Bash and run:

```powershell
ssh root@142.93.224.115
```

**If prompted for password:** Check your Digital Ocean email for the root password.

**If using SSH key:** It should connect automatically.

---

## Step 2: Quick Setup (Copy & Paste)

Once connected to your droplet, run these commands one by one:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && rm get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Clone repository
cd ~
git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git
cd metcon-workflow-app
```

---

## Step 3: Set Up Environment Variables

```bash
# Create .env file
nano .env
```

**Paste this template** (replace with your actual values):

```env
NODE_ENV=production
PORT=3000

# MongoDB Atlas connection string (replace with your actual connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metcon?retryWrites=true&w=majority

# Generate JWT secret (run this on droplet first: openssl rand -hex 64)
JWT_SECRET=your-generated-secret-here-64-characters-long
JWT_EXPIRES_IN=24h

# Frontend API URL
VITE_API_URL=http://142.93.224.115:3000
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

## Step 4: Generate JWT Secret

On your droplet, run:

```bash
openssl rand -hex 64
```

**Copy the output** and paste it into your `.env` file as `JWT_SECRET`.

---

## Step 5: Build and Start

```bash
# Build Docker images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

**Wait 1-2 minutes** for services to start.

---

## Step 6: Seed Database

```bash
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

---

## Step 7: Test

1. **Open in browser:** `http://142.93.224.115`
2. **You should see:** Login page
3. **Login with:**
   - Username: `admin`
   - Password: `admin123`

**⚠️ IMPORTANT:** Change the default password immediately!

---

## 🔥 Quick Commands Reference

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Update code
cd ~/metcon-workflow-app
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 🆘 Troubleshooting

### Can't connect via SSH:
- Check Digital Ocean dashboard → Droplet → Access → Console
- Use web console to connect

### Services won't start:
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Rebuild
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### MongoDB connection fails:
- Verify MongoDB Atlas IP whitelist includes: `142.93.224.115`
- Check connection string in `.env` file

---

## 📚 Full Guide

For detailed instructions, see: `DROPLET_DEPLOYMENT.md`

---

**Your app will be live at:** `http://142.93.224.115` 🎉

