import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import type { SeedDataTemplate } from '@/types/seed-templates'
import { getServerUser } from '@/lib/get-server-user'

export interface PreviewItem {
  type: 'category' | 'subcategory' | 'product'
  name: string
  action: 'create' | 'update' | 'skip'
  existing?: {
    id: string
    name: string
    [key: string]: any
  }
  template: {
    name: string
    [key: string]: any
  }
}

export interface PreviewResult {
  success: boolean
  error?: string
  stats: {
    categoriesCreate: number
    categoriesUpdate: number
    categoriesSkip: number
    subcategoriesCreate: number
    subcategoriesUpdate: number
    subcategoriesSkip: number
    productsCreate: number
    productsUpdate: number
    productsSkip: number
  }
  items: PreviewItem[]
}

/**
 * POST /api/admin/seed-templates/preview
 * 
 * Preview what would happen if a template was imported
 * Does NOT make any changes to the database
 * 
 * Body: { template: SeedDataTemplate, targetBusinessId: string, mode: 'skip' | 'update' | 'new-only' }
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
    if (!isAdmin && !hasUserPermission(user, 'canApplySeedTemplates')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { template, targetBusinessId, mode } = await req.json() as {
      template: SeedDataTemplate
      targetBusinessId: string
      mode: 'skip' | 'update' | 'new-only'
    }

    if (!template || !targetBusinessId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const business = await prisma.businesses.findUnique({
      where: { id: targetBusinessId },
      select: { type: true }
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    if (business.type !== template.businessType) {
      return NextResponse.json(
        { success: false, error: `Business type mismatch: ${business.type} vs ${template.businessType}` },
        { status: 400 }
      )
    }

    const items: PreviewItem[] = []
    const stats = {
      categoriesCreate: 0,
      categoriesUpdate: 0,
      categoriesSkip: 0,
      subcategoriesCreate: 0,
      subcategoriesUpdate: 0,
      subcategoriesSkip: 0,
      productsCreate: 0,
      productsUpdate: 0,
      productsSkip: 0
    }

    // Preview categories
    for (const catData of template.categories) {
      const existing = await prisma.businessCategories.findFirst({
        where: {
          businessId: targetBusinessId,
          name: catData.name
        }
      })

      if (existing) {
        if (mode === 'update') {
          stats.categoriesUpdate++
          items.push({
            type: 'category',
            name: catData.name,
            action: 'update',
            existing: {
              id: existing.id,
              name: existing.name,
              emoji: existing.emoji,
              color: existing.color
            },
            template: catData
          })
        } else {
          stats.categoriesSkip++
          items.push({
            type: 'category',
            name: catData.name,
            action: 'skip',
            existing: {
              id: existing.id,
              name: existing.name,
              emoji: existing.emoji,
              color: existing.color
            },
            template: catData
          })
        }
      } else {
        stats.categoriesCreate++
        items.push({
          type: 'category',
          name: catData.name,
          action: 'create',
          template: catData
        })
      }
    }

    // Preview subcategories
    for (const subData of template.subcategories) {
      const category = await prisma.businessCategories.findFirst({
        where: {
          businessId: targetBusinessId,
          name: subData.categoryName
        }
      })

      if (!category) continue

      const existing = await prisma.inventorySubcategory.findFirst({
        where: {
          categoryId: category.id,
          name: subData.name
        }
      })

      if (existing) {
        stats.subcategoriesSkip++
        items.push({
          type: 'subcategory',
          name: subData.name,
          action: 'skip',
          existing: {
            id: existing.id,
            name: existing.name,
            emoji: existing.emoji
          },
          template: subData
        })
      } else {
        stats.subcategoriesCreate++
        items.push({
          type: 'subcategory',
          name: subData.name,
          action: 'create',
          template: subData
        })
      }
    }

    // Preview products
    for (const prodData of template.products) {
      const existing = prodData.sku ? await prisma.businessProducts.findFirst({
        where: {
          businessId: targetBusinessId,
          sku: prodData.sku
        },
        include: {
          business_categories: true,
          inventory_subcategory: true
        }
      }) : null

      if (existing) {
        if (mode === 'skip') {
          stats.productsSkip++
          items.push({
            type: 'product',
            name: prodData.name,
            action: 'skip',
            existing: {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
              basePrice: existing.basePrice,
              category: existing.business_categories.name
            },
            template: {
              name: prodData.name,
              sku: prodData.sku,
              basePrice: prodData.basePrice,
              category: prodData.categoryName
            }
          })
        } else if (mode === 'update') {
          stats.productsUpdate++
          items.push({
            type: 'product',
            name: prodData.name,
            action: 'update',
            existing: {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
              basePrice: existing.basePrice,
              category: existing.business_categories.name
            },
            template: {
              name: prodData.name,
              sku: prodData.sku,
              basePrice: prodData.basePrice,
              category: prodData.categoryName
            }
          })
        } else if (mode === 'new-only') {
          stats.productsSkip++
          items.push({
            type: 'product',
            name: prodData.name,
            action: 'skip',
            existing: {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
              basePrice: existing.basePrice,
              category: existing.business_categories.name
            },
            template: {
              name: prodData.name,
              sku: prodData.sku,
              basePrice: prodData.basePrice,
              category: prodData.categoryName
            }
          })
        }
      } else {
        stats.productsCreate++
        items.push({
          type: 'product',
          name: prodData.name,
          action: 'create',
          template: {
            name: prodData.name,
            sku: prodData.sku,
            basePrice: prodData.basePrice,
            category: prodData.categoryName
          }
        })
      }
    }

    const result: PreviewResult = {
      success: true,
      stats,
      items
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Preview failed',
        stats: {
          categoriesCreate: 0,
          categoriesUpdate: 0,
          categoriesSkip: 0,
          subcategoriesCreate: 0,
          subcategoriesUpdate: 0,
          subcategoriesSkip: 0,
          productsCreate: 0,
          productsUpdate: 0,
          productsSkip: 0
        },
        items: []
      },
      { status: 500 }
    )
  }
}
