# Build a portable EXE on the developer's Windows PC (internet required for first build).
# The delivered EXE bundles the web app and Electron; customer needs neither Node nor internet.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
function Run-Npm {
  & npm.cmd @args
  if ($LASTEXITCODE -ne 0) { throw "npm failed with exit code $LASTEXITCODE" }
}
Run-Npm ci
& node --test tests/commercial-regressions.cjs
if ($LASTEXITCODE -ne 0) { throw 'Regression tests failed' }
Run-Npm run build
$web = Join-Path $root 'desktop\web'
if (Test-Path $web) { Remove-Item -LiteralPath $web -Recurse -Force }
New-Item -ItemType Directory -Path $web | Out-Null
Copy-Item -Path (Join-Path $root 'dist\*') -Destination $web -Recurse -Force
if (Test-Path (Join-Path $root 'desktop\package-lock.json')) {
  Run-Npm --prefix desktop ci
} else {
  # Resolve the current stable releases and pin them in the separate desktop lockfile.
  Run-Npm --prefix desktop install --save-dev --save-exact electron@latest electron-builder@latest
}
$expected = Join-Path $root 'release\LoungeLink-POS-1.0.0-portable.exe'
if (Test-Path $expected) { Remove-Item -LiteralPath $expected -Force }
Run-Npm --prefix desktop run package:win
if (-not (Test-Path $expected)) { throw 'Expected portable EXE was not produced' }
Write-Host "Windows package: $expected"
Get-FileHash -Algorithm SHA256 -LiteralPath $expected
