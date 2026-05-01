import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/custom-bulk/merge
// Body: { winnerId, loserIds, finalName?, businessId }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { winnerId, loserIds, finalName, businessId } = body

    if (!winnerId || !businessId) {
      return NextResponse.json({ success: false, error: 'winnerId and businessId are required' }, { status: 400 })
    }
    if (!Array.isArray(loserIds) || loserIds.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one loserId is required' }, { status: 400 })
    }
    if (loserIds.includes(winnerId)) {
      return NextResponse.json({ success: false, error: 'Winner cannot also be a loser' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch winner
      const winner = await tx.customBulkProducts.findUnique({ where: { id: winnerId } })
      if (!winner || winner.businessId !== businessId) {
        throw new Error('Winner product not found or does not belong to this business')
      }

      // Fetch losers
      const losers = await tx.customBulkProducts.findMany({
        where: { id: { in: loserIds } },
      })
      if (losers.length !== loserIds.length) {
        throw new Error('One or more products to merge were not found')
      }
      for (const loser of losers) {
        if (loser.businessId !== businessId) {
          throw new Error(`Product "${loser.name}" does not belong to this business`)
        }
      }

      const addedCount = losers.reduce((sum, l) => sum + l.remainingCount, 0)
      const mergeNote = losers
        .map(l => `${l.name} (${l.remainingCount} units)`)
        .join(', ')
      const mergeLog = `Merged from: ${mergeNote} on ${new Date().toISOString().slice(0, 10)}`

      const updatedWinner = await tx.customBulkProducts.update({
        where: { id: winnerId },
        data: {
          remainingCount: winner.remainingCount + addedCount,
          itemCount: winner.itemCount + addedCount,
          ...(finalName?.trim() && finalName.trim() !== winner.name ? { name: finalName.trim() } : {}),
          notes: winner.notes ? `${winner.notes}\n${mergeLog}` : mergeLog,
        },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      })

      await tx.customBulkProducts.updateMany({
        where: { id: { in: loserIds } },
        data: { isActive: false },
      })

      return updatedWinner
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Merge failed'
    console.error('Custom bulk merge error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
