import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

function isAdmin(session: unknown): boolean {
  if (!user || typeof session !== 'object') return false
  const maybeUser = user
  return !!maybeUser && typeof maybeUser.role === 'string' && maybeUser.role === 'admin'
}

const SEEDED = ['EMP001','EMP002','EMP003','EMP004','EMP1009']

export async function POST(_req: NextRequest) {
  try {
    const user = await getServerUser()
    if ((!user || user.role !== 'admin')) return NextResponse.json({ message: 'Admin access required' }, { status: 401 })

    // Delete contracts only for the seeded employeeNumbers
    const employees = await prisma.employees.findMany({ where: { employeeNumber: { in: SEEDED } }, select: { id: true } })
    const empIds = employees.map(e => e.id)
    const contracts = await prisma.employeeContracts.findMany({ where: { employeeId: { in: empIds } } })
    const deleted = []
    for (const c of contracts) {
      try {
        await prisma.employeeContracts.delete({ where: { id: c.id } })
        deleted.push(c)
      } catch (err) {
        console.warn('Failed to delete contract', c.id, String(err))
      }
    }

    return NextResponse.json({ deleted: deleted.length })
  } catch (err) {
    console.error('Error unseeding contracts:', err)
    return NextResponse.json({ message: 'Failed', error: String(err) }, { status: 500 })
  }
}
