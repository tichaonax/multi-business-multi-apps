import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// GET /api/policy-templates
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admins can see inactive templates too
  const where = isSystemAdmin(user) ? {} : { isActive: true }

  const templates = await prisma.policyTemplate.findMany({
    where,
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return NextResponse.json(templates)
}

// POST /api/policy-templates — admin only
export async function POST(request: Request) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json()
  const { title, category, description, content } = body

  if (!title || !category || !content) {
    return NextResponse.json({ error: 'title, category, and content are required' }, { status: 400 })
  }

  const template = await prisma.policyTemplate.create({
    data: { title, category, description: description || null, content, isActive: true },
  })

  return NextResponse.json(template, { status: 201 })
}
