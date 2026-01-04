import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'

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
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin guard
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }

  try {
    const result = await runScript('scripts/create-admin.js')

    if (result.code !== 0) {
      return NextResponse.json({
        success: false,
        error: 'Admin user creation failed',
        stdout: result.stdout,
        stderr: result.stderr
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        email: 'admin@business.local',
        password: 'admin123'
      },
      stdout: result.stdout
    })
  } catch (err: any) {
    return NextResponse.json({
      error: 'Failed to run admin creation script',
      message: err?.message || String(err)
    }, { status: 500 })
  }
}

// Also support GET for simple redirect-based creation
export async function GET(request: NextRequest) {
  return POST(request)
}
