import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    const where: any = { businessType: 'hardware' }
    if (businessId) where.businessId = businessId

    const products = await prisma.businessProducts.findMany({
      where,
      include: {
        business_categories: {
          include: {
            domain: { select: { id: true, name: true, emoji: true } }
          }
        }
      }
    })

    const hardwareCategories = await prisma.businessCategories.findMany({
      where: { businessType: 'hardware', domainId: { not: null } },
      select: {
        domainId: true,
        domain: { select: { id: true, name: true, emoji: true, isActive: true } }
      }
    })

    const domainMap = new Map()
    hardwareCategories.forEach(cat => {
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

    return NextResponse.json({ success: true, data: { total: products.length, byDepartment } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
