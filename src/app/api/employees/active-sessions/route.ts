import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/employees/active-sessions
// Returns employee IDs whose linked user was active in the last 15 minutes.
// Works with JWT sessions (no DB session rows) by checking Users.lastAccessedAt
// which is refreshed by getServerUser() on every authenticated API call.
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

  const activeUsers = await prisma.users.findMany({
    where: {
      isActive: true,
      lastAccessedAt: { gt: fifteenMinutesAgo },
    },
    select: { id: true },
  })

  if (activeUsers.length === 0) return NextResponse.json({ employeeIds: [] })

  const userIds = activeUsers.map((u) => u.id)
  const employees = await prisma.employees.findMany({
    where: { userId: { in: userIds }, isActive: true },
    select: { id: true },
  })

  return NextResponse.json({ employeeIds: employees.map((e) => e.id) })
}
