import { NextRequest, NextResponse } from 'next/server'
import runSeedMigration from '@/lib/seed/seed-migration'
import { getServerUser } from '@/lib/get-server-user'

function devScriptsAllowed(): boolean {
  // Allow only when explicitly enabled in non-production environments
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ALLOW_DEV_SCRIPTS === 'true'
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Deny in production always and require explicit flag for dev environments
  if (!devScriptsAllowed()) {
    console.warn('Blocked attempt to run migration seeding via API by user:', user?.email || user?.id)
    return NextResponse.json({ error: 'Seeding disabled in this environment' }, { status: 403 })
  }

  try {
    await runSeedMigration()
    return NextResponse.json({ ok: true, message: 'Migration seeding started/completed' })
  } catch (err: any) {
    console.error('Seed migration API error:', err)
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
