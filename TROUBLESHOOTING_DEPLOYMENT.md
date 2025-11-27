# 🔧 METCON Deployment Troubleshooting Guide

Quick reference for fixing common deployment issues on Digital Ocean.

---

## 🚨 Quick Diagnostic

Run this on your droplet to diagnose issues:

```bash
# Make script executable
chmod +x diagnose-deployment.sh

# Run diagnostic
./diagnose-deployment.sh
```

Or manually check:

```bash
# Check if containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

---

## 🔴 Common Issues & Solutions

### Issue 1: "App not loading" / Blank page / Connection refused

**Symptoms:**
- Browser shows "This site can't be reached"
- Blank white page
- Connection timeout

**Diagnosis:**
```bash
# Check if containers are running
docker compose -f docker-compose.prod.yml ps

# Check if ports are listening
netstat -tuln | grep -E "80|3000"

# Test backend directly
curl http://localhost:3000/health

# Test frontend directly
curl http://localhost:80
```

**Solutions:**

1. **Containers not running:**
   ```bash
   # Start containers
   docker compose -f docker-compose.prod.yml up -d
   
   # Wait 30 seconds, then check
   docker compose -f docker-compose.prod.yml ps
   ```

2. **Ports not accessible from outside:**
   ```bash
   # Check Digital Ocean firewall (in dashboard)
   # Settings → Networking → Firewalls
   # Ensure ports 80 and 3000 are open
   
   # Or check local firewall
   ufw status
   ufw allow 80
   ufw allow 3000
   ```

3. **Containers crashing:**
   ```bash
   # Check logs for errors
   docker compose -f docker-compose.prod.yml logs backend
   docker compose -f docker-compose.prod.yml logs frontend
   
   # Common causes:
   # - Missing .env file
   # - Invalid MongoDB URI
   # - Build errors
   ```

---

### Issue 2: Backend not starting

**Symptoms:**
- Backend container exits immediately
- Logs show connection errors
- Health check fails

**Diagnosis:**
```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Common errors:
# - "MongoServerError: Authentication failed"
# - "Error: connect ECONNREFUSED"
# - "Missing environment variable"
```

**Solutions:**

1. **MongoDB Connection Failed:**
   ```bash
   # Verify .env file has correct MongoDB URI
   cat .env | grep MONGODB_URI
   
   # Test MongoDB connection from droplet
   # (Install MongoDB client if needed)
   # mongosh "your-connection-string"
   
   # Check MongoDB Atlas:
   # - IP whitelist includes droplet IP
   # - Database user has correct permissions
   # - Connection string is correct
   ```

2. **Missing Environment Variables:**
   ```bash
   # Check .env file exists and has all required vars
   cat .env
   
   # Required variables:
   # - NODE_ENV=production
   # - PORT=3000
   # - MONGODB_URI=...
   # - JWT_SECRET=...
   # - JWT_EXPIRES_IN=24h
   ```

3. **Port Already in Use:**
   ```bash
   # Find what's using port 3000
   netstat -tuln | grep 3000
   lsof -i :3000
   
   # Kill process if needed
   kill -9 <PID>
   
   # Or change port in docker-compose.prod.yml
   ```

4. **Build Errors:**
   ```bash
   # Rebuild from scratch
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml build --no-cache
   docker compose -f docker-compose.prod.yml up -d
   ```

---

### Issue 3: Frontend not loading / Blank page

**Symptoms:**
- Frontend container running but page is blank
- Browser console shows errors
- API calls failing

**Diagnosis:**
```bash
# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend

# Check if nginx is serving files
curl http://localhost:80

