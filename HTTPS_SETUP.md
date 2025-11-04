# HTTPS Setup for Local Development

This guide shows you how to run the website with HTTPS on `https://www.signsyncmeet.localhost.com`

## Prerequisites

Install `mkcert` (creates local SSL certificates):
- **Windows**: `choco install mkcert` or `winget install FiloSottile.mkcert`
- **macOS**: `brew install mkcert`
- **Linux**: Download from [mkcert releases](https://github.com/FiloSottile/mkcert/releases)

## Quick Setup

### Step 1: Generate Certificates

**Windows:**
```powershell
cd apps\frontend
powershell -ExecutionPolicy Bypass -File scripts\setup-https.ps1
```

**Linux/Mac:**
```bash
cd apps/frontend
bash scripts/setup-https.sh
```

**Manual (if scripts don't work):**
```bash
# Install local CA (one-time)
mkcert -install

# Generate certificates
cd apps/frontend
mkdir -p certs
cd certs
mkcert -key-file key.pem -cert-file cert.pem www.signsyncmeet.localhost.com signsyncmeet.localhost.com localhost 127.0.0.1 ::1
```

### Step 2: Update Hosts File

Add these entries to your hosts file:

**Windows** (`C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1    www.signsyncmeet.localhost.com
127.0.0.1    signsyncmeet.localhost.com
```

**Linux/Mac** (`/etc/hosts`):
```
127.0.0.1    www.signsyncmeet.localhost.com
127.0.0.1    signsyncmeet.localhost.com
```

**PowerShell (Windows as Admin):**
```powershell
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n# SignSync Meet`n127.0.0.1`twww.signsyncmeet.localhost.com`n127.0.0.1`tsignsyncmeet.localhost.com"
```

### Step 3: Update Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to: **Authentication** → **Settings** → **Authorized domains**
4. Add:
   - `www.signsyncmeet.localhost.com`
   - `signsyncmeet.localhost.com`

### Step 4: Start the Dev Server

```bash
pnpm dev
```

The frontend will now run on **https://www.signsyncmeet.localhost.com:3000**

## Troubleshooting

**Certificates not found error:**
- Make sure you've run the setup script
- Certificates should be in `apps/frontend/certs/`
- Files needed: `cert.pem` and `key.pem`

**Browser certificate warning:**
- Make sure you ran `mkcert -install` to install the local CA
- Trust the certificate if prompted

**Port already in use:**
- Stop any other servers on port 3000
- Or change the port in `apps/frontend/server.js`

**Hosts file not working:**
- Make sure you saved the hosts file
- Flush DNS: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

## Access URLs

After setup:
- **Main**: https://www.signsyncmeet.localhost.com:3000
- **Alt**: https://localhost:3000 (also works)
- **Backend**: http://localhost:5000 (still HTTP for API)


