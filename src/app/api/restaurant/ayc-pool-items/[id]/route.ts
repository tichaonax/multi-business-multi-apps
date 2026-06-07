import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // Support both full edit and isActive-only toggle
    const data: any = {}
    if ('isActive' in body) data.isActive = body.isActive
    if (body.name !== undefined) {
      data.name = body.name.trim()
      data.emoji = body.emoji?.trim() || '🍽️'
      data.pricePerKgSmall = parseFloat(body.pricePerKgSmall) || 0
      data.pricePerKgMedium = parseFloat(body.pricePerKgMedium) || 0
      data.pricePerKgLarge = parseFloat(body.pricePerKgLarge) || 0
    }

    const item = await prisma.asYouLikeItPoolItems.update({ where: { id }, data })
    return NextResponse.json(item)
  } catch (error) {
    console.error('AYC pool item PUT error:', error)
    return NextResponse.json({ error: 'Failed to update pool item' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.asYouLikeItPoolItems.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AYC pool item DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete pool item' }, { status: 500 })
  }
}
