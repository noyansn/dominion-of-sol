# Dominion Dev Watchdog - Starts both Vite and Server, restarts if either dies
Write-Host '=== Dominion Dev Watchdog ===' -ForegroundColor Cyan
Write-Host 'Vite   -> http://localhost:5173/'  -ForegroundColor Green
Write-Host 'Server -> ws://127.0.0.1:8765'     -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop.'              -ForegroundColor Yellow

function Start-Vite {
    Start-Job -Name vite -ScriptBlock { Set-Location C:\Users\noyan\Downloads\game\client; npm run dev }
}
function Start-Server {
    Start-Job -Name server -ScriptBlock { Set-Location C:\Users\noyan\Downloads\game\server; .\target\release\server.exe }
}

$jobVite = Start-Vite
$jobServer = Start-Server

try {
    while ($true) {
        Start-Sleep 4
        Receive-Job $jobVite, $jobServer -ErrorAction SilentlyContinue | Out-Null
        if ($jobVite.State -in 'Completed', 'Failed') {
            Remove-Job $jobVite -Force -ErrorAction SilentlyContinue
            Write-Host '[VITE] Restarting...' -ForegroundColor Yellow
            $jobVite = Start-Vite
        }
        if ($jobServer.State -in 'Completed', 'Failed') {
            Remove-Job $jobServer -Force -ErrorAction SilentlyContinue
            Write-Host '[SERVER] Restarting...' -ForegroundColor Yellow
            $jobServer = Start-Server
        }
    }
} finally {
    Remove-Job $jobVite, $jobServer -Force -ErrorAction SilentlyContinue
    Write-Host 'Dominion Dev Watchdog Stopped.' -ForegroundColor Red
}
