/**
 * USB/Serial Port Detection API
 * Detects available USB, COM, and LPT ports on Windows
 * GET /api/printers/detect-ports
 */

import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const ports: string[] = [];

    // Detect COM ports using PowerShell
    try {
      const psScript = `
        Get-WmiObject Win32_SerialPort | Select-Object DeviceID | ForEach-Object {
          $_.DeviceID
        }
      `.trim();

      const output = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
        encoding: 'utf8',
        shell: 'cmd.exe',
        timeout: 5000,
      });

      // Parse COM port output
      const comPorts = output
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^COM\d+$/i.test(line));

      ports.push(...comPorts);
    } catch (error) {
      console.warn('Failed to detect COM ports:', error);
    }

    // Detect USB ports by checking common USB printer ports
    try {
      const usbPorts = ['USB001', 'USB002', 'USB003', 'USB004', 'USB005'];

      for (const port of usbPorts) {
        try {
          // Try to access the port to check if it exists
          const normalizedPort = `\\\\.\\${port}`;
          const testScript = `
            try {
              $stream = New-Object System.IO.FileStream("${normalizedPort}", [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
              $stream.Close()
              Write-Output "EXISTS"
            } catch {
              Write-Output "NOT_FOUND"
            }
          `.trim();

          const result = execSync(`powershell -Command "${testScript.replace(/"/g, '\\"')}"`, {
            encoding: 'utf8',
            shell: 'cmd.exe',
            timeout: 2000,
          }).trim();

          if (result === 'EXISTS') {
            ports.push(port);
          }
        } catch (error) {
          // Port doesn't exist or can't be accessed
          continue;
        }
      }
    } catch (error) {
      console.warn('Failed to detect USB ports:', error);
    }

    // Add common LPT ports (less common nowadays but still possible)
    try {
      const lptPorts = ['LPT1', 'LPT2', 'LPT3'];

      for (const port of lptPorts) {
        try {
          const normalizedPort = `\\\\.\\${port}`;
          const testScript = `
            try {
              $stream = New-Object System.IO.FileStream("${normalizedPort}", [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
              $stream.Close()
              Write-Output "EXISTS"
            } catch {
              Write-Output "NOT_FOUND"
            }
          `.trim();

          const result = execSync(`powershell -Command "${testScript.replace(/"/g, '\\"')}"`, {
            encoding: 'utf8',
            shell: 'cmd.exe',
            timeout: 2000,
          }).trim();

          if (result === 'EXISTS') {
            ports.push(port);
          }
        } catch (error) {
          // Port doesn't exist
          continue;
        }
      }
    } catch (error) {
      console.warn('Failed to detect LPT ports:', error);
    }

    // If no ports detected, return common defaults as fallback
    if (ports.length === 0) {
      console.log('No ports detected, returning common defaults');
      return NextResponse.json({
        ports: [
          'USB001', 'USB002', 'USB003',
          'COM1', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8',
          'LPT1', 'LPT2'
        ],
        detected: false,
        message: 'No ports auto-detected. Showing common port names.',
      });
    }

    console.log('Detected ports:', ports);

    return NextResponse.json({
      ports: ports.sort(),
      detected: true,
      message: `Found ${ports.length} available port(s)`,
    });

  } catch (error) {
    console.error('Port detection error:', error);

    // Return common defaults on error
    return NextResponse.json({
      ports: [
        'USB001', 'USB002', 'USB003',
        'COM1', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8',
        'LPT1', 'LPT2'
      ],
      detected: false,
      message: 'Port detection failed. Showing common port names.',
    });
  }
}
