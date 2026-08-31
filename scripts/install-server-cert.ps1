# Run this ON a server (new or existing) to install/refresh the shared LAN
# HTTPS certificate and restart the app. Pair with scripts/generate-server-cert.js,
# which is run once centrally (wherever mkcert + the root CA live) whenever a
# new server joins - see ADMIN-INSTALLATION-GUIDE.md Section 6 for the full story.
#
# Prefer running this via npm rather than calling the .ps1 directly - it
# handles execution policy for you (see package.json's "cert:install" script):
#   From a folder containing the two generated cert files (USB stick, shared folder, etc.):
#     npm run cert:install -- "D:\mbm-cert-transfer"
#   Or if the files are already sitting in certs\ on this machine:
#     npm run cert:install
#
# $From is positional (no flag name needed) - first argument after "--".

param(
  [Parameter(Position = 0)]
  [string]$From = ""
)

$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$certsDir = Join-Path $appRoot "certs"

if (-not (Test-Path $certsDir)) {
  New-Item -ItemType Directory -Path $certsDir | Out-Null
}

if ($From) {
  if (-not (Test-Path $From)) {
    Write-Error "Source folder not found: $From"
    exit 1
  }
  Copy-Item -Path (Join-Path $From "*.pem") -Destination $certsDir -Force
  Write-Host "Copied cert files from $From to $certsDir"
}

$keyFiles = Get-ChildItem -Path $certsDir -Filter "*-key.pem" -ErrorAction SilentlyContinue
$certFiles = Get-ChildItem -Path $certsDir -Filter "*.pem" -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -ne "rootCA.pem" -and $_.Name -ne "qz-certificate.pem" -and $_.Name -notmatch "-key\.pem$" }

if ($certFiles.Count -eq 0 -or $keyFiles.Count -eq 0) {
  Write-Error "No cert/key pair found in $certsDir. Copy the shared cert files there first (or pass -From <folder>)."
  exit 1
}

$certFile = $certFiles[0].FullName
Write-Host "Using certificate: $($certFiles[0].Name)"

# Warn (don't block) if this machine's own IP isn't actually covered by the
# certificate - the most common way a "new server" install silently stays on
# plain HTTP: the IP was never added to scripts/lan-server-ips.json before
# the cert was generated.
$opensslCandidates = @("openssl", "C:\Program Files\Git\usr\bin\openssl.exe")
$openssl = $opensslCandidates | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue -CommandType Application } | Select-Object -First 1
if (-not $openssl) { $openssl = $opensslCandidates[1] }

$certText = & $openssl x509 -noout -text -in $certFile 2>$null
$sanLine = ($certText | Select-String "Subject Alternative Name" -Context 0,1).Context.PostContext
Write-Host "Certificate covers: $sanLine"

$localIps = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.InterfaceAlias -notmatch "Loopback" }).IPAddress
$covered = $false
foreach ($ip in $localIps) {
  if ($sanLine -match [regex]::Escape($ip)) { $covered = $true }
}
if (-not $covered) {
  Write-Warning "This machine's IP address(es) ($($localIps -join ', ')) were NOT found in the certificate. HTTPS will not validate correctly here. Add this server's IP to scripts/lan-server-ips.json, regenerate the cert centrally, and re-copy it here before continuing."
}

Write-Host "`nRestarting the service..."
Set-Location $appRoot
npm run service:restart

Write-Host "`nVerify with: Get-Content windows-service\daemon\service-$(Get-Date -Format 'yyyy-MM-dd').log -Tail 20"
Write-Host "Look for: [Server] HTTPS enabled - certs loaded from ./certs/"
