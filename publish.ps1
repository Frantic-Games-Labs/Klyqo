param(
    [Parameter(Mandatory=$true)]
    [string]$GamePath,
    
    [Parameter(Mandatory=$true)]
    [string]$Slug
)

$KlyqoPath = $PWD.Path
$TargetDir = Join-Path $KlyqoPath "public\games\$Slug"

Write-Host "🚀 Starting automated publish for $Slug..." -ForegroundColor Cyan

# 1. Check if the game path exists
if (-Not (Test-Path $GamePath)) {
    Write-Host "❌ Error: Could not find game folder at $GamePath" -ForegroundColor Red
    exit 1
}

# 2. Build the game
Write-Host "📦 Building the game..." -ForegroundColor Yellow
Set-Location $GamePath
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Game build failed!" -ForegroundColor Red
    Set-Location $KlyqoPath
    exit 1
}

# 3. Copy the built files to Klyqo
Write-Host "📂 Copying files to Klyqo..." -ForegroundColor Yellow
Set-Location $KlyqoPath
if (Test-Path $TargetDir) {
    Remove-Item -Recurse -Force $TargetDir
}
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Recurse -Force "$GamePath\dist\*" $TargetDir

# 4. Push to Vercel
Write-Host "☁️ Pushing to GitHub & Vercel..." -ForegroundColor Yellow
git add "public/games/$Slug/*"
git commit -m "deploy: update game $Slug"
git push

Write-Host "✅ DONE! The game is successfully building on Vercel!" -ForegroundColor Green
Write-Host "You can now go to Klyqo /admin and add a local game with slug: $Slug" -ForegroundColor Cyan
