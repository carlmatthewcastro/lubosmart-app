param([switch] $CheckOnly)

$ErrorActionPreference = 'Stop'
$webRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'web'
$browserJob = $null

function Test-LocalPort([string] $ServerName, [int] $Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.ConnectAsync($ServerName, $Port)
        return ($pending.Wait(500) -and $client.Connected)
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Get-LocalSetting([string] $Name, [string] $Fallback) {
    $line = Get-Content (Join-Path $webRoot '.env') |
        Where-Object { $_ -match ('^\s*' + [regex]::Escape($Name) + '\s*=') } |
        Select-Object -Last 1
    if ($null -eq $line) { return $Fallback }
    return (($line -split '=', 2)[1].Trim().Trim('"').Trim("'"))
}

function Start-LocalDatabaseService([string] $ServiceName) {
    try {
        Start-Service -Name $ServiceName -ErrorAction Stop
        return
    } catch {
        Write-Host 'Windows needs administrator permission to start the database. Accept the Windows permission prompt to continue.'
    }

    # Elevate only the service startup, keeping the development servers unelevated.
    $escapedName = $ServiceName.Replace("'", "''")
    $serviceCommand = "try { Start-Service -Name '$escapedName' -ErrorAction Stop; exit 0 } catch { exit 1 }"
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($serviceCommand))
    try {
        $startup = Start-Process -FilePath "$PSHOME\powershell.exe" -Verb RunAs -WindowStyle Hidden `
            -ArgumentList @('-NoProfile', '-NonInteractive', '-EncodedCommand', $encodedCommand) -Wait -PassThru -ErrorAction Stop
    } catch {
        throw "Windows did not allow database startup. Launch again and accept the administrator prompt. $($_.Exception.Message)"
    }
    if ($startup.ExitCode -ne 0) {
        throw "Windows could not start database service '$ServiceName', even with administrator permission. Check its status and error in Windows Services."
    }
}

try {
    Set-Location -LiteralPath $webRoot
    foreach ($command in @('php.exe', 'node.exe', 'npm.cmd')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Missing $command. Install PHP/Node.js and add it to PATH first."
        }
    }
    foreach ($file in @('.env', 'vendor/autoload.php', 'node_modules/concurrently/dist/bin/concurrently.js', 'node_modules/vite/bin/vite.js')) {
        if (-not (Test-Path $file)) {
            throw "Missing web/$file. Complete documentation/SETUP.md first."
        }
    }

    $appUri = [uri](Get-LocalSetting 'APP_URL' 'http://127.0.0.1:8000')
    if ($appUri.Host -notin @('localhost', '127.0.0.1') -or $appUri.Scheme -ne 'http' -or $appUri.Port -ne 8000) {
        throw 'This launcher expects a local APP_URL such as http://127.0.0.1:8000 in web/.env.'
    }
    $dbDriver = Get-LocalSetting 'DB_CONNECTION' 'sqlite'
    $dbHost = Get-LocalSetting 'DB_HOST' '127.0.0.1'
    $dbPort = [int](Get-LocalSetting 'DB_PORT' '3306')
    if ($CheckOnly) {
        Write-Host "Launcher checks passed. Website: $($appUri.AbsoluteUri)"
        Write-Host "PHP from PATH: $((Get-Command php.exe).Source)"
        Write-Host "Database: $dbDriver at ${dbHost}:$dbPort"
        return
    }

    foreach ($port in @(8000, 5173)) {
        if (Test-LocalPort $appUri.Host $port) {
            throw "Port $port is already in use. Close the existing local server before launching again."
        }
    }
    if ($dbDriver -in @('mysql', 'mariadb') -and $dbHost -in @('localhost', '127.0.0.1')) {
        if (-not (Test-LocalPort $dbHost $dbPort)) {
            $databaseServices = @(Get-Service | Where-Object { $_.Name -match '^(mysql|mariadb)' })
            if ($databaseServices.Count -ne 1) {
                throw "Start your database service on port $dbPort, then double-click the launcher again."
            }
            $databaseService = $databaseServices[0]
            if ($databaseService.Status -ne 'Running') {
                Write-Host "Starting database service $($databaseService.Name)..."
                Start-LocalDatabaseService $databaseService.Name
            }
            $deadline = (Get-Date).AddSeconds(20)
            while (-not (Test-LocalPort $dbHost $dbPort)) {
                if ((Get-Date) -gt $deadline) { throw "Database service is not accepting connections on port $dbPort. Check Windows Services and your database configuration." }
                Start-Sleep -Milliseconds 300
            }
        }
    }

    # Open the browser only after both development servers accept connections.
    $browserJob = Start-Job -ArgumentList $appUri.AbsoluteUri, $appUri.Host -ScriptBlock {
        param($Url, $ServerName)
        $deadline = (Get-Date).AddSeconds(60)
        do {
            $ready = $true
            foreach ($port in @(8000, 5173)) {
                $client = New-Object System.Net.Sockets.TcpClient
                try {
                    if (-not ($client.ConnectAsync($ServerName, $port).Wait(500) -and $client.Connected)) { $ready = $false }
                } catch { $ready = $false } finally { $client.Dispose() }
            }
            if ($ready) { Start-Process $Url; return }
            Start-Sleep -Milliseconds 500
        } while ((Get-Date) -lt $deadline)
        Write-Output "Browser startup timed out. Open $Url once the servers are ready."
    }

    $env:PHP_CLI_SERVER_WORKERS = '1'
    Write-Host "Starting LubosMart at $($appUri.AbsoluteUri)"
    Write-Host 'Keep this window open. Press Ctrl+C to stop the website, Vite and queue worker.'
    Write-Host 'Your database Windows service stays running when the development servers stop.'
    & node.exe 'node_modules/concurrently/dist/bin/concurrently.js' '--kill-others' '--names' 'server,queue,vite' `
        "php artisan serve --host=$($appUri.Host) --port=8000 --tries=1" `
        'php artisan queue:work --tries=1' `
        "npm run dev -- --host=$($appUri.Host) --port=5173 --strictPort"
    if ($LASTEXITCODE -ne 0) { throw 'The local servers stopped. See the output above for details.' }
} catch {
    Write-Host "`nLubosMart launcher: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($null -ne $browserJob) {
        Stop-Job $browserJob -ErrorAction SilentlyContinue
        Receive-Job $browserJob -ErrorAction SilentlyContinue
        Remove-Job $browserJob -Force -ErrorAction SilentlyContinue
    }
}
