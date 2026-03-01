import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'

const { seedDemoExpensePayments } = require('../../../../../scripts/seed-demo-expense-payments.js')

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const devBypass = process.env.FORCE_ADMIN_SESSION === 'true' && body._forceAdmin
  if (!devBypass) {
    const user = await getServerUser()
    const currentUser = user as any
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const confirmed = !!body.confirm
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText : undefined
  if (!confirmed || !confirmText) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  if (!confirmText.startsWith('SEED-EXPENSE-PAYMENTS-')) {
    return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })
  }

  try {
    await seedDemoExpensePayments()
    return NextResponse.json({ success: true, message: 'Expense payments seeded successfully' })
  } catch (err: any) {
    console.error('Seed expense payments failed:', err)
    return NextResponse.json(
      { error: 'Failed to seed expense payments', message: err?.message || String(err) },
      { status: 500 }
    )
  }
}
