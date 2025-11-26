# Setting Up SSH Keys for Automated Deployment

This will allow the assistant to run commands on your droplet without needing a password each time.

## Option 1: Generate SSH Key on Your Local Machine (Recommended)

### Step 1: Generate SSH Key (if you don't have one)
```powershell
# In PowerShell on your local machine
ssh-keygen -t ed25519 -C "metcon-deployment"
# Press Enter to accept default location
# Press Enter twice for no passphrase (or set one if you prefer)
```

### Step 2: Copy Public Key to Droplet
```powershell
# This will prompt for password one last time, then copy your key
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@142.93.224.115 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Step 3: Test Connection (should work without password)
```powershell
ssh root@142.93.224.115 "echo 'SSH key working!'"
```

## Option 2: Use Existing SSH Key

If you already have an SSH key:

```powershell
# Copy your existing public key
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@142.93.224.115 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## Option 3: Manual Setup

1. Generate key: `ssh-keygen -t ed25519`
2. Copy public key content: `type $env:USERPROFILE\.ssh\id_ed25519.pub`
3. SSH into droplet: `ssh root@142.93.224.115`
4. Run: `mkdir -p ~/.ssh && nano ~/.ssh/authorized_keys`
5. Paste your public key, save and exit
6. Set permissions: `chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh`

## After Setup

Once SSH keys are set up, the assistant can run commands like:
```powershell
ssh root@142.93.224.115 "cd ~/metcon-workflow-app && git pull origin main"
```

Without needing a password!

