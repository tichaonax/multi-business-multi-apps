import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import path from 'path'

// Use absolute path based on process.cwd() so Next's bundler can resolve the runtime script
const restoreModulePath = path.join(process.cwd(), 'scripts', 'restore-from-backup')
let restore: any
try {
  const restoreModule = require(restoreModulePath)
  restore = restoreModule.restore
} catch (error) {
  console.warn('restore-from-backup module not available during build:', error)
  restore = null
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const filename = body?.filename
  const confirmed = !!body?.confirm
  const confirmText = typeof body?.confirmText === 'string' ? body.confirmText : undefined
  if (!filename || !confirmed || !confirmText) return NextResponse.json({ error: 'filename and confirmation required' }, { status: 400 })
  if (!confirmText.startsWith('RESTORE-BACKUP-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  if (!restore) {
    return NextResponse.json({ error: 'Restore functionality not available' }, { status: 503 })
  }

  try {
    const abs = path.join(process.cwd(), 'scripts', filename)
    await restore(abs)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Restore failed', message: err?.message || String(err) }, { status: 500 })
  }
}
