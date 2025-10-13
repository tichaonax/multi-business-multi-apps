import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any
  if (!session?.users?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { filename } = await params
  const base = path.join(process.cwd(), 'scripts')
  const abs = path.join(base, filename)
  if (!fs.existsSync(abs)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const content = fs.readFileSync(abs, 'utf8')
  return new NextResponse(content, { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${filename}"` } })
}
