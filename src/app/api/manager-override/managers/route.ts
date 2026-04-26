import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/manager-override/managers?businessId=xxx
// Returns all managers eligible to approve an override for the given business.
// Eligible = admin role, OR business-manager / business-owner membership for the business.
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = req.nextUrl.searchParams.get('businessId') || ''
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

  const MANAGER_ROLES = ['business-owner', 'business-manager']

  // Fetch memberships with manager-level roles for this business
  const memberships = await prisma.businessMemberships.findMany({
    where: {
      businessId,
      isActive: true,
      role: { in: MANAGER_ROLES },
    },
    select: {
      users: {
        select: { id: true, name: true, isActive: true },
      },
    },
  })

  // Also fetch system admins (they can override in any business)
  const admins = await prisma.users.findMany({
    where: { role: 'admin', isActive: true },
    select: { id: true, name: true },
  })

  const seen = new Set<string>()
  const managers: { id: string; name: string }[] = []

  for (const a of admins) {
    if (!seen.has(a.id)) {
      seen.add(a.id)
      managers.push({ id: a.id, name: a.name || 'Admin' })
    }
  }

  for (const m of memberships) {
    if (m.users && m.users.isActive && !seen.has(m.users.id)) {
      seen.add(m.users.id)
      managers.push({ id: m.users.id, name: m.users.name || 'Manager' })
    }
  }

  managers.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ managers })
}
