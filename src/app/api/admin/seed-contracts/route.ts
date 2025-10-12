import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

function isAdmin(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false
  const maybeUser = (session as any).user
  return !!maybeUser && typeof maybeUser.role === 'string' && maybeUser.role === 'admin'
}

// Only operate on these seeded employeeNumbers
const SEEDED = ['EMP001','EMP002','EMP003','EMP004','EMP1009']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session)) return NextResponse.json({ message: 'Admin access required' }, { status: 401 })

    // find seeded employees
    const employees = await prisma.employees.findMany({ where: { employeeNumber: { in: SEEDED } } })

    const created = []
    for (const emp of employees) {
      const existing = await prisma.employeeContracts.findFirst({ where: { employeeId: emp.id } })
      if (existing) continue

      // create a simple contract using API helper shape (we create directly via DB here to avoid fetch requirements in admin)
      const contract = await prisma.employeeContracts.create({ data: {
        id: randomUUID(),
        employeeId: emp.id,
        contractNumber: `CT-${emp.employeeNumber}`,
        version: 1,
        jobTitleId: emp.jobTitleId,
        compensationTypeId: emp.compensationTypeId,
        baseSalary: 30000,
        startDate: new Date(),
        primaryBusinessId: emp.primaryBusinessId,
        supervisorId: emp.supervisorId || null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: emp.supervisorId || emp.id
      }})
      created.push(contract)
    }

    return NextResponse.json({ created: created.length, details: created })
  } catch (err) {
    console.error('Error seeding contracts:', err)
    return NextResponse.json({ message: 'Failed', error: String(err) }, { status: 500 })
  }
}
