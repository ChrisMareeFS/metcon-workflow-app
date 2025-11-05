# METCON - Push to GitHub Script
# This script helps you push your code to GitHub

Write-Host "🚀 METCON - Push to GitHub" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green
Write-Host ""

# Add Git to PATH
$env:Path += ";C:\Program Files\Git\bin"

# Check if git is available
try {
    $gitVersion = git --version
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not found. Please install Git first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 We need some information:" -ForegroundColor Yellow
Write-Host ""

# Get GitHub username
$githubUsername = Read-Host "Enter your GitHub username"

# Get repository name
Write-Host ""
Write-Host "Repository name (e.g., 'metcon-workflow-app'):" -ForegroundColor Cyan
$repoName = Read-Host "Enter repository name"

# Check if repository exists
$repoUrl = "https://github.com/$githubUsername/$repoName.git"
Write-Host ""
Write-Host "Checking if repository exists..." -ForegroundColor Yellow

try {
    git ls-remote $repoUrl *>$null
    Write-Host "✅ Repository found: $repoUrl" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "⚠️  Repository not found or not accessible." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create the repository first:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/new" -ForegroundColor White
    Write-Host "2. Repository name: $repoName" -ForegroundColor White
    Write-Host "3. Make it Private (recommended)" -ForegroundColor White
    Write-Host "4. DO NOT initialize with README" -ForegroundColor White
    Write-Host "5. Click 'Create repository'" -ForegroundColor White
    Write-Host ""
    $createRepo = Read-Host "Press Enter after creating the repository, or 'q' to quit"
    if ($createRepo -eq 'q') { exit }
}

# Check if remote already exists
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host ""
    Write-Host "⚠️  Remote 'origin' already exists: $remoteExists" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/n)"
    if ($overwrite -eq 'y') {
        git remote remove origin
        Write-Host "✅ Removed old remote" -ForegroundColor Green
    } else {
        Write-Host "❌ Cancelled. Remote not changed." -ForegroundColor Red
        exit 1
    }
}

# Add remote
Write-Host ""
Write-Host "🔗 Adding GitHub remote..." -ForegroundColor Yellow
git remote add origin $repoUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote added: $repoUrl" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to add remote" -ForegroundColor Red
    exit 1
}

# Verify current branch
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host ""
    Write-Host "🔄 Renaming branch to 'main'..." -ForegroundColor Yellow
    git branch -M main
}

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "⚠️  You'll be prompted for credentials:" -ForegroundColor Yellow
Write-Host "   - Username: $githubUsername" -ForegroundColor Cyan
Write-Host "   - Password: Use a Personal Access Token (NOT your password)" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Get token here: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "   → Generate new token (classic)" -ForegroundColor Cyan
Write-Host "   → Check 'repo' scope" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter when ready to push"

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 View your repository:" -ForegroundColor Cyan
    Write-Host "   https://github.com/$githubUsername/$repoName" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Next step: Deploy to Digital Ocean App Platform" -ForegroundColor Yellow
    Write-Host "   See DEPLOYMENT.md for instructions" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Common issues:" -ForegroundColor Red
    Write-Host "   - Wrong username or repository name" -ForegroundColor Yellow
    Write-Host "   - Invalid or expired Personal Access Token" -ForegroundColor Yellow
    Write-Host "   - Repository doesn't exist (create it first)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Tip: Use GitHub Desktop or VS Code Git extension for easier authentication" -ForegroundColor Cyan
}

