import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { canAccessBusiness, offerDisplayStatus } from '@/lib/sample-offers'

/**
 * MBM-329 — Sample Offers report data. One row per issued offer with its promised
 * incentives, redemption, actual items supplied, substitutions, resulting sales
 * and void/refund flags. Summary + groupings are computed by the page from these rows.
 *
 * Filters: issuedFrom/issuedTo, redeemedFrom/redeemedTo (ISO), customerId, productId,
 * salespersonId (employee id or user id), status (VALID|EXPIRED|REDEEMED|VOIDED),
 * substitution (any|none|paid|free).
 */
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams
  const businessId = q.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  if (!canAccessBusiness(user, businessId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Umbrella business = "All" → no business filter (admins only)
  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { isUmbrellaBusiness: true } })
  const allBusinesses = !!business?.isUmbrellaBusiness && user.role === 'admin'

  const range = (from: string | null, to: string | null) =>
    from || to ? { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } : undefined
  const issuedAt = range(q.get('issuedFrom'), q.get('issuedTo'))
  const redeemedAt = range(q.get('redeemedFrom'), q.get('redeemedTo'))
  const salespersonId = q.get('salespersonId')

  const offers = await prisma.sampleOffers.findMany({
    where: {
      ...(allBusinesses ? {} : { businessId }),
      ...(issuedAt ? { issuedAt } : {}),
      ...(redeemedAt ? { redeemedAt } : {}),
      ...(q.get('customerId') ? { customerId: q.get('customerId')! } : {}),
      ...(q.get('productId') ? { sampledProductId: q.get('productId')! } : {}),
      ...(salespersonId ? { OR: [{ issuedByEmployeeId: salespersonId }, { issuedByUserId: salespersonId }] } : {}),
    },
    orderBy: { issuedAt: 'desc' },
    include: {
      business_customers: { select: { id: true, name: true, customerNumber: true } },
      promo_items: { orderBy: { createdAt: 'asc' } },
      substitutions: { orderBy: { acceptedAt: 'asc' } },
      issued_order: { select: { id: true, orderNumber: true, status: true, order_cancellation: { select: { id: true } } } },
      redeemed_order: {
        select: {
          id: true, orderNumber: true, status: true, createdAt: true, totalAmount: true,
          order_cancellation: { select: { createdAt: true, refundAmount: true, staffReason: true } },
          business_order_items: { select: { quantity: true, unitPrice: true, totalPrice: true, attributes: true } },
        },
      },
    },
  })

  // Names for issuing salespeople and substitution processors
  const employeeIds = [...new Set(offers.map(o => o.issuedByEmployeeId).filter(Boolean))] as string[]
  const userIds = [...new Set(offers.flatMap(o => [o.issuedByUserId, ...o.substitutions.map(s => s.processedByUserId)]).filter(Boolean))] as string[]
  const [employees, users] = await Promise.all([
    employeeIds.length ? prisma.employees.findMany({ where: { id: { in: employeeIds } }, select: { id: true, fullName: true } }) : [],
    userIds.length ? prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
  ])
  const empName = new Map(employees.map(e => [e.id, e.fullName]))
  const userName = new Map(users.map(u => [u.id, u.name]))

  const isVoided = (o: { status: string; order_cancellation: unknown } | null) =>
    !!o && (o.status === 'CANCELLED' || o.status === 'REFUNDED' || !!o.order_cancellation)

  let rows = offers.map(o => {
    const status = offerDisplayStatus(o)
    const redemptionVoided = isVoided(o.redeemed_order)
    const offerLines = (o.redeemed_order?.business_order_items || [])
      .filter(i => (i.attributes as any)?.sampleOfferId === o.id)
      .map(i => {
        const a = i.attributes as any
        return { name: a?.productName || 'Item', quantity: i.quantity, unitPrice: Number(i.unitPrice), total: Number(i.totalPrice), role: a?.sampleRole as string, substitutedFrom: a?.substitutedFrom || null }
      })
    const paidLines = offerLines.filter(l => l.role === 'PROMOTED')
    const promotedSales = paidLines.filter(l => !l.substitutedFrom).reduce((s, l) => s + l.total, 0)
    const substituteSales = paidLines.filter(l => l.substitutedFrom).reduce((s, l) => s + l.total, 0)
    const salespersonId = o.issuedByEmployeeId || o.issuedByUserId
    return {
      id: o.id,
      businessId: o.businessId,
      offerCode: o.offerCode,
      customer: o.business_customers,
      customerPhone: o.customerPhone,
      sampledProductId: o.sampledProductId,
      sampledProductName: o.sampledProductName,
      issuedAt: o.issuedAt,
      expiresAt: o.expiresAt,
      validityDays: o.validityDays,
      salesperson: { id: salespersonId, name: (o.issuedByEmployeeId && empName.get(o.issuedByEmployeeId)) || (o.issuedByUserId && userName.get(o.issuedByUserId)) || 'Unknown' },
      issuedOrder: o.issued_order ? { id: o.issued_order.id, orderNumber: o.issued_order.orderNumber, voided: isVoided(o.issued_order) } : null,
      promisedItems: o.promo_items.map(p => ({ name: p.productName, quantity: p.quantity, suppliedName: p.suppliedProductName })),
      status: status === 'REDEEMED' && redemptionVoided ? 'VOIDED' as const : status,
      redeemedAt: o.redeemedAt,
      redemptionOrder: o.redeemed_order ? {
        id: o.redeemed_order.id,
        orderNumber: o.redeemed_order.orderNumber,
        orderTotal: Number(o.redeemed_order.totalAmount),
        voided: redemptionVoided,
        voidedAt: o.redeemed_order.order_cancellation?.createdAt || null,
        refundAmount: o.redeemed_order.order_cancellation ? Number(o.redeemed_order.order_cancellation.refundAmount) : null,
        voidReason: o.redeemed_order.order_cancellation?.staffReason || null,
      } : null,
      itemsSupplied: offerLines,
      substitutions: o.substitutions.map(s => ({
        id: s.id,
        lineRole: s.lineRole,
        originalProductName: s.originalProductName,
        substituteProductName: s.substituteProductName,
        substituteUnitPrice: Number(s.substituteUnitPrice),
        customerAccepted: s.customerAccepted,
        acceptedAt: s.acceptedAt,
        processedBy: (s.processedByUserId && userName.get(s.processedByUserId)) || 'Unknown',
        redemptionOrderNumber: o.redeemed_order?.orderNumber || null,
      })),
      promotedSales,
      substituteSales,
    }
  })

  const status = q.get('status')
  if (status) rows = rows.filter(r => r.status === status)
  const substitution = q.get('substitution')
  if (substitution === 'none') rows = rows.filter(r => r.substitutions.length === 0)
  else if (substitution === 'any') rows = rows.filter(r => r.substitutions.length > 0)
  else if (substitution === 'paid') rows = rows.filter(r => r.substitutions.some(s => s.lineRole === 'PAID'))
  else if (substitution === 'free') rows = rows.filter(r => r.substitutions.some(s => s.lineRole === 'FREE'))

  return NextResponse.json({ success: true, data: rows })
}
