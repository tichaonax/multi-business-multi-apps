import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/manager-override/code/status
// Returns the current manager's override code status.
// Also triggers a renewal notification if expiry is within 5 days.
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await prisma.managerOverrideCodes.findUnique({
    where: { userId: user.id },
    select: { createdAt: true, expiresAt: true },
  })

  if (!record) {
    return NextResponse.json({ hasCode: false })
  }

  const now = new Date()
  const isExpired = record.expiresAt <= now
  const msUntilExpiry = record.expiresAt.getTime() - now.getTime()
  const daysUntilExpiry = Math.max(0, Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24)))

  // Trigger renewal notification when ≤ 5 days out and not already notified today
  if (!isExpired && daysUntilExpiry <= 5) {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentNotif = await prisma.appNotification.findFirst({
      where: {
        userId: user.id,
        type: 'OVERRIDE_CODE_EXPIRING',
        createdAt: { gte: oneDayAgo },
      },
      select: { id: true },
    })
    if (!recentNotif) {
      await prisma.appNotification.create({
        data: {
          userId: user.id,
          type: 'OVERRIDE_CODE_EXPIRING',
          title: 'Override code expiring soon',
          message: `Your manager override code expires on ${record.expiresAt.toLocaleDateString()}. Renew it to continue authorising manager actions.`,
          linkUrl: '/profile#override-code',
        },
      })
    }
  }

  return NextResponse.json({
    hasCode: true,
    isExpired,
    expiresAt: record.expiresAt.toISOString(),
    daysUntilExpiry,
  })
}
