import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// Returns the UTC timestamp for midnight of `date`'s local calendar date in `tz`.
// Works for any fixed or DST timezone without external libraries.
function startOfDayInTZ(now: Date, tz: string): Date {
  // Get local calendar date string (ISO format: "YYYY-MM-DD")
  const localDateStr = now.toLocaleDateString('sv', { timeZone: tz })
  const [y, m, d] = localDateStr.split('-').map(Number)

  // Create midnight UTC for that calendar date (unadjusted)
  const midnightUTC = new Date(Date.UTC(y, m - 1, d))

  // Find what local time midnightUTC represents in tz, then compute offset
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(midnightUTC)

  const h = parseInt(parts.find(p => p.type === 'hour')!.value) % 24
  const min = parseInt(parts.find(p => p.type === 'minute')!.value)

  // UTC+ timezone (h ≤ 12): midnightUTC is h hours AHEAD of local midnight
  // UTC- timezone (h > 12): midnightUTC is (24-h) hours BEHIND local midnight
  const offsetMins = h <= 12 ? -(h * 60 + min) : (24 * 60 - h * 60 - min)

  return new Date(midnightUTC.getTime() + offsetMins * 60 * 1000)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const timezone = searchParams.get('timezone') || 'UTC'
    const now = new Date()

    const todayStart    = startOfDayInTZ(now, timezone)
    const todayEnd      = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

    // ── Bale sold counts (today + yesterday) ─────────────────────────────────
    // Note: DB columns are camelCase (no @map) so raw SQL must use quoted identifiers
    const baleRows = await prisma.$queryRaw<
      { bale_id: string; period: string; sold: bigint; first_sold_at: Date }[]
    >`
      SELECT
        (boi.attributes->>'baleId')                    AS bale_id,
        CASE
          WHEN bo."createdAt" >= ${todayStart} THEN 'today'
          ELSE 'yesterday'
        END                                            AS period,
        SUM(boi.quantity)                              AS sold,
        MIN(bo."createdAt")                            AS first_sold_at
      FROM business_order_items boi
      JOIN business_orders bo ON boi."orderId" = bo.id
      WHERE bo."businessId" = ${businessId}
        AND (boi.attributes->>'baleId') IS NOT NULL
        AND COALESCE((boi.attributes->>'isBOGOFree')::boolean, false) = false
        AND bo."createdAt" >= ${yesterdayStart}
        AND bo."createdAt" <= ${todayEnd}
        AND bo.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY boi.attributes->>'baleId', period
    `

    const bales: Record<string, { soldToday: number; soldYesterday: number; firstSoldTodayAt: string | null }> = {}
    for (const row of baleRows) {
      if (!bales[row.bale_id]) bales[row.bale_id] = { soldToday: 0, soldYesterday: 0, firstSoldTodayAt: null }
      if (row.period === 'today') {
        bales[row.bale_id].soldToday = Number(row.sold)
        bales[row.bale_id].firstSoldTodayAt = row.first_sold_at.toISOString()
      } else {
        bales[row.bale_id].soldYesterday = Number(row.sold)
      }
    }

    // ── R710 WiFi token sold counts (today + yesterday) ───────────────────────
    const wifiRows = await prisma.$queryRaw<
      { token_config_id: string; period: string; sold: bigint; first_sold_at: Date }[]
    >`
      SELECT
        t."tokenConfigId"                              AS token_config_id,
        CASE
          WHEN s."soldAt" >= ${todayStart} THEN 'today'
          ELSE 'yesterday'
        END                                            AS period,
        COUNT(*)                                       AS sold,
        MIN(s."soldAt")                                AS first_sold_at
      FROM r710_token_sales s
      JOIN r710_tokens t ON s."tokenId" = t.id
      WHERE s."businessId" = ${businessId}
        AND s."soldAt" >= ${yesterdayStart}
        AND s."soldAt" <= ${todayEnd}
      GROUP BY t."tokenConfigId", period
    `

    const wifi: Record<string, { soldToday: number; soldYesterday: number; firstSoldTodayAt: string | null }> = {}
    for (const row of wifiRows) {
      if (!wifi[row.token_config_id]) wifi[row.token_config_id] = { soldToday: 0, soldYesterday: 0, firstSoldTodayAt: null }
      if (row.period === 'today') {
        wifi[row.token_config_id].soldToday = Number(row.sold)
        wifi[row.token_config_id].firstSoldTodayAt = row.first_sold_at.toISOString()
      } else {
        wifi[row.token_config_id].soldYesterday = Number(row.sold)
      }
    }

    // ── Regular product variant sold counts (today + yesterday) ──────────────
    const productRows = await prisma.$queryRaw<
      { variant_id: string; period: string; sold: bigint; first_sold_at: Date }[]
    >`
      SELECT
        boi."productVariantId"                         AS variant_id,
        CASE
          WHEN bo."createdAt" >= ${todayStart} THEN 'today'
          ELSE 'yesterday'
        END                                            AS period,
        SUM(boi.quantity)                              AS sold,
        MIN(bo."createdAt")                            AS first_sold_at
      FROM business_order_items boi
      JOIN business_orders bo ON boi."orderId" = bo.id
      WHERE bo."businessId" = ${businessId}
        AND boi."productVariantId" IS NOT NULL
        AND (boi.attributes->>'baleId') IS NULL
        AND boi.attributes->>'wifiToken' IS DISTINCT FROM 'true'
        AND boi.attributes->>'r710Token' IS DISTINCT FROM 'true'
        AND bo."createdAt" >= ${yesterdayStart}
        AND bo."createdAt" <= ${todayEnd}
        AND bo.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY boi."productVariantId", period
    `

    const products: Record<string, { soldToday: number; soldYesterday: number; firstSoldTodayAt: string | null }> = {}
    for (const row of productRows) {
      if (!products[row.variant_id]) products[row.variant_id] = { soldToday: 0, soldYesterday: 0, firstSoldTodayAt: null }
      if (row.period === 'today') {
        products[row.variant_id].soldToday = Number(row.sold)
        products[row.variant_id].firstSoldTodayAt = row.first_sold_at.toISOString()
      } else {
        products[row.variant_id].soldYesterday = Number(row.sold)
      }
    }

    return NextResponse.json({ bales, wifi, products })
  } catch (error) {
    console.error('[clothing/pos-stats] error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
