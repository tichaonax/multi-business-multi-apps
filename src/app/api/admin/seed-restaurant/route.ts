import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getServerUser } from '@/lib/get-server-user'

async function runScript(scriptPath: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const proc = spawn('node', [scriptPath], { cwd: process.cwd(), env: process.env })
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
  if (!confirmText.startsWith('SEED-RESTAURANT-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  try {
    const result = await runScript('scripts/seed-restaurant-demo.js')
    if (result.code !== 0) {
      return NextResponse.json({ error: 'Seed script failed', stdout: result.stdout, stderr: result.stderr }, { status: 500 })
    }
    return NextResponse.json({ success: true, stdout: result.stdout })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to run seed script', message: err?.message || String(err) }, { status: 500 })
  }
}
