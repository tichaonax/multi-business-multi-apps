#Requires -RunAsAdministrator
<#
  MBM server, step 2: Windows. Adapted from Farm Control's 02-windows.ps1.
  Name, no automatic sign-in, the wired address to reserve, the clock, never
  sleep, Windows Update restarts outside business hours, BitLocker advice.
  Asks y/n before each change; safe to run again.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\02-windows.ps1 [-Name MBM-SRV1]
#>
param([string]$Name = 'MBM-SRV1')
$ErrorActionPreference = 'Stop'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Ask($q) { (Read-Host "$q [y/n]") -match '^[yY]' }
$restart = $false

Step "Computer name"
if ($env:COMPUTERNAME -eq $Name) { Ok $Name }
else {
  Write-Host "  Now: $($env:COMPUTERNAME)"
  if (Ask "Rename it to $Name (takes effect after a restart)?") {
    Rename-Computer -NewName $Name -Force; $restart = $true; Ok "renamed to $Name after the restart"
  } else { Todo "keep $($env:COMPUTERNAME)" }
}

Step "Automatic sign-in"
$wl = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
$auto = (Get-ItemProperty $wl -Name AutoAdminLogon -ErrorAction SilentlyContinue).AutoAdminLogon
if ("$auto" -eq '1') {
  if (Ask "Windows signs in by itself. Turn that off?") {
    Set-ItemProperty $wl -Name AutoAdminLogon -Value '0'
    Remove-ItemProperty $wl -Name DefaultPassword -ErrorAction SilentlyContinue
    Ok "off"
  } else { Todo "automatic sign-in is on" }
} else { Ok "off (the MBM service runs without anyone signed in)" }

Step "Network"
$up = @(Get-NetAdapter -Physical | Where-Object Status -eq 'Up')
$wired = @($up | Where-Object { $_.PhysicalMediaType -match '802\.3' -or $_.Name -match 'Ethernet' })
if ($wired.Count -eq 0) { Todo "no network cable connected: use the wired adapter" } else {
  foreach ($a in $wired) {
    $ipc = Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
    Ok ("wired: " + $a.Name + " " + $ipc.IPAddress + " (MAC " + $a.MacAddress + ")")
    if ($ipc.PrefixOrigin -eq 'Dhcp') { Todo ("reserve " + $ipc.IPAddress + " for MAC " + $a.MacAddress + " on the router: the tills and printers find MBM at this address") }
  }
}

Step "Clock (Windows Time)"
$wt = Get-Service W32Time
if ($wt.Status -eq 'Running' -and $wt.StartType -eq 'Automatic') { Ok "running, starts at boot" }
elseif (Ask "Windows Time is $($wt.Status) ($($wt.StartType)). Start it, at boot too, and sync now?") {
  Set-Service W32Time -StartupType Automatic; Start-Service W32Time; w32tm /resync /force | Out-Null
  Ok "running, starts at boot"
} else { Todo "Windows Time is $($wt.Status): receipts, payroll and sign-in times need a right clock" }
$tz = (Get-TimeZone).Id
Ok "time zone: $tz"
if ($tz -ne 'South Africa Standard Time') { Todo "Zimbabwe is UTC+2 (South Africa Standard Time): Set-TimeZone -Id 'South Africa Standard Time' once it is there" }

Step "Power: never sleep"
$ac = (powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE | Select-String 'Current AC Power Setting Index' | Select-Object -First 1).ToString()
if ($ac -match '0x00000000') { Ok "never sleeps on mains" }
elseif (Ask "The server can go to sleep. Never sleep, never hibernate?") {
  powercfg /change standby-timeout-ac 0; powercfg /change hibernate-timeout-ac 0; powercfg /hibernate off
  Ok "never sleeps"
} else { Todo "the server may sleep: nobody can reach MBM then" }

Step "Windows Update restarts"
$au = 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings'
$s = (Get-ItemProperty $au -Name ActiveHoursStart -ErrorAction SilentlyContinue).ActiveHoursStart
$e = (Get-ItemProperty $au -Name ActiveHoursEnd -ErrorAction SilentlyContinue).ActiveHoursEnd
if ($s -eq 6 -and $e -eq 23) { Ok "no restarts between 06:00 and 23:00" }
elseif (Ask "Keep Windows Update from restarting between 06:00 and 23:00 (business hours)?") {
  if (-not (Test-Path $au)) { New-Item $au -Force | Out-Null }
  Set-ItemProperty $au -Name ActiveHoursStart -Value 6 -Type DWord
  Set-ItemProperty $au -Name ActiveHoursEnd -Value 23 -Type DWord
  Ok "no restarts between 06:00 and 23:00"
} else { Todo "Windows Update may restart during business hours" }

Step "BitLocker on C:"
try {
  $bl = Get-BitLockerVolume -MountPoint C: -ErrorAction Stop
  if ($bl.ProtectionStatus -eq 'On') { Ok "on" }
  else { Todo "off. Recommended: TPM only, no PIN (restarts need nobody). Save the recovery key OFF this machine." }
} catch { Todo "could not be read ($($_.Exception.Message))" }

Step "By hand, if not done yet"
Todo "Windows Update until nothing is left"
Todo "the UPS: USB cable, its software set to shut Windows down on low battery"
Todo "firmware: power on after power loss"

Write-Host ""
if ($restart) {
  if (Ask "Restart now for the new name?") { Restart-Computer -Force }
  Write-Host "Restart, then: C:\MBM\setup\00-status.ps1" -ForegroundColor Cyan
} else { Write-Host "Next: C:\MBM\setup\03-prerequisites.ps1" -ForegroundColor Cyan }
