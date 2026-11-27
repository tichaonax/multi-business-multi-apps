<#
  MBM-352: sets up the "MBM POS Updater" task. It runs as administrator,
  from the POS app installer (installer.nsh → customInstall).

  - C:\ProgramData\MBM POS\ is made admin-only: SYSTEM and Administrators
    can change it, Users can only read it.
  - updater.json in that folder holds the server to update from, plus the
    certificate pinned for it. It's written only when -Server is given, i.e.
    by an admin-approved install (the POS app's "Update now" with the Windows
    prompt, or install-pos.ps1). A silent install by the task itself leaves
    it as it was.
  - The task runs pos-updater.ps1 (in Program Files) as SYSTEM. Any signed-in
    user may start it; only admins may change it.

  -Cert: the "sha256/<base64>" fingerprint the POS app pinned for that
  server. When it's not given, the certificate the server shows now is
  pinned (an admin approved this install). The updater accepts the server
  when Windows trusts it as SYSTEM, or when it shows that certificate.
#>
param([string]$Server = '', [string]$Cert = '', [string]$InstallDir = '')
$ErrorActionPreference = 'Stop'
$Dir = Join-Path $env:ProgramData 'MBM POS'
$Log = Join-Path $Dir 'updater.log'
function Log($t) { try { Add-Content -Path $Log -Value ("{0}  setup  {1}" -f (Get-Date -Format s), $t) } catch {} }

try {
  # 1. Admin-only folder (also takes it back if someone else created it first)
  New-Item -ItemType Directory -Force -Path $Dir | Out-Null
  & icacls.exe $Dir /setowner '*S-1-5-32-544' /T /C /Q | Out-Null
  & icacls.exe $Dir /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' /Q | Out-Null
  Get-ChildItem $Dir -Force | ForEach-Object { & icacls.exe $_.FullName /reset /T /C /Q | Out-Null }
  New-Item -ItemType Directory -Force -Path (Join-Path $Dir 'download') | Out-Null

  # 2. Which server (only on an admin-approved install)
  $Server = $Server.Trim().TrimEnd('/')
  if ($Server -match '^https?://') {
    if (-not $Cert -and $Server -like 'https://*') {
      # Always pin the certificate the server shows now (an admin approved
      # this install). The task runs as SYSTEM, which may not trust a
      # certificate that this admin's own account trusts (e.g. mkcert's CA
      # lives in the user's store only). The fingerprint is taken inside
      # the callback: the certificate is gone once the connection closes.
      Add-Type -TypeDefinition @"
using System; using System.Net.Sockets; using System.Net.Security;
using System.Security.Cryptography; using System.Security.Cryptography.X509Certificates;
public static class MbmCertPin {
  public static string Fingerprint(string host, int port) {
    string fp = null;
    using (var tcp = new TcpClient(host, port))
    using (var ssl = new SslStream(tcp.GetStream(), false, (s, c, ch, e) => {
      using (var sha = SHA256.Create()) fp = "sha256/" + Convert.ToBase64String(sha.ComputeHash(c.GetRawCertData()));
      return true;
    })) { ssl.AuthenticateAsClient(host); }
    return fp;
  }
}
"@
      $uri = [Uri]$Server
      $Cert = [MbmCertPin]::Fingerprint($uri.Host, $(if ($uri.Port -gt 0) { $uri.Port } else { 443 }))
    }
    $cfg = [ordered]@{ server = $Server; certFingerprint = $(if ($Cert) { $Cert } else { $null }); setAt = (Get-Date).ToUniversalTime().ToString('o') }
    [IO.File]::WriteAllText((Join-Path $Dir 'updater.json'), ($cfg | ConvertTo-Json))
    Log "server $Server$(if ($Cert) { ' (certificate pinned)' })"
  }

  # 3. The task (runs as SYSTEM; Authenticated Users may read and start it)
  if (-not $InstallDir) { $InstallDir = Split-Path (Split-Path $PSScriptRoot) }
  $script = Join-Path $InstallDir 'resources\updater\pos-updater.ps1'
  $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Installs the Multi-Business POS app from its server when a till asks (MBM-352).</Description></RegistrationInfo>
  <Principals><Principal id="Author"><UserId>S-1-5-18</UserId><RunLevel>HighestAvailable</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <ExecutionTimeLimit>PT30M</ExecutionTimeLimit>
  </Settings>
  <Actions Context="Author"><Exec><Command>$ps</Command><Arguments>-NoProfile -ExecutionPolicy Bypass -File "$script"</Arguments></Exec></Actions>
</Task>
"@
  $svc = New-Object -ComObject Schedule.Service
  $svc.Connect()
  # 6 = create or update; 5 = service account (SYSTEM)
  $svc.GetFolder('\').RegisterTask('MBM POS Updater', $xml, 6, 'SYSTEM', $null, 5, 'D:(A;;FA;;;SY)(A;;FA;;;BA)(A;;GRGX;;;AU)') | Out-Null
  Log "task registered ($script)"
} catch {
  Log "FAILED: $($_.Exception.Message)"
  exit 1
}
