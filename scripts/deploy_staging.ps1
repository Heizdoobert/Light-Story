# Staging deployment script (PowerShell)
# Usage: pwsh scripts\deploy_staging.ps1 -env staging
param(
  [string]$env = 'staging'
)

Write-Output "Building frontend..."
npm --prefix frontend run build

Write-Output "Deploying frontend to hosting provider..."
# Placeholder: replace with your hosting deploy command (Vercel/Netlify/Static host)
Write-Output "Please replace the placeholder with your hosting CLI command (vercel/now/netlify deploy)"

Write-Output "Deploying Supabase migrations and functions (requires supabase CLI)..."
if (Get-Command supabase -ErrorAction SilentlyContinue) {
  Push-Location backend-supabase
  supabase login
  supabase link --project-ref $env
  supabase db push
  supabase functions deploy increment-story-views
  supabase functions deploy manage-story
  supabase functions deploy manage-chapter
  supabase functions deploy create_comic
  supabase functions deploy upload_to_r2
  Pop-Location
} else {
  Write-Output "Supabase CLI not found. Please run the following from backend-supabase:"
  Write-Output "  supabase login && supabase link --project-ref <ref> && supabase db push && supabase functions deploy <name>"
}

Write-Output "Staging deploy script completed. Verify the app in staging and run the AUDIT_VALIDATION.md checklist."