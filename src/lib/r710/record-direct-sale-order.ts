/**
 * MBM-338 — a WiFi pass sold from the left-menu "WiFi Sales" screen (direct
 * sale) is real income for the business. The sale itself already puts the
 * money in the business's WiFi expense account; this also records it as a
 * completed, paid order so it shows in sales reports, end-of-day/salesperson
 * sales and Receipt History, like WiFi sold in the POS.
 *
 * The business account is NOT credited — the money lives in the WiFi account.
 *
 * Passes sold in one checkout share a `saleGroupId`, so they land on one order.
 */
import { prisma } from '@/lib/prisma'

const PREFIX: Record<string, string> = {
  clothing: 'CLO', hardware: 'HWD', grocery: 'GRC', restaurant: 'RST', consulting: 'CON',
  services: 'SVC', retail: 'RTL', construction: 'CTN', vehicles: 'VEH', vehicle_service: 'VSV',
}

function orderNumberFor(businessType: string, orderCount: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${PREFIX[businessType] || 'BIZ'}-${date}-${String(orderCount + 1).padStart(4, '0')}`
}

export async function recordDirectWifiSaleOrder(params: {
  businessId: string
  user: { id: string; name?: string | null; email?: string | null }
  saleGroupId?: string | null
  tokenId: string
  code: string
  packageName: string
  tokenConfigId: string
  amount: number
  paymentMethod: string
  ecocashFeeAmount?: number
  ecocashTransactionCode?: string
}): Promise<{ id: string; orderNumber: string } | null> {
  const { businessId, user, saleGroupId, tokenId, code, packageName, tokenConfigId, amount, paymentMethod } = params
  if (!(amount > 0)) return null // free passes aren't sales

  const method = paymentMethod === 'ECOCASH' ? 'ECOCASH' : paymentMethod === 'CARD' ? 'CARD' : 'CASH'
  const item = {
    productVariantId: null,
    quantity: 1,
    unitPrice: amount,
    discountAmount: 0,
    totalPrice: amount,
    attributes: {
      productName: `📶 ${packageName}`,
      packageName,
      category: 'R710 WiFi',
      r710Token: true,
      tokenConfigId,
      tokenIds: [tokenId],
      tokenCodes: [code],
      directSale: true,
    },
  }

  // Add to the order already started for this checkout, if any
  if (saleGroupId) {
    const existing = await prisma.businessOrders.findFirst({
      where: { businessId, attributes: { path: ['directWifiSaleGroup'], equals: saleGroupId } },
      select: { id: true, orderNumber: true, subtotal: true, totalAmount: true },
    })
    if (existing) {
      await prisma.$transaction([
        prisma.businessOrderItems.create({ data: { ...item, orderId: existing.id } as any }),
        prisma.businessOrders.update({
          where: { id: existing.id },
          data: {
            subtotal: Number(existing.subtotal) + amount,
            totalAmount: Number(existing.totalAmount) + amount,
            updatedAt: new Date(),
          },
        }),
      ])
      return { id: existing.id, orderNumber: existing.orderNumber }
    }
  }

  const [business, employee] = await Promise.all([
    prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } }),
    prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } }),
  ])
  const businessType = business?.type || 'other'

  const create = async (orderNumber: string) => prisma.businessOrders.create({
    data: {
      businessId,
      orderNumber,
      employeeId: employee?.id ?? null,
      createdBy: user.id,
      orderType: 'SALE',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: method as any,
      subtotal: amount,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: amount,
      businessType,
      transactionDate: new Date(),
      notes: 'WiFi direct sale',
      attributes: {
        posOrder: true,
        directWifiSale: true,
        ...(saleGroupId ? { directWifiSaleGroup: saleGroupId } : {}),
        employeeName: user.name || user.email || 'Unknown',
        ...(method === 'ECOCASH' && params.ecocashTransactionCode ? {
          ecocashTransactionCode: params.ecocashTransactionCode,
          ecocashFeeAmount: params.ecocashFeeAmount,
        } : {}),
      },
      updatedAt: new Date(),
      business_order_items: { create: [item as any] },
    },
    select: { id: true, orderNumber: true },
  })

  const count = await prisma.businessOrders.count({ where: { businessId } })
  try {
    return await create(orderNumberFor(businessType, count))
  } catch (err: any) {
    // order-number collision — make it unique, as the POS order routes do
    if (err?.code === 'P2002') return await create(`${orderNumberFor(businessType, count)}-${Date.now().toString().slice(-6)}`)
    throw err
  }
}
