# PowerShell port of start.sh — build once, then run with auto-restart.
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[start.ps1] build failed (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
}

while ($true) {
    Write-Host "[start.ps1] starting at $(Get-Date)"
    node dist/index.js   # non-zero exit won't throw; the loop just restarts
    Write-Host "[start.ps1] exited, restarting in 3s"
    Start-Sleep -Seconds 3
}
