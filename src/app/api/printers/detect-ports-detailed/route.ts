import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

/**
 * Detailed port detection using Get-Printer
 * GET /api/printers/detect-ports-detailed
 */
export async function GET() {
  try {
    if (process.platform === 'win32') {
      const ps = 'Get-Printer | Select-Object Name,PortName,DriverName,Type | ConvertTo-Json -Depth 1';
      const output = execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, {
        encoding: 'utf8',
        shell: 'cmd.exe',
        timeout: 3000,
      });

      if (!output.trim()) return NextResponse.json({ printers: [] });

      const parsed = JSON.parse(output);
      const printers = Array.isArray(parsed) ? parsed : [parsed];

      const ports = printers.map((p: any) => ({
        name: p.Name,
        portName: p.PortName,
        driverName: p.DriverName,
        type: p.Type,
      }));

      return NextResponse.json({ printers: ports, detected: true, message: `Found ${ports.length} printers` });
    }

    return NextResponse.json({ printers: [], detected: false, message: 'Platform not supported' });
  } catch (error) {
    console.error('Detailed port detection failed:', error);
    return NextResponse.json({ printers: [], detected: false, message: 'Failed to detect ports' });
  }
}
