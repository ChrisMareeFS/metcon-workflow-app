# 🚨 Quick Fix: App Not Loading on Digital Ocean

Follow these steps to diagnose and fix the issue.

---

## 🎯 Step 1: Connect to Your Droplet

```bash
ssh root@142.93.224.115
```

(Replace with your actual droplet IP if different)

---

## 🔍 Step 2: Run Diagnostic

Once connected to your droplet:

```bash
# Navigate to project directory
cd ~/metcon-workflow-app

# If directory doesn't exist, clone it
git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git
cd metcon-workflow-app

# Make diagnostic script executable
chmod +x diagnose-deployment.sh

# Run diagnostic
./diagnose-deployment.sh
```

This will show you exactly what's wrong.

---

## 🔧 Step 3: Quick Fix

If you want to try a quick fix:

```bash
# Make fix script executable
chmod +x fix-deployment.sh

# Run fix script
./fix-deployment.sh
```

This will:
- ✅ Check/create .env file
- ✅ Stop and restart containers
- ✅ Rebuild if needed
- ✅ Run health checks

---

## 📋 Most Common Issues

### Issue: Containers Not Running

```bash
# Check status
docker compose -f docker-compose.prod.yml ps

# If not running, start them
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### Issue: Missing .env File

```bash
# Create .env file
nano .env
```

Add this (replace with your actual values):

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metcon?retryWrites=true&w=majority
JWT_SECRET=$(openssl rand -hex 64)
JWT_EXPIRES_IN=24h
VITE_API_URL=http://142.93.224.115:3000
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Issue: MongoDB Connection Failed

1. **Check MongoDB Atlas:**
   - Go to MongoDB Atlas dashboard
   - Network Access → Add IP Address
   - Add your droplet IP: `142.93.224.115`
   - Or temporarily: `0.0.0.0/0` (allows all IPs)

2. **Verify connection string in .env:**
   ```bash
   cat .env | grep MONGODB_URI
   ```

### Issue: Ports Not Accessible

```bash
# Check if ports are listening
netstat -tuln | grep -E "80|3000"

# Check Digital Ocean firewall (in dashboard)
# Settings → Networking → Firewalls
# Ensure HTTP (80) and port 3000 are allowed
```

### Issue: Build Errors

```bash
# Rebuild from scratch
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

---

## ✅ Verify It's Working

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Test backend
curl http://localhost:3000/health

# Test frontend
curl http://localhost:80

# Check from browser
# Open: http://142.93.224.115
```

---

## 📝 View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Backend only
docker compose -f docker-compose.prod.yml logs -f backend

# Frontend only
docker compose -f docker-compose.prod.yml logs -f frontend
```

---

## 🆘 Still Not Working?

1. **Check Digital Ocean Dashboard:**
   - Is droplet running?
   - Are firewalls configured?
   - Any alerts or errors?

2. **Check MongoDB Atlas:**
   - Is cluster running?
   - Is IP whitelisted?
   - Is connection string correct?

3. **Collect Information:**
   ```bash
   # Run diagnostic
   ./diagnose-deployment.sh > diagnostic.txt
   
   # Get logs
   docker compose -f docker-compose.prod.yml logs > logs.txt
   ```

4. **Common Fixes:**
   - Restart: `docker compose -f docker-compose.prod.yml restart`
   - Rebuild: `docker compose -f docker-compose.prod.yml build --no-cache`
   - Check .env: `cat .env`

---

## 📚 More Help

- **Detailed Troubleshooting:** See `TROUBLESHOOTING_DEPLOYMENT.md`
- **Full Deployment Guide:** See `DROPLET_DEPLOYMENT.md`

---

**Your app should be accessible at:** `http://142.93.224.115`

**Default login:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change the default password immediately!**

