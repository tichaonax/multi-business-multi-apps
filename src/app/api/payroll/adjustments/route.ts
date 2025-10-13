import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

import { randomBytes } from 'crypto';
// GET /api/payroll/adjustments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const payrollEntryId = searchParams.get('payrollEntryId')

    const where: any = {}
    if (payrollEntryId) {
      where.payrollEntryId = payrollEntryId
    }

    const adjustments = await prisma.payrollAdjustments.findMany({
      where,
      include: {
        payrollEntry: {
          select: {
            id: true,
            employeeName: true,
            employeeNumber: true
          }
        },
        users_payroll_periods_createdByTousers: {
          select: { id: true, name: true, email: true }
        },
        users_payroll_periods_approvedByTousers: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(adjustments)
  } catch (error) {
    console.error('Payroll adjustments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll adjustments' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/adjustments
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canEditPayrollEntry')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      payrollEntryId,
      type, // incoming field name from client; map to adjustmentType in DB
      // category is not present on the DB model; ignored
      amount,
      isAddition,
      description,
      reason
    } = data

    // Validation: description is optional (map to reason) — require entryId, type and amount
    if (!payrollEntryId || !type || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify entry exists
    const entry = await prisma.payrollEntries.findUnique({
      where: { id: payrollEntryId },
      include: {
        payrollPeriod: true
      }
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      )
    }

    // Check if period is editable
    if (entry.payrollPeriod?.status === 'closed' || entry.payrollPeriod?.status === 'exported') {
      return NextResponse.json(
        { error: 'Cannot add adjustments to closed or exported payroll period' },
        { status: 400 }
      )
    }

    // Create adjustment
    const adjustment = await prisma.$transaction(async (tx) => {
      // Build sanitized create payload to avoid accidentally passing user-supplied fields
      // determine stored amount sign robustly based on isAddition flag or the sign of the amount
      const rawAmount = typeof amount === 'number' ? amount : parseFloat(amount)
      let signedAmount = Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : 0
      // Interpret isAddition flexibly: accept boolean true/false or string 'true'/'false'
      const isAdditionFlag = (isAddition === true) || (String(isAddition).toLowerCase() === 'true')
      const isAdditionExplicitlyProvided = typeof isAddition === 'boolean' || (typeof isAddition === 'string' && (String(isAddition).toLowerCase() === 'true' || String(isAddition).toLowerCase() === 'false'))
      // If client explicitly provided the flag, use it; otherwise fall back to the sign of rawAmount
      if (isAdditionExplicitlyProvided) {
        signedAmount = isAdditionFlag ? Math.abs(signedAmount) : -Math.abs(signedAmount)
      } else {
        // If amount is negative, treat as deduction; otherwise treat as addition
        signedAmount = Number(signedAmount) < 0 ? -Math.abs(signedAmount) : Math.abs(signedAmount)
      }

      const createPayload: any = {
        id: `PA-${nanoid(12)}`,
        payrollEntry: { connect: { id: payrollEntryId } },
        adjustmentType: type || null,
        amount: signedAmount,
        // Prisma model does not have `description` — map client `description` into `reason` if provided
        reason: reason ?? description ?? null,
        users_payroll_periods_createdByTousers: { connect: { id: session.user.id } },
        createdAt: new Date()
      }

      // Defensively remove any stray payrollEntryId that might be present
      if ((createPayload as any).payrollEntryId) delete (createPayload as any).payrollEntryId
      // Remove other client-side-only fields that shouldn't be sent to Prisma
      if ((createPayload as any).type) delete (createPayload as any).type
      if ((createPayload as any).category) delete (createPayload as any).category
      if ((createPayload as any).isAddition) delete (createPayload as any).isAddition

      // Log payload just before creation for debugging (will show in server logs)
      console.debug('Creating payrollAdjustment with payload:', createPayload)

      let newAdjustment: any
      try {
        newAdjustment = await tx.payrollAdjustment.create({
          data: createPayload,
          include: {
            users_payroll_periods_createdByTousers: {
              select: { id: true, name: true, email: true }
            }
          }
        })
      } catch (e) {
        console.error('Error creating payrollAdjustment. Payload:', createPayload)
        console.error(e)
        throw e
      }

      // Recalculate entry + period totals from DB to ensure consistent logic
      await recalcEntryAndPeriod(tx, payrollEntryId)

      return newAdjustment
    })

    return NextResponse.json(adjustment, { status: 201 })
  } catch (error) {
    console.error('Payroll adjustment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll adjustment' },
      { status: 500 }
    )
  }
}

// PUT /api/payroll/adjustments - update an existing adjustment (only allowed when payroll not exported)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(session.user, 'canEditPayrollEntry')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const data = await req.json()
    const { id, amount, description, isAddition, type, reason } = data
    if (!id) return NextResponse.json({ error: 'Adjustment id required' }, { status: 400 })

    const existing = await prisma.payrollAdjustments.findUnique({ where: { id }, include: { payrollEntry: { include: { payrollPeriod: true } } } })
    if (!existing) return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 })
    if (existing.payrollEntry?.payrollPeriod?.status === 'exported' || existing.payrollEntry?.payrollPeriod?.status === 'closed') {
      return NextResponse.json({ error: 'Cannot modify adjustments on exported or closed payroll period' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // update adjustment
      const existingAny: any = existing

      // compute signed amount robustly based on isAddition flag or amount sign
      let newAmount = existingAny.amount
      if (amount !== undefined) {
        const raw = typeof amount === 'number' ? amount : parseFloat(amount)
        let candidate = Number.isFinite(Number(raw)) ? Number(raw) : 0
        const isAdditionFlagUp = (isAddition === true) || (String(isAddition).toLowerCase() === 'true')
        const isAdditionExplicitUp = typeof isAddition === 'boolean' || (typeof isAddition === 'string' && (String(isAddition).toLowerCase() === 'true' || String(isAddition).toLowerCase() === 'false'))
        if (isAdditionExplicitUp) {
          newAmount = isAdditionFlagUp ? Math.abs(candidate) : -Math.abs(candidate)
        } else {
          newAmount = candidate < 0 ? -Math.abs(candidate) : Math.abs(candidate)
        }
      }

      const updated = await tx.payrollAdjustment.update({
        where: { id }, data: {
          amount: newAmount,
          // map client description -> reason (DB field is `reason`); keep existing if not provided
          reason: reason !== undefined ? reason : (description !== undefined ? description : existingAny.reason),
          adjustmentType: type !== undefined ? type : existingAny.adjustmentType,
          updatedAt: new Date()
        }, include: { users_payroll_periods_createdByTousers: { select: { id: true, name: true } } }
      })

      // Recalculate totals for entry and period
      const entryId = existingAny.payrollEntryId as string | null
      if (entryId) await recalcEntryAndPeriod(tx, entryId)

      return updated
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update payroll adjustment error:', error)
    return NextResponse.json({ error: 'Failed to update adjustment' }, { status: 500 })
  }
}

// DELETE /api/payroll/adjustments?adjustmentId= - delete an adjustment
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(session.user, 'canEditPayrollEntry')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const adjustmentId = searchParams.get('adjustmentId')
    if (!adjustmentId) return NextResponse.json({ error: 'adjustmentId required' }, { status: 400 })

    const existing = await prisma.payrollAdjustments.findUnique({ where: { id: adjustmentId }, include: { payrollEntry: { include: { payrollPeriod: true } } } })
    if (!existing) return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 })
    if (existing.payrollEntry?.payrollPeriod?.status === 'exported' || existing.payrollEntry?.payrollPeriod?.status === 'closed') {
      return NextResponse.json({ error: 'Cannot delete adjustments on exported or closed payroll period' }, { status: 400 })
    }

    const existingAny: any = existing
    const result = await prisma.$transaction(async (tx) => {
      await tx.payrollAdjustment.delete({ where: { id: adjustmentId } })
      if (existingAny.payrollEntryId) await recalcEntryAndPeriod(tx, existingAny.payrollEntryId as string)
      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Delete payroll adjustment error:', error)
    return NextResponse.json({ error: 'Failed to delete adjustment' }, { status: 500 })
  }
}

