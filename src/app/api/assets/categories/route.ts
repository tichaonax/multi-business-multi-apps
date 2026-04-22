import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    // Return system-wide categories (businessId = null) + business-specific ones
    const categories = await prisma.assetCategory.findMany({
      where: businessId
        ? { OR: [{ businessId: null }, { businessId }] }
        : { businessId: null },
      orderBy: [{ businessId: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('GET /api/assets/categories error:', error)
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

    const { businessId, name, description, defaultDepreciationMethod, defaultUsefulLifeYears, defaultSalvageValuePct, icon } = await request.json()

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const category = await prisma.assetCategory.create({
      data: {
        businessId: businessId || null,
        name,
        description: description || null,
        defaultDepreciationMethod: defaultDepreciationMethod || 'STRAIGHT_LINE',
        defaultUsefulLifeYears: defaultUsefulLifeYears ? parseInt(defaultUsefulLifeYears) : null,
        defaultSalvageValuePct: defaultSalvageValuePct != null ? parseFloat(defaultSalvageValuePct) : null,
        icon: icon || null,
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('POST /api/assets/categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
