import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ id: string; imageId: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, imageId } = await params

    const assetImage = await prisma.assetImage.findFirst({ where: { id: imageId, assetId: id } })
    if (!assetImage) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    await prisma.assetImage.delete({ where: { id: imageId } })

    // Delete the raw image from the images table too
    await prisma.$executeRaw`DELETE FROM "images" WHERE "id" = ${assetImage.imageId}`

    // If deleted image was primary, promote the next image
    if (assetImage.isPrimary) {
      const next = await prisma.assetImage.findFirst({ where: { assetId: id }, orderBy: { sortOrder: 'asc' } })
      if (next) await prisma.assetImage.update({ where: { id: next.id }, data: { isPrimary: true } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/assets/[id]/images/[imageId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, imageId } = await params
    const { setPrimary } = await request.json()

    if (setPrimary) {
      // Unset all primaries then set this one
      await prisma.assetImage.updateMany({ where: { assetId: id }, data: { isPrimary: false } })
      await prisma.assetImage.update({ where: { id: imageId }, data: { isPrimary: true } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/assets/[id]/images/[imageId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
