import { NextRequest, NextResponse } from 'next/server'
import { getProgress, requestCancel } from '@/lib/backup-progress'
import { getServerUser } from '@/lib/get-server-user'
import { isBusinessOwner } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing progress id' }, { status: 400 })
  }
  console.log(`[api/backup/progress] GET id=${id} pid=${process.pid} reqUrl=${request.url}`)

  const progress = getProgress(id)
  if (!progress) {
    console.log(`[api/backup/progress] GET no progress for id=${id} pid=${process.pid}`)
    return NextResponse.json({ error: 'Progress id not found' }, { status: 404 })
  }

  return NextResponse.json({ progress })
}

/**
 * MBM-334 — Stop a running backup or restore: POST /api/backup/progress?id=…
 * The job notices before its next table (backup) or record (restore).
 */
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  // Same people who may start one (backup: admin/manager/owner; restore: admin)
  if (!user || !(user.role === 'admin' || user.role === 'manager' || isBusinessOwner(user))) {
    return NextResponse.json({ error: 'You are not allowed to stop a backup or restore' }, { status: 403 })
  }
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing progress id' }, { status: 400 })
  const progress = getProgress(id)
  if (!progress) return NextResponse.json({ error: 'Progress id not found' }, { status: 404 })
  if (progress.model === 'completed' || progress.model === 'error' || progress.model === 'cancelled') {
    return NextResponse.json({ stopped: false, message: 'Already finished' })
  }
  requestCancel(id)
  console.log(`[api/backup/progress] stop requested id=${id} by ${user.id}`)
  return NextResponse.json({ stopped: true })
}
