import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ employeeId: string; contractId: string }>
}

/**
 * Add/remove a single benefit on an already-existing contract, without going
 * through a full renewal. Contract language (see contract-pdf-generator.ts)
 * tells employees benefits may be added/removed at any time -- this is the
 * operational counterpart to that clause.
 *
 * Payroll safety: payroll periods snapshot a contract's benefits at period-
 * creation time (src/lib/payroll/contract-snapshot.ts) and never re-read the
 * live contract, so editing contract_benefits here can never retroactively
 * change an already-created payroll period.
 */

async function loadContract(employeeId: string, contractId: string) {
  return prisma.employeeContracts.findUnique({
    where: { id: contractId, employeeId },
  })
}

function mapBenefit(row: any) {
  return {
    id: row.id,
    benefitTypeId: row.benefitTypeId,
    amount: row.amount,
    isPercentage: row.isPercentage,
    notes: row.notes,
    benefitType: {
      name: row.benefit_types?.name ?? null,
      type: row.benefit_types?.type ?? null,
    },
  }
}

async function currentBenefits(contractId: string) {
  const rows = await prisma.contractBenefits.findMany({
    where: { contractId },
    include: { benefit_types: { select: { name: true, type: true } } },
  })
  return rows.map(mapBenefit)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { employeeId, contractId } = await params
    if (!hasPermission(user, 'canEditEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const contract = await loadContract(employeeId, contractId)
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    if (contract.status === 'terminated') {
      return NextResponse.json({ error: 'Cannot modify terminated contracts. Contract status is locked.' }, { status: 400 })
    }

    const { benefitTypeId, amount, isPercentage, notes } = await req.json()
    if (!benefitTypeId || amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'benefitTypeId and a numeric amount are required' }, { status: 400 })
    }

    const benefitType = await prisma.benefitTypes.findUnique({ where: { id: benefitTypeId } })
    if (!benefitType) {
      return NextResponse.json({ error: 'Benefit type not found' }, { status: 404 })
    }

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.contractBenefits.create({
        data: {
          id: randomUUID(),
          contractId,
          benefitTypeId,
          amount: Number(amount),
          isPercentage: !!isPercentage,
          notes: notes || null,
        },
      })

      await tx.auditLogs.create({
        data: {
          userId: user.id,
          action: 'CONTRACT_BENEFIT_ADDED',
          entityType: 'EmployeeContract',
          entityId: contractId,
          changes: {
            contractId,
            employeeId,
            benefitTypeId,
            benefitName: benefitType.name,
            amount: Number(amount),
            isPercentage: !!isPercentage,
            notes: notes || null,
          },
          timestamp: new Date(),
        },
      })

      return row
    })

    return NextResponse.json({ benefit: mapBenefit({ ...created, benefit_types: benefitType }), benefits: await currentBenefits(contractId) })
  } catch (error) {
    console.error('Add contract benefit error:', error)
    return NextResponse.json({ error: 'Failed to add benefit' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { employeeId, contractId } = await params
    if (!hasPermission(user, 'canEditEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const contract = await loadContract(employeeId, contractId)
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    if (contract.status === 'terminated') {
      return NextResponse.json({ error: 'Cannot modify terminated contracts. Contract status is locked.' }, { status: 400 })
    }

    const { contractBenefitId, reason } = await req.json()
    if (!contractBenefitId) {
      return NextResponse.json({ error: 'contractBenefitId is required' }, { status: 400 })
    }

    const existing = await prisma.contractBenefits.findUnique({
      where: { id: contractBenefitId },
      include: { benefit_types: { select: { name: true, type: true } } },
    })
    if (!existing || existing.contractId !== contractId) {
      return NextResponse.json({ error: 'Benefit not found on this contract' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Captured before deleting -- this row's data is the only place it will
      // still exist once removed, so the audit trail must hold a full copy.
      await tx.auditLogs.create({
        data: {
          userId: user.id,
          action: 'CONTRACT_BENEFIT_REMOVED',
          entityType: 'EmployeeContract',
          entityId: contractId,
          changes: {
            contractId,
            employeeId,
            benefitTypeId: existing.benefitTypeId,
            benefitName: existing.benefit_types?.name ?? null,
            amount: existing.amount,
            isPercentage: existing.isPercentage,
            notes: existing.notes,
            reason: reason || null,
          },
          timestamp: new Date(),
        },
      })

      await tx.contractBenefits.delete({ where: { id: contractBenefitId } })
    })

    return NextResponse.json({ benefits: await currentBenefits(contractId) })
  } catch (error) {
    console.error('Remove contract benefit error:', error)
    return NextResponse.json({ error: 'Failed to remove benefit' }, { status: 500 })
  }
}
