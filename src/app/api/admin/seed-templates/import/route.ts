import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import type { 
  ImportTemplateOptions, 
  ImportTemplateResult, 
  SeedDataTemplate
} from '@/types/seed-templates'

/**
 * POST /api/admin/seed-templates/import
 * 
 * Imports a seed template and applies it to a business
 * 
 * Body: ImportTemplateOptions with template data
 * Returns: ImportTemplateResult with import stats
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const currentUser = session?.user as any
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admins have full access)
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin && !hasUserPermission(session.user, 'canApplySeedTemplates')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const options: ImportTemplateOptions = await req.json()

    // Validate required fields
    if (!options.template || !options.targetBusinessId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: template, targetBusinessId' 
        },
        { status: 400 }
      )
    }

    const template: SeedDataTemplate = options.template

    // Verify target business exists
    const business = await prisma.businesses.findUnique({
      where: { id: options.targetBusinessId },
      select: { id: true, name: true, type: true }
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Target business not found' },
        { status: 404 }
      )
    }

    // Verify business type matches
    if (business.type !== template.businessType) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Business type mismatch: business is ${business.type}, template is ${template.businessType}` 
        },
        { status: 400 }
      )
    }

    const stats = {
      categoriesCreated: 0,
      categoriesSkipped: 0,
      subcategoriesCreated: 0,
      subcategoriesSkipped: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      errors: [] as string[]
    }

    // Import categories first
    for (const catData of template.categories) {
      try {
        const existing = await prisma.businessCategories.findFirst({
          where: {
            businessId: options.targetBusinessId,
            name: catData.name
          }
        })

        if (existing) {
          if (options.mode === 'update' || options.mode === 'new-only') {
            stats.categoriesSkipped++
          }
        } else {
          await prisma.businessCategories.create({
            data: {
              businessId: options.targetBusinessId,
              name: catData.name,
              emoji: catData.emoji,
              color: catData.color,
              description: catData.description,
              displayOrder: catData.displayOrder,
              businessType: catData.businessType
            }
          })
          stats.categoriesCreated++
        }
      } catch (error: any) {
        stats.errors.push(`Category ${catData.name}: ${error.message}`)
      }
    }

    // Import subcategories
    for (const subData of template.subcategories) {
      try {
        // Find parent category
        const category = await prisma.businessCategories.findFirst({
          where: {
            businessId: options.targetBusinessId,
            name: subData.categoryName
          }
        })

        if (!category) {
          stats.errors.push(`Subcategory ${subData.name}: parent category ${subData.categoryName} not found`)
          continue
        }

        const existing = await prisma.inventorySubcategory.findFirst({
          where: {
            categoryId: category.id,
            name: subData.name
          }
        })

        if (existing) {
          stats.subcategoriesSkipped++
        } else {
          await prisma.inventorySubcategory.create({
            data: {
              categoryId: category.id,
              name: subData.name,
              emoji: subData.emoji,
              displayOrder: subData.displayOrder
            }
          })
          stats.subcategoriesCreated++
        }
      } catch (error: any) {
        stats.errors.push(`Subcategory ${subData.name}: ${error.message}`)
      }
    }

    // Import products
    for (const prodData of template.products) {
      try {
        // Find category
        const category = await prisma.businessCategories.findFirst({
          where: {
            businessId: options.targetBusinessId,
            name: prodData.categoryName
          }
        })

        if (!category) {
          stats.errors.push(`Product ${prodData.name}: category ${prodData.categoryName} not found`)
          continue
        }

        // Find subcategory if specified
        let subcategoryId = null
        if (prodData.subcategoryName) {
          const subcategory = await prisma.inventorySubcategory.findFirst({
            where: {
              categoryId: category.id,
              name: prodData.subcategoryName
            }
          })
          subcategoryId = subcategory?.id || null
        }

        // Find brand if specified
        let brandId = null
        if (prodData.brandName) {
          const brand = await prisma.businessBrands.findFirst({
            where: {
              businessId: options.targetBusinessId,
              name: prodData.brandName
            }
          })
          
          if (!brand) {
            // Create brand if it doesn't exist
            const newBrand = await prisma.businessBrands.create({
              data: {
                businessId: options.targetBusinessId,
                name: prodData.brandName
              }
            })
            brandId = newBrand.id
          } else {
            brandId = brand.id
          }
        }

        // Check if product exists by SKU
        const existing = prodData.sku ? await prisma.businessProducts.findFirst({
          where: {
            businessId: options.targetBusinessId,
            sku: prodData.sku
          }
        }) : null

        if (existing) {
          if (options.mode === 'skip') {
            stats.productsSkipped++
          } else if (options.mode === 'update') {
            await prisma.businessProducts.update({
              where: { id: existing.id },
              data: {
                name: prodData.name,
                description: prodData.description,
                categoryId: category.id,
                subcategoryId,
                brandId,
                basePrice: prodData.basePrice,
                costPrice: prodData.costPrice,
                originalPrice: prodData.originalPrice,
                discountPercent: prodData.discountPercent,
                attributes: prodData.attributes as any
              }
            })
            stats.productsUpdated++
          } else if (options.mode === 'new-only') {
            stats.productsSkipped++
          }
        } else {
          await prisma.businessProducts.create({
            data: {
              businessId: options.targetBusinessId,
              sku: prodData.sku || undefined,
              name: prodData.name,
              description: prodData.description,
              categoryId: category.id,
              subcategoryId,
              brandId,
              basePrice: prodData.basePrice,
              costPrice: prodData.costPrice,
              originalPrice: prodData.originalPrice,
              discountPercent: prodData.discountPercent,
              attributes: prodData.attributes as any,
              isActive: true
            }
          })
          stats.productsCreated++
        }
      } catch (error: any) {
        stats.errors.push(`Product ${prodData.name}: ${error.message}`)
      }
    }

    // Optionally save template to database if not from existing template
    let savedTemplateId: string | undefined
    if (options.saveToDatabase !== false) {
      try {
        const saved = await prisma.seedDataTemplates.create({
          data: {
            name: template.metadata.name,
            businessType: template.businessType,
            version: template.version,
            description: template.metadata.description,
            isActive: true,
            isSystemDefault: false,
            productCount: template.products.length,
            categoryCount: template.categories.length,
            templateData: template as any,
            createdBy: session.user.id,
            exportNotes: `Imported to ${business.name}`
          }
        })
        savedTemplateId = saved.id
      } catch (error: any) {
        stats.errors.push(`Save template: ${error.message}`)
      }
    }

    const result: ImportTemplateResult = {
      success: stats.errors.length === 0 || 
               stats.productsCreated > 0 || 
               stats.categoriesCreated > 0,
      stats,
      savedTemplateId,
      message: `Imported ${stats.productsCreated} products, ${stats.categoriesCreated} categories, ${stats.subcategoriesCreated} subcategories`
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Import template error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to import template',
        stats: {
          categoriesCreated: 0,
          categoriesSkipped: 0,
          subcategoriesCreated: 0,
          subcategoriesSkipped: 0,
          productsCreated: 0,
          productsUpdated: 0,
          productsSkipped: 0,
          errors: [error.message]
        }
      },
      { status: 500 }
    )
  }
}
