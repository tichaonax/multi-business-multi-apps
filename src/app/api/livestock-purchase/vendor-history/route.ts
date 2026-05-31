import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Returns the top purchase line items for a vendor, learned from recent sessions.
// No extra storage — derived from existing livestock_purchase_lines data.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  const vendorId = searchParams.get('vendorId')

  if (!businessId || !vendorId) {
    return NextResponse.json({ error: 'businessId and vendorId required' }, { status: 400 })
  }

  // Get the last 10 submitted sessions for this vendor
  const recentSessions = await prisma.livestockPurchaseSessions.findMany({
    where: { businessId, supplierId: vendorId, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'desc' },
    take: 10,
    select: { id: true },
  })

  if (recentSessions.length === 0) return NextResponse.json([])

  const sessionIds = recentSessions.map((s) => s.id)

  // Aggregate lines by categoryName — most frequent first, use most recent price
  const lines = await prisma.livestockPurchaseLines.findMany({
    where: { sessionId: { in: sessionIds } },
    orderBy: { createdAt: 'desc' },
  })

  // Group by category: count occurrences, use latest price
  const map = new Map<string, { count: number; pricePerKg: number }>()
  for (const line of lines) {
    const cat = line.categoryName
    if (!map.has(cat)) {
      map.set(cat, { count: 1, pricePerKg: Number(line.pricePerKg) })
    } else {
      map.get(cat)!.count++
      // keep latest price (lines are desc by createdAt so first seen = most recent)
    }
  }

  const results = Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([categoryName, { count, pricePerKg }]) => ({ categoryName, count, pricePerKg }))

  return NextResponse.json(results)
}