// helper to recalc entry and period totals
async function recalcEntryAndPeriod(tx: any, entryId: string) {
  const entry = await tx.payrollEntry.findUnique({ where: { id: entryId }, include: { payrollEntryBenefits: true, payrollAdjustments: true, payrollPeriod: true } })
  if (!entry) return

  const benefitsTotal = (entry.payrollEntryBenefits || []).filter((b: any) => b.isActive).reduce((s: number, b: any) => s + Number(b.amount), 0)
  // payrollAdjustments.amount is stored as signed (positive for additions, negative for deductions)
  let additionsTotal = 0
  let adjustmentsAsDeductions = 0
  for (const a of (entry.payrollAdjustments || [])) {
    const amt = Number(a.amount || 0)
    if (amt >= 0) additionsTotal += amt
    else adjustmentsAsDeductions += Math.abs(amt)
  }

  const baseSalary = Number(entry.baseSalary || 0)
  const commission = Number(entry.commission || 0)
  const overtimePay = Number(entry.overtimePay || 0)

  // Add positive adjustments to gross; negative adjustments counted as additional deductions
  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal
  const currentStoredDeductions = Number(entry.totalDeductions || 0)
  const newTotalDeductions = currentStoredDeductions + adjustmentsAsDeductions
  const netPay = grossPay - newTotalDeductions

  await tx.payrollEntry.update({ where: { id: entryId }, data: { benefitsTotal, adjustmentsTotal: additionsTotal, grossPay, netPay, totalDeductions: newTotalDeductions, updatedAt: new Date() } })

  const allEntries = await tx.payrollEntry.findMany({ where: { payrollPeriodId: entry.payrollPeriodId } })
  const periodTotals = allEntries.reduce((acc: any, e: any) => ({ totalGrossPay: acc.totalGrossPay + Number(e.grossPay), totalDeductions: acc.totalDeductions + Number(e.totalDeductions), totalNetPay: acc.totalNetPay + Number(e.netPay) }), { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 })

  await tx.payrollPeriod.update({ where: { id: entry.payrollPeriodId }, data: { totalGrossPay: periodTotals.totalGrossPay, totalDeductions: periodTotals.totalDeductions, totalNetPay: periodTotals.totalNetPay, updatedAt: new Date() } })
}
