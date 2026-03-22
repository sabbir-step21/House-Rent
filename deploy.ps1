# HouseRent PWA Deployment Script for PowerShell

# 1. Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# 2. Build the project
Write-Host "Building the project..." -ForegroundColor Cyan
npm run build

# 3. Instructions for hosting
Write-Host "`nBuild Complete!" -ForegroundColor Green
Write-Host "The production-ready files are in the 'dist' folder." -ForegroundColor Yellow
Write-Host "You can now upload the contents of 'dist' to your hosting provider." -ForegroundColor Yellow

# Optional: Preview the build
$choice = Read-Host "`nWould you like to preview the build locally? (y/n)"
if ($choice -eq 'y') {
    npm run preview
}
