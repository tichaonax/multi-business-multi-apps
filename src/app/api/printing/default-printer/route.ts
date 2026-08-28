/**
 * MBM-283 Phase 3: business-wide default receipt printer — the fallback
 * used at print time when the printing user has no saved per-user choice
 * of their own (see use-print-preferences.ts's defaultPrinterId, which is
 * checked first client-side and always wins when it applies). Exists
 * specifically so mobile/remote printing has a sane default without every
 * user having to pick a printer by hand — see MBM-283's plan, Phase 3.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'

function canManageDefault(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || getUserRoleInBusiness(user, businessId) === 'business-owner'
}

function hasBusinessAccess(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || (user.businessMemberships?.some(m => m.businessId === businessId && m.isActive) ?? false)
}

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  // Read access is any active member of the business — this just resolves
  // a print-time default, not a management action.
  if (!hasBusinessAccess(user, businessId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const config = await prisma.defaultReceiptPrinterConfigs.findUnique({ where: { businessId } })
  return NextResponse.json({ success: true, printerId: config?.printerId ?? null })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, printerId } = await request.json() as { businessId?: string; printerId?: string }
    if (!businessId || !printerId) {
      return NextResponse.json({ error: 'businessId and printerId are required' }, { status: 400 })
    }
    if (!canManageDefault(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
    }

    // Reuse the same authorization check print dispatch itself uses — a
    // business-wide default should never point at a printer this business
    // couldn't actually print to (an AGENT-mode printer not assigned/not
    // remote-enabled for this business).
    const { resolvePrinterForBusiness, PrinterAuthorizationError } = await import('@/lib/printing/print-dispatch')
    try {
      await resolvePrinterForBusiness(printerId, businessId)
    } catch (err) {
      if (err instanceof PrinterAuthorizationError) {
        return NextResponse.json({ error: err.message }, { status: err.message === 'Printer not found' ? 404 : 403 })
      }
      throw err
    }

    const config = await prisma.defaultReceiptPrinterConfigs.upsert({
      where: { businessId },
      create: { businessId, printerId, updatedBy: user.id },
      update: { printerId, updatedBy: user.id },
    })

    return NextResponse.json({ success: true, printerId: config.printerId })
  } catch (error) {
    console.error('[Default Printer] POST error:', error)
    return NextResponse.json({ error: 'Failed to save default printer' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  if (!canManageDefault(user, businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  await prisma.defaultReceiptPrinterConfigs.deleteMany({ where: { businessId } })
  return NextResponse.json({ success: true })
}
