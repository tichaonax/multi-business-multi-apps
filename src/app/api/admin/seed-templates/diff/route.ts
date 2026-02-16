import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import type { SeedDataTemplate } from '@/types/seed-templates'
import { getServerUser } from '@/lib/get-server-user'

export interface DiffItem {
  type: 'category' | 'subcategory' | 'product'
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  changes?: Array<{
    field: string
    oldValue: any
    newValue: any
  }>
  existing?: any
  template?: any
}

export interface DiffResult {
  success: boolean
  error?: string
  summary: {
    categoriesAdded: number
    categoriesRemoved: number
    categoriesModified: number
    categoriesUnchanged: number
    subcategoriesAdded: number
    subcategoriesRemoved: number
    subcategoriesModified: number
    subcategoriesUnchanged: number
    productsAdded: number
    productsRemoved: number
    productsModified: number
    productsUnchanged: number
  }
  items: DiffItem[]
}

/**
 * POST /api/admin/seed-templates/diff
 * 
 * Compare template with existing business data
 * Shows what's added, removed, modified, or unchanged
 * 
 * Body: { template: SeedDataTemplate, targetBusinessId: string }
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

    const { template, targetBusinessId } = await req.json() as {
      template: SeedDataTemplate
      targetBusinessId: string
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

    const items: DiffItem[] = []
    const summary = {
      categoriesAdded: 0,
      categoriesRemoved: 0,
      categoriesModified: 0,
      categoriesUnchanged: 0,
      subcategoriesAdded: 0,
      subcategoriesRemoved: 0,
      subcategoriesModified: 0,
      subcategoriesUnchanged: 0,
      productsAdded: 0,
      productsRemoved: 0,
      productsModified: 0,
      productsUnchanged: 0
    }

    // Get existing data
    const existingCategories = await prisma.businessCategories.findMany({
      where: { businessId: targetBusinessId }
    })

    const existingProducts = await prisma.businessProducts.findMany({
      where: { businessId: targetBusinessId },
      include: {
        business_categories: true,
        inventory_subcategory: true
      }
    })

    // Compare categories
    const templateCategoryMap = new Map(template.categories.map(c => [c.name, c]))
    const existingCategoryMap = new Map(existingCategories.map(c => [c.name, c]))

    // Find added categories
    for (const [name, templateCat] of templateCategoryMap) {
      if (!existingCategoryMap.has(name)) {
        summary.categoriesAdded++
        items.push({
          type: 'category',
          name,
          status: 'added',
          template: templateCat
        })
      } else {
        const existingCat = existingCategoryMap.get(name)!
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

        if (existingCat.emoji !== templateCat.emoji) {
          changes.push({ field: 'emoji', oldValue: existingCat.emoji, newValue: templateCat.emoji })
        }
        if (existingCat.color !== templateCat.color) {
          changes.push({ field: 'color', oldValue: existingCat.color, newValue: templateCat.color })
        }
        if (existingCat.description !== templateCat.description) {
          changes.push({ field: 'description', oldValue: existingCat.description, newValue: templateCat.description })
        }

        if (changes.length > 0) {
          summary.categoriesModified++
          items.push({
            type: 'category',
            name,
            status: 'modified',
            changes,
            existing: existingCat,
            template: templateCat
          })
        } else {
          summary.categoriesUnchanged++
          items.push({
            type: 'category',
            name,
            status: 'unchanged',
            existing: existingCat,
            template: templateCat
          })
        }
      }
    }

    // Find removed categories
    for (const [name, existingCat] of existingCategoryMap) {
      if (!templateCategoryMap.has(name)) {
        summary.categoriesRemoved++
        items.push({
          type: 'category',
          name,
          status: 'removed',
          existing: existingCat
        })
      }
    }

    // Compare products
    const templateProductMap = new Map(template.products.map(p => [p.sku || p.name, p]))
    const existingProductMap = new Map(existingProducts.map(p => [p.sku || p.name, p]))

    // Find added products
    for (const [key, templateProd] of templateProductMap) {
      if (!existingProductMap.has(key)) {
        summary.productsAdded++
        items.push({
          type: 'product',
          name: templateProd.name,
          status: 'added',
          template: {
            name: templateProd.name,
            sku: templateProd.sku,
            basePrice: templateProd.basePrice,
            category: templateProd.categoryName
          }
        })
      } else {
        const existingProd = existingProductMap.get(key)!
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

        if (existingProd.name !== templateProd.name) {
          changes.push({ field: 'name', oldValue: existingProd.name, newValue: templateProd.name })
        }
        if (Number(existingProd.basePrice) !== templateProd.basePrice) {
          changes.push({ field: 'basePrice', oldValue: existingProd.basePrice, newValue: templateProd.basePrice })
        }
        if (existingProd.description !== templateProd.description) {
          changes.push({ field: 'description', oldValue: existingProd.description, newValue: templateProd.description })
        }
        if (existingProd.business_categories.name !== templateProd.categoryName) {
          changes.push({ field: 'category', oldValue: existingProd.business_categories.name, newValue: templateProd.categoryName })
        }

        if (changes.length > 0) {
          summary.productsModified++
          items.push({
            type: 'product',
            name: templateProd.name,
            status: 'modified',
            changes,
            existing: {
              name: existingProd.name,
              sku: existingProd.sku,
              basePrice: existingProd.basePrice,
              category: existingProd.business_categories.name
            },
            template: {
              name: templateProd.name,
              sku: templateProd.sku,
              basePrice: templateProd.basePrice,
              category: templateProd.categoryName
            }
          })
        } else {
          summary.productsUnchanged++
        }
      }
    }

    // Find removed products
    for (const [key, existingProd] of existingProductMap) {
      if (!templateProductMap.has(key)) {
        summary.productsRemoved++
        items.push({
          type: 'product',
          name: existingProd.name,
          status: 'removed',
          existing: {
            name: existingProd.name,
            sku: existingProd.sku,
            basePrice: existingProd.basePrice,
            category: existingProd.business_categories.name
          }
        })
      }
    }

    const result: DiffResult = {
      success: true,
      summary,
      items: items.filter(item => item.status !== 'unchanged') // Only show changes by default
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Diff error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Diff failed',
        summary: {
          categoriesAdded: 0,
          categoriesRemoved: 0,
          categoriesModified: 0,
          categoriesUnchanged: 0,
          subcategoriesAdded: 0,
          subcategoriesRemoved: 0,
          subcategoriesModified: 0,
          subcategoriesUnchanged: 0,
          productsAdded: 0,
          productsRemoved: 0,
          productsModified: 0,
          productsUnchanged: 0
        },
        items: []
      },
      { status: 500 }
    )
  }
}
