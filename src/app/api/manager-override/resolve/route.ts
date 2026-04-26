import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import bcrypt from 'bcryptjs'

// POST /api/manager-override/resolve
// Body: { value: string, businessId: string }
// Resolves a typed code or scanned card to a manager identity.
// Checks employee scanToken first, then override code hash.
// Does NOT log — logging happens in the cancel or cancel/log routes.
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // rawValue preserves original case for scanToken lookup (tokens stored as-scanned)
  // upperValue is used only for override code comparison (codes stored uppercase)
  const rawValue = String(body.value ?? '').trim()
  const upperValue = rawValue.toUpperCase()
  const businessId = String(body.businessId ?? '').trim()

  if (!rawValue) return NextResponse.json({ error: 'value is required' }, { status: 400 })
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

  // Step 1: Check if this matches an employee's scanToken (exact case match)
  const employee = await prisma.employees.findFirst({
    where: { scanToken: rawValue, isActive: true },
    select: {
      fullName: true,
      users: {
        select: { id: true, isActive: true, role: true, permissions: true, business_memberships: true },
      },
    },
  })

  if (employee) {
    if (!employee.users || !employee.users.isActive) {
      return NextResponse.json({ error: 'Employee does not have an active user account' }, { status: 403 })
    }
    const empUser = { ...employee.users, businessMemberships: (employee.users as any).business_memberships }
    const perms = getEffectivePermissions(empUser as any, businessId)
    if (employee.users.role !== 'admin' && !perms.canCloseBooks) {
      return NextResponse.json({ error: 'Employee does not have manager permissions' }, { status: 403 })
    }
    return NextResponse.json({
      managerId: employee.users.id,
      managerName: employee.fullName,
      method: 'CARD',
    })
  }

  // Step 2: Check override code hash
  const now = new Date()
  const allCodes = await prisma.managerOverrideCodes.findMany({
    select: { userId: true, codeHash: true, expiresAt: true },
  })

  for (const record of allCodes) {
    const matches = await bcrypt.compare(upperValue, record.codeHash)
    if (!matches) continue

    if (record.expiresAt <= now) {
      return NextResponse.json({ error: 'Override code expired — manager must renew it' }, { status: 401 })
    }

    // Fetch the manager user to check permissions
    const manager = await prisma.users.findUnique({
      where: { id: record.userId },
      select: { id: true, name: true, isActive: true, role: true, permissions: true, business_memberships: true },
    })
    if (!manager || !manager.isActive) {
      return NextResponse.json({ error: 'Manager account is not active' }, { status: 403 })
    }
    const mgr = { ...manager, businessMemberships: (manager as any).business_memberships }
    const perms = getEffectivePermissions(mgr as any, businessId)
    if (manager.role !== 'admin' && !perms.canCloseBooks) {
      return NextResponse.json({ error: 'User does not have manager permissions' }, { status: 403 })
    }

    return NextResponse.json({
      managerId: manager.id,
      managerName: manager.name,
      method: 'CODE',
    })
  }

  return NextResponse.json({ error: 'Invalid code or unrecognised card' }, { status: 401 })
}
