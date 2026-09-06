# ==============================================================================
# Dominion of Sol — Single Authoritative Developer Runtime Launcher
# Usage: .\start_dev.ps1 [-NoWatch]
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$NoWatch
)

$ErrorActionPreference = 'Continue'
$RepoRoot = $PSScriptRoot
if (-not $RepoRoot) { $RepoRoot = (Get-Location).Path }

Write-Host '==================================================' -ForegroundColor Cyan
Write-Host 'DOMINION OF SOL — AUTHORITATIVE DEV STARTUP' -ForegroundColor Cyan
Write-Host "Repo Root: $RepoRoot" -ForegroundColor DarkGray
Write-Host '==================================================' -ForegroundColor Cyan

# 1. Resolve Git Revision
$GitCommit = ''
try {
    $GitCommit = (git -C $RepoRoot rev-parse HEAD).Trim()
} catch {
    Write-Error "Failed to read git commit from ${RepoRoot}: $_"
    exit 1
}
Write-Host "[GIT] Current Working Tree Revision: $GitCommit" -ForegroundColor Green

# 2. Helper functions to inspect port owners
function Get-PortOwnerPid {
    param([int]$Port)
    $tcp = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($tcp) { return [int]$tcp.OwningProcess }

    # Fallback to netstat parser
    $ns = netstat -ano | Select-String ":$Port\s+.*LISTENING\s+(\d+)"
    if ($ns) {
        $m = [regex]::Match($ns[0], ":$Port\s+.*LISTENING\s+(\d+)")
        if ($m.Success) { return [int]$m.Groups[1].Value }
    }
    return $null
}

function Get-ProcessMeta {
    param([int]$PidToInspect)
    try {
        $proc = Get-Process -Id $PidToInspect -ErrorAction SilentlyContinue
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $PidToInspect" -ErrorAction SilentlyContinue
        return [PSCustomObject]@{
            Pid = $PidToInspect
            Name = if ($proc) { $proc.ProcessName } else { 'Unknown' }
            Path = if ($cim) { $cim.ExecutablePath } else { '' }
            CommandLine = if ($cim) { $cim.CommandLine } else { '' }
        }
    } catch {
        return $null
    }
}

