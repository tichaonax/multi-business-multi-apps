import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/policy-templates
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.policyTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return NextResponse.json(templates)
}
