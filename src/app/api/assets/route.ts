import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const where: Record<string, unknown> = { businessId }
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [assets, total] = await Promise.all([
      prisma.businessAsset.findMany({
        where,
        include: { category: { select: { id: true, name: true, icon: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.businessAsset.count({ where }),
    ])

    return NextResponse.json({ success: true, data: assets, meta: { total, page, limit } })
  } catch (error) {
    console.error('GET /api/assets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      businessId, categoryId, name, description, serialNumber,
      manufacturer, model, location, purchaseDate, purchasePrice,
      salvageValue, depreciationMethod, usefulLifeYears, notes,
    } = body

    if (!businessId || !name || !purchaseDate || purchasePrice == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate asset tag: fetch business type prefix then count existing assets
    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
    const prefix = (business?.type ?? 'BUS').slice(0, 3).toUpperCase()
    const count = await prisma.businessAsset.count({ where: { businessId } })
    const assetTag = `${prefix}-AST-${String(count + 1).padStart(4, '0')}`

    const price = parseFloat(purchasePrice)
    const salvage = parseFloat(salvageValue ?? 0)

    const asset = await prisma.businessAsset.create({
      data: {
        businessId,
        categoryId: categoryId || null,
        assetTag,
        name,
        description: description || null,
        serialNumber: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        location: location || null,
        purchaseDate: new Date(purchaseDate),
        purchasePrice: price,
        currentBookValue: price,
        salvageValue: salvage,
        depreciationMethod: depreciationMethod || 'STRAIGHT_LINE',
        usefulLifeYears: usefulLifeYears ? parseInt(usefulLifeYears) : null,
        notes: notes || null,
        createdBy: user.id,
      },
      include: { category: { select: { id: true, name: true, icon: true } } },
    })

    return NextResponse.json({ success: true, data: asset }, { status: 201 })
  } catch (error) {
    console.error('POST /api/assets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
