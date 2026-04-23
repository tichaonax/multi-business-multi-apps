/**
 * MBM-188: Backfill canViewPOSSoldCount and canViewPOSStockCount
 * into all business_memberships rows based on their role preset.
 *
 * Run: npx ts-node --env-file .env.local scripts/set-pos-badge-permissions.ts
 *
 * This script OVERWRITES any existing value for these two keys with the
 * correct preset value, fixing rows that were saved with wrong data.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// These must match the exact role strings stored in business_memberships.role
const TRUE_ROLES = new Set([
  'business-owner',
  'business-manager',
  'employee',
  'salesperson',
  'restaurant-associate',
  'grocery-associate',
  'clothing-associate',
  'system-admin',
])

const FALSE_ROLES = new Set([
  'read-only',
  'delivery-driver',
])

async function main() {
  const memberships = await prisma.businessMemberships.findMany({
    select: { id: true, role: true, permissions: true, businesses: { select: { name: true } } }
  })

  let updated = 0
  let skipped = 0

  for (const m of memberships) {
    const role = (m.role || '').toLowerCase()
    let canView: boolean

    if (TRUE_ROLES.has(role)) {
      canView = true
    } else if (FALSE_ROLES.has(role)) {
      canView = false
    } else {
      console.log(`  SKIP unknown role "${role}" on membership ${m.id}`)
      skipped++
      continue
    }

    const existing = (m.permissions as Record<string, unknown>) || {}
    const updatedPerms = {
      ...existing,
      canViewPOSSoldCount: canView,
      canViewPOSStockCount: canView,
    }

    await prisma.businessMemberships.update({
      where: { id: m.id },
      data: { permissions: updatedPerms }
    })

    console.log(`  SET ${canView ? 'true ' : 'false'} → ${m.businesses?.name || m.id} (${role})`)
    updated++
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Total: ${memberships.length}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
