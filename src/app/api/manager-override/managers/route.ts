import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// GET /api/manager-override/managers?businessId=xxx
// Returns all managers eligible to approve an override for the given business.
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = req.nextUrl.searchParams.get('businessId') || ''
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

  // Fetch all active users who have a membership in this business
  const memberships = await prisma.businessMemberships.findMany({
    where: { businessId, isActive: true },
    select: {
      userId: true,
      users: {
        select: { id: true, name: true, isActive: true, role: true, permissions: true },
      },
    },
  })

  // Also include admins (they can override in any business)
  const admins = await prisma.users.findMany({
    where: { role: 'admin', isActive: true },
    select: { id: true, name: true, isActive: true, role: true, permissions: true },
  })

  const seen = new Set<string>()
  const managers: { id: string; name: string }[] = []

  const addIfManager = (u: { id: string; name: string | null; isActive: boolean; role: string; permissions: any }) => {
    if (!u.isActive || seen.has(u.id)) return
    if (u.role === 'admin') {
      seen.add(u.id)
      managers.push({ id: u.id, name: u.name || 'Admin' })
      return
    }
    // Build a minimal user object for getEffectivePermissions
    const memberships = (u as any).business_memberships ?? []
    const perms = getEffectivePermissions({ ...u, businessMemberships: memberships } as any, businessId)
    if (perms.canCloseBooks) {
      seen.add(u.id)
      managers.push({ id: u.id, name: u.name || 'Manager' })
    }
  }

  for (const m of memberships) {
    if (m.users) addIfManager(m.users as any)
  }
  for (const a of admins) {
    addIfManager(a as any)
  }

  managers.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ managers })
}
