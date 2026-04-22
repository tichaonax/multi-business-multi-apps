import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET — fetch account balance, blacklist status, and transaction history
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { customerId } = params

    const account = await prisma.deliveryCustomerAccounts.findUnique({
      where: { customerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!account) {
      // Return a zero-balance account shape so the UI doesn't need to handle null
      return NextResponse.json({
        success: true,
        account: {
          id: null,
          customerId,
          balance: 0,
          isBlacklisted: false,
          blacklistReason: null,
          blacklistedAt: null,
          blacklistedBy: null,
          transactions: [],
        },
      })
    }

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('Error fetching delivery account:', error)
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 })
  }
}
