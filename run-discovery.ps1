# Propperly — Source Discovery Service
# Usage: .\run-discovery.ps1 [port] [workspace-path]
#
# Starts the services process which hosts /api/discovery/* on the given port.
# The workspace defaults to the current directory.

param(
    [int]$Port = 3001,
    [string]$WorkspaceCwd = (Get-Location).Path
)

$env:PORT = $Port
$env:PROPPERLY_CWD = $WorkspaceCwd

Write-Host "Starting Propperly Discovery Service"
Write-Host "  Port      : $Port"
Write-Host "  Workspace : $WorkspaceCwd"
Write-Host "  UI        : http://localhost:$Port"
Write-Host ""

Set-Location "$PSScriptRoot"

# Open browser after a short delay so the server has time to start
Start-Job -ScriptBlock {
    param($p)
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:$p"
} -ArgumentList $Port | Out-Null

npx tsx services/src/index.ts
