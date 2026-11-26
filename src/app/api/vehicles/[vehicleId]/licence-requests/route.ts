// MBM-346: the latest expense request raised to pay for renewing one of this
// vehicle's licences, so the renewal window can say "funds requested —
// awaiting approval" / "approved — enter the licence".
//
// It looks for combo request lines for this vehicle with a Licensing (or
// Insurance) cost of that licence type, made after the current licence was
// entered. Once the new licence is entered it becomes the current one, so an
// older request no longer matches and the banner goes away by itself.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest, { params }: { params: Promise<{ vehicleId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { vehicleId } = await params
    const licenseType = new URL(request.url).searchParams.get('licenseType') || ''
    if (!licenseType) return NextResponse.json({ error: 'licenseType is required' }, { status: 400 })

    // The current licence of that type (the newest entered); requests before it are done with
    const current = await prisma.vehicleLicenses.findFirst({
      where: { vehicleId, licenseType: licenseType as any },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    const line = await prisma.comboPaymentRequestItems.findFirst({
      where: {
        vehicleId,
        ...(licenseType === 'INSURANCE'
          ? { vehicleExpenseType: 'INSURANCE' }
          : { vehicleExpenseType: 'LICENSING', vehicleLicenseType: licenseType }),
        request: {
          status: { not: 'DRAFT' },
          ...(current ? { createdAt: { gt: current.createdAt } } : {}),
        },
      },
      orderBy: { request: { createdAt: 'desc' } },
      select: {
        id: true,
        estimatedAmount: true,
        request: {
          select: {
            id: true, title: true, status: true, accountId: true,
            requestedAmount: true, approvedAmount: true,
            createdAt: true, submittedAt: true, approvedAt: true,
            expenseAccount: { select: { accountName: true } },
            creator: { select: { name: true } },
          },
        },
      },
    })

    if (!line) return NextResponse.json({ success: true, data: null })
    const r = line.request
    return NextResponse.json({
      success: true,
      data: {
        id: r.id,
        itemId: line.id, // MBM-347: "combo-item:<itemId>" links the licence to this cost
        title: r.title,
        status: r.status,
        accountId: r.accountId,
        accountName: r.expenseAccount?.accountName ?? null,
        amount: Number(line.estimatedAmount ?? r.requestedAmount ?? 0),
        approvedAmount: r.approvedAmount != null ? Number(r.approvedAmount) : null,
        requestedBy: r.creator?.name ?? null,
        createdAt: r.createdAt.toISOString(),
        submittedAt: r.submittedAt?.toISOString() ?? null,
        approvedAt: r.approvedAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error('licence-requests GET error:', error)
    return NextResponse.json({ error: 'Failed to load the licence request' }, { status: 500 })
  }
}
