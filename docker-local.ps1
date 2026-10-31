param([switch]$Fast, [switch]$Local)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$supabaseDir = Join-Path $root 'backend-supabase\supabase'
$composeEnv = Join-Path $root 'docker-local.env'
$workerEnv = Join-Path $root 'workers\kv-worker\.env'
$rootEnv = Join-Path $root '.env'

function Get-DotEnvValue([string]$path, [string]$name) {
  $line = Select-String -Path $path -Pattern "^$name=" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $line) { return '' }
  return $line.Line.Substring($name.Length + 1).Trim().Trim('"').Trim("'")
}

# Server (cloud) values from root .env - source of truth for cloud mode
$cloudUrl = Get-DotEnvValue $rootEnv 'SUPABASE_URL'
$cloudAnon = Get-DotEnvValue $rootEnv 'SUPABASE_ANON_KEY'
$cloudService = Get-DotEnvValue $rootEnv 'SUPABASE_SERVICE_ROLE_KEY'
$cloudServiceKey = Get-DotEnvValue $rootEnv 'SUPABASE_SERVICE_KEY'
$cloudJwks = Get-DotEnvValue $rootEnv 'SUPABASE_JWKS_URL'
$cloudPubKey = Get-DotEnvValue $rootEnv 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
$encKey = Get-DotEnvValue $rootEnv 'NEXT_PUBLIC_ENC_KEY'
$internalSecret = Get-DotEnvValue $rootEnv 'INTERNAL_ADMIN_SECRET'

$modeLabel = if ($Local) { 'LOCAL EMULATOR' } else { 'CLOUD' }

if ($Fast) {
  if (-not (Test-Path $composeEnv)) { throw 'docker-local.env missing - run the full mode once (without -Fast) first' }
  $currentUrl = Get-DotEnvValue $composeEnv 'NEXT_PUBLIC_SUPABASE_URL'
  $currentPub = Get-DotEnvValue $composeEnv 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  if ($Local) {
    $modeMatch = $currentUrl -like '*host.docker.internal*'
  } else {
    if (-not $cloudUrl -or -not $cloudPubKey) { throw "CLOUD MODE: missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in $rootEnv" }
    $modeMatch = ($currentUrl -eq $cloudUrl) -and ($currentPub -eq $cloudPubKey)
  }
  if (-not $modeMatch) {
    throw "MODE MISMATCH: docker-local.env points at '$currentUrl' but $modeLabel mode expects a different Supabase. Run the full mode once (without -Fast)."
  }
  Write-Host "==> FAST MODE: $modeLabel - keeping Supabase emulator + images, cached build, no prune"
  Write-Host '==> [1/2] Restarting compose stack'
  docker compose --env-file $composeEnv down --remove-orphans
  Write-Host '==> [2/2] Rebuilding (cached) & starting'
  docker compose --env-file $composeEnv build
  docker compose --env-file $composeEnv up -d
  docker compose --env-file $composeEnv ps
  Write-Host ''
  $summary = 'App: http://localhost:3000 | Gateway: http://localhost:8787/api/health'
  if ($Local) { $summary += ' | Studio: http://localhost:54323' }
  Write-Host $summary
  exit 0
}

Write-Host "==> MODE: $modeLabel"
if ($Local) {
  Write-Host '    Supabase emulator on host | R2 = Cloudflare (server) | Web app = local docker container'
} else {
  Write-Host "    Supabase = $cloudUrl (REAL PRODUCTION DATA - admin actions and uploads write to production)"
  Write-Host '    R2 = Cloudflare (server) | Web app = local docker container'
}

Write-Host '==> [1/8] Stopping old Supabase emulator (if CLI present)'
if (Get-Command supabase -ErrorAction SilentlyContinue) {
  Push-Location $supabaseDir
  & supabase stop --no-backup 2>&1 | Out-Host
  Pop-Location
} else {
  Write-Host 'supabase CLI not found - skipping emulator stop'
}

Write-Host '==> [2/8] Stopping project "light-story" (old + current)'
if (Test-Path $composeEnv) {
  docker compose --env-file $composeEnv down --rmi all --volumes --remove-orphans
} else {
  Write-Host 'docker-local.env missing - skipping compose down (fresh checkout)'
}

Write-Host '==> [3/8] Pruning ALL Docker images, volumes, build cache'
docker system prune -af --volumes

Write-Host '==> [4/8] Verifying nothing from light-story remains'
$leftover = @(docker ps -a --format '{{.Names}}' | Where-Object { $_ -match '^light-story(-|$)' })
if ($leftover.Count -gt 0) {
  Write-Host "STILL RUNNING: $($leftover -join ', ')" -ForegroundColor Red
  throw 'Old light-story containers are still running - refusing to deploy'
}
Write-Host 'OK: no light-story containers remain'

