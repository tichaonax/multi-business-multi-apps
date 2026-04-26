import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import bcrypt from 'bcryptjs'

// POST /api/manager-override/code/setup
// Body: { code: string }
// Creates or rotates the manager's override code.
// Validates: 6 chars, ≥1 letter + ≥1 digit, not reused in last 365 days.
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const raw = String(body.code ?? '').trim().toUpperCase()

  // Format validation
  if (raw.length !== 6) {
    return NextResponse.json({ error: 'Code must be exactly 6 characters' }, { status: 400 })
  }
  if (!/[A-Z]/.test(raw)) {
    return NextResponse.json({ error: 'Code must contain at least one letter' }, { status: 400 })
  }
  if (!/[0-9]/.test(raw)) {
    return NextResponse.json({ error: 'Code must contain at least one number' }, { status: 400 })
  }

  // Check reuse history (last 365 days)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const history = await prisma.managerOverrideCodeHistory.findMany({
    where: { userId: user.id, retiredAt: { gte: oneYearAgo } },
    select: { codeHash: true },
  })
  for (const h of history) {
    if (await bcrypt.compare(raw, h.codeHash)) {
      return NextResponse.json({ error: 'This code was used recently. Choose a different code.' }, { status: 400 })
    }
  }

  const newHash = await bcrypt.hash(raw, 10)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const existing = await prisma.managerOverrideCodes.findUnique({
    where: { userId: user.id },
  })

  await prisma.$transaction(async (tx) => {
    if (existing) {
      // Archive old code to history before replacing
      await tx.managerOverrideCodeHistory.create({
        data: {
          userId: user.id,
          codeHash: existing.codeHash,
          createdAt: existing.createdAt,
        },
      })
      await tx.managerOverrideCodes.update({
        where: { userId: user.id },
        data: { codeHash: newHash, expiresAt },
      })
    } else {
      await tx.managerOverrideCodes.create({
        data: { userId: user.id, codeHash: newHash, expiresAt },
      })
    }
  })

  return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() })
}
