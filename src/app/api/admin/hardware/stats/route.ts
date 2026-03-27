import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    const where: any = { businessType: 'hardware' }
    if (businessId) where.businessId = businessId

    const [products, barcodeItems] = await Promise.all([
      prisma.businessProducts.findMany({
        where,
        include: {
          business_categories: {
            include: {
              domain: { select: { id: true, name: true, emoji: true } }
            }
          }
        }
      }),
      prisma.barcodeInventoryItems.findMany({
        where: businessId ? { businessId } : {},
        include: {
          business_category: {
            include: {
              domain: { select: { id: true, name: true, emoji: true } }
            }
          }
        }
      })
    ])

    const [directDomains, categoryDomains] = await Promise.all([
      prisma.inventoryDomains.findMany({
        where: { businessType: 'hardware', isActive: true },
        select: { id: true, name: true, emoji: true }
      }),
      prisma.businessCategories.findMany({
        where: { businessType: 'hardware', domainId: { not: null } },
        select: { domain: { select: { id: true, name: true, emoji: true, isActive: true } } }
      })
    ])

    const domainMap = new Map()
    directDomains.forEach(d => domainMap.set(d.id, d))
    categoryDomains.forEach(cat => {
      if (cat.domain && cat.domain.isActive && !domainMap.has(cat.domain.id)) {
        domainMap.set(cat.domain.id, cat.domain)
      }
    })
    const allDomains = Array.from(domainMap.values())

    const byDepartment: Record<string, { name: string; emoji: string; count: number }> = {}
    allDomains.forEach(domain => {
      byDepartment[domain.id] = { name: domain.name, emoji: domain.emoji || '', count: 0 }
    })

    products.forEach(product => {
      const domain = product.business_categories?.domain
      if (domain) {
        if (!byDepartment[domain.id]) {
          byDepartment[domain.id] = { name: domain.name, emoji: domain.emoji || '', count: 0 }
        }
        byDepartment[domain.id].count++
      }
    })

    barcodeItems.forEach(item => {
      const domain = (item as any).business_category?.domain
      if (domain) {
        if (!byDepartment[domain.id]) {
          byDepartment[domain.id] = { name: domain.name, emoji: domain.emoji || '', count: 0 }
        }
        byDepartment[domain.id].count++
      }
    })

    const total = products.length + barcodeItems.length
    return NextResponse.json({ success: true, data: { total, byDepartment } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
