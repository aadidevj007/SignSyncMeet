# Firebase Domain Authorization Setup

## Fix: `auth/unauthorized-domain` Error

When using a custom domain like `www.signsyncmeet.localhost.com`, Firebase Authentication requires the domain to be explicitly authorized.

## Quick Fix Steps

### 1. Add Domain to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to: **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add these domains:
   - `www.signsyncmeet.localhost.com`
   - `signsyncmeet.localhost.com` (without www)
6. Click **Save**

### 2. Update Windows Hosts File (Run as Administrator)

**Option A: PowerShell (as Admin)**
```powershell
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
Add-Content -Path $hostsPath -Value "`n# SignSync Meet`n127.0.0.1`twww.signsyncmeet.localhost.com`n127.0.0.1`tsignsyncmeet.localhost.com" -Force
```

**Option B: Manual Edit**
1. Open Notepad **as Administrator**
2. Open: `C:\Windows\System32\drivers\etc\hosts`
3. Add these lines:
```
127.0.0.1    www.signsyncmeet.localhost.com
127.0.0.1    signsyncmeet.localhost.com
```
4. Save and close

### 3. Access Your Site

After completing steps 1 & 2, access the site at:
- **http://www.signsyncmeet.localhost.com:3000** (custom domain)
- **http://localhost:3000** (fallback, works immediately)

## Notes

- The dev server is now configured to bind to `0.0.0.0`, allowing access via both localhost and custom domain
- Firebase will accept requests from any authorized domain
- If you skip the hosts file update, you can still use `localhost:3000` and Firebase will work (localhost is authorized by default)
- For production, add your actual domain (e.g., `app.signsyncmeet.com`) to Firebase authorized domains

## Troubleshooting

**Error persists?**
- Make sure you saved changes in Firebase Console
- Clear browser cache and cookies
- Try in an incognito/private window
- Verify the domain is exactly as shown in Firebase Console

**Can't edit hosts file?**
- Make sure you're running PowerShell/Notepad as Administrator
- On Windows: Right-click → "Run as administrator"



