import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getServerUser } from '@/lib/get-server-user'

function isAdminRequest(req: NextRequest) {
  // lightweight placeholder - we'll get session below per-route
  return true
}

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  const currentUser = user as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check multiple directories for backup files
  const searchPaths = [
    path.join(process.cwd(), 'scripts'),
    process.cwd(), // Root directory
  ]

  const allBackups: { name: string; mtime: number; size: number }[] = []

  for (const basePath of searchPaths) {
    if (!fs.existsSync(basePath)) continue

    const files = fs.readdirSync(basePath).filter(f =>
      (f.includes('backup') || f.includes('restore')) &&
      f.endsWith('.json') &&
      !f.includes('node_modules')
    )

    const stats = files.map(f => {
      const stat = fs.statSync(path.join(basePath, f))
      return { name: f, mtime: stat.mtime.getTime(), size: stat.size }
    })

    allBackups.push(...stats)
  }

  // Remove duplicates and sort by modification time
  const uniqueBackups = Array.from(
    new Map(allBackups.map(b => [b.name, b])).values()
  ).sort((a, b) => b.mtime - a.mtime)

  return NextResponse.json({ backups: uniqueBackups })
}
