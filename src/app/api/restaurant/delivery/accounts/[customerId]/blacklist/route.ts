import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// PATCH — ban or unban a customer from delivery (management only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { customerId } = params
    const body = await request.json()
    const { action, reason, businessId } = body // action: 'ban' | 'unban'

    const perms = getEffectivePermissions(user, businessId ?? undefined)
    if (!perms.canManageDeliveryBlacklist) {
      return NextResponse.json({ error: 'Forbidden: canManageDeliveryBlacklist required' }, { status: 403 })
    }

    if (!action || !['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'action must be "ban" or "unban"' }, { status: 400 })
    }
    if (action === 'ban' && !reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to ban a customer' }, { status: 400 })
    }

    const isBanning = action === 'ban'

    // Ensure account exists before updating (create with zero balance if not)
    const account = await prisma.deliveryCustomerAccounts.upsert({
      where: { customerId },
      create: {
        customerId,
        businessId: businessId || '',
        balance: 0,
        isBlacklisted: isBanning,
        blacklistReason: isBanning ? reason : null,
        blacklistedAt: isBanning ? new Date() : null,
        blacklistedBy: isBanning ? user.id : null,
        updatedAt: new Date(),
      },
      update: {
        isBlacklisted: isBanning,
        blacklistReason: isBanning ? reason : null,
        blacklistedAt: isBanning ? new Date() : null,
        blacklistedBy: isBanning ? user.id : null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      account,
      message: isBanning ? 'Customer banned from delivery' : 'Customer removed from blacklist',
    })
  } catch (error) {
    console.error('Error updating delivery blacklist:', error)
    return NextResponse.json({ error: 'Failed to update blacklist' }, { status: 500 })
  }
}
