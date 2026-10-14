# Safe Push Script for River of Life
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ($scriptDir) { Set-Location $scriptDir }

$gitPath = Join-Path $scriptDir "..\mingit\cmd\git.exe"
if (-not (Test-Path $gitPath)) {
    Write-Error "Could not find portable Git executable at $gitPath"
    Exit
}

$env:PATH = (Join-Path $scriptDir "..\mingit\cmd") + ";" + (Join-Path $scriptDir "..\mingit\mingw64\bin") + ";" + $env:PATH

Write-Host "--- Pushing commits to GitHub (main & develop) ---" -ForegroundColor Cyan
Write-Host "If an authentication window opens, please complete sign-in to authorize." -ForegroundColor Yellow
& $gitPath push origin main develop
Write-Host "--- Push Completed! ---" -ForegroundColor Green