function Test-IsDominionProcess {
    param($Meta, [int]$Port)
    if (-not $Meta) { return $false }
    $name = $Meta.Name.ToLower()
    $cmd = $Meta.CommandLine.ToLower()
    $path = $Meta.Path.ToLower()
    $rootNorm = $RepoRoot.ToLower().Replace('/', '\')

    if ($Port -eq 8765) {
        if ($name -eq 'server' -or $name -eq 'server.exe') { return $true }
        if ($path -and $path.Contains($rootNorm)) { return $true }
        if ($cmd -and $cmd.Contains($rootNorm)) { return $true }
    } elseif ($Port -eq 5173) {
        if ($name -eq 'node' -or $name -eq 'node.exe') {
            if ($cmd.Contains('vite') -or $cmd.Contains('project-dominion') -or $cmd.Contains($rootNorm)) {
                return $true
            }
        }
    }
    return $false
}

function Clean-PortSafely {
    param([int]$Port, [string]$ServiceName)
    $ownerPid = Get-PortOwnerPid -Port $Port
    if ($ownerPid) {
        $meta = Get-ProcessMeta -PidToInspect $ownerPid
        $isDominion = Test-IsDominionProcess -Meta $meta -Port $Port
        if ($isDominion) {
            Write-Host "[STALE PROCESS DETECTED] Port $Port owned by stale Dominion $ServiceName (PID $ownerPid). Terminating..." -ForegroundColor Yellow
            try {
                taskkill /F /T /PID $ownerPid | Out-Null
            } catch {
                Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
            }
            # Wait for port to be released
            $freed = $false
            for ($i = 0; $i -lt 10; $i++) {
                Start-Sleep -Milliseconds 300
                if (-not (Get-PortOwnerPid -Port $Port)) {
                    $freed = $true
                    break
                }
            }
            if (-not $freed) {
                Write-Error "Failed to release port $Port from PID $ownerPid after termination."
                exit 1
            }
            Write-Host "[PORT FREED] Port $Port is now clean." -ForegroundColor Green
        } else {
            Write-Host '==================================================' -ForegroundColor Red
            Write-Host "PORT $Port ALREADY IN USE BY NON-DOMINION PROCESS" -ForegroundColor Red
            Write-Host "PID         : $ownerPid"
            Write-Host "NAME        : $($meta.Name)"
            Write-Host "PATH        : $($meta.Path)"
            Write-Host "COMMAND LINE: $($meta.CommandLine)"
            Write-Host "Refusing to kill unrelated process. Please free port $Port manually." -ForegroundColor Red
            Write-Host '==================================================' -ForegroundColor Red
            exit 1
        }
    }
}

# 3. Clean stale Dominion processes on 8765 and 5173
Clean-PortSafely -Port 8765 -ServiceName 'Server'
Clean-PortSafely -Port 5173 -ServiceName 'Vite Client'

# 4. Clean orphan server.exe processes in this repository
$repoNorm = $RepoRoot.ToLower().Replace('/', '\')
Get-CimInstance Win32_Process -Filter "Name = 'server.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    $procPid = $_.ProcessId
    $procPath = $_.ExecutablePath
    if ($procPath -and $procPath.ToLower().Contains($repoNorm)) {
        Write-Host "[ORPHAN DETECTED] Terminating orphan server.exe PID $procPid..." -ForegroundColor Yellow
        Stop-Process -Id $procPid -Force -ErrorAction SilentlyContinue
    }
}

# 5. Build Canonical Server
Write-Host '[BUILD] Compiling canonical server (release profile)...' -ForegroundColor Cyan
$serverManifest = Join-Path $RepoRoot 'server\Cargo.toml'

cmd.exe /c "cargo build --release --bin server --manifest-path ""$serverManifest"""
if ($LASTEXITCODE -ne 0) {
    Write-Error "Server build failed with exit code $LASTEXITCODE."
    exit 1
}

$CanonicalServerExe = Join-Path $RepoRoot 'server\target\release\server.exe'
if (-not (Test-Path $CanonicalServerExe)) {
    Write-Error "Canonical server binary not found at $CanonicalServerExe!"
    exit 1
}

$binaryInfo = Get-Item $CanonicalServerExe
$sizeMb = [math]::Round($binaryInfo.Length / 1048576, 2)
$modTime = $binaryInfo.LastWriteTime.ToString('yyyy-MM-ddTHH:mm:ss')
Write-Host "[BUILD READY] Binary: $CanonicalServerExe ($sizeMb MB, LastModified=$modTime)" -ForegroundColor Green

# 6. Launch Server Process
Write-Host '[SERVER] Launching canonical server on ws://127.0.0.1:8765...' -ForegroundColor Cyan
$serverProc = Start-Process -FilePath $CanonicalServerExe -WorkingDirectory (Join-Path $RepoRoot 'server') -PassThru

# Wait for server to bind port 8765
$serverReady = $false
$probeScript = Join-Path $RepoRoot 'scripts\probe_server_welcome.cjs'
$serverWelcomeJson = $null

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 400
    if ($serverProc.HasExited) {
        Write-Error "Server process exited prematurely with code $($serverProc.ExitCode)!"
        exit 1
    }
    if (Get-PortOwnerPid -Port 8765) {
        # Probe handshake
        try {
            $rawWelcome = & node $probeScript 2>$null
            if ($rawWelcome) {
                $serverWelcomeJson = $rawWelcome | ConvertFrom-Json
                if ($serverWelcomeJson -and $serverWelcomeJson.type -eq 'server_welcome') {
                    $serverReady = $true
                    break
                }
            }
        } catch {}
    }
}

if (-not $serverReady) {
    Write-Error 'Timed out waiting for server handshake on port 8765.'
    try { Stop-Process -Id $serverProc.Id -Force } catch {}
    exit 1
}

$ServerCommit = $serverWelcomeJson.serverCommit
$ServerPid = $serverProc.Id
$proto = $serverWelcomeJson.protocolVersion
Write-Host "[SERVER READY] PID=$ServerPid, EmbeddedCommit=$ServerCommit, Protocol=$proto" -ForegroundColor Green

