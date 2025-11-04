# 🚀 Deploy Now - Step by Step

## Step 1: Connect to Your Droplet

**Open PowerShell or Git Bash** and run:

```powershell
ssh root@142.93.224.115
```

**If this is your first time connecting:**
- You'll see a security warning - type `yes` and press Enter
- Enter the root password (check your Digital Ocean email, or use SSH key if configured)

**You should see:** `root@your-droplet-name:~#`

---

## Step 2: Copy the Deployment Script

**Option A: Download the script directly on the droplet:**

```bash
# Once connected to droplet, run:
curl -o deploy-all.sh https://raw.githubusercontent.com/ChrisMareeFS/metcon-workflow-app/main/deploy-all.sh
chmod +x deploy-all.sh
./deploy-all.sh
```

**Option B: Copy-paste the script manually:**

1. Open the file `deploy-all.sh` in your local project
2. Copy the entire contents
3. Paste into your droplet terminal
4. Press Enter

---

## Step 3: Script Will Guide You

The script will:
- ✅ Update system packages
- ✅ Install Docker and Docker Compose
- ✅ Clone your repository
- ✅ Generate JWT secret automatically
- ✅ Create .env file template
- ⚠️ **Pause** for you to add your MongoDB Atlas connection string
- ✅ Build Docker images
- ✅ Start services
- ✅ Show you the status

---

## Step 4: Add MongoDB Connection String

When the script pauses, you'll need to:

1. **Edit the .env file:**
   ```bash
   nano .env
   ```

2. **Find this line:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metcon?retryWrites=true&w=majority
   ```

3. **Replace with your actual MongoDB Atlas connection string:**
   - Go to MongoDB Atlas
   - Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Make sure it ends with `/metcon?retryWrites=true&w=majority`

4. **Save:** `Ctrl+X`, then `Y`, then `Enter`

5. **Continue the script** (press Enter when prompted)

---

## Step 5: Wait for Completion

The script will:
- Build Docker images (3-5 minutes)
- Start services
- Show you the status

**You'll see:**
```
✅ DEPLOYMENT COMPLETE!
🌐 Access your app: http://142.93.224.115
```

---

## Step 6: Test Your App

1. **Open browser:** `http://142.93.224.115`
2. **You should see:** Login page
3. **Login:**
   - Username: `admin`
   - Password: `admin123`

---

## 🆘 Troubleshooting

### Can't connect via SSH:
- Use Digital Ocean web console: Dashboard → Droplet → Access → Launch Droplet Console
- Or check your SSH key/password

### Script fails at MongoDB step:
- Make sure MongoDB Atlas IP whitelist includes: `142.93.224.115`
- Verify connection string is correct

### Services won't start:
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Rebuild
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

---

## ✅ Done!

Your app is live at: `http://142.93.224.115`

**Next steps:**
1. Change default admin password
2. Set up SSL (if you have a domain)
3. Configure backups
4. Test all features

---

**Ready? Start with Step 1 above!** 🚀

