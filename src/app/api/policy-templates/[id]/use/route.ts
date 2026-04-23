import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/policy-templates/[id]/use
// Body: { businessId }
// Copies the template into a new DRAFT policy for the business,
// substituting {{BUSINESS_NAME}} with the actual business name.
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { businessId } = body
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const template = await prisma.policyTemplate.findUnique({ where: { id, isActive: true } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { name: true } })

  const substitutedContent = template.content.replace(/\{\{BUSINESS_NAME\}\}/g, business?.name ?? 'Your Business')

  const policy = await prisma.policy.create({
    data: {
      businessId,
      title: template.title,
      description: template.description ?? null,
      category: template.category,
      contentType: 'RICH_TEXT',
      status: 'DRAFT',
      currentVersion: 0,
      createdById: user.id,
    },
  })

  // Store the substituted content in a draft version ready for editing
  const draftVersion = await prisma.policyVersion.create({
    data: {
      policyId: policy.id,
      version: 1,
      status: 'DRAFT',
      content: substitutedContent,
      createdById: user.id,
    },
  })

  return NextResponse.json({ policy, draftVersion }, { status: 201 })
}
