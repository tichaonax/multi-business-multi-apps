/**
 * MBM-283 Phase 3, extended: default receipt printer — the fallback used at
 * print time when the printing user has no saved per-user choice of their
 * own (see use-print-preferences.ts's defaultPrinterId, checked first
 * client-side and always wins when it applies).
 *
 * Three levels: a workstation-specific default (real hardware pairing) or
 * a print-terminal-specific default (lightweight, no-agent identity — see
 * printing/terminals/route.ts) each take priority over a single
 * business-wide default (the fallback for any caller with neither). A
 * caller passes at most ONE of workstationAgentId / printTerminalId — a
 * given browser is either a paired hardware workstation or a registered
 * terminal, never both.
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
  const workstationAgentId = request.nextUrl.searchParams.get('workstationAgentId') || undefined
  const printTerminalId = request.nextUrl.searchParams.get('printTerminalId') || undefined
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  // Read access is any active member of the business — this just resolves
  // a print-time default, not a management action.
  if (!hasBusinessAccess(user, businessId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  let config = null
  if (printTerminalId) {
    config = await prisma.defaultReceiptPrinterConfigs.findFirst({ where: { businessId, printTerminalId } })
    // Best-effort "still alive" marker — non-blocking, never fails the request.
    prisma.printTerminals.update({ where: { id: printTerminalId }, data: { lastSeenAt: new Date() } }).catch(() => {})
  } else if (workstationAgentId) {
    config = await prisma.defaultReceiptPrinterConfigs.findFirst({ where: { businessId, workstationAgentId } })
  }
  if (!config) {
    config = await prisma.defaultReceiptPrinterConfigs.findFirst({ where: { businessId, workstationAgentId: null, printTerminalId: null } })
  }

  return NextResponse.json({ success: true, printerId: config?.printerId ?? null })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, workstationAgentId, printTerminalId, printerId } = await request.json() as {
      businessId?: string
      workstationAgentId?: string | null
      printTerminalId?: string | null
      printerId?: string
    }
    if (!businessId || !printerId) {
      return NextResponse.json({ error: 'businessId and printerId are required' }, { status: 400 })
    }
    if (workstationAgentId && printTerminalId) {
      return NextResponse.json({ error: 'Pass at most one of workstationAgentId or printTerminalId, not both' }, { status: 400 })
    }
    if (!canManageDefault(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
    }

    // Reuse the same authorization check print dispatch itself uses — a
    // default should never point at a printer this business couldn't
    // actually print to (an AGENT-mode printer not assigned/not
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

    const existing = await prisma.defaultReceiptPrinterConfigs.findFirst({
      where: { businessId, workstationAgentId: workstationAgentId ?? null, printTerminalId: printTerminalId ?? null },
    })

    const config = existing
      ? await prisma.defaultReceiptPrinterConfigs.update({
          where: { id: existing.id },
          data: { printerId, updatedBy: user.id },
        })
      : await prisma.defaultReceiptPrinterConfigs.create({
          data: { businessId, workstationAgentId: workstationAgentId ?? null, printTerminalId: printTerminalId ?? null, printerId, updatedBy: user.id },
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
  const workstationAgentId = request.nextUrl.searchParams.get('workstationAgentId') || undefined
  const printTerminalId = request.nextUrl.searchParams.get('printTerminalId') || undefined
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  if (!canManageDefault(user, businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  await prisma.defaultReceiptPrinterConfigs.deleteMany({
    where: { businessId, workstationAgentId: workstationAgentId ?? null, printTerminalId: printTerminalId ?? null },
  })
  return NextResponse.json({ success: true })
}
