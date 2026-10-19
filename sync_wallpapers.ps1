# sync_wallpapers.ps1
# Automatically scans assets/daily_verses/, generates manifest.json & wallpaper_catalog.json, and synchronizes docs/

$repoDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$srcDir = Join-Path $repoDir "assets\daily_verses"
$docsDir = Join-Path $repoDir "docs\assets\daily_verses"
$manifestPath = Join-Path $srcDir "manifest.json"
$catalogPath = Join-Path $srcDir "wallpaper_catalog.json"

Write-Host "Scanning images in $srcDir ..." -ForegroundColor Cyan

$validExtensions = @(".jpg", ".jpeg", ".png", ".webp")
$files = Get-ChildItem -Path $srcDir -File | Where-Object { $validExtensions -contains $_.Extension.ToLower() } | Sort-Object Name

$imageList = @()
$catalogList = @()

foreach ($f in $files) {
    $imageList += $f.Name
    
    # Infer category
    $fn = $f.Name.ToLower()
    $category = "art"
    if ($fn -match "mountain|snow|summit|alpine|sinai") { $category = "mountains" }
    elseif ($fn -match "sea|water|lake|river|ocean|waterfall|falls") { $category = "water" }
    elseif ($fn -match "forest|tree|wood|pine|garden|flower|rose|sunflower") { $category = "forest" }
    elseif ($fn -match "star|night|galaxy|celestial|sky") { $category = "stars" }
    elseif ($fn -match "sun|dawn|morning|sunset|sunrise|dusk") { $category = "dawn" }
    elseif ($fn -match "download|pexels|art|cross|bible|shepherd|lion") { $category = "art" }
    
    $cleanName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) -replace "[-_]", " "
    
    $catalogList += [PSCustomObject]@{
        file = $f.Name
        name = $cleanName
        nameMr = $cleanName
        category = $category
    }
}

# 1. Update manifest.json
$count = $imageList.Count
$manifestObj = [PSCustomObject]@{
    description = "River of Life - Curated Scenic, Biblical, and Spiritual Wallpapers"
    directory = "assets/daily_verses/"
    count = $count
    images = $imageList
}

$manifestJson = $manifestObj | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.Encoding]::UTF8)
Write-Host "Updated manifest.json ($count images)." -ForegroundColor Green

# 2. Update wallpaper_catalog.json
$catalogJson = $catalogList | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($catalogPath, $catalogJson, [System.Text.Encoding]::UTF8)
Write-Host "Updated wallpaper_catalog.json." -ForegroundColor Green

# 3. Synchronize to docs/assets/daily_verses/
if (Test-Path (Join-Path $repoDir "docs")) {
    if (-not (Test-Path $docsDir)) {
        New-Item -ItemType Directory -Path $docsDir -Force | Out-Null
    }
    Copy-Item -Path $manifestPath -Destination (Join-Path $docsDir "manifest.json") -Force
    Copy-Item -Path $catalogPath -Destination (Join-Path $docsDir "wallpaper_catalog.json") -Force
    Copy-Item -Path (Join-Path $srcDir "*.*") -Destination $docsDir -Force
    Write-Host "Synchronized all images and manifests to docs/assets/daily_verses/." -ForegroundColor Green
}

Write-Host "Wallpaper synchronization complete!" -ForegroundColor Yellow
