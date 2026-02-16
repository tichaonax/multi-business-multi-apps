import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import type {
  ExportTemplateOptions,
  SeedDataTemplate,
  ProductSeedItem,
  CategorySeedItem,
  SubcategorySeedItem
} from '@/types/seed-templates'
import { getServerUser } from '@/lib/get-server-user'

export interface BulkExportOptions {
  businessIds: string[]
  baseVersion: string
  zeroPrices?: boolean
  onlyActive?: boolean
  nameTemplate?: string // e.g., "{businessName} Template v{version}"
}

export interface BulkExportResult {
  success: boolean
  error?: string
  results: Array<{
    businessId: string
    businessName: string
    success: boolean
    error?: string
    templateId?: string
    stats?: {
      products: number
      categories: number
      subcategories: number
    }
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

/**
 * POST /api/admin/seed-templates/bulk-export
 * 
 * Export multiple businesses at once
 * 
 * Body: BulkExportOptions
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    const currentUser = user as any
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admins have full access)
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin && !hasUserPermission(user, 'canExportSeedTemplates')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const options: BulkExportOptions = await req.json()

    if (!options.businessIds || options.businessIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No businesses selected' },
        { status: 400 }
      )
    }

    if (!options.baseVersion) {
      return NextResponse.json(
        { success: false, error: 'Base version required' },
        { status: 400 }
      )
    }

    const results: BulkExportResult['results'] = []
    let successful = 0
    let failed = 0

    // Process each business
    for (const businessId of options.businessIds) {
      try {
        // Get business info
        const business = await prisma.businesses.findUnique({
          where: { id: businessId },
          select: { id: true, name: true, type: true }
        })

        if (!business) {
          results.push({
            businessId,
            businessName: 'Unknown',
            success: false,
            error: 'Business not found'
          })
          failed++
          continue
        }

        // Generate template name
        const templateName = options.nameTemplate
          ? options.nameTemplate
              .replace('{businessName}', business.name)
              .replace('{version}', options.baseVersion)
          : `${business.name} Template`

        // Fetch products
        const whereClause: any = { businessId }
        if (options.onlyActive !== false) {
          whereClause.isActive = true
        }

        const products = await prisma.businessProducts.findMany({
          where: whereClause,
          include: {
            business_categories: {
              include: { domain: true }
            },
            inventory_subcategory: true,
            business_brands: true,
            product_variants: true
          },
          orderBy: [
            { business_categories: { name: 'asc' } },
            { name: 'asc' }
          ]
        })

        // Transform products
        const productSeedItems: ProductSeedItem[] = products.map(product => ({
          sku: product.sku || '',
          name: product.name,
          description: product.description || undefined,
          categoryName: product.business_categories.name,
          subcategoryName: product.inventory_subcategory?.name,
          domainId: product.business_categories.domainId || undefined,
          basePrice: options.zeroPrices ? 0 : Number(product.basePrice),
          costPrice: product.costPrice ? (options.zeroPrices ? 0 : Number(product.costPrice)) : undefined,
          originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
          discountPercent: product.discountPercent ? Number(product.discountPercent) : undefined,
          attributes: product.attributes as Record<string, any> || undefined,
          brandName: product.business_brands?.name || undefined
        }))

        // Get unique categories
        const uniqueCategories = Array.from(
          new Map(
            products.map(p => [p.business_categories.id, p.business_categories])
          ).values()
        )

        const categorySeedItems: CategorySeedItem[] = uniqueCategories.map(cat => ({
          name: cat.name,
          emoji: cat.emoji || undefined,
          color: cat.color || undefined,
          description: cat.description || undefined,
          domainId: cat.domainId || undefined,
          displayOrder: cat.displayOrder || undefined,
          businessType: cat.businessType
        }))

        // Get unique subcategories
        const uniqueSubcategories = Array.from(
          new Map(
            products
              .filter(p => p.inventory_subcategory)
              .map(p => [
                p.inventory_subcategory!.id,
                {
                  subcategory: p.inventory_subcategory!,
                  categoryName: p.business_categories.name
                }
              ])
          ).values()
        )

        const subcategorySeedItems: SubcategorySeedItem[] = uniqueSubcategories.map(item => ({
          name: item.subcategory.name,
          categoryName: item.categoryName,
          emoji: item.subcategory.emoji || undefined,
          displayOrder: item.subcategory.displayOrder || undefined
        }))

        // Build template
        const templateData: SeedDataTemplate = {
          version: options.baseVersion,
          businessType: business.type,
          metadata: {
            name: templateName,
            description: `Bulk exported from ${business.name}`,
            exportedAt: new Date().toISOString(),
            exportedBy: user.name || user.email,
            exportedFrom: business.name,
            totalProducts: productSeedItems.length,
            totalCategories: categorySeedItems.length,
            totalSubcategories: subcategorySeedItems.length
          },
          products: productSeedItems,
          categories: categorySeedItems,
          subcategories: subcategorySeedItems
        }

        // Save to database
        const template = await prisma.seedDataTemplates.create({
          data: {
            name: templateName,
            businessType: business.type,
            version: options.baseVersion,
            description: `Bulk exported from ${business.name}`,
            isActive: true,
            isSystemDefault: false,
            productCount: productSeedItems.length,
            categoryCount: categorySeedItems.length,
            templateData: templateData as any,
            createdBy: user.id,
            sourceBusinessId: businessId,
            exportNotes: 'Bulk export'
          }
        })

        results.push({
          businessId,
          businessName: business.name,
          success: true,
          templateId: template.id,
          stats: {
            products: productSeedItems.length,
            categories: categorySeedItems.length,
            subcategories: subcategorySeedItems.length
          }
        })
        successful++

      } catch (error: any) {
        console.error(`Bulk export error for business ${businessId}:`, error)
        results.push({
          businessId,
          businessName: 'Unknown',
          success: false,
          error: error.message || 'Export failed'
        })
        failed++
      }
    }

    const bulkResult: BulkExportResult = {
      success: failed === 0,
      results,
      summary: {
        total: options.businessIds.length,
        successful,
        failed
      }
    }

    return NextResponse.json(bulkResult)

  } catch (error: any) {
    console.error('Bulk export error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Bulk export failed',
        results: [],
        summary: { total: 0, successful: 0, failed: 0 }
      },
      { status: 500 }
    )
  }
}
