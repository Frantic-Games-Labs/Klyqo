param(
    [Parameter(Mandatory=$true)]
    [string]$SourcePath,

    [Parameter(Mandatory=$true)]
    [string]$Slug,

    [string]$Title = "",
    [string]$Tagline = "",
    [string]$Category = "Arcade",
    [string]$Controls = "Keyboard + Mouse",
    [string]$SiteUrl = "https://klyqo.vercel.app",
    [string]$AdminToken = ""
)

# --- 1. Sanitise slug: always lowercase, spaces to dashes ---
$Slug = $Slug.ToLower() -replace '\s+', '-' -replace '[^a-z0-9\-]', ''
if (-not $Title) { $Title = (Get-Culture).TextInfo.ToTitleCase($Slug -replace '-', ' ') }

Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkGreen
Write-Host "  Klyqo Publisher" -ForegroundColor Green
Write-Host "  Game : $Title" -ForegroundColor Cyan
Write-Host "  Slug : $Slug" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor DarkGreen
Write-Host ""

$TempDir = Join-Path $env:TEMP "KlyqoPublish_$([guid]::NewGuid())"
$KlyqoTempPath = Join-Path $TempDir "Klyqo"
$GameExtractPath = Join-Path $TempDir "ExtractedGame"
$TargetDir = Join-Path $KlyqoTempPath "public\games\$Slug"

# --- 2. Clone the website ---
Write-Host "[1/5] Fetching Klyqo website..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TempDir | Out-Null
git clone https://github.com/Frantic-Games-Labs/Klyqo.git $KlyqoTempPath --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Could not clone repository." -ForegroundColor Red; exit 1 }

# --- 3. Extract or copy game ---
Write-Host "[2/5] Preparing game files..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $GameExtractPath | Out-Null

if ((Get-Item $SourcePath) -is [System.IO.DirectoryInfo]) {
    Copy-Item -Path "$SourcePath\*" -Destination $GameExtractPath -Recurse -Force
} elseif ($SourcePath.EndsWith(".zip")) {
    Expand-Archive -Path $SourcePath -DestinationPath $GameExtractPath -Force
} else {
    Write-Host "ERROR: SourcePath must be a folder or .zip file." -ForegroundColor Red; exit 1
}

# If the zip contained a single subfolder, step into it
$items = Get-ChildItem $GameExtractPath
if ($items.Count -eq 1 -and $items[0].PSIsContainer) {
    $GameExtractPath = $items[0].FullName
}

# --- 4. Build if needed ---
if (Test-Path (Join-Path $GameExtractPath "package.json")) {
    Write-Host "[3/5] AI source code detected! Compiling..." -ForegroundColor Magenta
    Set-Location $GameExtractPath
    npm install --silent
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Build failed!" -ForegroundColor Red; exit 1 }

    $distPath = Join-Path $GameExtractPath "dist"
    if (-not (Test-Path $distPath)) { Write-Host "ERROR: No 'dist' folder after build." -ForegroundColor Red; exit 1 }

    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    Copy-Item -Path "$distPath\*" -Destination $TargetDir -Recurse -Force
} else {
    Write-Host "[3/5] Ready-to-play HTML detected!" -ForegroundColor Magenta
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    Copy-Item -Path "$GameExtractPath\*" -Destination $TargetDir -Recurse -Force
}

# Verify index.html exists
if (-not (Test-Path (Join-Path $TargetDir "index.html"))) {
    Write-Host "ERROR: No index.html found in game files. Cannot publish." -ForegroundColor Red
    exit 1
}

# --- 5. Push to GitHub ---
Write-Host "[4/5] Pushing to GitHub..." -ForegroundColor Yellow
Set-Location $KlyqoTempPath
git add "public/games/$Slug" | Out-Null
git commit -m "deploy: upload game [$Slug]" --quiet
git push origin main --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Git push failed." -ForegroundColor Red; exit 1 }

# --- 6. Auto-register game in database (if admin token provided) ---
if ($AdminToken -ne "") {
    Write-Host "[5/5] Registering game in database..." -ForegroundColor Yellow
    $body = @{
        slug        = $Slug
        title       = $Title
        tagline     = if ($Tagline) { $Tagline } else { "Play $Title now." }
        description = ""
        category    = $Category
        controls    = $Controls
        source      = "local"
        status      = "live"
        sortOrder   = 0
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest `
            -Uri "$SiteUrl/api/games" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -Headers @{ "Cookie" = "klyqo_admin=$AdminToken" } `
            -ErrorAction Stop
        Write-Host "  Game registered in database!" -ForegroundColor Green
    } catch {
        Write-Host "  NOTE: Could not auto-register (admin token may be wrong, or game already exists)." -ForegroundColor DarkYellow
        Write-Host "  Go to $SiteUrl/admin and add the game manually with slug: $Slug" -ForegroundColor Cyan
    }
} else {
    Write-Host "[5/5] Skipping auto-register (no -AdminToken provided)." -ForegroundColor DarkGray
    Write-Host "  Once Vercel deploys, go to $SiteUrl/admin and add the game with slug: $Slug" -ForegroundColor Cyan
}

# --- 7. Cleanup ---
Set-Location $env:USERPROFILE
Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkGreen
Write-Host "  DONE! Vercel is deploying..." -ForegroundColor Green
Write-Host "  Slug   : $Slug" -ForegroundColor Cyan
Write-Host "  Game   : $SiteUrl/play/$Slug" -ForegroundColor Cyan
Write-Host "  Raw    : $SiteUrl/games/$Slug/index.html" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor DarkGreen
Write-Host ""
