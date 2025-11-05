# Upload METCON files to Digital Ocean Droplet
# Run this from the project root directory

$DROPLET_IP = "142.93.224.115"
$DROPLET_USER = "root"

Write-Host "🚀 Uploading METCON files to droplet..." -ForegroundColor Green
Write-Host "Droplet: $DROPLET_USER@$DROPLET_IP" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ Error: backend/ or frontend/ directories not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory:" -ForegroundColor Yellow
    Write-Host "   cd C:\Users\chris\Documents\FantoFlame\MetCon" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Found backend/ and frontend/ directories" -ForegroundColor Green
Write-Host ""

# Create directory on droplet first
Write-Host "📁 Creating directory on droplet..." -ForegroundColor Yellow
ssh "${DROPLET_USER}@${DROPLET_IP}" "mkdir -p ~/metcon-workflow-app"

# Upload backend
Write-Host "📤 Uploading backend directory..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor Gray
scp -r backend "${DROPLET_USER}@${DROPLET_IP}:~/metcon-workflow-app/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend uploaded" -ForegroundColor Green
} else {
    Write-Host "❌ Backend upload failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Upload frontend
Write-Host "📤 Uploading frontend directory..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor Gray
scp -r frontend "${DROPLET_USER}@${DROPLET_IP}:~/metcon-workflow-app/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend uploaded" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend upload failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Upload docker-compose.prod.yml
Write-Host "📤 Uploading docker-compose.prod.yml..." -ForegroundColor Yellow
scp docker-compose.prod.yml "${DROPLET_USER}@${DROPLET_IP}:~/metcon-workflow-app/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ docker-compose.prod.yml uploaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  docker-compose.prod.yml upload failed (will create on server)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Upload Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps on your droplet:" -ForegroundColor Cyan
Write-Host "   1. SSH to droplet: ssh root@$DROPLET_IP" -ForegroundColor White
Write-Host "   2. cd ~/metcon-workflow-app" -ForegroundColor White
Write-Host "   3. Create .env file: nano .env" -ForegroundColor White
Write-Host '   4. Build and start: docker compose -f docker-compose.prod.yml up -d --build' -ForegroundColor White
Write-Host ""

