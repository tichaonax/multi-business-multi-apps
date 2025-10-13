import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import path from 'path'

// Path to the runtime script (may only exist in development environments).
const restoreModulePath = path.join(process.cwd(), 'scripts', 'restore-from-backup')

/**
 * Dev scripts allowlist check. You can opt-in to enable dev scripts on non-dev
 * hosts by setting `ALLOW_DEV_SCRIPTS=true` in the environment.
 */
function devScriptsAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_SCRIPTS === 'true'
}

/**
 * Lazily load the restore module at request time. We avoid a top-level `require`
 * so the Next bundler won't attempt to resolve dev-only scripts during the
 * production build. Using eval('require') prevents static analysis from
 * picking up the import path.
 */
function loadRestore(): ((filePath: string) => Promise<void>) | null {
  if (!devScriptsAllowed()) return null

  try {
    // eslint-disable-next-line no-eval
    const req = eval('require') as NodeRequire
    const restoreModule = req(restoreModulePath)
    return restoreModule?.restore ?? null
  } catch (error) {
    console.warn('restore-from-backup module not available at runtime:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any
  if (!session?.users?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const filename = body?.filename
  const confirmed = !!body?.confirm
  const confirmText = typeof body?.confirmText === 'string' ? body.confirmText : undefined
  if (!filename || !confirmed || !confirmText) return NextResponse.json({ error: 'filename and confirmation required' }, { status: 400 })
  if (!confirmText.startsWith('RESTORE-BACKUP-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  const restore = loadRestore()
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
