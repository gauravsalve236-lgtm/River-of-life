# Safe Push Script for River of Life
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ($scriptDir) { Set-Location $scriptDir }

$possibleGitPaths = @(
    "C:\Users\Gaurav.Salve\MinGit\cmd\git.exe",
    (Join-Path $scriptDir "..\mingit\cmd\git.exe"),
    (Join-Path $scriptDir "..\..\MinGit\cmd\git.exe")
)
$gitPath = $null
foreach ($p in $possibleGitPaths) {
    if (Test-Path $p) { $gitPath = $p; break }
}
if (-not $gitPath) {
    $found = (Get-Command git.exe -ErrorAction SilentlyContinue)
    if ($found) { $gitPath = $found.Source }
}
if (-not $gitPath) {
    Write-Error "Could not find portable Git executable."
    Exit 1
}

$gitBinDir = Split-Path (Split-Path $gitPath -Parent) -Parent
$mingwBin = Join-Path $gitBinDir "mingw64\bin"
if (Test-Path $mingwBin) {
    $env:PATH = (Split-Path $gitPath -Parent) + ";" + $mingwBin + ";" + $env:PATH
} else {
    $env:PATH = (Split-Path $gitPath -Parent) + ";" + $env:PATH
}

Write-Host "--- Pushing commits to GitHub (main & develop) ---" -ForegroundColor Cyan
Write-Host "If an authentication window opens, please complete sign-in to authorize." -ForegroundColor Yellow
& $gitPath push origin main develop
Write-Host "--- Push Completed! ---" -ForegroundColor Green
