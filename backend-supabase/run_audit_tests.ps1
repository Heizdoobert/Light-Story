# Run backend audit SQL tests using psql or supabase CLI
# Usage:
# 1) Set the environment variable DATABASE_URL or SUPABASE_DB_URL
# 2) Run this script from repository root: pwsh backend-supabase\run_audit_tests.ps1

param(
    [string]$connection = $env:DATABASE_URL
)

if (-not $connection) {
    Write-Error "No database connection provided. Set DATABASE_URL environment variable or pass -connection '<conn>'"
    exit 1
}

# Try psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Output "Running audit SQL via psql..."
    psql $connection -f "$(Resolve-Path ./backend-supabase/supabase/tests/audit_validation.sql)"
    exit $LASTEXITCODE
}

# Try supabase CLI
$supabase = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabase) {
    Write-Output "Running audit SQL via supabase db query..."
    supabase db query --file "backend-supabase/supabase/tests/audit_validation.sql"
    exit $LASTEXITCODE
}

Write-Error "Neither 'psql' nor 'supabase' CLI found in PATH. Install psql or supabase CLI and retry."
exit 2
