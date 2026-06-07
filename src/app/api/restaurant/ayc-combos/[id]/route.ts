import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const combo = await prisma.asYouLikeItCombos.findUnique({
      where: { id },
      include: {
        sizes: { orderBy: { sortOrder: 'asc' } },
        items: {
          where: { isActive: true, pool_item: { isActive: true } },
          orderBy: { sortOrder: 'asc' },
          include: { pool_item: true }
        }
      }
    })
    if (!combo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(combo)
  } catch (error) {
    console.error('AYC combo GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch combo' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { name, description, sizes, poolItemIds } = await req.json()

    await prisma.$transaction(async (tx) => {
      await tx.asYouLikeItComboSizes.deleteMany({ where: { comboId: id } })
      await tx.asYouLikeItComboItems.deleteMany({ where: { comboId: id } })

      await tx.asYouLikeItCombos.update({
        where: { id },
        data: {
          name,
          description: description || null,
          sizes: {
            create: (sizes || []).map((s: any, i: number) => ({
              sizeName: s.sizeName,
              basePrice: parseFloat(s.basePrice),
              sortOrder: i
            }))
          },
          items: {
            create: (poolItemIds || []).map((poolItemId: string, i: number) => ({
              poolItemId,
              sortOrder: i
            }))
          }
        }
      })
    })

    const updated = await prisma.asYouLikeItCombos.findUnique({
      where: { id },
      include: {
        sizes: { orderBy: { sortOrder: 'asc' } },
        items: { orderBy: { sortOrder: 'asc' }, include: { pool_item: true } }
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('AYC combo PUT error:', error)
    return NextResponse.json({ error: 'Failed to update combo' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.asYouLikeItCombos.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AYC combo DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete combo' }, { status: 500 })
  }
}
