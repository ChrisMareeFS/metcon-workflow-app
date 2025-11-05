# 🚀 Push to GitHub - Quick Commands

## Step 1: Create GitHub Repository

1. Go to: **https://github.com/new**
2. Repository name: `metcon-workflow-app` (or your choice)
3. Description: `METCON Workflow Management System`
4. **Private** (recommended)
5. **DO NOT** check "Initialize with README"
6. Click **"Create repository"**

## Step 2: Get Personal Access Token

1. Go to: **https://github.com/settings/tokens**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name: `METCON Deployment`
4. Expiration: `90 days` (or your choice)
5. **Scopes:** Check ✅ **`repo`** (Full control of private repositories)
6. Click **"Generate token"**
7. **COPY THE TOKEN** (you won't see it again!)

## Step 3: Run These Commands

Open PowerShell in your project folder and run:

```powershell
# Add Git to PATH (if needed)
$env:Path += ";C:\Program Files\Git\bin"

# Replace YOUR-USERNAME and YOUR-REPO-NAME with your actual values
$githubUsername = "YOUR-USERNAME"
$repoName = "YOUR-REPO-NAME"

# Add GitHub remote
git remote add origin "https://github.com/$githubUsername/$repoName.git"

# Push to GitHub
git push -u origin main
```

**When prompted:**
- **Username:** Your GitHub username
- **Password:** Paste your Personal Access Token (not your password!)

## ✅ Success!

If successful, you'll see:
```
Enumerating objects: 128, done.
Writing objects: 100% (128/128), done.
To https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
 * [new branch]      main -> main
```

## 🚀 Next: Deploy to Digital Ocean

Once pushed, you can deploy using Digital Ocean App Platform:
1. Go to: https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect your GitHub repository
4. Follow `DEPLOYMENT.md` guide

