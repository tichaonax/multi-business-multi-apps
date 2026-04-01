import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/user/permissions
 * Returns the current user's permissions and role for client-side permission checks.
 * (useSession only stores id/role/name — permissions require a DB fetch via getServerUser)
 */
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ permissions: user.permissions ?? {}, role: user.role })
}
