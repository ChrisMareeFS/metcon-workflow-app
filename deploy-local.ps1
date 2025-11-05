# METCON - Local Deployment Preparation Script
# Run this on your local Windows machine to prepare for deployment

Write-Host "🚀 METCON - Local Deployment Preparation" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$DROPLET_IP = "142.93.224.115"

# Check if SSH is available
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check for SSH
$sshAvailable = $false
try {
    $sshVersion = ssh -V 2>&1
    if ($LASTEXITCODE -eq 0 -or $sshVersion -match "OpenSSH") {
        $sshAvailable = $true
        Write-Host "✅ SSH is available" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  SSH not found in PATH" -ForegroundColor Yellow
    Write-Host "   SSH should be available in Windows 10/11 by default" -ForegroundColor Gray
    Write-Host "   If not, install OpenSSH from: Settings > Apps > Optional Features" -ForegroundColor Gray
}

Write-Host ""

# Generate JWT Secret
Write-Host "🔐 Step 2: Generating JWT Secret..." -ForegroundColor Yellow
try {
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    # Better: use crypto
    Add-Type -AssemblyName System.Security
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $jwtSecret = [Convert]::ToHexString($bytes)
    Write-Host "✅ JWT Secret generated: $jwtSecret" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  Could not generate JWT secret, will generate on server" -ForegroundColor Yellow
    $jwtSecret = "WILL_BE_GENERATED_ON_SERVER"
}

# Create .env template
Write-Host "📝 Step 3: Creating .env template..." -ForegroundColor Yellow
$envTemplate = @"
NODE_ENV=production
PORT=3000

# MongoDB Atlas - REPLACE WITH YOUR ACTUAL CONNECTION STRING
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metcon?retryWrites=true`&w=majority

# JWT Secret
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=24h

# Frontend API URL
VITE_API_URL=http://$DROPLET_IP:3000
"@

$envTemplate | Out-File -FilePath env.droplet.template -Encoding utf8
Write-Host "✅ Created env.droplet.template" -ForegroundColor Green
Write-Host ""

# Check MongoDB Atlas setup
Write-Host "📋 Step 4: MongoDB Atlas Checklist..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Before deploying, make sure you have:" -ForegroundColor Cyan
Write-Host "  1. MongoDB Atlas cluster created" -ForegroundColor White
Write-Host "  2. Database user created (username + password)" -ForegroundColor White
Write-Host "  3. IP whitelist includes: $DROPLET_IP" -ForegroundColor White
Write-Host "  4. Connection string copied" -ForegroundColor White
Write-Host ""
$mongoReady = Read-Host "Do you have your MongoDB Atlas connection string ready? (y/n)"
if ($mongoReady -ne "y" -and $mongoReady -ne "Y") {
    Write-Host ""
    Write-Host "⚠️  Please set up MongoDB Atlas first:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://www.mongodb.com/cloud/atlas" -ForegroundColor Cyan
    Write-Host "  2. Create free cluster" -ForegroundColor Cyan
    Write-Host "  3. Create database user" -ForegroundColor Cyan
    Write-Host "  4. Whitelist IP: $DROPLET_IP" -ForegroundColor Cyan
    Write-Host "  5. Get connection string" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter when ready, or Ctrl+C to exit"
}

# Generate deployment commands
Write-Host ""
Write-Host "📋 Step 5: Deployment Commands" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow
Write-Host ""

$commands = @"
# Commands to run on your droplet (copy and paste these):

# 1. Connect to droplet
ssh root@$DROPLET_IP

# 2. Once connected, run deployment script:
curl -fsSL https://raw.githubusercontent.com/ChrisMareeFS/metcon-workflow-app/main/deploy-all.sh | bash

# 3. When script pauses, edit .env file:
nano .env
# (Replace MONGODB_URI with your actual connection string)
# Save: Ctrl+X, Y, Enter

# 4. Continue script (press Enter when prompted)
"@

Write-Host $commands -ForegroundColor Cyan
Write-Host ""

# Save commands to file
$commands | Out-File -FilePath deploy-commands.txt -Encoding utf8
Write-Host "✅ Commands saved to: deploy-commands.txt" -ForegroundColor Green
Write-Host ""

# Test SSH connection
Write-Host "🔌 Step 6: Testing SSH connection..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Attempting to connect to droplet..." -ForegroundColor Gray
Write-Host "You may be prompted for password or to accept fingerprint" -ForegroundColor Gray
Write-Host ""

$testConnection = Read-Host "Test SSH connection now? (y/n)"
if ($testConnection -eq "y" -or $testConnection -eq "Y") {
    Write-Host "Connecting to $DROPLET_IP..." -ForegroundColor Cyan
    Write-Host "If connection succeeds, you'll see the droplet prompt." -ForegroundColor Gray
    Write-Host "Type 'exit' to return here." -ForegroundColor Gray
    Write-Host ""
    ssh root@$DROPLET_IP "echo 'Connection successful!'"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SSH connection successful!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Connection test had issues. You can still try manually:" -ForegroundColor Yellow
        Write-Host "   ssh root@$DROPLET_IP" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Preparation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Files created:" -ForegroundColor Cyan
Write-Host "   - env.droplet.template (your .env template)" -ForegroundColor White
Write-Host "   - deploy-commands.txt (copy-paste commands)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open deploy-commands.txt" -ForegroundColor White
Write-Host "   2. Copy the commands" -ForegroundColor White
Write-Host "   3. Connect to droplet: ssh root@$DROPLET_IP" -ForegroundColor White
Write-Host "   4. Run the deployment script" -ForegroundColor White
Write-Host ""
Write-Host "📚 Full guide: See DEPLOY_NOW.md" -ForegroundColor Gray
Write-Host ""