if ($Local) {
  Write-Host '==> [5/8] Starting fresh Supabase emulator (first run pulls images)'
  Push-Location $supabaseDir
  & supabase start
  if ($LASTEXITCODE -ne 0) { throw 'supabase start failed' }
  Pop-Location

  Write-Host '==> [5.5/8] Resetting local DB (migrations + seed.sql, no sample data)'
  Push-Location $supabaseDir
  & supabase db reset
  if ($LASTEXITCODE -ne 0) { throw 'supabase db reset failed' }
  Pop-Location

  Write-Host '==> [6/8] Collecting local keys'
  Push-Location $supabaseDir
  $status = @(& supabase status -o env) -join "`n"
  Pop-Location
  function Get-Status([string]$name) {
    $m = [regex]::Match($status, "(?m)^$name\s*=\s*[\""']?(?<v>[^\""'\r\n]+)")
    if ($m.Success) { return $m.Groups['v'].Value }
    return ''
  }
  $apiUrl = Get-Status 'API_URL'
  $anonKey = Get-Status 'ANON_KEY'
  $serviceKey = Get-Status 'SERVICE_ROLE_KEY'
  if (-not $apiUrl -or -not $anonKey -or -not $serviceKey) {
    Write-Host $status
    throw 'Could not parse supabase status output'
  }
  $apiUrl = $apiUrl -replace '127\.0\.0\.1', 'host.docker.internal' -replace 'localhost', 'host.docker.internal'
  $pubKey = $anonKey
  $jwksUrl = "$apiUrl/auth/v1/.well-known/jwks.json"
  $workerServiceKey = $serviceKey
  $gatewayProd = ''
} else {
  Write-Host '==> [5/8] CLOUD MODE: using server Supabase (no local emulator)'
  $required = @{
    'SUPABASE_URL' = $cloudUrl
    'SUPABASE_ANON_KEY' = $cloudAnon
    'SUPABASE_SERVICE_ROLE_KEY' = $cloudService
    'SUPABASE_SERVICE_KEY' = $cloudServiceKey
    'SUPABASE_JWKS_URL' = $cloudJwks
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' = $cloudPubKey
    'NEXT_PUBLIC_ENC_KEY' = $encKey
    'INTERNAL_ADMIN_SECRET' = $internalSecret
  }
  $missing = @($required.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
  if ($missing.Count -gt 0) { throw "CLOUD MODE: missing required value(s) in $rootEnv : $($missing -join ', ')" }
  $apiUrl = $cloudUrl
  $anonKey = $cloudAnon
  $serviceKey = $cloudService
  $pubKey = $cloudPubKey
  $jwksUrl = $cloudJwks
  $workerServiceKey = $cloudServiceKey
  $gatewayProd = Get-DotEnvValue $rootEnv 'NEXT_PUBLIC_GATEWAY_URL_PRODUCTION'
  if (-not $gatewayProd) { $gatewayProd = 'https://kv-worker.hhhuygiau.workers.dev' }
}

Write-Host '==> [6.5/8] Writing env files'
$composeLines = @(
  "NEXT_PUBLIC_SUPABASE_URL=$apiUrl"
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$pubKey"
  "NEXT_PUBLIC_GATEWAY_URL=http://localhost:8787"
  "NEXT_PUBLIC_GATEWAY_URL_PRODUCTION=$gatewayProd"
  "NEXT_PUBLIC_ENC_KEY=$encKey"
  "SUPABASE_URL=$apiUrl"
  "SUPABASE_ANON_KEY=$anonKey"
  "SUPABASE_SERVICE_ROLE_KEY=$serviceKey"
  "SUPABASE_JWKS_URL=$jwksUrl"
  "INTERNAL_ADMIN_SECRET=$internalSecret"
)
foreach ($name in @('R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_ENDPOINT','NEXT_PUBLIC_R2_BUCKET_COVERS','NEXT_PUBLIC_R2_BUCKET_CHAPTERS')) {
  $v = Get-DotEnvValue $rootEnv $name
  if ($v) { $composeLines += "$name=$v" }
}
$composeLines | Where-Object { $_ -notmatch '=$' } | Set-Content -Path $composeEnv -Encoding ascii

$workerLines = @(
  '# Generated by docker-local.ps1 - do not edit'
  "SUPABASE_URL=$apiUrl"
  "SUPABASE_ANON_KEY=$anonKey"
  "SUPABASE_SERVICE_KEY=$workerServiceKey"
  "SUPABASE_JWKS_URL=$jwksUrl"
  "ENC_KEY=$encKey"
)
$workerLines | Where-Object { $_ -notmatch '^[A-Z_]+=$' } | Set-Content -Path $workerEnv -Encoding ascii

Write-Host '==> [7/8] Deploying with NO cache'
docker compose --env-file $composeEnv build --no-cache
docker compose --env-file $composeEnv up -d
docker compose --env-file $composeEnv ps

Write-Host ''
$summary = 'App: http://localhost:3000 | Gateway: http://localhost:8787/api/health'
if ($Local) { $summary += ' | Studio: http://localhost:54323' }
Write-Host $summary
