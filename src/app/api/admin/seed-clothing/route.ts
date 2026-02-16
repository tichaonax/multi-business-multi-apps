import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'

// Import seed function to run in-process
const { seed: seedClothing } = require('../../../../../scripts/seed-clothing-demo.js')

export async function POST(request: NextRequest) {
    // Allow a developer bypass when FORCE_ADMIN_SESSION is set and the request includes _forceAdmin: true
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
    if (!confirmText.startsWith('SEED-CLOTHING-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

    try {
        await seedClothing()
        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Seed clothing in-process failed:', err)
        return NextResponse.json({ error: 'Failed to run clothing seed script in-process', message: err?.message || String(err) }, { status: 500 })
    }
}
