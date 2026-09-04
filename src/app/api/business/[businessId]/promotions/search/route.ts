import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

interface Candidate {
  itemType: 'product' | 'category'
  itemId: string
  sourceTable: 'BARCODE_ITEM' | 'BUSINESS_PRODUCT' | 'BALE_CATEGORY'
  name: string
  category: string | null
  price: number
}

// GET /api/business/[businessId]/promotions/search?businessType=grocery|clothing&q=
// Picker used when creating a new promotion — every priced, in-stock product (or,
// for clothing, bale category) eligible to be promoted, not just ones currently
// showing on the customer display.
export async function GET(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const permissions = getEffectivePermissions(user, businessId)
  if (user.role !== 'admin' && !permissions.canManagePromotions) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const businessType = req.nextUrl.searchParams.get('businessType')
  if (businessType !== 'grocery' && businessType !== 'clothing') {
    return NextResponse.json({ error: 'businessType must be grocery or clothing' }, { status: 400 })
  }
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()

  const candidates: Candidate[] = []

  const [invItems, bizProducts] = await Promise.all([
    prisma.barcodeInventoryItems.findMany({
      where: { businessId, isActive: true, stockQuantity: { gt: 0 }, sellingPrice: { gt: 0 } },
      select: { id: true, name: true, sellingPrice: true, business_category: { select: { name: true } } },
    }),
    prisma.businessProducts.findMany({
      where: { businessId, isActive: true, isAvailable: true, basePrice: { gt: 0 } },
      select: { id: true, name: true, basePrice: true, business_categories: { select: { name: true } } },
    }),
  ])

  for (const item of invItems) {
    candidates.push({
      itemType: 'product', itemId: item.id, sourceTable: 'BARCODE_ITEM',
      name: item.name, category: item.business_category?.name ?? null, price: Number(item.sellingPrice ?? 0),
    })
  }
  for (const p of bizProducts) {
    candidates.push({
      itemType: 'product', itemId: p.id, sourceTable: 'BUSINESS_PRODUCT',
      name: p.name, category: p.business_categories?.name ?? null, price: Number(p.basePrice ?? 0),
    })
  }

  if (businessType === 'clothing') {
    const categories = await prisma.clothingBaleCategories.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })
    for (const cat of categories) {
      candidates.push({
        itemType: 'category', itemId: cat.id, sourceTable: 'BALE_CATEGORY',
        name: cat.name, category: null, price: 0,
      })
    }
  }

  const filtered = q
    ? candidates.filter(c => c.name.toLowerCase().includes(q) || (c.category ?? '').toLowerCase().includes(q))
    : candidates

  filtered.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ candidates: filtered.slice(0, 100) })
}
