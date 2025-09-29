import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import runSeedMigration from '@/lib/seed/seed-migration'

function devScriptsAllowed(): boolean {
  // Allow only when explicitly enabled in non-production environments
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ALLOW_DEV_SCRIPTS === 'true'
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  if (!session || !(session as any).user || (session as any).user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Deny in production always and require explicit flag for dev environments
  if (!devScriptsAllowed()) {
    console.warn('Blocked attempt to run migration seeding via API by user:', (session as any).user?.email || (session as any).user?.id)
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
