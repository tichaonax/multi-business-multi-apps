/**
 * MBM-188: Backfill canViewPOSSoldCount and canViewPOSStockCount permissions
 * into existing business_memberships and users rows based on current role.
 *
 * Run: npx ts-node --env-file .env.local scripts/set-pos-badge-permissions.ts
 *
 * Roles that get TRUE: owner, manager, employee, salesperson, restaurant_associate
 * Roles that get FALSE: read_only, delivery_driver
 * Users: all existing users get TRUE in their global permissions
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TRUE_ROLES = new Set(['owner', 'manager', 'employee', 'salesperson', 'restaurant_associate'])
const FALSE_ROLES = new Set(['read_only', 'delivery_driver'])

async function main() {
  // --- Business memberships ---
  const memberships = await prisma.businessMembership.findMany({
    select: { id: true, role: true, permissions: true }
  })

  let membershipUpdated = 0
  for (const m of memberships) {
    const role = (m.role || '').toLowerCase()
    if (!TRUE_ROLES.has(role) && !FALSE_ROLES.has(role)) continue

    const canView = TRUE_ROLES.has(role)
    const existing = (m.permissions as Record<string, unknown>) || {}
    const updated = {
      ...existing,
      canViewPOSSoldCount: canView,
      canViewPOSStockCount: canView
    }
    await prisma.businessMembership.update({
      where: { id: m.id },
      data: { permissions: updated }
    })
    membershipUpdated++
  }
  console.log(`Updated ${membershipUpdated} / ${memberships.length} business memberships`)

  // --- Users (global permissions) ---
  const users = await prisma.user.findMany({
    select: { id: true, permissions: true }
  })

  let userUpdated = 0
  for (const u of users) {
    const existing = (u.permissions as Record<string, unknown>) || {}
    const updated = {
      ...existing,
      canViewPOSSoldCount: true,
      canViewPOSStockCount: true
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { permissions: updated }
    })
    userUpdated++
  }
  console.log(`Updated ${userUpdated} / ${users.length} users`)

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
