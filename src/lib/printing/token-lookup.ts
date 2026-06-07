/**
 * Token lookup for receipt reprints.
 *
 * WiFi token sales (ESP32 and R710) are not linked to business orders by orderId.
 * When an order is first created, the order item attributes now store `tokenIds`
 * (added in MBM-233). For older orders without stored tokenIds, we fall back to a
 * time-window query against the token sales tables.
 */

import { PrismaClient } from '@prisma/client'

type PrismaLike = PrismaClient & any

export async function lookupOrderTokens(
  prisma: PrismaLike,
  order: {
    id: string
    businessId: string
    createdAt: Date
    business_order_items: Array<{
      quantity: number
      attributes: any
    }>
  }
): Promise<{ r710Tokens: any[]; wifiTokens: any[] }> {
  const r710Tokens: any[] = []
  const wifiTokens: any[] = []

  // ── R710 tokens ──────────────────────────────────────────────────────────────
  const r710Items = order.business_order_items.filter(i => i.attributes?.r710Token === true)

  for (const item of r710Items) {
    const attrs = item.attributes || {}
    const storedIds: string[] | undefined = attrs.tokenIds

    if (storedIds && storedIds.length > 0) {
      // New orders: tokenIds stored at sale time
      const tokens = await prisma.r710Tokens.findMany({
        where: { id: { in: storedIds } },
        include: { r710_token_configs: true, r710_wlans: true },
      })
      for (const t of tokens) {
        r710Tokens.push({
          username: t.username,
          password: t.password,
          packageName: t.r710_token_configs?.name || attrs.productName || 'WiFi',
          durationValue: t.r710_token_configs?.durationValue || 0,
          durationUnit: t.r710_token_configs?.durationUnit || 'hour_Hours',
          deviceLimit: t.r710_token_configs?.deviceLimit,
          expiresAt: t.expiresAtR710,
          ssid: t.r710_wlans?.ssid,
          success: true,
        })
      }
    } else {
      // Older orders: time-window fallback (order.createdAt ± 2 min)
      const windowStart = new Date(order.createdAt.getTime() - 5_000)
      const windowEnd   = new Date(order.createdAt.getTime() + 120_000)

      const sales = await prisma.r710TokenSales.findMany({
        where: {
          businessId: order.businessId,
          saleChannel: 'POS',
          soldAt: { gte: windowStart, lte: windowEnd },
          ...(attrs.tokenConfigId
            ? { r710_tokens: { tokenConfigId: attrs.tokenConfigId } }
            : {}),
        },
        include: {
          r710_tokens: { include: { r710_token_configs: true, r710_wlans: true } },
        },
        take: item.quantity,
      })

      for (const sale of sales) {
        const t = sale.r710_tokens
        r710Tokens.push({
          username: t.username,
          password: t.password,
          packageName: t.r710_token_configs?.name || attrs.productName || 'WiFi',
          durationValue: t.r710_token_configs?.durationValue || 0,
          durationUnit: t.r710_token_configs?.durationUnit || 'hour_Hours',
          deviceLimit: t.r710_token_configs?.deviceLimit,
          expiresAt: t.expiresAtR710,
          ssid: t.r710_wlans?.ssid,
          success: true,
        })
      }
    }
  }

  // ── ESP32 WiFi tokens ─────────────────────────────────────────────────────────
  const esp32Items = order.business_order_items.filter(i => i.attributes?.wifiToken === true)

  for (const item of esp32Items) {
    const attrs = item.attributes || {}
    const storedIds: string[] | undefined = attrs.tokenIds

    if (storedIds && storedIds.length > 0) {
      // New orders: tokenIds stored at sale time
      const tokens = await prisma.wifiTokens.findMany({
        where: { id: { in: storedIds } },
        include: { token_configurations: true },
      })
      for (const t of tokens) {
        wifiTokens.push({
          tokenCode: t.token,
          packageName: t.token_configurations?.name || attrs.productName || 'WiFi Access',
          duration: t.token_configurations?.durationMinutes || 0,
          bandwidthDownMb: t.token_configurations?.bandwidthDownMb || 0,
          bandwidthUpMb: t.token_configurations?.bandwidthUpMb || 0,
          success: true,
        })
      }
    } else {
      // Older orders: time-window fallback
      const windowStart = new Date(order.createdAt.getTime() - 5_000)
      const windowEnd   = new Date(order.createdAt.getTime() + 120_000)

      const sales = await prisma.wifiTokenSales.findMany({
        where: {
          businessId: order.businessId,
          saleChannel: 'POS',
          soldAt: { gte: windowStart, lte: windowEnd },
          ...(attrs.tokenConfigId
            ? { wifi_tokens: { tokenConfigId: attrs.tokenConfigId } }
            : {}),
        },
        include: {
          wifi_tokens: { include: { token_configurations: true } },
        },
        take: item.quantity,
      })

      for (const sale of sales) {
        const t = sale.wifi_tokens
        wifiTokens.push({
          tokenCode: t.token,
          packageName: t.token_configurations?.name || attrs.productName || 'WiFi Access',
          duration: t.token_configurations?.durationMinutes || 0,
          bandwidthDownMb: t.token_configurations?.bandwidthDownMb || 0,
          bandwidthUpMb: t.token_configurations?.bandwidthUpMb || 0,
          success: true,
        })
      }
    }
  }

  return { r710Tokens, wifiTokens }
}
