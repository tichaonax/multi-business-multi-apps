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

    const contracts = await prisma.employeeContract.findMany({
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params
    const data = await req.json()

    if (!hasPermission(session.user, 'canCreateEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      jobTitleId,
      compensationTypeId,
      baseSalary,
      startDate,
      primaryBusinessId,
      supervisorId,
      pdfContractData,
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

    if (!jobTitleId || !compensationTypeId || !baseSalary || !startDate || !primaryBusinessId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Fetch umbrella business data
    const umbrellaBusinessData = await prisma.business.findFirst({
      where: { isUmbrellaBusiness: true },
      select: { umbrellaBusinessName: true }
    })

    // Validate supervisor requirement based on job title
    const jobTitle = await prisma.jobTitle.findUnique({ where: { id: jobTitleId } })
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

    const supervisor = supervisorId ? await prisma.employee.findUnique({
      where: { id: supervisorId },
      include: { jobTitles: true }
    }) : null

  // Use transaction to terminate previous contracts and create new one
  const contract = await prisma.$transaction(async (tx) => {
      // Terminate all existing contracts for this employee (any status except terminated)
      await tx.employeeContract.updateMany({
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
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          employmentStatus: 'pending_contract',
          isActive: false // Employee remains inactive until contract is signed
        }
      })

      // Create new contract with pending_signature status (becomes active only when signed)
      const contractCreateData: Prisma.EmployeeContractUncheckedCreateInput = {
        id: randomUUID(),
        employeeId,
        contractNumber: 'CON' + Date.now().toString(),
        version: 1,
        jobTitleId,
        compensationTypeId,
        baseSalary: new Prisma.Decimal(parseFloat(baseSalary)),
        startDate: new Date(startDate),
        primaryBusinessId,
        supervisorId: supervisorId || null,
        supervisorName: supervisor?.fullName || null,
        supervisorTitle: supervisor?.jobTitles?.title || null,
        isCommissionBased: false,
        isSalaryBased: true,
        createdBy: session.user.id,
        status: 'pending_signature', // Contract starts as pending signature, becomes active when signed
        pdfGenerationData: pdfContractData,
        umbrellaBusinessId: umbrellaBusinessId || null,
        umbrellaBusinessName: umbrellaBusinessData?.umbrellaBusinessName || 'Demo Umbrella Company',
        businessAssignments: businessAssignments || null,
        // updatedAt has a default in the schema; not required here
      }

      return await tx.employeeContract.create({ data: contractCreateData })
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
