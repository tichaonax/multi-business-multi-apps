import { NextRequest, NextResponse } from 'next/server'
import { getProgress } from '@/lib/backup-progress'

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
