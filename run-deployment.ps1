# Deployment script - will prompt for SSH password
$dropletIP = "142.93.224.115"

Write-Host "🚀 METCON Deployment Script" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""
Write-Host "Connecting to droplet: $dropletIP" -ForegroundColor Yellow
Write-Host "You will be prompted for the root password." -ForegroundColor Yellow
Write-Host ""

$deploymentCommands = @"
cd ~/metcon-workflow-app
git pull origin main
chmod +x deploy-update.sh
./deploy-update.sh
"@

# Run commands via SSH using the MetCon SSH key
ssh -i "$env:USERPROFILE\.ssh\id_ed25519_metcon" root@$dropletIP $deploymentCommands

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Your app should be accessible at: http://$dropletIP" -ForegroundColor Cyan


