/**
 * POST /api/printers/[id]/clear-queue
 * Cancel all pending print jobs for a specific printer via PowerShell.
 */

import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const psFile = join(tmpdir(), `clear-queue-${Date.now()}.ps1`)

  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const printer = await prisma.networkPrinters.findUnique({ where: { id: params.id } })
    if (!printer) return NextResponse.json({ error: 'Printer not found' }, { status: 404 })

    const safeName = printer.printerName.replace(/'/g, "''")

    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'

# Cancel all queued jobs for this printer
Get-PrintJob -PrinterName '${safeName}' | Remove-PrintJob

# Restart print spooler to flush any stubborn stuck jobs
Stop-Service -Name Spooler -Force
Start-Sleep -Milliseconds 500
Remove-Item "$env:SystemRoot\\System32\\spool\\PRINTERS\\*" -Force -ErrorAction SilentlyContinue
Start-Service -Name Spooler
Start-Sleep -Milliseconds 500

Write-Output "OK"
`.trim()

    writeFileSync(psFile, psScript, 'utf8')

    const result = execSync(
      `powershell -ExecutionPolicy Bypass -File "${psFile}"`,
      { encoding: 'utf8', timeout: 20000, shell: 'cmd.exe' }
    )

    console.log(`[ClearQueue] Cleared queue for "${printer.printerName}":`, result.trim())

    return NextResponse.json({
      success: true,
      message: `Print queue cleared for ${printer.printerName}`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ClearQueue] Failed:', msg)
    return NextResponse.json({ error: 'Failed to clear queue', details: msg }, { status: 500 })
  } finally {
    try { if (existsSync(psFile)) unlinkSync(psFile) } catch {}
  }
}