# 7. Launch Vite Dev Server on Strict Port 5173
Write-Host '[CLIENT] Launching Vite client on strict port 5173...' -ForegroundColor Cyan
$clientDir = Join-Path $RepoRoot 'client'

# Launch npm run dev via cmd.exe
$clientProc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev' -WorkingDirectory $clientDir -PassThru

# Wait for HTTP 200 on http://127.0.0.1:5173
$clientReady = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if ($clientProc.HasExited) {
        Write-Error 'Vite client process exited prematurely!'
        try { Stop-Process -Id $serverProc.Id -Force } catch {}
        exit 1
    }
    if (Get-PortOwnerPid -Port 5173) {
        try {
            $res = Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($res -and $res.StatusCode -eq 200) {
                $clientReady = $true
                break
            }
        } catch {}
        # If port 5173 is already listening by node, give it 1 second and consider ready
        Start-Sleep -Milliseconds 800
        $clientReady = $true
        break
    }
}

if (-not $clientReady) {
    Write-Error 'Timed out waiting for Vite client on http://localhost:5173.'
    try { Stop-Process -Id $clientProc.Id -Force } catch {}
    try { Stop-Process -Id $serverProc.Id -Force } catch {}
    exit 1
}

$ClientPid = Get-PortOwnerPid -Port 5173
if (-not $ClientPid) { $ClientPid = $clientProc.Id }

$CommitMatch = ($GitCommit -eq $ServerCommit)
$MatchStr = if ($CommitMatch) { 'YES' } else { 'NO (WARNING)' }

# 8. Print Authoritative Dev Summary Banner
Write-Host ''
Write-Host '================================================' -ForegroundColor Green
Write-Host 'DOMINION DEV READY' -ForegroundColor Green
Write-Host ''
Write-Host 'REPO:'
Write-Host "  $RepoRoot"
Write-Host ''
Write-Host 'GIT:'
Write-Host "  $GitCommit"
Write-Host ''
Write-Host 'SERVER:'
Write-Host "  PID $ServerPid"
Write-Host "  commit $ServerCommit"
Write-Host '  port 8765'
Write-Host "  binary $CanonicalServerExe"
Write-Host ''
Write-Host 'CLIENT:'
Write-Host "  PID $ClientPid"
Write-Host "  commit $GitCommit"
Write-Host '  port 5173'
Write-Host ''
Write-Host "CLIENT/SERVER MATCH = $MatchStr" -ForegroundColor $(if ($CommitMatch) { 'Green' } else { 'Red' })
Write-Host ''
Write-Host 'OPEN:'
Write-Host '  http://localhost:5173' -ForegroundColor Cyan
Write-Host '================================================' -ForegroundColor Green
Write-Host ''

if ($NoWatch) {
    Write-Host '[WATCHDOG] -NoWatch specified. Server and client remain running in background.' -ForegroundColor DarkGray
    exit 0
}

Write-Host 'Press Ctrl+C to stop both Server and Vite.' -ForegroundColor Yellow

# 9. Watchdog / Cleanup Monitor
try {
    while ($true) {
        Start-Sleep -Seconds 3
        if ($serverProc.HasExited) {
            Write-Host "[SERVER] Server process terminated unexpectedly (ExitCode: $($serverProc.ExitCode))." -ForegroundColor Red
            break
        }
        if ($clientProc.HasExited) {
            Write-Host '[CLIENT] Client process terminated unexpectedly.' -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host '[CLEANUP] Stopping development environment processes...' -ForegroundColor Yellow
    try {
        if ($serverProc -and -not $serverProc.HasExited) {
            taskkill /F /T /PID $serverProc.Id 2>$null | Out-Null
        }
    } catch {}
    try {
        if ($clientProc -and -not $clientProc.HasExited) {
            taskkill /F /T /PID $clientProc.Id 2>$null | Out-Null
        }
        # Also ensure port 5173 owner is stopped
        $vitePid = Get-PortOwnerPid -Port 5173
        if ($vitePid) {
            taskkill /F /T /PID $vitePid 2>$null | Out-Null
        }
    } catch {}
    Write-Host '[CLEANUP] Dominion Dev Environment stopped cleanly. All ports freed.' -ForegroundColor Green
}
