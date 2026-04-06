import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

function formatConversion(c: any) {
  const tendered = c.tenderedAmount ? Number(c.tenderedAmount) : null
  const requested = Number(c.amount)
  return {
    id: c.id,
    businessId: c.businessId,
    business: c.business ?? undefined,
    amount: requested,
    tenderedAmount: tendered,
    variance: tendered !== null ? tendered - requested : null,
    notes: c.notes,
    status: c.status,
    requestedBy: c.requestedBy,
    requestedAt: c.requestedAt,
    requester: c.requester ?? undefined,
    approvedBy: c.approvedBy,
    approvedAt: c.approvedAt,
    approver: c.approver ?? undefined,
    completedBy: c.completedBy,
    completedAt: c.completedAt,
    completer: c.completer ?? undefined,
    rejectedBy: c.rejectedBy,
    rejectedAt: c.rejectedAt,
    rejecter: c.rejecter ?? undefined,
    rejectionReason: c.rejectionReason,
    outflowEntryId: c.outflowEntryId,
    inflowEntryId: c.inflowEntryId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

/**
 * GET /api/ecocash-conversions/[id]
 * Returns one conversion with all related users and linked cash bucket entries.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const conversion = await prisma.ecocashConversion.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true, type: true } },
        requester: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
        completer: { select: { id: true, name: true, email: true } },
        rejecter: { select: { id: true, name: true, email: true } },
      },
    })

    if (!conversion) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })

    // Attach linked ledger entries if present
    let outflowEntry = null
    let inflowEntry = null
    if (conversion.outflowEntryId) {
      outflowEntry = await prisma.cashBucketEntry.findUnique({ where: { id: conversion.outflowEntryId } })
    }
    if (conversion.inflowEntryId) {
      inflowEntry = await prisma.cashBucketEntry.findUnique({ where: { id: conversion.inflowEntryId } })
    }

    return NextResponse.json({
      success: true,
      data: { ...formatConversion(conversion), outflowEntry, inflowEntry },
    })
  } catch (error) {
    console.error('Error fetching ecocash conversion:', error)
    return NextResponse.json({ error: 'Failed to fetch ecocash conversion' }, { status: 500 })
  }
}
