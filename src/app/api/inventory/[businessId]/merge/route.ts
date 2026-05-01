import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { randomUUID } from 'crypto'

type RouteContext = { params: Promise<{ businessId: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const body = await request.json()
    const { winnerId, loserIds, finalName } = body as {
      winnerId: string
      loserIds: string[]
      finalName?: string
    }

    if (!winnerId || !loserIds?.length) {
      return NextResponse.json({ error: 'winnerId and loserIds are required' }, { status: 400 })
    }
    if (loserIds.includes(winnerId)) {
      return NextResponse.json({ error: 'Winner cannot also be a loser' }, { status: 400 })
    }

    // Verify membership
    const isAdmin = user.role?.toLowerCase() === 'admin'
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
      })
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Strip the `inv_` UI prefix if present — actual DB IDs do not have this prefix
    const cleanWinnerId = winnerId.startsWith('inv_') ? winnerId.slice(4) : winnerId
    const cleanLoserIds = loserIds.map((id: string) => id.startsWith('inv_') ? id.slice(4) : id)

    // Look up the business type for stock movement records
    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
    const businessType = business?.type ?? 'general'

    const allIds = [cleanWinnerId, ...cleanLoserIds]

    const result = await prisma.$transaction(async (tx) => {
      // Load winner + losers from BarcodeInventoryItems
      const items = await tx.barcodeInventoryItems.findMany({
        where: { id: { in: allIds }, businessId },
      })

      const winner = items.find(i => i.id === cleanWinnerId)
      if (!winner) throw new Error('Winner product not found')

      const losers = items.filter(i => cleanLoserIds.includes(i.id))
      if (losers.length !== cleanLoserIds.length) throw new Error('One or more loser products not found')

      // Sum stock from all losers
      let transferredStock = 0
      const loserNames: string[] = []

      for (const loser of losers) {
        if (loser.stockQuantity > 0) {
          transferredStock += loser.stockQuantity
        }
        loserNames.push(loser.name)
      }

      // Add transferred stock to winner
      if (transferredStock > 0) {
        await tx.barcodeInventoryItems.update({
          where: { id: cleanWinnerId },
          data: {
            stockQuantity: { increment: transferredStock },
            updatedAt: new Date(),
          },
        })

        // Record stock movement on winner
        await tx.businessStockMovements.create({
          data: {
            id: randomUUID(),
            businessId,
            barcodeInventoryItemId: cleanWinnerId,
            movementType: 'ADJUSTMENT',
            quantity: transferredStock,
            reason: `Merged from: ${loserNames.join(', ')}`,
            reference: 'Inventory Merge',
            businessType: businessType,
            createdAt: new Date(),
          },
        })
      }

      // Deactivate losers
      await tx.barcodeInventoryItems.updateMany({
        where: { id: { in: cleanLoserIds } },
        data: { isActive: false, updatedAt: new Date() },
      })

      // Optionally rename winner
      const winnerUpdate: Record<string, unknown> = { updatedAt: new Date() }
      if (finalName && finalName.trim() && finalName.trim() !== winner.name) {
        winnerUpdate.name = finalName.trim()
      }
      const updatedWinner = await tx.barcodeInventoryItems.update({
        where: { id: cleanWinnerId },
        data: winnerUpdate,
      })

      return { winner: updatedWinner, mergedCount: losers.length, transferredStock }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Inventory merge error:', error)
    return NextResponse.json({ error: 'Failed to merge items. Please try again.' }, { status: 500 })
  }
}
