import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// PATCH /api/policy-templates/[id] — update title, category, description, content, isActive
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const { id } = params
  const body = await request.json()
  const { title, category, description, content, isActive } = body

  const existing = await prisma.policyTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const updated = await prisma.policyTemplate.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(content !== undefined && { content }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/policy-templates/[id] — soft delete (set isActive: false)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const { id } = params

  const existing = await prisma.policyTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  await prisma.policyTemplate.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
