import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ employeeNumber: string }>
}

// WARNING: Local-only, unauthenticated debug endpoint. Remove before production.
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { employeeNumber } = await params

    if (!employeeNumber) {
      return NextResponse.json({ error: 'Missing employeeNumber' }, { status: 400 })
    }

    const employee = await prisma.employees.findFirst({ where: { employeeNumber } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId: employee.id },
      select: { id: true, contractNumber: true, pdfGenerationData: true, baseSalary: true, startDate: true }
    })

    return NextResponse.json({ employeeId: employee.id, employeeNumber, contracts })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 })
  }
}
