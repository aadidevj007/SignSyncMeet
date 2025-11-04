# Setup HTTPS certificates for local development on Windows
# Uses mkcert to create local CA and certificates

Write-Host "🔒 Setting up HTTPS for www.signsyncmeet.localhost.com" -ForegroundColor Cyan

# Check if mkcert is installed
$mkcertPath = Get-Command mkcert -ErrorAction SilentlyContinue
if (-not $mkcertPath) {
    Write-Host "❌ mkcert not found. Please install it first:" -ForegroundColor Red
    Write-Host "   Run: choco install mkcert" -ForegroundColor Yellow
    Write-Host "   Or: winget install FiloSottile.mkcert" -ForegroundColor Yellow
    exit 1
}

# Create certs directory if it doesn't exist
$certsDir = "apps\frontend\certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
}

# Install local CA (one-time setup)
Write-Host "📜 Installing local CA..." -ForegroundColor Yellow
mkcert -install

# Generate certificate for the custom domain
Write-Host "🔐 Generating certificate for www.signsyncmeet.localhost.com..." -ForegroundColor Yellow
Push-Location $certsDir
mkcert -key-file key.pem -cert-file cert.pem www.signsyncmeet.localhost.com signsyncmeet.localhost.com localhost 127.0.0.1 ::1
Pop-Location

Write-Host "✅ Certificate generated at apps\frontend\certs\cert.pem" -ForegroundColor Green
Write-Host "✅ Key generated at apps\frontend\certs\key.pem" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update apps\frontend\package.json dev script to use HTTPS" -ForegroundColor White
Write-Host "2. Add hosts file entry: 127.0.0.1 www.signsyncmeet.localhost.com" -ForegroundColor White
Write-Host "3. Access https://www.signsyncmeet.localhost.com:3000" -ForegroundColor White



