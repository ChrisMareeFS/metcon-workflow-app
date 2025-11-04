# 🔗 GitHub Setup Guide

Quick guide to connect your METCON project to GitHub.

---

## Step 1: Install Git for Windows

1. **Download Git:**
   - Go to: https://git-scm.com/download/win
   - Download the latest version (64-bit)
   - Run the installer

2. **Installation Settings (Recommended):**
   - ✅ Use Visual Studio Code as Git's default editor
   - ✅ Git from the command line and also from 3rd-party software
   - ✅ Use bundled OpenSSH
   - ✅ Checkout Windows-style, commit Unix-style line endings
   - ✅ Use MinTTY (default terminal)
   - ✅ Enable file system caching

3. **Complete installation** and restart your terminal/PowerShell

---

## Step 2: Verify Git Installation

Open a **new** PowerShell window and run:

```powershell
git --version
```

You should see something like: `git version 2.42.0.windows.2`

---

## Step 3: Configure Git (First Time Only)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Step 4: Initialize Repository

In your project folder (`C:\Users\chris\Documents\FantoFlame\MetCon`):

```powershell
# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - METCON Workflow App"
```

---

## Step 5: Create GitHub Repository

1. **Go to GitHub:**
   - Visit: https://github.com/new
   - Or: https://github.com → Click **"+"** → **"New repository"**

2. **Repository Settings:**
   - **Repository name:** `metcon-workflow-app` (or your preferred name)
   - **Description:** `METCON Workflow Management System for Precious Metals Processing`
   - **Visibility:** 
     - ✅ **Private** (recommended for internal use)
     - ⚠️ Public (if you want it open source)
   - ⚠️ **DO NOT** check "Initialize with README" (we already have files)
   - Click **"Create repository"**

3. **Copy the repository URL:**
   - You'll see something like: `https://github.com/YOUR-USERNAME/metcon-workflow-app.git`
   - **Copy this URL**

---

## Step 6: Connect and Push

Back in your PowerShell (in the project folder):

```powershell
# Add GitHub remote (replace with your actual URL)
git remote add origin https://github.com/YOUR-USERNAME/metcon-workflow-app.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**You'll be prompted for GitHub credentials:**
- Username: Your GitHub username
- Password: Use a **Personal Access Token** (not your password)

### Get Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Name:** `METCON Deployment`
4. **Expiration:** 90 days (or your preference)
5. **Scopes:** Check **`repo`** (full control of private repositories)
6. Click **"Generate token"**
7. **Copy the token immediately** (you won't see it again!)
8. Use this token as your password when pushing

---

## Step 7: Verify

1. **Refresh your GitHub repository page**
2. You should see all your files!
3. **Check:** Files like `README.md`, `DEPLOYMENT.md`, `backend/`, `frontend/` should be visible

---

## ✅ Success!

Your code is now on GitHub! You can now:

1. **Deploy to Digital Ocean** (follow `DEPLOYMENT.md`)
2. **Connect Digital Ocean App Platform** to your GitHub repo
3. **Enable automatic deployments** on push to `main`

---

## 🚨 Troubleshooting

### "Git is not recognized"
- **Solution:** Restart PowerShell/terminal after installing Git
- **Or:** Use Git Bash instead of PowerShell

### "Permission denied" when pushing
- **Solution:** Use Personal Access Token, not password
- **Or:** Set up SSH keys (more advanced)

### "Repository not found"
- **Solution:** Check repository name and URL are correct
- **Solution:** Make sure repository exists on GitHub

### "Everything up-to-date" but files missing
- **Solution:** Make sure you ran `git add .` before commit
- **Solution:** Check `.gitignore` isn't excluding your files

---

## 📝 Next Steps After GitHub Setup

1. ✅ **Deploy to Digital Ocean App Platform**
   - Go to: https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Connect your GitHub repository
   - Follow `DEPLOYMENT.md` guide

2. ✅ **Set up MongoDB Atlas** (if not done)
   - See `DEPLOYMENT.md` Step 1

3. ✅ **Configure environment variables**
   - See `DEPLOYMENT.md` Step 2

---

**Need help?** Check the troubleshooting section or see `DEPLOYMENT.md` for full deployment guide.

