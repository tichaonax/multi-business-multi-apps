import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/employees/me
// Returns the employee record linked to the currently authenticated user (via userId).
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const employee = await prisma.employees.findFirst({
    where: { userId: user.id },
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
      isActive: true,
    },
  })

  if (!employee) return NextResponse.json({ employee: null })

  return NextResponse.json({ employee })
}
