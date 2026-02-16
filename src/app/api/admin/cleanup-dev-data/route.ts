import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getServerUser } from '@/lib/get-server-user'

async function runScriptWithEnv(scriptPath: string, envVars: Record<string,string|undefined>) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const env = { ...process.env, ...envVars }
    const proc = spawn('node', [scriptPath], { cwd: process.cwd(), env })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => resolve({ code, stdout, stderr }))
    proc.on('error', (err) => reject(err))
  })
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  const currentUser = user as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const confirmed = !!body.confirm
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText : undefined
  if (!confirmed || !confirmText) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })

  // Accept either the legacy DELETE-DEV-DATA- token or the UI-generated UNSEED-RESTAURANT- token
  const validPrefix = confirmText.startsWith('DELETE-DEV-DATA-') || confirmText.startsWith('UNSEED-RESTAURANT-') || confirmText.startsWith('UNSEED-')
  if (!validPrefix) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  try {
    // Set CLEANUP_CONFIRM so the script actually performs deletes
    const result = await runScriptWithEnv('scripts/cleanup-dev-data.js', { CLEANUP_CONFIRM: 'YES' })
    if (result.code !== 0) {
      return NextResponse.json({ error: 'Cleanup script failed', stdout: result.stdout, stderr: result.stderr }, { status: 500 })
    }
    return NextResponse.json({ success: true, stdout: result.stdout })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to run cleanup script', message: err?.message || String(err) }, { status: 500 })
  }
}
