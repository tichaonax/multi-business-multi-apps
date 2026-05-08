import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/policies/[id]/upload
// Accepts a single PDF file via multipart form-data (field name: "file").
// Stores it in the images table (binary) and returns { fileId }.
// The fileId can then be passed to PATCH or publish to associate it with the policy version.
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const policy = await prisma.policy.findUnique({ where: { id } })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: policy.businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "images" ("id", "data", "mimeType", "size", "expiresAt", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      ${buffer},
      'application/pdf',
      ${file.size},
      NULL,
      NOW()
    )
    RETURNING "id"
  `

  return NextResponse.json({ fileId: rows[0].id }, { status: 201 })
}
