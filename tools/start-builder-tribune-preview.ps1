$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $repoRoot "server"
$clientDir = Join-Path $repoRoot "client"

Write-Host "Starting Soulmatch Builder Tribune preview..." -ForegroundColor Cyan
Write-Host "Server dir: $serverDir"
Write-Host "Client dir: $clientDir"

$serverCommand = @"
Set-Location '$serverDir'
pnpm install
pnpm dev
"@

$clientCommand = @"
Set-Location '$clientDir'
pnpm install
pnpm dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverCommand | Out-Null
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", $clientCommand | Out-Null

Write-Host ""
Write-Host "Preview starting in two terminals:" -ForegroundColor Green
Write-Host "- Server: http://localhost:3001"
Write-Host "- Client: http://localhost:5173"
Write-Host ""
Write-Host "Open the client URL in your browser and navigate to the Builder UI."
