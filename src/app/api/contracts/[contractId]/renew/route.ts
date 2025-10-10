import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { randomUUID } from 'crypto'
import { z } from 'zod'

// Renewal request schema
const RenewalSchema = z.object({
  renewalType: z.enum(['same_duration', 'extend_months', 'custom_dates']),
  extendMonths: z.number().optional(),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
  notes: z.string().optional()
})

// POST - Renew an existing contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage contracts
    if (!hasPermission(session.user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

  const { contractId } = await params
  const body = await request.json()

    // Validate request data
    const validatedData = RenewalSchema.parse(body)

    // Fetch the original contract
    const originalContract = await prisma.employeeContract.findUnique({
      where: { id: contractId },
      include: {
        contract_benefits: true,
        employees_employee_contracts_employeeIdToemployees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true
          }
        }
      }
    })

    if (!originalContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Prevent renewal of terminated contracts
    if (originalContract.status === 'terminated') {
      return NextResponse.json(
        { error: 'Cannot renew a terminated contract. Please create a new contract instead.' },
        { status: 400 }
      )
    }

    // Calculate renewal dates
    let newStartDate: Date
    let newEndDate: Date | null = null

    if (validatedData.renewalType === 'custom_dates') {
      if (!validatedData.customStartDate || !validatedData.customEndDate) {
        return NextResponse.json(
          { error: 'Custom start and end dates are required for custom_dates renewal type' },
          { status: 400 }
        )
      }
      newStartDate = new Date(validatedData.customStartDate)
      newEndDate = new Date(validatedData.customEndDate)
    } else {
      // Start date is the day after original contract ends, or today if no end date
      newStartDate = originalContract.endDate
        ? new Date(originalContract.endDate.getTime() + 24 * 60 * 60 * 1000) // Add 1 day
        : new Date()

      if (validatedData.renewalType === 'same_duration' && originalContract.endDate) {
        // Calculate original duration and apply it
        const originalDuration = originalContract.endDate.getTime() - originalContract.startDate.getTime()
        newEndDate = new Date(newStartDate.getTime() + originalDuration)
      } else if (validatedData.renewalType === 'extend_months' && validatedData.extendMonths) {
        // Extend by specified months
        newEndDate = new Date(newStartDate)
        newEndDate.setMonth(newEndDate.getMonth() + validatedData.extendMonths)
      } else if (originalContract.contractDurationMonths) {
        // Use original contract duration if available
        newEndDate = new Date(newStartDate)
        newEndDate.setMonth(newEndDate.getMonth() + originalContract.contractDurationMonths)
      }
    }

    // Determine renewal count
    const renewalCount = (originalContract.renewalCount || 0) + 1
    const originalContractId = originalContract.originalContractId || originalContract.id

    // Use transaction to create renewed contract and update original contract
    const renewedContract = await prisma.$transaction(async (tx) => {
      // Generate unique contract number using timestamp (same as regular contracts)
      // This ensures uniqueness regardless of other contract number formats in the system
      const newContractNumber = 'CON' + Date.now().toString()

      // Build the create data for the renewed contract
      const renewedContractData: any = {
        id: randomUUID(),
        // Copy all relevant fields from original contract
        employeeId: originalContract.employeeId,
        jobTitleId: originalContract.jobTitleId,
        compensationTypeId: originalContract.compensationTypeId,
        baseSalary: originalContract.baseSalary,
        isCommissionBased: originalContract.isCommissionBased,
        isSalaryBased: originalContract.isSalaryBased,
        commissionAmount: originalContract.commissionAmount,
        livingAllowance: originalContract.livingAllowance,
        customResponsibilities: originalContract.customResponsibilities,
        probationPeriodMonths: originalContract.probationPeriodMonths,
        primaryBusinessId: originalContract.primaryBusinessId,
        umbrellaBusinessId: originalContract.umbrellaBusinessId,
        umbrellaBusinessName: originalContract.umbrellaBusinessName,
        supervisorId: originalContract.supervisorId,
        supervisorName: originalContract.supervisorName,
        supervisorTitle: originalContract.supervisorTitle,
        contractDurationMonths: originalContract.contractDurationMonths,
        additionalBusinesses: originalContract.additionalBusinesses,

        // New contract specific fields
        contractNumber: newContractNumber,
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'active', // Auto-activate renewed contracts
        employeeSignedAt: new Date(), // Auto-sign renewed contracts (employee)
        managerSignedAt: new Date(), // Auto-sign renewed contracts (manager)
        createdBy: session.user.id,

        // Renewal tracking fields
        isRenewal: true,
        renewalCount: renewalCount,
        originalContractId: originalContractId,
        previousContractId: originalContract.id,

        // Copy PDF generation data from original contract and mark as renewed
        pdfGenerationData: originalContract.pdfGenerationData ? {
          ...(originalContract.pdfGenerationData as any),
          isRenewal: true,
          renewalCount: renewalCount,
          renewalNote: `==RENEWED== (Renewal #${renewalCount})`,
          contractNumber: newContractNumber,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate ? newEndDate.toISOString() : null
        } : null,

        // Notes combining original and renewal notes
        notes: [originalContract.notes, validatedData.notes].filter(Boolean).join('\n\n--- RENEWAL NOTES ---\n'),

        version: 1
      }

      // Conditionally include JSON fields only when present to satisfy Prisma typing
      if (originalContract.additionalBusinesses) {
        renewedContractData.additionalBusinesses = originalContract.additionalBusinesses as any
      }
      if (originalContract.businessAssignments) {
        renewedContractData.businessAssignments = originalContract.businessAssignments as any
      }

      // Create the renewed contract
      const newContract = await tx.employeeContract.create({
        data: renewedContractData
      })

      // Copy contract benefits INSIDE transaction to ensure atomicity
      for (const benefit of originalContract.contract_benefits) {
        await tx.contractBenefit.create({
          data: {
            id: randomUUID(),
            contractId: newContract.id,
            benefitTypeId: benefit.benefitTypeId,
            amount: benefit.amount,
            isPercentage: benefit.isPercentage,
            notes: benefit.notes
          }
        })
      }

      // Mark original contract as expired (it has been renewed)
      // This MUST be last to ensure the new contract is fully created first
      await tx.employeeContract.update({
        where: { id: originalContract.id },
        data: {
          status: 'expired',
          endDate: newStartDate // End date is when the new contract starts
        }
      })

      return newContract
    })

    // Create contract renewal record
    // Determine a renewalDueDate (required by the schema). Use the new contract end date if present,
    // otherwise fall back to the new start date so the field is always populated.
    const renewalDueDate = newEndDate ? newEndDate : newStartDate

    await prisma.contractRenewal.create({
      data: {
        id: randomUUID(),
        employeeId: originalContract.employeeId,
        originalContractId: originalContract.id,
        newContractId: renewedContract.id,
        notes: validatedData.notes || `Renewed contract (type: ${validatedData.renewalType})`,
        renewalDueDate
      }
    })

    // Fetch the complete renewed contract for response
    const completeRenewedContract = await prisma.employeeContract.findUnique({
      where: { id: renewedContract.id },
      include: {
        contract_benefits: {
          include: {
            benefitType: true
          }
        },
        jobTitles: true,
        compensationTypes: true,
        employees_employee_contracts_employeeIdToemployees: {
          select: {
            fullName: true,
            employeeNumber: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        renewedContract: completeRenewedContract,
        originalContract: {
          id: originalContract.id,
          contractNumber: originalContract.contractNumber
        },
        renewalInfo: {
          renewalCount,
          renewalType: validatedData.renewalType,
          originalContractId
        }
      },
      message: `Contract renewed successfully. New contract: ${renewedContract.contractNumber}`
    })

  } catch (error) {
    console.error('Error renewing contract:', error)

    if (error instanceof z.ZodError) {
      // Zod error structure isn't strongly typed here; include errors defensively
      return NextResponse.json(
        { error: 'Invalid request data', details: (error as any).errors || (error as any).formErrors || null },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to renew contract' },
      { status: 500 }
    )
  }
}