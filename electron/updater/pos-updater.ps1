<#
  MBM-352: the "MBM POS Updater" task. It runs as SYSTEM, started by the POS
  app's "Update now".

  It updates only from the server in C:\ProgramData\MBM POS\updater.json,
  which only an admin can write (see setup-updater.ps1). It downloads into
  that admin-only folder, checks the SHA-256 the server gives, and installs
  silently. The installer closes the POS app and the R710 agent; the POS
  app's helper reopens it as the user.

  Progress goes to update-status.json (users can read it) and updater.log.
#>
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Dir = Join-Path $env:ProgramData 'MBM POS'
$StatusFile = Join-Path $Dir 'update-status.json'
$Log = Join-Path $Dir 'updater.log'

function Log($t) { try { Add-Content -Path $Log -Value ("{0}  task   {1}" -f (Get-Date -Format s), $t) } catch {} }
function Status($state, $message) {
  $o = [ordered]@{ state = $state; message = $message; at = (Get-Date).ToUniversalTime().ToString('o') }
  [IO.File]::WriteAllText($StatusFile, ($o | ConvertTo-Json -Compress))
  Log "$state  $message"
}
function Installed-Version {
  $keys = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
  $k = Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Multi-Business POS*' } | Select-Object -First 1
  if ($k) { $k.DisplayVersion } else { $null }
}

try {
  Status 'running' 'Checking the server...'
  $cfg = Get-Content (Join-Path $Dir 'updater.json') -Raw | ConvertFrom-Json
  $server = ([string]$cfg.server).TrimEnd('/')
  if ($server -notmatch '^https?://') { throw 'No server is set up for updates on this till.' }
  # Accept the server when Windows (as SYSTEM) trusts its certificate, or when
  # it shows the one pinned at setup. Compiled, not a PowerShell callback,
  # which can fail when .NET calls it from another thread.
  Add-Type -TypeDefinition @"
using System; using System.Net; using System.Net.Security;
using System.Security.Cryptography; using System.Security.Cryptography.X509Certificates;
public static class MbmCertCheck {
  public static string Pin;
  public static void Install() {
    ServicePointManager.ServerCertificateValidationCallback = (s, c, ch, e) => {
      if (e == SslPolicyErrors.None) return true;
      if (string.IsNullOrEmpty(Pin) || c == null) return false;
      using (var sha = SHA256.Create()) return ("sha256/" + Convert.ToBase64String(sha.ComputeHash(c.GetRawCertData()))) == Pin;
    };
  }
}
"@
  [MbmCertCheck]::Pin = [string]$cfg.certFingerprint
  [MbmCertCheck]::Install()
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $wc = New-Object Net.WebClient

  $info = ($wc.DownloadString("$server/api/public/electron/download?info=1") | ConvertFrom-Json).data
  if (-not $info.sha256) { throw 'The server has no POS app installer to give.' }
  $before = Installed-Version
  if ($before -eq $info.version) { Status 'uptodate' "Already on POS app $before."; exit 0 }

  Status 'running' "Downloading POS app $($info.version)..."
  $name = ([string]$info.file) -replace '[^A-Za-z0-9._-]', '-'
  $file = Join-Path (Join-Path $Dir 'download') $name
  Get-ChildItem (Join-Path $Dir 'download') -Filter *.exe -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  $wc.DownloadFile("$server/api/public/electron/download", $file)
  $hash = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
  if ($hash -ne ([string]$info.sha256).ToLower()) { Remove-Item $file -Force; throw 'The download is damaged (SHA-256 does not match). Nothing was installed.' }

  Status 'running' "Installing POS app $($info.version)..."
  $p = Start-Process $file -ArgumentList '/S' -Wait -PassThru
  Remove-Item $file -Force -ErrorAction SilentlyContinue
  $after = Installed-Version
  if ($p.ExitCode -ne 0 -or $after -ne $info.version) { throw "The installer did not finish (exit $($p.ExitCode), installed: $after)." }
  Status 'done' "POS app $before -> $after"
} catch {
  Status 'failed' $_.Exception.Message
  exit 1
}