# Check browser console (F12) for errors
```

**Solutions:**

1. **Build Failed:**
   ```bash
   # Rebuild frontend
   docker compose -f docker-compose.prod.yml build --no-cache frontend
   docker compose -f docker-compose.prod.yml up -d frontend
   ```

2. **VITE_API_URL Not Set:**
   ```bash
   # Check .env file
   cat .env | grep VITE_API_URL
   
   # Should be: VITE_API_URL=http://YOUR_DROPLET_IP:3000
   # Or: VITE_API_URL=http://localhost:3000 (if using nginx proxy)
   
   # Rebuild frontend after changing
   docker compose -f docker-compose.prod.yml build frontend
   docker compose -f docker-compose.prod.yml up -d frontend
   ```

3. **CORS Errors:**
   ```bash
   # Check backend CORS configuration
   # In backend/src/server.ts, ensure:
   # origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
   
   # For production, set CORS_ORIGIN in .env:
   # CORS_ORIGIN=http://YOUR_DROPLET_IP
   ```

4. **Nginx Configuration Issues:**
   ```bash
   # Check nginx config inside container
   docker compose -f docker-compose.prod.yml exec frontend cat /etc/nginx/conf.d/default.conf
   
   # Restart frontend
   docker compose -f docker-compose.prod.yml restart frontend
   ```

---

### Issue 4: "502 Bad Gateway" or "504 Gateway Timeout"

**Symptoms:**
- Nginx error page
- Backend not responding

**Solutions:**

1. **Backend Not Running:**
   ```bash
   # Check backend status
   docker compose -f docker-compose.prod.yml ps backend
   
   # Restart backend
   docker compose -f docker-compose.prod.yml restart backend
   
   # Check logs
   docker compose -f docker-compose.prod.yml logs backend
   ```

2. **Backend Taking Too Long:**
   ```bash
   # Check backend health
   docker compose -f docker-compose.prod.yml exec backend curl http://localhost:3000/health
   
   # If slow, check MongoDB connection
   # Increase timeout in nginx if needed
   ```

---

### Issue 5: Database Connection Errors

**Symptoms:**
- "MongoServerError: Authentication failed"
- "MongoNetworkError: connect ECONNREFUSED"
- "MongoTimeoutError"

**Solutions:**

1. **Check MongoDB Atlas Settings:**
   - ✅ IP whitelist includes droplet IP (or 0.0.0.0/0 for testing)
   - ✅ Database user exists and has correct password
   - ✅ Connection string is correct format

2. **Test Connection:**
   ```bash
   # From droplet, test MongoDB connection
   # (Install mongosh if needed)
   apt install mongodb-database-tools -y
   
   # Test connection string
   mongosh "your-connection-string"
   ```

3. **Verify .env File:**
   ```bash
   # Check MongoDB URI format
   cat .env | grep MONGODB_URI
   
   # Should be:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metcon?retryWrites=true&w=majority
   
   # Ensure password is URL-encoded if it contains special characters
   ```

---

### Issue 6: Containers Keep Restarting

**Symptoms:**
- Containers show "Restarting" status
- Logs show repeated errors

**Diagnosis:**
```bash
# Check restart count
docker compose -f docker-compose.prod.yml ps

# Check logs for crash loop
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```

**Solutions:**

1. **Check Exit Code:**
   ```bash
   # See why container exited
   docker compose -f docker-compose.prod.yml ps -a
   docker inspect <container-id> | grep -A 10 "State"
   ```

2. **Common Causes:**
   - Missing environment variables
   - Database connection failing
   - Port conflicts
   - Build errors

3. **Fix:**
   ```bash
   # Stop containers
   docker compose -f docker-compose.prod.yml down
   
   # Fix the issue (check logs)
   # Then rebuild and restart
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## 🔄 Complete Reset (Nuclear Option)

If nothing works, start fresh:

```bash
# Stop and remove everything
docker compose -f docker-compose.prod.yml down -v

# Remove images (optional)
docker rmi $(docker images | grep metcon | awk '{print $3}')

# Verify .env file is correct
nano .env

# Rebuild everything
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 📊 Health Check Commands

```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# Backend health
curl http://localhost:3000/health

# Frontend
curl http://localhost:80

# All logs
docker compose -f docker-compose.prod.yml logs -f

# Resource usage
docker stats

# Disk space
df -h
```

---

## 🌐 External Access Issues

If app works locally but not from browser:

1. **Check Digital Ocean Firewall:**
   - Dashboard → Networking → Firewalls
   - Ensure HTTP (80) and custom port 3000 are allowed
   - Or allow all traffic from your IP

2. **Check Droplet Firewall:**
   ```bash
   ufw status
   ufw allow 80
   ufw allow 3000
   ```

3. **Test from Droplet:**
   ```bash
   # Get droplet IP
   curl ifconfig.me
   
   # Test from droplet itself
   curl http://localhost:3000/health
   curl http://localhost:80
   ```

4. **Test from Your Machine:**
   ```bash
   # Replace with your droplet IP
   curl http://YOUR_DROPLET_IP:3000/health
   curl http://YOUR_DROPLET_IP:80
   ```

---

## 📞 Getting Help

If you're still stuck:

1. **Collect Information:**
   ```bash
   # Run diagnostic
   ./diagnose-deployment.sh > diagnostic-output.txt
   
   # Get logs
   docker compose -f docker-compose.prod.yml logs > all-logs.txt
   
   # Get container status
   docker compose -f docker-compose.prod.yml ps > container-status.txt
   ```

2. **Check:**
   - Digital Ocean dashboard for droplet status
   - MongoDB Atlas dashboard for connection issues
   - Browser console (F12) for frontend errors

3. **Common Fixes:**
   - Restart containers: `docker compose -f docker-compose.prod.yml restart`
   - Rebuild: `docker compose -f docker-compose.prod.yml build --no-cache`
   - Check .env file: `cat .env`
   - Verify MongoDB Atlas IP whitelist

---

## ✅ Success Checklist

Your deployment is working when:

- ✅ `docker compose -f docker-compose.prod.yml ps` shows both containers as "Up"
- ✅ `curl http://localhost:3000/health` returns `{"status":"ok",...}`
- ✅ `curl http://localhost:80` returns HTML
- ✅ Browser can access `http://YOUR_DROPLET_IP`
- ✅ Login page loads
- ✅ Can log in with admin/admin123
- ✅ No errors in browser console (F12)

---

*Last updated: 2025-01-08*


