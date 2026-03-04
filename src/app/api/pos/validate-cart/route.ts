import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface CartItemInput {
  id: string
  productId: string
  variantId?: string
  name: string
  quantity: number
  attributes?: Record<string, any>
}

interface ValidateCartBody {
  businessId: string
  items: CartItemInput[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ValidateCartBody = await request.json()
    const { businessId, items } = body

    if (!businessId || !Array.isArray(items)) {
      return NextResponse.json({ error: 'businessId and items are required' }, { status: 400 })
    }

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, type: true, isActive: true }
    })
    if (!business || !business.isActive) {
      return NextResponse.json({ error: 'Business not found or inactive' }, { status: 404 })
    }

    const valid: CartItemInput[] = []
    const invalid: Array<{ item: CartItemInput; reason: string }> = []

    for (const item of items) {
      const isBaleItem =
        item.productId?.startsWith('bale_') ||
        !!item.attributes?.baleId ||
        !!item.attributes?.isBale

      if (isBaleItem) {
        // ── Bale validation ───────────────────────────────────────────────
        const baleId =
          item.attributes?.baleId ||
          (item.productId?.startsWith('bale_') ? item.productId.replace(/^bale_/, '') : null) ||
          (item.variantId?.startsWith('bale_') ? item.variantId.replace(/^bale_/, '') : null)

        if (!baleId) {
          invalid.push({ item, reason: 'Bale ID could not be determined' })
          continue
        }

        const bale = await prisma.clothingBales.findFirst({
          where: { id: baleId, businessId },
          select: { id: true, isActive: true, remainingCount: true }
        })

        if (!bale) {
          invalid.push({ item, reason: 'Bale no longer exists in this business' })
        } else if (!bale.isActive) {
          invalid.push({ item, reason: 'Bale has been deactivated' })
        } else if (bale.remainingCount < 1) {
          invalid.push({ item, reason: 'Bale is out of stock' })
        } else {
          valid.push(item)
        }
        continue
      }

      // ── Skip virtual/non-inventory items ─────────────────────────────────
      const isVirtual =
        item.attributes?.wifiToken ||
        item.attributes?.r710Token ||
        item.attributes?.businessService ||
        item.attributes?.isService

      if (isVirtual) {
        // Virtual items (WiFi tokens, services) don't need inventory validation
        valid.push(item)
        continue
      }

      // ── Regular product validation ────────────────────────────────────────
      if (!item.productId) {
        invalid.push({ item, reason: 'Missing product ID' })
        continue
      }

      const product = await prisma.businessProducts.findFirst({
        where: { id: item.productId, businessId, isActive: true },
        select: {
          id: true,
          isActive: true,
          product_variants: item.variantId
            ? { where: { id: item.variantId }, select: { id: true, isActive: true, stockQuantity: true } }
            : undefined
        }
      })

      if (!product) {
        invalid.push({ item, reason: 'Product is no longer available in this business' })
        continue
      }

      if (item.variantId) {
        const variant = product.product_variants?.[0]
        if (!variant) {
          invalid.push({ item, reason: 'Product variant no longer exists' })
          continue
        }
        if (!variant.isActive) {
          invalid.push({ item, reason: 'Product variant has been deactivated' })
          continue
        }
      }

      valid.push(item)
    }

    return NextResponse.json({ valid, invalid })
  } catch (error) {
    console.error('[validate-cart] Error:', error)
    return NextResponse.json(
      { error: 'Failed to validate cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
