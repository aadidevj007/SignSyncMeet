# Clean Next.js build cache
Write-Host "Cleaning Next.js build cache..."

if (Test-Path ".next") {
    Write-Host "Removing .next directory..."
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host ".next directory removed successfully!"
} else {
    Write-Host ".next directory not found."
}

Write-Host "Done!"

