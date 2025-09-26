import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

function isAdminRequest(req: NextRequest) {
  // lightweight placeholder - we'll get session below per-route
  return true
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const base = path.join(process.cwd(), 'scripts')
  if (!fs.existsSync(base)) return NextResponse.json({ backups: [] })
  const files = fs.readdirSync(base).filter(f => f.startsWith('cleanup-backup-') && f.endsWith('.json'))
  const stats = files.map(f => {
    const stat = fs.statSync(path.join(base, f))
    return { name: f, mtime: stat.mtime.getTime(), size: stat.size }
  }).sort((a,b) => b.mtime - a.mtime)
  return NextResponse.json({ backups: stats })
}
