import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const images = await prisma.assetImage.findMany({
      where: { assetId: id },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: images.map(img => ({
        ...img,
        url: `/api/images/${img.imageId}`,
      })),
    })
  } catch (error) {
    console.error('GET /api/assets/[id]/images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Forward files to the universal images API
    const formData = await request.formData()
    const files = formData.getAll('files')
    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

    const uploadFormData = new FormData()
    for (const file of files) uploadFormData.append('files', file as Blob)

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const uploadRes = await fetch(`${baseUrl}/api/universal/images`, {
      method: 'POST',
      body: uploadFormData,
    })
    const uploadJson = await uploadRes.json()
    if (!uploadRes.ok) return NextResponse.json({ error: uploadJson.error || 'Upload failed' }, { status: 500 })

    // Check if this asset already has images (to set isPrimary on first upload)
    const existingCount = await prisma.assetImage.count({ where: { assetId: id } })

    const uploadedImages = uploadJson.data as Array<{ filename: string }>
    const created = await Promise.all(
      uploadedImages.map((img, idx) =>
        prisma.assetImage.create({
          data: {
            assetId: id,
            imageId: img.filename,
            isPrimary: existingCount === 0 && idx === 0,
            sortOrder: existingCount + idx,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: created.map(img => ({ ...img, url: `/api/images/${img.imageId}` })),
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/assets/[id]/images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
