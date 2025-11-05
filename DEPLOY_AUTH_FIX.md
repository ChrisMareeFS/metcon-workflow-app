# 🔐 Fix: GitHub Authentication Issue

GitHub no longer accepts password authentication. Here are solutions:

## Option 1: Make Repository Public (Easiest)

If you're okay with making the repo public temporarily:

1. Go to: https://github.com/ChrisMareeFS/metcon-workflow-app/settings
2. Scroll to "Danger Zone"
3. Click "Change visibility" → "Make public"
4. Then on your droplet, run:

```bash
cd ~
git clone https://github.com/ChrisMareeFS/metcon-workflow-app.git
cd metcon-workflow-app
chmod +x deploy-all.sh
./deploy-all.sh
```

You can make it private again after deployment.

---

## Option 2: Use Personal Access Token (Recommended)

1. **Create a token on GitHub:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: `Droplet Deployment`
   - Expiration: `90 days`
   - Scopes: Check ✅ `repo` (Full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **On your droplet, clone with token:**
   ```bash
   cd ~
   git clone https://YOUR_TOKEN@github.com/ChrisMareeFS/metcon-workflow-app.git
   cd metcon-workflow-app
   chmod +x deploy-all.sh
   ./deploy-all.sh
   ```

   Replace `YOUR_TOKEN` with the token you just created.

---

## Option 3: Upload Script Directly (No Git Needed)

Copy the script content directly to your droplet:

**On your LOCAL machine**, run:

```powershell
# Upload the script to your droplet
scp deploy-all.sh root@142.93.224.115:~/deploy-all.sh
```

**Then on your droplet**, run:

```bash
chmod +x ~/deploy-all.sh
~/deploy-all.sh
```

---

## Option 4: Manual Setup (No Script)

If all else fails, follow the manual steps in `DROPLET_DEPLOYMENT.md` - it has step-by-step commands without needing Git.

---

## Quick Recommendation

**Use Option 2 (Personal Access Token)** - it's secure and works with private repos.

Or **Option 3 (SCP upload)** - fastest if you just want to deploy now.

