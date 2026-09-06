# Dominion Dev Watchdog - ikisini de baslatir, olunce yeniden baslatir
Write-Host '=== Dominion Dev Watchdog ===' -ForegroundColor Cyan
Write-Host 'Vite  -> http://localhost:5173/'  -ForegroundColor Green
Write-Host 'Server-> ws://127.0.0.1:8765' -ForegroundColor Green
Write-Host 'Ctrl+C ile durdur.' -ForegroundColor Yellow

function Start-Vite {
    Start-Job -Name vite -ScriptBlock { Set-Location C:\Users\noyan\Downloads\game\client; npm run dev }
}
function Start-Server {
    Start-Job -Name server -ScriptBlock { Set-Location C:\Users\noyan\Downloads\game\server; .\target-msvc\x86_64-pc-windows-msvc\release\server.exe }
}

 = Start-Vite
 = Start-Server

try {
    while (True) {
        Start-Sleep 4
        Receive-Job ,  -ErrorAction SilentlyContinue | Out-Null
        if (.State -in ''Completed'',''Failed'') { Remove-Job  -Force; Write-Host ''[VITE] Restarting...'';  = Start-Vite }
        if (.State -in ''Completed'',''Failed'') { Remove-Job  -Force; Write-Host ''[SERVER] Restarting...'';  = Start-Server }
    }
} finally {
    Remove-Job , -Force -EA SilentlyContinue
    Write-Host ''Stopped.''
}
