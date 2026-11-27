[CmdletBinding()]
param(
    [ValidateRange(1,10)][int]$Repetitions = 2,
    [switch]$CleanInstall,
    [switch]$CleanCheckout,
    [switch]$IncludeTrackedChanges,
    [string]$PostgresBin = ''
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
. (Join-Path $PSScriptRoot 'local-postgres.ps1')
$repository = Split-Path $PSScriptRoot
$sourceRepository = $repository
$originalDirectory = Get-Location
$savedEnvironment = @{}
$privateNames = @(Get-ChildItem Env: | Where-Object { $_.Name -match '^(DATABASE_|DIRECT_URL$|FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS$|AI_|REDIS_|VITE_|PG|NODE_OPTIONS$|NODE_ENV$|STUDY_TEST_DATABASE_URL$)' } | Select-Object -ExpandProperty Name)
foreach ($privateName in $privateNames) {
    $savedEnvironment[$privateName] = [Environment]::GetEnvironmentVariable($privateName)
    [Environment]::SetEnvironmentVariable($privateName, $null)
}
$fixture = $null
function Invoke-StudyCheck {
    param([string]$Package, [string[]]$Arguments, [string]$LogName)
    Set-Location (Join-Path $repository $Package)
    Write-Host ("Checking " + $Package + ': npm ' + ($Arguments -join ' '))
    $logPath = Join-Path $fixture.Root $LogName
    try { & npm.cmd @Arguments > $logPath 2>&1 }
    catch { Get-Content $logPath | Select-Object -Last 40; throw "Check failed; inspect $LogName" }
    if ($LASTEXITCODE -ne 0) { Get-Content $logPath | Select-Object -Last 40; throw "Check failed; inspect $LogName" }
    Get-Content $logPath | Select-Object -Last 8 | Write-Host
}
try {
    foreach ($package in @('server','client')) {
        foreach ($envFile in @('.env','.env.local','.env.production','.env.production.local','.env.test','.env.test.local')) {
            if (Test-Path -LiteralPath (Join-Path $repository "$package/$envFile")) { throw 'Run the credential-free harness in a checkout without private environment files.' }
        }
    }
    $fixture = Start-StudyPostgres -PostgresBin $PostgresBin
    if ($CleanCheckout) {
        $repository = Join-Path $fixture.Root 'checkout'
        New-Item -ItemType Directory -Path $repository | Out-Null
        $archivePath = Join-Path $fixture.Root 'source.tar'
        & git -C $sourceRepository archive --format=tar -o $archivePath HEAD
        & tar -xf $archivePath -C $repository
        if ($IncludeTrackedChanges) {
            $patchPath = Join-Path $fixture.Root 'candidate.patch'
            & git -C $sourceRepository diff --binary --output=$patchPath HEAD
            if ((Get-Item -LiteralPath $patchPath).Length -gt 0) { & git -c core.autocrlf=false -C $repository apply $patchPath }
        }
        $CleanInstall = $true
    }
    $env:STUDY_TEST_DATABASE_URL = $fixture.Url
    $env:DATABASE_URL = $fixture.Url
    Write-Host ('Disposable fixture and logs: ' + $fixture.Root)
    for ($pass = 1; $pass -le $Repetitions; $pass++) {
        if ($CleanInstall) {
            Invoke-StudyCheck server @('ci') "pass-$pass-server-install.log"
            Invoke-StudyCheck client @('ci') "pass-$pass-client-install.log"
        }
        Set-Location (Join-Path $repository 'server')
        & node node_modules/prisma/build/index.js migrate deploy > (Join-Path $fixture.Root "pass-$pass-migrations.log") 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'Disposable migrations failed.' }
        Invoke-StudyCheck server @('test') "pass-$pass-server-unit.log"
        Invoke-StudyCheck server @('run','test:db') "pass-$pass-server-db.log"
        Invoke-StudyCheck client @('test') "pass-$pass-client.log"
        foreach ($package in @('server','client')) {
            foreach ($check in @('typecheck','lint','format:check','build')) {
                Invoke-StudyCheck $package @('run',$check) "pass-$pass-$package-$($check.Replace(':','-')).log"
            }
        }
        Write-Host ("PASS " + $pass + " completed with injected test identities and mock AI only.")
    }
} finally {
    if ($fixture) { Stop-StudyPostgres $fixture }
    foreach ($privateName in @('STUDY_TEST_DATABASE_URL','DATABASE_URL')) { [Environment]::SetEnvironmentVariable($privateName, $null) }
    foreach ($privateName in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($privateName, $savedEnvironment[$privateName]) }
    Set-Location $originalDirectory
}
