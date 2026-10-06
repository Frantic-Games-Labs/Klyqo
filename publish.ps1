param(
    [Parameter(Mandatory=$true)]
    [string]$SourcePath,
    
    [Parameter(Mandatory=$true)]
    [string]$Slug
)

Write-Host "Starting automated publish for $Slug..." -ForegroundColor Cyan

$TempDir = Join-Path $env:TEMP "KlyqoPublish_$([guid]::NewGuid())"
$KlyqoTempPath = Join-Path $TempDir "Klyqo"
$GameExtractPath = Join-Path $TempDir "ExtractedGame"
$TargetDir = Join-Path $KlyqoTempPath "public\games\$Slug"

# 1. Invisibly clone the website
Write-Host "Fetching Klyqo website in the background..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TempDir | Out-Null
Set-Location $TempDir
git clone https://github.com/Frantic-Games-Labs/Klyqo.git --quiet

# 2. Extract or Copy Game to Temp folder for processing
New-Item -ItemType Directory -Force -Path $GameExtractPath | Out-Null
if ((Get-Item $SourcePath) -is [System.IO.DirectoryInfo]) {
    Write-Host "Copying game folder..." -ForegroundColor Yellow
    Copy-Item -Path "$SourcePath\*" -Destination $GameExtractPath -Recurse -Force
} 
elseif ($SourcePath.EndsWith(".zip")) {
    Write-Host "Unzipping game archive..." -ForegroundColor Yellow
    Expand-Archive -Path $SourcePath -DestinationPath $GameExtractPath -Force
} 
else {
    Write-Host "Error: SourcePath must be a Folder or a .zip file!" -ForegroundColor Red
    exit 1
}

# 3. Check if it's raw source code that needs building
if (Test-Path (Join-Path $GameExtractPath "package.json")) {
    Write-Host "AI Source Code detected! Compiling game into a playable build..." -ForegroundColor Magenta
    Set-Location $GameExtractPath
    npm install
    npm run build
    
    # After build, move only the finished 'dist' folder to the website
    if (Test-Path (Join-Path $GameExtractPath "dist")) {
        New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
        Copy-Item -Path "$GameExtractPath\dist\*" -Destination $TargetDir -Recurse -Force
    } else {
        Write-Host "Error: Game failed to compile!" -ForegroundColor Red
        exit 1
    }
} else {
    # If no package.json, it's already playable HTML! Just copy it directly.
    Write-Host "Ready-to-play HTML detected!" -ForegroundColor Magenta
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    Copy-Item -Path "$GameExtractPath\*" -Destination $TargetDir -Recurse -Force
}

# 4. Push the update to Vercel
Write-Host "Pushing finished game to live website..." -ForegroundColor Yellow
Set-Location $KlyqoTempPath
git add "public/games/$Slug/*"
git commit -m "deploy: upload new game $Slug" --quiet
git push origin main --quiet

# 5. Clean up
Set-Location $env:USERPROFILE
Remove-Item -Recurse -Force $TempDir

Write-Host "DONE! The game is now uploading to Vercel!" -ForegroundColor Green
Write-Host "Go to Klyqo /admin and add a local game with slug: $Slug" -ForegroundColor Cyan
