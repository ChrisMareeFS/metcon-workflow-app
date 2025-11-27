# PowerShell script to deploy to droplet
# This will SSH into your droplet and run the deployment

$dropletIP = "142.93.224.115"
$commands = @"
cd ~/metcon-workflow-app
git pull origin main
chmod +x deploy-update.sh
./deploy-update.sh
"@

Write-Host "Connecting to droplet and running deployment..." -ForegroundColor Green
ssh root@$dropletIP $commands


