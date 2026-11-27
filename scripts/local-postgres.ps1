Set-StrictMode -Version Latest
function Start-StudyPostgres {
    param([string]$PostgresBin = '')
    $ErrorActionPreference = 'Stop'
    if (-not $PostgresBin) {
        $command = Get-Command pg_ctl -ErrorAction SilentlyContinue
        if (-not $command) { throw 'Install PostgreSQL 18 client/server tools or pass -PostgresBin.' }
        $PostgresBin = Split-Path $command.Source
    }
    $PostgresBin = (Resolve-Path -LiteralPath $PostgresBin).Path
    $fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('study-phase6-' + [guid]::NewGuid().ToString('N'))
    $dataPath = Join-Path $fixtureRoot 'data'
    New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $fixturePort = $listener.LocalEndpoint.Port
    $listener.Stop()
    $databaseName = 'study_test_' + [guid]::NewGuid().ToString('N')
    & (Join-Path $PostgresBin 'initdb.exe') -D $dataPath -U study_fixture -A trust --no-locale -E UTF8 > (Join-Path $fixtureRoot 'init.log') 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL initialization failed; inspect init.log.' }
    $startArguments = '-D "' + $dataPath + '" -l "' + (Join-Path $fixtureRoot 'postgres.log') + '" -o "-h 127.0.0.1 -p ' + $fixturePort + '" -w start'
    $starter = Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList $startArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $fixtureRoot 'start.log') -RedirectStandardError (Join-Path $fixtureRoot 'start-error.log')
    if (-not $starter.WaitForExit(15000)) { throw 'Disposable PostgreSQL startup timed out.' }
    if ($starter.ExitCode -ne 0) { throw 'Disposable PostgreSQL startup failed.' }
    try {
        & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $fixturePort -U study_fixture $databaseName
        if ($LASTEXITCODE -ne 0) { throw 'Disposable database creation failed.' }
        return [pscustomobject]@{ Root=$fixtureRoot; Data=$dataPath; Bin=$PostgresBin; Port=$fixturePort; Name=$databaseName; Url="postgresql://study_fixture@127.0.0.1:$fixturePort/$databaseName" }
    } catch {
        & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataPath -m fast -w stop | Out-Null
        throw
    }
}
function Stop-StudyPostgres {
    param([Parameter(Mandatory)]$Fixture)
    $resolvedRoot = [IO.Path]::GetFullPath($Fixture.Root)
    $resolvedData = [IO.Path]::GetFullPath($Fixture.Data)
    if (-not $resolvedData.StartsWith($resolvedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Fixture data path escaped its owned directory.' }
    & (Join-Path $Fixture.Bin 'pg_ctl.exe') -D $resolvedData -m fast -w stop
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL shutdown failed.' }
}
