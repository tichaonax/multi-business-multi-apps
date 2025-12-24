import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/printers/test-usb-direct
 * Body: { portName: string }
 * Attempts to write raw bytes directly to a port name (e.g., \\.\TMUSB001) or use printer spooler fallback
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const portName = body?.portName;
    if (!portName) {
      return NextResponse.json({ error: 'portName required' }, { status: 400 });
    }

    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\x0A';

    let receipt = '';
    receipt += ESC + '@';
    receipt += ESC + 'a' + String.fromCharCode(1);
    receipt += 'DIRECT PORT TEST' + LF;
    receipt += `Port: ${portName}` + LF;
    receipt += LF + 'Test Successful' + LF + LF;
    receipt += GS + 'V' + '\x41' + '\x03';

    const data = Buffer.from(receipt, 'binary');

    // First attempt: write to device file (\\.\TMUSB001 style)
    const { execSync } = require('child_process');

    try {
      const normalized = portName.startsWith('\\\\.\\') ? portName : `\\\\.\\${portName}`;
      // Use PowerShell to write binary file to port via FileStream (works for some drivers)
      const tempFile = `"${process.cwd().replace(/\\/g, '\\\\')}\\test-usb-direct.bin"`;
      require('fs').writeFileSync(tempFile.replace(/"/g, ''), data);

      const psScript = `
        $port = "${normalized}"
        $file = ${tempFile}
        $data = [System.IO.File]::ReadAllBytes($file)
        try {
          $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
          $stream.Write($data, 0, $data.Length)
          $stream.Flush()
          $stream.Close()
          Write-Output "SUCCESS"
        } catch {
          Write-Output "FAIL:$_"
        }
      `.trim();

      const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\\"')}"`, { encoding: 'utf8', shell: 'cmd.exe', timeout: 10000 }).trim();

      if (result.startsWith('SUCCESS')) {
        return NextResponse.json({ success: true, method: 'direct-port', message: 'Sent to port' });
      }

    } catch (err) {
      console.warn('Direct raw port write failed:', err?.message || err);
    }

    // Second attempt: try printer spooler RAW by printer name matching port
    try {
      const printerLib = require('printer');
      // We don't have a printer name, try to map port to printer names via Get-Printer
      const psList = execSync('powershell -Command "Get-Printer | Select-Object Name,PortName | ConvertTo-Json -Depth 1"', { encoding: 'utf8', shell: 'cmd.exe' });
      const parsed = JSON.parse(psList);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const found = arr.find((p: any) => p.PortName && p.PortName.toLowerCase().includes(portName.toLowerCase()));

      if (found) {
        await new Promise((resolve, reject) => {
          printerLib.printDirect({ data, printer: found.Name, type: 'RAW', success: id => resolve(id), error: (e: any) => reject(e) });
        });
        return NextResponse.json({ success: true, method: 'spooler-raw', printer: found.Name });
      }

    } catch (err) {
      console.warn('Printer spooler attempt failed:', err?.message || err);
    }

    return NextResponse.json({ error: 'All test methods failed. See server logs for details.' }, { status: 500 });

  } catch (error) {
    console.error('test-usb-direct error:', error);
    return NextResponse.json({ error: 'Test failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
