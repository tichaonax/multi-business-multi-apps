import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Import seed function to run in-process
const { seed: seedHardware } = require('../../../../../scripts/seed-hardware-demo.js')

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any
  if (!session?.users?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const confirmed = !!body.confirm
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText : undefined
  if (!confirmed || !confirmText) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  if (!confirmText.startsWith('SEED-HARDWARE-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  try {
    await seedHardware()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Seed hardware in-process failed:', err)
    return NextResponse.json({ error: 'Failed to run seed script in-process', message: err?.message || String(err) }, { status: 500 })
  }
}
