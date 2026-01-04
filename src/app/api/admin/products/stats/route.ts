import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get product statistics (universal - works for any businessType)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessType = searchParams.get('businessType')
    const businessId = searchParams.get('businessId')

    // BusinessType is required
    if (!businessType) {
      return NextResponse.json(
        { success: false, error: 'businessType parameter is required' },
        { status: 400 }
      )
    }

    const where: any = {
      businessType
    }

    if (businessId) {
      where.businessId = businessId
    }

    // Get all products with category and business info
    const products = await prisma.businessProducts.findMany({
      where,
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        business_categories: {
          include: {
            domain: {
              select: { id: true, name: true, emoji: true }
            }
          }
        }
      }
    })

    // Get all active businesses of this type for the business selector
    const allBusinesses = await prisma.businesses.findMany({
      where: { type: businessType, isActive: true },
      select: { id: true, name: true }
    })

    // IMPORTANT: Fetch all domains first so departments are always visible (even with 0 products)
    // This ensures department navigation displays the structure regardless of product count
    // We fetch domains through categories to include both business-specific AND universal domains
    const categories = await prisma.businessCategories.findMany({
      where: {
        businessType,
        domainId: { not: null }
      },
      select: {
        domainId: true,
        domain: {
          select: { id: true, name: true, emoji: true, isActive: true }
        }
      }
    })

    // Extract unique domains from categories (includes both specific and universal domains)
    const domainMap = new Map()
    categories.forEach(cat => {
      if (cat.domain && cat.domain.isActive && !domainMap.has(cat.domain.id)) {
        domainMap.set(cat.domain.id, cat.domain)
      }
    })
    const allDomains = Array.from(domainMap.values())

    // Calculate statistics
    const stats = {
      total: products.length,
      withPrices: products.filter(p => p.basePrice > 0).length,
      withoutPrices: products.filter(p => p.basePrice === 0).length,
      withBarcodes: products.filter(p => p.barcode).length,
      withoutBarcodes: products.filter(p => !p.barcode).length,
      available: products.filter(p => p.isAvailable).length,
      unavailable: products.filter(p => !p.isAvailable).length,

      // Business breakdown
      byBusiness: {} as Record<string, {
        id: string
        name: string
        count: number
        withPrices: number
        withBarcodes: number
        available: number
      }>,

      // Department breakdown - Initialize with all domains (count=0 for each)
      // This ensures departments show even when no products exist
      byDepartment: allDomains.reduce((acc, domain) => {
        acc[domain.id] = {
          name: domain.name,
          emoji: domain.emoji || '',
          count: 0,
          withPrices: 0,
          withBarcodes: 0,
          available: 0
        }
        return acc
      }, {} as Record<string, {
        name: string
        emoji: string
        count: number
        withPrices: number
        withBarcodes: number
        available: number
      }>),

      // Category breakdown (top 10)
      byCategory: {} as Record<string, {
        name: string
        departmentName: string
        count: number
      }>,

      // Price statistics
      pricing: {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalValue: 0
      }
    }

    // Business breakdown
    products.forEach(product => {
      const business = product.businesses
      if (business) {
        if (!stats.byBusiness[business.id]) {
          stats.byBusiness[business.id] = {
            id: business.id,
            name: business.name,
            count: 0,
            withPrices: 0,
            withBarcodes: 0,
            available: 0
          }
        }
        stats.byBusiness[business.id].count++
        if (product.basePrice > 0) stats.byBusiness[business.id].withPrices++
        if (product.barcode) stats.byBusiness[business.id].withBarcodes++
        if (product.isAvailable) stats.byBusiness[business.id].available++
      }

      // Department breakdown
      const domain = product.business_categories?.domain
      if (domain) {
        if (!stats.byDepartment[domain.id]) {
          stats.byDepartment[domain.id] = {
            name: domain.name,
            emoji: domain.emoji || '',
            count: 0,
            withPrices: 0,
            withBarcodes: 0,
            available: 0
          }
        }

        stats.byDepartment[domain.id].count++
        if (product.basePrice > 0) stats.byDepartment[domain.id].withPrices++
        if (product.barcode) stats.byDepartment[domain.id].withBarcodes++
        if (product.isAvailable) stats.byDepartment[domain.id].available++
      }

      // Category breakdown
      const category = product.business_categories
      if (category) {
        if (!stats.byCategory[category.id]) {
          stats.byCategory[category.id] = {
            name: category.name,
            departmentName: domain?.name || '',
            count: 0
          }
        }
        stats.byCategory[category.id].count++
      }
    })

    // Price statistics
    const prices = products
      .map(p => Number(p.basePrice))
      .filter(price => price > 0)

    if (prices.length > 0) {
      stats.pricing.avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
      stats.pricing.minPrice = Math.min(...prices)
      stats.pricing.maxPrice = Math.max(...prices)
      stats.pricing.totalValue = prices.reduce((sum, price) => sum + price, 0)
    }

    // Convert byCategory to sorted array (top 10)
    const topCategories = Object.entries(stats.byCategory)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        topCategories,
        allBusinesses
      }
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
