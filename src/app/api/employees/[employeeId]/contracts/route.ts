import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ employeeId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId },
      select: {
        id: true,
        contractNumber: true,
        version: true,
        baseSalary: true,
        startDate: true,
        endDate: true,
        status: true,
        employeeSignedAt: true,
        createdAt: true,
        pdfGenerationData: true,
        isRenewal: true,
        renewalCount: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Debug: Log retrieved contracts
    console.log('📋 Retrieved contracts:', contracts.map(c => ({
      id: c.id,
      contractNumber: c.contractNumber,
      status: c.status,
      employeeSignedAt: c.employeeSignedAt,
      hasPdfData: !!c.pdfGenerationData,
      pdfDataType: typeof c.pdfGenerationData
    })))

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Contracts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // Check for a dev-only seed API key header. When running seeds locally we
    // allow bypassing normal auth/permission checks so seeders can call this
    // endpoint to create contracts in the same way the UI does. The header is
    // only honored when NODE_ENV !== 'production' and SEED_API_KEY is set.
    const seedHeader = req.headers.get('x-seed-api-key')
    const isSeedRequest = process.env.NODE_ENV !== 'production' && seedHeader && process.env.SEED_API_KEY && seedHeader === process.env.SEED_API_KEY

    let session: any = null
    if (!isSeedRequest) {
      session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (!hasPermission(session.user, 'canCreateEmployeeContracts')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { employeeId } = await params
    const data = await req.json()

    const {
      jobTitleId,
      compensationTypeId,
      baseSalary,
      startDate,
      primaryBusinessId,
      supervisorId,
      pdfContractData,
      previousContractId,
      umbrellaBusinessId,
      businessAssignments
    } = data

    // Debug logging
    console.log('🔍 Received contract data:', JSON.stringify({
      hasFormData: !!data,
      hasPdfContractData: !!pdfContractData,
      pdfDataType: typeof pdfContractData,
      pdfDataKeys: pdfContractData ? Object.keys(pdfContractData).slice(0, 5) : 'none'
    }, null, 2))

    if (!jobTitleId || !compensationTypeId || !startDate || !primaryBusinessId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Normalize and validate baseSalary: must be a positive number
    const normalizedBaseSalary = Number(baseSalary)
    if (!isFinite(normalizedBaseSalary) || normalizedBaseSalary <= 0) {
      return NextResponse.json({ error: 'Invalid baseSalary. Must be a positive number' }, { status: 400 })
    }

    const employee = await prisma.employees.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Fetch umbrella business data
    const umbrellaBusinessData = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true },
      select: { umbrellaBusinessName: true }
    })

    // Validate supervisor requirement based on job title
    const jobTitle = await prisma.jobTitles.findUnique({ where: { id: jobTitleId } })
    const isManagementRole = jobTitle && (
      jobTitle.title.toLowerCase().includes('manager') ||
      jobTitle.title.toLowerCase().includes('director') ||
      jobTitle.title.toLowerCase().includes('ceo') ||
      jobTitle.title.toLowerCase().includes('chief') ||
      jobTitle.title.toLowerCase().includes('head') ||
      jobTitle.level?.toLowerCase().includes('senior') ||
      jobTitle.department?.toLowerCase() === 'executive'
    )

    // Require supervisor for non-management roles
    if (!supervisorId && !isManagementRole) {
      return NextResponse.json({ error: 'Supervisor is required for non-management positions' }, { status: 400 })
    }

    const supervisor = supervisorId ? await prisma.employees.findUnique({
      where: { id: supervisorId },
      include: { jobTitles: true }
    }) : null

    // Use transaction to create the new contract. When called via seed API key
    // we avoid terminating existing contracts and mark the created contract as
    // active so the seeded contract behaves like a normal created-and-signed
    // contract for testing purposes.
    const creatingUserId = isSeedRequest ? 'seed-script' : session.user.id

    const contract = await prisma.$transaction(async (tx) => {
      if (!isSeedRequest) {
        // Terminate all existing contracts for this employee (any status except terminated)
        await tx.employeeContracts.updateMany({
          where: {
            employeeId,
            status: { not: 'terminated' }
          },
          data: {
            status: 'terminated',
            endDate: new Date() // Set end date to now when terminating
          }
        })

        // Update employee status to pending_contract until they sign the new contract
        await tx.employees.update({
          where: { id: employeeId },
          data: {
            employmentStatus: 'pending_contract',
            isActive: false // Employee remains inactive until contract is signed
          }
        })
      }

      // Create new contract (active when seeding, otherwise pending_signature)
      // We intentionally do NOT write previousContractId into pdfGenerationData or notes anymore.
      // The previousContractId is stored in the dedicated DB column only.
      const pdfGenerationDataValue = pdfContractData ? (pdfContractData as any) : null
      const notesValue = data.notes || ''

      // Use a flexible any-typed payload to avoid mismatches with generated Prisma types
      // in environments where Prisma Client wasn't regenerated yet.
      const contractCreateData: any = {
        id: randomUUID(),
        employeeId,
        contractNumber: 'CON' + Date.now().toString(),
        version: 1,
        jobTitleId,
        compensationTypeId,
  baseSalary: new Prisma.Decimal(normalizedBaseSalary),
        startDate: new Date(startDate),
        primaryBusinessId,
        supervisorId: supervisorId || null,
        supervisorName: supervisor?.fullName || null,
        supervisorTitle: supervisor?.jobTitles?.title || null,
        previousContractId: previousContractId || null,
        isCommissionBased: false,
        isSalaryBased: true,
        createdBy: creatingUserId,
        status: isSeedRequest ? 'active' : 'pending_signature',
  pdfGenerationData: pdfGenerationDataValue,
        umbrellaBusinessId: umbrellaBusinessId || null,
        umbrellaBusinessName: umbrellaBusinessData?.umbrellaBusinessName || 'Demo Umbrella Company',
        businessAssignments: businessAssignments || null,
        notes: notesValue,
        // updatedAt has a default in the schema; not required here
      }

      return await tx.employeeContracts.create({ data: contractCreateData })
    })


    // Debug: Log created contract
    console.log('✅ Contract created with pdfGenerationData:', {
      contractId: contract.id,
      hasGenerationData: !!contract.pdfGenerationData,
      generationDataType: typeof contract.pdfGenerationData
    })
    return NextResponse.json(contract)
  } catch (error: any) {
    console.error('Contract creation error:', error)
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}
