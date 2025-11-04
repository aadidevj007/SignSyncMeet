# Update hosts file for www.signsyncmeet.localhost.com
# Requires Administrator privileges

param(
    [switch]$Remove
)

$hostsFile = "C:\Windows\System32\drivers\etc\hosts"
$entries = @(
    "# SignSync Meet",
    "127.0.0.1`twww.signsyncmeet.localhost.com",
    "127.0.0.1`tsignsyncmeet.localhost.com"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "`nPlease run PowerShell as Administrator and execute:" -ForegroundColor Yellow
    Write-Host "   .\scripts\update-hosts.ps1" -ForegroundColor White
    Write-Host "`nOr manually add these lines to $hostsFile:" -ForegroundColor Yellow
    $entries | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    exit 1
}

if ($Remove) {
    Write-Host "🗑️  Removing SignSync Meet entries from hosts file..." -ForegroundColor Yellow
    $content = Get-Content $hostsFile
    $filtered = $content | Where-Object { 
        $_ -notmatch "SignSync Meet" -and 
        $_ -notmatch "www.signsyncmeet.localhost.com" -and 
        $_ -notmatch "signsyncmeet.localhost.com"
    }
    $filtered | Set-Content $hostsFile
    Write-Host "✅ Removed SignSync Meet entries" -ForegroundColor Green
} else {
    # Check if entries already exist
    $content = Get-Content $hostsFile
    $alreadyExists = $content | Where-Object { $_ -match "www.signsyncmeet.localhost.com" }
    
    if ($alreadyExists) {
        Write-Host "ℹ️  Hosts file entries already exist" -ForegroundColor Cyan
    } else {
        Write-Host "📝 Adding SignSync Meet entries to hosts file..." -ForegroundColor Yellow
        $entries | Add-Content -Path $hostsFile
        Write-Host "✅ Added hosts file entries" -ForegroundColor Green
    }
    
    # Flush DNS cache
    Write-Host "🔄 Flushing DNS cache..." -ForegroundColor Yellow
    ipconfig /flushdns | Out-Null
    Write-Host "✅ DNS cache flushed" -ForegroundColor Green
    
    Write-Host "`n✅ Hosts file updated successfully!" -ForegroundColor Green
    Write-Host "   You can now access: https://www.signsyncmeet.localhost.com:3000" -ForegroundColor Cyan
}

