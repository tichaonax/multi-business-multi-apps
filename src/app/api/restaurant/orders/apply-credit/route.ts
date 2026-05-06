import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { randomUUID } from 'crypto'

// POST — apply customer credit to a dine-in or takeaway order
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { orderId, customerId, businessId, creditToApply, orderType, changeToCredit } = body

    if (!orderId || !customerId || !businessId || !orderType) {
      return NextResponse.json(
        { error: 'orderId, customerId, businessId, and orderType are required' },
        { status: 400 }
      )
    }

    const applyAmount = Number(creditToApply) || 0
    const changeSave   = Number(changeToCredit) || 0

    if (applyAmount <= 0 && changeSave <= 0) {
      return NextResponse.json({ error: 'creditToApply or changeToCredit must be > 0' }, { status: 400 })
    }

    // Fetch or initialise the customer's credit account
    const account = await prisma.deliveryCustomerAccounts.findUnique({
      where: { customerId },
    })

    const openingBalance = Number(account?.balance || 0)

    // Validate sufficient credit when deducting
    if (applyAmount > 0 && openingBalance < applyAmount) {
      return NextResponse.json(
        { error: `Insufficient credit. Available: $${openingBalance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Verify the order exists and belongs to this business
    const order = await prisma.businessOrders.findUnique({
      where: { id: orderId },
      select: { id: true, businessId: true },
    })
    if (!order || order.businessId !== businessId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Net balance change: deduct creditToApply, add changeToCredit
    const balanceDelta   = changeSave - applyAmount
    const closingBalance = openingBalance + balanceDelta

    await prisma.$transaction(async (tx) => {
      // Update or create the credit account
      if (account) {
        await tx.deliveryCustomerAccounts.update({
          where: { customerId },
          data: { balance: closingBalance, updatedAt: new Date() },
        })
      } else if (changeSave > 0) {
        // No account yet — create one funded by the change being saved
        await tx.deliveryCustomerAccounts.create({
          data: {
            id: randomUUID(),
            customerId,
            businessId,
            balance: closingBalance,
            updatedAt: new Date(),
          },
        })
      }

      // Record DEBIT transaction if credit was applied
      if (applyAmount > 0 && (account || closingBalance >= 0)) {
        const accountRecord = account ?? await tx.deliveryCustomerAccounts.findUnique({ where: { customerId } })
        if (accountRecord) {
          await tx.deliveryAccountTransactions.create({
            data: {
              accountId: accountRecord.id,
              type: 'DEBIT',
              amount: applyAmount,
              orderId,
              notes: `${orderType} order — credit applied`,
              createdBy: user.id,
            },
          })
        }
      }

      // Record CREDIT transaction if change was saved
      if (changeSave > 0) {
        const accountRecord = await tx.deliveryCustomerAccounts.findUnique({ where: { customerId } })
        if (accountRecord) {
          await tx.deliveryAccountTransactions.create({
            data: {
              accountId: accountRecord.id,
              type: 'CREDIT',
              amount: changeSave,
              orderId,
              notes: `Change saved to credit from ${orderType} order`,
              createdBy: user.id,
            },
          })
        }
      }

      // Write the credit payment record for receipt + audit
      await tx.restaurantCreditPayments.create({
        data: {
          id: randomUUID(),
          orderId,
          customerId,
          businessId,
          openingBalance,
          creditUsed: applyAmount,
          closingBalance,
          changeToCredit: changeSave > 0 ? changeSave : null,
          orderType,
          createdBy: user.id,
        },
      })
    })

    return NextResponse.json({
      success: true,
      openingBalance,
      creditUsed: applyAmount,
      changeToCredit: changeSave > 0 ? changeSave : null,
      closingBalance,
    })
  } catch (error: any) {
    console.error('Error applying credit:', error)
    return NextResponse.json({ error: 'Failed to apply credit' }, { status: 500 })
  }
}
