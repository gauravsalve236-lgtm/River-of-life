# Get the directory of this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ($scriptDir) { Set-Location $scriptDir }

$gitPath = Join-Path $scriptDir "..\mingit\cmd\git.exe"
if (-not (Test-Path $gitPath)) {
    Write-Error "Could not find portable Git executable at $gitPath"
    Exit
}

Write-Host "--- Git Initialization ---" -ForegroundColor Cyan
& $gitPath init

Write-Host "--- Adding Remote Origin ---" -ForegroundColor Cyan
& $gitPath remote remove origin 2>$null
& $gitPath remote add origin https://github.com/gauravsalve236-lgtm/River-of-life.git

Write-Host "--- Staging Files ---" -ForegroundColor Cyan
& $gitPath add -A

Write-Host "--- Committing Changes ---" -ForegroundColor Cyan
# Configure standard user details for the commit if not already configured
& $gitPath config user.name "Gaurav Salve"
& $gitPath config user.email "gauravsalve236@gmail.com"
& $gitPath commit -m "Improve Auth accessibility with header/home shortcuts, pre-seeded admin, and professional prayer form"

Write-Host "--- Setting Main Branch ---" -ForegroundColor Cyan
& $gitPath branch -M main

Write-Host ""
Write-Host "--- Pushing Files to GitHub ---" -ForegroundColor Yellow
Write-Host "A GitHub sign-in window may pop up on your screen. Please complete the sign-in to authorize." -ForegroundColor Green
& $gitPath push -u origin main --force

Write-Host ""
Write-Host "--- Upload Process Completed! ---" -ForegroundColor Green
