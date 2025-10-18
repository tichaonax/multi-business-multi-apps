import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

// POST /api/payroll/periods/[periodId]/sync-benefits
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    if (!hasPermission(session.user, 'canManagePayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find entries in the period (minimal fields)
    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: periodId },
      select: { id: true, employeeId: true }
    })

    // Find any existing benefits for these entries
    const entryIds = entries.map(e => e.id)
    const existingBenefits = await prisma.payrollEntryBenefits.findMany({ where: { payrollEntryId: { in: entryIds } }, select: { payrollEntryId: true } })
    const entriesWithBenefits = new Set(existingBenefits.map((b: any) => b.payrollEntryId))
    const entriesNoBenefits = entries.filter(e => !entriesWithBenefits.has(e.id))
    if (entriesNoBenefits.length === 0) {
      return NextResponse.json({ success: true, message: 'No entries without benefits found', count: 0 })
    }

    const employeeIds = Array.from(new Set(entriesNoBenefits.map(e => e.employeeId)))

    // Fetch latest contracts for these employees (fallback to most recent regardless of status)
    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: { startDate: 'desc' },
      include: { contract_benefits: { include: { benefit_types: true } } }
    })

    const latestContractByEmployee: Record<string, any> = {}
    for (const c of contracts) {
      if (!latestContractByEmployee[c.employeeId]) latestContractByEmployee[c.employeeId] = c
    }

    const benefitRecords: any[] = []
    for (const entry of entriesNoBenefits) {
      const contract = latestContractByEmployee[entry.employeeId]
      if (!contract) continue

      for (const b of contract.contract_benefits || []) {
        const amount = Number(b.amount ?? b.benefit_types?.defaultAmount ?? 0)
        if (!amount || amount === 0) continue
        // skip deductions when inferring benefits
        if (b.benefit_types?.type === 'deduction') continue

        benefitRecords.push({
          id: `PEB-${nanoid(12)}`,
          payrollEntryId: entry.id,
          benefitTypeId: b.benefitTypeId,
          benefitName: b.benefit_types?.name || 'Contract Benefit',
          amount,
          isActive: true,
          source: 'contract',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    if (benefitRecords.length === 0) {
      return NextResponse.json({ success: true, message: 'No contract benefits found to persist', count: 0 })
    }

    // Persist benefits and recalc totals in a transaction
    await prisma.$transaction(async (tx) => {
      // createMany for benefits
      await tx.payrollEntryBenefits.createMany({ data: benefitRecords })

      // Recalculate each affected entry and update payroll period totals
      const affectedEntryIds = Array.from(new Set(benefitRecords.map(b => b.payrollEntryId)))
      for (const entryId of affectedEntryIds) {
        const entry = await tx.payrollEntries.findUnique({
          where: { id: entryId },
          include: { payroll_entry_benefits: true }
        })
        if (!entry) continue

        const benefitsTotal = entry.payroll_entry_benefits.filter((b: any) => b.isActive).reduce((s: number, b: any) => s + Number(b.amount), 0)
        const baseSalary = Number(entry.baseSalary || 0)
        const commission = Number(entry.commission || 0)
        const overtimePay = Number(entry.overtimePay || 0)
        const adjustmentsTotal = Number(entry.adjustmentsTotal || 0)

        const grossPay = baseSalary + commission + overtimePay + benefitsTotal + adjustmentsTotal
        const totalDeductions = Number(entry.totalDeductions || 0)
        const netPay = grossPay - totalDeductions

        await tx.payrollEntries.update({
          where: { id: entryId },
          data: { benefitsTotal, grossPay, netPay, updatedAt: new Date() }
        })
      }

      // Update period totals
      const allEntries = await tx.payrollEntries.findMany({ where: { payrollPeriodId: periodId } })
      const totals = allEntries.reduce((acc: any, e: any) => ({
        totalEmployees: acc.totalEmployees + 1,
        totalGrossPay: acc.totalGrossPay + Number(e.grossPay),
        totalDeductions: acc.totalDeductions + Number(e.totalDeductions),
        totalNetPay: acc.totalNetPay + Number(e.netPay)
      }), { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 })

      await tx.payrollPeriods.update({ where: { id: periodId }, data: totals })
    })

    return NextResponse.json({ success: true, message: 'Contract benefits persisted', count: benefitRecords.length })
  } catch (error) {
    console.error('Sync benefits error:', error)
    return NextResponse.json({ error: 'Failed to sync benefits' }, { status: 500 })
  }
}
