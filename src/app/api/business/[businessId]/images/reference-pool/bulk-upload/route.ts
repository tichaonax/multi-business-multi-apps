import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'

/**
 * POST /api/business/[businessId]/images/reference-pool/bulk-upload
 * multipart/form-data: files (one or more), domainId (required),
 * categoryId (optional), subcategoryId (optional).
 *
 * Manually grows the shared reference-image pool (MBM-294) the same way the
 * one-time category import script does — one `Images` row (no `businessId`,
 * it's shared across every business of this type) + one
 * `CategoryReferenceImages` link per file, `isUserUploaded: true`.
 *
 * Gated stricter than the pool's read endpoints: this writes into a pool
 * shared by every business of this type, not just the caller's own data, so
 * it requires `canManageInventory` rather than plain membership.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const canManage = isSystemAdmin(user) || hasPermission(user, 'canManageInventory', businessId)
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const data = await request.formData()
  const files = data.getAll('files') as File[]
  const domainId = data.get('domainId') as string | null
  const categoryId = (data.get('categoryId') as string | null) || null
  const subcategoryId = (data.get('subcategoryId') as string | null) || null

  if (!files || files.length === 0) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
  if (!domainId) return NextResponse.json({ error: 'domainId is required' }, { status: 400 })

  const domain = await prisma.inventoryDomains.findUnique({ where: { id: domainId }, select: { businessType: true } })
  if (!domain || domain.businessType !== business.type) {
    return NextResponse.json({ error: 'Category does not belong to this business type' }, { status: 400 })
  }

  let created = 0
  const skipped: string[] = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      skipped.push(`${file.name}: not an image`)
      continue
    }
    if (file.size > 10 * 1024 * 1024) {
      skipped.push(`${file.name}: too large (max 10MB)`)
      continue
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const image = await prisma.images.create({
      data: { data: buffer, mimeType: file.type, size: file.size },
    })
    await prisma.categoryReferenceImages.create({
      data: {
        imageId: image.id,
        domainId,
        categoryId,
        subcategoryId,
        businessType: business.type,
        isUserUploaded: true,
        createdBy: user.id,
      },
    })
    created++
  }

  return NextResponse.json({ success: true, created, skipped })
}
