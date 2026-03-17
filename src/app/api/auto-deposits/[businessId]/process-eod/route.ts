import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import {
  autoGenerateCashAllocationReport,
  processAutoDeposits,
  UserEntry,
  AutoDepositResult,
} from '@/lib/eod-utils'
import { computeAndExecutePayrollContribution } from '@/lib/payroll-eod-contribution'

type Params = { params: Promise<{ businessId: string }> }

export type { UserEntry, AutoDepositResult }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { businessId } = await params
    const permissions = getEffectivePermissions(user, businessId)
    const canProcess =
      user.role === 'admin' ||
      permissions.canMakeExpenseDeposits ||
      permissions.canManageBusinessSettings
    if (!canProcess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { eodDate } = body
    if (!eodDate || !/^\d{4}-\d{2}-\d{2}$/.test(eodDate)) {
      return NextResponse.json(
        { error: 'eodDate is required and must be YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    // Optional user-selected entries (from interactive EOD preview step)
    const entries: UserEntry[] | undefined =
      Array.isArray(body.entries) ? (body.entries as UserEntry[]) : undefined

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        isActive: true,
        business_accounts: { select: { balance: true } },
      },
    })
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Server-side pre-validation when user entries provided
    if (entries !== undefined) {
      const nonSkipped = entries.filter(e => !e.skip)
      if (nonSkipped.length > 0) {
        const totalRequested = nonSkipped.reduce((sum, e) => sum + e.amount, 0)
        const currentBalance = Number(business.business_accounts?.balance ?? 0)
        if (totalRequested > currentBalance) {
          return NextResponse.json(
            {
              error:
                `Insufficient balance — $${currentBalance.toFixed(2)} available but ` +
                `$${totalRequested.toFixed(2)} requested`,
            },
            { status: 422 }
          )
        }
        // Rent minimum check
        const rentConfig = await prisma.businessRentConfig.findUnique({
          where: { businessId },
          select: { expenseAccountId: true, dailyTransferAmount: true, isActive: true },
        })
        if (rentConfig?.isActive && rentConfig.expenseAccountId) {
          const configs = await prisma.expenseAccountAutoDeposit.findMany({
            where: { businessId, isActive: true },
            select: { id: true, expenseAccountId: true },
          })
          const entryMap = new Map(entries.map(e => [e.configId, e]))
          const rentAutoConfig = configs.find((c: { id: string; expenseAccountId: string | null }) => c.expenseAccountId === rentConfig.expenseAccountId)
          if (rentAutoConfig) {
            const rentEntry = entryMap.get(rentAutoConfig.id)
            if (rentEntry && !rentEntry.skip) {
              const rentMinimum = Number(rentConfig.dailyTransferAmount)
              if (rentEntry.amount < rentMinimum) {
                return NextResponse.json(
                  {
                    error:
                      `Rent deposit amount $${rentEntry.amount.toFixed(2)} is below the ` +
                      `minimum of $${rentMinimum.toFixed(2)}`,
                  },
                  { status: 422 }
                )
              }
            }
          }
        }
      }
    }

    // Run auto-deposits via shared utility
    const { results, summary } = await processAutoDeposits(businessId, eodDate, user.id, entries)

    // Payroll auto-contribution — runs as part of EOD, non-fatal
    let payrollContribution = null
    try {
      // Get today's total sales for the formula
      const dayStart = new Date(eodDate + 'T00:00:00Z')
      const dayEnd   = new Date(eodDate + 'T23:59:59.999Z')
      const salesAgg = await prisma.businessOrders.aggregate({
        where: {
          businessId,
          OR: [
            { transactionDate: { gte: dayStart, lte: dayEnd } },
            { transactionDate: null, createdAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
        _sum: { totalAmount: true },
      })
      const dailySales = Number(salesAgg._sum.totalAmount ?? 0)
      payrollContribution = await computeAndExecutePayrollContribution(businessId, eodDate, dailySales, user.id)
    } catch (payrollErr) {
      console.error('[EOD] Payroll contribution failed (non-fatal):', payrollErr)
    }

    // Auto-generate the cash allocation report (non-fatal)
    try {
      await autoGenerateCashAllocationReport(businessId, eodDate, user.id)
    } catch (cashAllocErr) {
      console.error('[EOD] Failed to auto-generate cash allocation report:', cashAllocErr)
    }

    return NextResponse.json({ success: true, eodDate, results, summary, payrollContribution })
  } catch (err) {
    console.error('[POST /api/auto-deposits/process-eod]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
