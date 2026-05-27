param(
  [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "Building shared packages..."
npm run build --workspace @pos-dte/shared-types
npm run build --workspace @pos-dte/dte-core

Write-Host "Generating Prisma clients..."
npm run db:generate

Write-Host "Building API..."
npm run build --workspace @pos-dte/api

Write-Host "Building Web as Next standalone..."
$env:NEXT_OUTPUT_STANDALONE = "true"
npm run build --workspace @pos-dte/web
Remove-Item Env:\NEXT_OUTPUT_STANDALONE -ErrorAction SilentlyContinue

Write-Host "Building Electron main/preload..."
$env:POS_DTE_LOCAL_BUNDLE = "1"
npm run build --workspace @pos-dte/electron

if (-not $SkipInstaller) {
  Write-Host "Packaging Polaris Local installer..."
  Push-Location (Join-Path $root "apps/electron")
  try {
    npx electron-builder --config electron-builder.local.yml
  } finally {
    Pop-Location
    Remove-Item Env:\POS_DTE_LOCAL_BUNDLE -ErrorAction SilentlyContinue
  }
} else {
  Remove-Item Env:\POS_DTE_LOCAL_BUNDLE -ErrorAction SilentlyContinue
}

Write-Host "Polaris Local build completed."
