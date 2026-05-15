import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { randomUUID, randomBytes } from 'crypto'

// Restaurant items are menu-specific (ingredients, allergens, prep time).
// They can only copy to other restaurants.
// All other business types can copy to any non-restaurant business.
function isCompatibleBusinessType(sourceType: string, targetType: string): boolean {
  if (sourceType === 'restaurant') return targetType === 'restaurant'
  return targetType !== 'restaurant'
}

type RouteContext = { params: Promise<{ businessId: string; itemId: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId: sourceBusinessId, itemId } = await params
    const body = await request.json()
    const { targetBusinessId } = body as { targetBusinessId: string }

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'targetBusinessId is required' }, { status: 400 })
    }
    if (targetBusinessId === sourceBusinessId) {
      return NextResponse.json({ error: 'Target business must be different from source' }, { status: 400 })
    }

    // Verify user has access to source business
    const isAdmin = user.role?.toLowerCase() === 'admin'
    if (!isAdmin) {
      const sourceMembership = await prisma.businessMemberships.findFirst({
        where: { businessId: sourceBusinessId, userId: user.id, isActive: true }
      })
      if (!sourceMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify user has access to target business
    if (!isAdmin) {
      const targetMembership = await prisma.businessMemberships.findFirst({
        where: { businessId: targetBusinessId, userId: user.id, isActive: true }
      })
      if (!targetMembership) return NextResponse.json({ error: 'You do not have access to the target business' }, { status: 403 })
    }

    // Load target business type (needed by both paths)
    const targetBusiness = await prisma.businesses.findUnique({
      where: { id: targetBusinessId },
      select: { type: true, name: true }
    })
    if (!targetBusiness) return NextResponse.json({ error: 'Target business not found' }, { status: 404 })

    const targetType = targetBusiness.type

    // ── Path A: BarcodeInventoryItems (inv_ prefix) ───────────────────────────
    // Always copy INTO BusinessProducts so the item is visible in the POS.
    // BarcodeInventoryItems are inventory-only and never appear in the POS product panel.
    if (itemId.startsWith('inv_')) {
      const rawId = itemId.replace(/^inv_/, '')

      const source = await prisma.barcodeInventoryItems.findFirst({
        where: { id: rawId, businessId: sourceBusinessId }
      })
      if (!source) return NextResponse.json({ error: 'Source product not found' }, { status: 404 })

      // Get source business type for compatibility check
      const sourceBusiness = await prisma.businesses.findUnique({
        where: { id: sourceBusinessId },
        select: { type: true }
      })
      const sourceType = sourceBusiness?.type ?? 'other'

      if (!isCompatibleBusinessType(sourceType, targetType)) {
        return NextResponse.json(
          { error: `A ${sourceType} product cannot be copied to a ${targetType} business` },
          { status: 400 }
        )
      }

      // Check SKU conflict in BusinessProducts (the target table)
      if (source.sku) {
        const skuConflict = await prisma.businessProducts.findFirst({
          where: { businessId: targetBusinessId, sku: source.sku }
        })
        if (skuConflict) {
          return NextResponse.json(
            { error: `A product with SKU "${source.sku}" already exists in ${targetBusiness.name}` },
            { status: 409 }
          )
        }
      }

      // Generate SKU if source has none
      const resolvedSku = source.sku || source.name.replace(/\s+/g, '-').toUpperCase().slice(0, 20)

      // Copy into BusinessProducts + variant so it appears in inventory AND POS
      await prisma.$transaction(async (tx) => {
        const newId = randomUUID()

        // Resolve categoryId — try source categoryId, then same category name, then alphabetical first.
        let resolvedCategoryId = source.categoryId || null
        if (resolvedCategoryId) {
          const catExists = await tx.businessCategories.findFirst({
            where: {
              id: resolvedCategoryId,
              isActive: true,
              OR: [{ businessId: targetBusinessId }, { businessId: null }]
            }
          })
          if (!catExists) resolvedCategoryId = null
        }
        if (!resolvedCategoryId) {
          // Try to find a category in the target with the same name as the source category
          const sourceCategory = source.categoryId
            ? await tx.businessCategories.findUnique({ where: { id: source.categoryId }, select: { name: true } })
            : null
          if (sourceCategory?.name) {
            const nameMatch = await tx.businessCategories.findFirst({
              where: {
                name: sourceCategory.name,
                businessType: targetType,
                isActive: true,
                OR: [{ businessId: targetBusinessId }, { businessId: null }]
              }
            })
            if (nameMatch) resolvedCategoryId = nameMatch.id
          }
        }
        if (!resolvedCategoryId) {
          const fallbackCat = await tx.businessCategories.findFirst({
            where: {
              isActive: true,
              businessType: targetType,
              OR: [{ businessId: targetBusinessId }, { businessId: null }]
            },
            orderBy: { name: 'asc' }
          })
          if (!fallbackCat) throw new Error(`No categories found for ${targetType} business`)
          resolvedCategoryId = fallbackCat.id
        }

        await tx.businessProducts.create({
          data: {
            id: newId,
            businessId: targetBusinessId,
            businessType: targetType,
            name: source.name,
            description: source.customLabel || undefined,
            sku: resolvedSku,
            categoryId: resolvedCategoryId,
            basePrice: source.sellingPrice ?? 0,
            costPrice: source.costPrice ?? undefined,
            isActive: source.isActive,
            isInventoryTracked: false,
            isProductTemplate: false,
            updatedAt: new Date()
          }
        })

        // Copy barcode as a ProductBarcodes entry if barcodeData exists
        if (source.barcodeData) {
          await tx.productBarcodes.create({
            data: {
              id: randomUUID(),
              productId: newId,
              businessId: targetBusinessId,
              code: source.barcodeData,
              type: 'CUSTOM',
              isPrimary: true,
              isUniversal: false,
              isActive: true,
              updatedAt: new Date()
            }
          })
        }

        // Create default variant with 0 stock
        await tx.productVariants.create({
          data: {
            id: randomUUID(),
            productId: newId,
            name: 'Default',
            sku: resolvedSku,
            stockQuantity: 0,
            reorderLevel: source.reorderLevel ?? 10,
            price: source.sellingPrice ?? 0,
            updatedAt: new Date()
          }
        })
      })

      return NextResponse.json({
        message: `Product copied to ${targetBusiness.name}`,
        targetBusinessName: targetBusiness.name
      }, { status: 201 })
    }

    // ── Path B: BusinessProducts (standard UUID) ──────────────────────────────
    const source = await prisma.businessProducts.findFirst({
      where: { id: itemId, businessId: sourceBusinessId },
      include: {
        product_barcodes: { where: { isActive: true } },
        product_variants: { take: 1 }
      }
    })
    if (!source) return NextResponse.json({ error: 'Source product not found' }, { status: 404 })

    const sourceType = source.businessType

    if (!isCompatibleBusinessType(sourceType, targetType)) {
      return NextResponse.json(
        { error: `A ${sourceType} product cannot be copied to a ${targetType} business` },
        { status: 400 }
      )
    }

    // Check for SKU conflict in target business
    const skuConflict = await prisma.businessProducts.findFirst({
      where: { businessId: targetBusinessId, sku: source.sku }
    })
    if (skuConflict) {
      return NextResponse.json(
        { error: `A product with SKU "${source.sku}" already exists in ${targetBusiness.name}` },
        { status: 409 }
      )
    }

    // Copy product + barcodes + default variant in a transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const newId = randomUUID()

      // Resolve a valid categoryId for the target business.
      // Priority: 1) same category ID exists in target  2) same category name  3) alphabetical first
      let targetCategoryId = source.categoryId
      const sourceCatInTarget = await tx.businessCategories.findFirst({
        where: {
          id: source.categoryId,
          isActive: true,
          OR: [{ businessId: targetBusinessId }, { businessId: null }]
        }
      })
      if (!sourceCatInTarget) {
        // Try matching by name in the target business type
        const sourceCategory = await tx.businessCategories.findUnique({
          where: { id: source.categoryId },
          select: { name: true }
        })
        const nameMatch = sourceCategory?.name
          ? await tx.businessCategories.findFirst({
              where: {
                name: sourceCategory.name,
                businessType: targetType,
                isActive: true,
                OR: [{ businessId: targetBusinessId }, { businessId: null }]
              }
            })
          : null
        if (nameMatch) {
          targetCategoryId = nameMatch.id
        } else {
          const fallbackCat = await tx.businessCategories.findFirst({
            where: {
              isActive: true,
              businessType: targetType,
              OR: [{ businessId: targetBusinessId }, { businessId: null }]
            },
            orderBy: { name: 'asc' }
          })
          if (!fallbackCat) throw new Error(`No categories found for ${targetType} business`)
          targetCategoryId = fallbackCat.id
        }
      }

      const created = await tx.businessProducts.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          businessType: targetType,
          name: source.name,
          description: source.description,
          sku: source.sku,
          categoryId: targetCategoryId,
          basePrice: source.basePrice,
          costPrice: source.costPrice,
          productType: source.productType,
          isActive: source.isActive,
          isInventoryTracked: source.isInventoryTracked,
          isProductTemplate: false,
          attributes: source.attributes ?? undefined,
          updatedAt: new Date()
        }
      })

      // Copy barcodes
      if (source.product_barcodes.length > 0) {
        await tx.productBarcodes.createMany({
          data: source.product_barcodes.map(bc => ({
            id: randomUUID(),
            productId: newId,
            variantId: null,
            businessId: targetBusinessId,
            code: bc.code,
            type: bc.type,
            isPrimary: bc.isPrimary,
            isUniversal: bc.isUniversal,
            isActive: true,
            label: bc.label,
            notes: bc.notes,
            updatedAt: new Date()
          }))
        })
      }

      // Create default variant with 0 stock
      await tx.productVariants.create({
        data: {
          id: randomUUID(),
          productId: newId,
          name: 'Default',
          sku: source.sku,
          stockQuantity: 0,
          reorderLevel: source.product_variants[0]?.reorderLevel ?? 10,
          price: source.basePrice ?? 0,
          updatedAt: new Date()
        }
      })

      return created
    })

    return NextResponse.json({
      message: `Product copied to ${targetBusiness.name}`,
      productId: newProduct.id,
      targetBusinessName: targetBusiness.name
    }, { status: 201 })

  } catch (error) {
    console.error('Error copying product:', error)
    return NextResponse.json({ error: 'Failed to copy product' }, { status: 500 })
  }
}
