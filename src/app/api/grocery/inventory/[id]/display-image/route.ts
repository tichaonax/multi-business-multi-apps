import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// PATCH /api/grocery/inventory/[id]/display-image
// Body: { imageId: string | null }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { imageId } = await req.json()

  const item = await prisma.barcodeInventoryItems.update({
    where: { id },
    data: { imageId: imageId ?? null },
    select: { id: true, imageId: true },
  })

  return NextResponse.json({ success: true, item })
}
