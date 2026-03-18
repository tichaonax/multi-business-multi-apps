/**
 * Barcode Lookup Library
 *
 * Implements three-tier barcode lookup system:
 * 1. Check existing products (inventory)
 * 2. Check barcode templates
 * 3. Return "not found" result
 *
 * Phase 6: Template-Based Product Creation
 */

import { prisma } from '@/lib/prisma';

export type BarcodeLookupResult =
  | { type: 'product'; data: ProductLookupData }
  | { type: 'bale'; data: BaleLookupData }
  | { type: 'template'; data: TemplateLookupData }
  | { type: 'not_found'; barcode: string };

export interface ProductLookupData {
  product: any;
  variantId?: string;
  matchedBarcode: {
    id: string;
    code: string;
    type: string;
    isPrimary: boolean;
    isUniversal: boolean;
    label?: string | null;
    source: string;
  };
}

export interface BaleLookupData {
  bale: {
    id: string;
    batchNumber: string;
    sku: string;
    barcode: string | null;
    unitPrice: number;
    remainingCount: number;
    itemCount: number;
    bogoActive: boolean;
    bogoRatio: number;
    categoryName: string;
    businessId: string;
  };
}

export interface TemplateLookupData {
  template: {
    id: string;
    name: string;
    symbology: string;
    barcodeValue: string;
    width: number;
    height: number;
    displayValue: boolean;
    businessId: string;
    businessName: string;
    businessType: string;
    // Custom data from print jobs
    customData?: {
      name?: string;
      productName?: string;
      price?: number;
      size?: string;
      color?: string;
      category?: string;
      department?: string;
      description?: string;
    };
  };
  suggestedProduct: {
    name: string;
    sku?: string;
    description?: string;
    basePrice?: number;
    category?: string;
    department?: string;
  };
}

/**
 * Three-tier barcode lookup
 *
 * @param barcode - The barcode to look up
 * @param businessId - The business context for the lookup
 * @returns Lookup result (product, template, or not found)
 */
export async function lookupBarcode(
  barcode: string,
  businessId: string
): Promise<BarcodeLookupResult> {
  // TIER 1: Check existing products
  const productResult = await lookupProductByBarcode(barcode, businessId);
  if (productResult) {
    return { type: 'product', data: productResult };
  }

  // TIER 1.5: Check clothing bales (by barcode or SKU)
  const baleResult = await lookupBaleByBarcode(barcode, businessId);
  if (baleResult) {
    return { type: 'bale', data: baleResult };
  }

  // TIER 2: Check barcode templates
  const templateResult = await lookupTemplateByBarcode(barcode, businessId);
  if (templateResult) {
    return { type: 'template', data: templateResult };
  }

  // TIER 3: Not found
  return { type: 'not_found', barcode };
}

/**
 * TIER 1: Look up product by barcode
 */
async function lookupProductByBarcode(
  barcode: string,
  businessId: string
): Promise<ProductLookupData | null> {
  try {
    // Check product_barcodes table.
    // A barcode row can be linked via productId (business_product) OR variantId (product_variant),
    // so we need an OR filter to cover both cases.
    const matchedBarcode = await prisma.productBarcodes.findFirst({
      where: {
        code: barcode,
        OR: [
          { business_product: { businessId } },
          { product_variant: { business_products: { businessId } } },
        ],
      },
      include: {
        business_product: {
          include: {
            businesses: {
              select: { id: true, name: true, shortName: true, type: true },
            },
            business_categories: {
              select: { id: true, name: true, emoji: true },
            },
            product_variants: {
              include: { product_barcodes: true },
            },
          },
        },
        product_variant: {
          include: {
            product_barcodes: true,
            business_products: {
              include: {
                businesses: {
                  select: { id: true, name: true, shortName: true, type: true },
                },
                business_categories: {
                  select: { id: true, name: true, emoji: true },
                },
                product_variants: {
                  include: { product_barcodes: true },
                },
              },
            },
          },
        },
      },
    });

    // Fallback: search by SKU if no barcode match
    if (!matchedBarcode) {
      const skuProduct = await prisma.businessProducts.findFirst({
        where: {
          sku: { equals: barcode, mode: 'insensitive' },
          businessId: businessId,
          isActive: true
        },
        include: {
          businesses: {
            select: { id: true, name: true, shortName: true, type: true },
          },
          business_categories: {
            select: { id: true, name: true, emoji: true },
          },
          product_variants: {
            select: { id: true, name: true, sku: true, price: true, stockQuantity: true, attributes: true },
          },
        },
      });

      if (skuProduct) {
        return {
          product: {
            id: skuProduct.id,
            name: skuProduct.name,
            description: skuProduct.description,
            basePrice: skuProduct.basePrice,
            sku: skuProduct.sku,
            businessType: skuProduct.businesses?.type,
            productType: skuProduct.productType,
            condition: skuProduct.condition,
            category: skuProduct.business_categories
              ? { id: skuProduct.business_categories.id, name: skuProduct.business_categories.name, emoji: skuProduct.business_categories.emoji }
              : null,
            barcode: barcode,
            barcodes: [],
            isActive: skuProduct.isActive,
            variants: skuProduct.product_variants?.map((v: any) => ({
              id: v.id, name: v.name, sku: v.sku, price: v.price,
              stockQuantity: v.stockQuantity, attributes: v.attributes,
              barcode: null, barcodes: [],
            })),
          },
          matchedBarcode: {
            id: 'sku-match',
            code: barcode,
            type: 'SKU',
            isPrimary: false,
            isUniversal: false,
            label: 'Matched by SKU',
            source: 'sku',
          },
        };
      }
    }

    // Fallback: search by legacy ProductVariants.barcode field
    if (!matchedBarcode) {
      const variantByBarcode = await prisma.productVariants.findFirst({
        where: {
          barcode: barcode,
          isActive: true,
          business_products: { businessId, isActive: true }
        },
        include: {
          business_products: {
            include: {
              businesses: { select: { id: true, name: true, shortName: true, type: true } },
              business_categories: { select: { id: true, name: true, emoji: true } },
              product_variants: {
                where: { isActive: true },
                select: { id: true, name: true, sku: true, price: true, stockQuantity: true, attributes: true, barcode: true }
              }
            }
          }
        }
      })

      if (variantByBarcode?.business_products) {
        const product = variantByBarcode.business_products
        return {
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
            basePrice: product.basePrice,
            sku: product.sku,
            businessType: product.businesses?.type,
            productType: product.productType,
            condition: product.condition,
            category: product.business_categories
              ? { id: product.business_categories.id, name: product.business_categories.name, emoji: product.business_categories.emoji }
              : null,
            barcode: barcode,
            barcodes: [],
            isActive: product.isActive,
            variants: product.product_variants?.map((v: any) => ({
              id: v.id, name: v.name, sku: v.sku, price: v.price,
              stockQuantity: v.stockQuantity, attributes: v.attributes,
              barcode: v.barcode, barcodes: [],
            })),
          },
          variantId: variantByBarcode.id,
          matchedBarcode: {
            id: 'variant-barcode-field',
            code: barcode,
            type: 'CUSTOM',
            isPrimary: true,
            isUniversal: false,
            label: 'Matched by variant barcode',
            source: 'variant',
          },
        }
      }
    }

    if (matchedBarcode) {
      // Resolve the parent product — may come via business_product (productId) or
      // via product_variant -> business_products (variantId-only barcodes)
      const product = matchedBarcode.business_product
        ?? matchedBarcode.product_variant?.business_products

      if (!product) return null

      // Check if barcode matches a specific variant
      let variantId: string | undefined
      // If the barcode row itself points to a variant, use that
      if (matchedBarcode.variantId) {
        variantId = matchedBarcode.variantId
      } else {
        const matchingVariant = product.product_variants?.find((v) =>
          v.product_barcodes?.some((vb) => vb.code === barcode)
        )
        if (matchingVariant) {
          variantId = matchingVariant.id
        }
      }

      return {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          sku: product.sku,
          businessType: product.businesses?.type,
          productType: product.productType,
          condition: product.condition,
          category: product.business_categories
            ? {
                id: product.business_categories.id,
                name: product.business_categories.name,
                emoji: product.business_categories.emoji,
              }
            : null,
          barcode: barcode, // For backward compatibility
          barcodes: [
            {
              id: matchedBarcode.id,
              code: matchedBarcode.code,
              type: matchedBarcode.type,
              isPrimary: matchedBarcode.isPrimary,
              isUniversal: matchedBarcode.businessId === null,
              isActive: true,
              label: matchedBarcode.label,
              businessId: matchedBarcode.businessId,
              createdAt: matchedBarcode.createdAt.toISOString(),
              updatedAt: matchedBarcode.updatedAt.toISOString(),
            },
          ],
          isActive: product.isActive,
          variants: product.product_variants?.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            stockQuantity: v.stockQuantity,
            attributes: v.attributes,
            barcode: v.product_barcodes?.[0]?.code,
            barcodes: v.product_barcodes?.map((vb) => ({
              id: vb.id,
              code: vb.code,
              type: vb.type,
              isPrimary: vb.isPrimary,
              isActive: true,
              createdAt: vb.createdAt.toISOString(),
              updatedAt: vb.updatedAt.toISOString(),
            })),
          })),
        },
        variantId,
        matchedBarcode: {
          id: matchedBarcode.id,
          code: matchedBarcode.code,
          type: matchedBarcode.type,
          isPrimary: matchedBarcode.isPrimary,
          isUniversal: matchedBarcode.businessId === null,
          label: matchedBarcode.label,
          source: matchedBarcode.source,
        },
      }
    }

    return null;
  } catch (error) {
    console.error('Error in lookupProductByBarcode:', error);
    return null;
  }
}

/**
 * TIER 2: Look up barcode template by barcode value
 */
async function lookupTemplateByBarcode(
  barcode: string,
  businessId: string
): Promise<TemplateLookupData | null> {
  try {
    // Find template: match scanCode first (new short token), fall back to barcodeValue (legacy / direct entry)
    const template = await prisma.barcodeTemplates.findFirst({
      where: {
        businessId: businessId,
        isActive: true,
        OR: [
          { scanCode: barcode } as any,
          { barcodeValue: barcode },
        ],
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
            type: true,
          },
        },
        print_jobs: {
          where: {},
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            itemName: true,
            customData: true,
          },
        },
      },
    });

    if (!template) {
      return null;
    }

    // Get the most recent print job data for this template
    const latestPrintJob = template.print_jobs?.[0];
    const customData = latestPrintJob?.customData as any;

    // Extract suggested product data from template and print job
    const suggestedProduct = {
      name: customData?.productName || customData?.name || latestPrintJob?.itemName || '',
      sku: barcode, // Use barcode as default SKU
      description: customData?.description || template.name || '',
      basePrice: customData?.price ? parseFloat(customData.price) : undefined,
      category: customData?.category,
      department: customData?.department,
    };

    return {
      template: {
        id: template.id,
        name: template.name,
        symbology: template.symbology,
        barcodeValue: template.barcodeValue,
        width: template.width,
        height: template.height,
        displayValue: template.displayValue,
        businessId: template.businessId,
        businessName: template.business.name,
        businessType: template.business.type || 'general',
        customData: customData || {},
      },
      suggestedProduct,
    };
  } catch (error) {
    console.error('Error in lookupTemplateByBarcode:', error);
    return null;
  }
}

/**
 * TIER 1.5: Look up clothing bale by barcode or SKU
 */
async function lookupBaleByBarcode(
  barcode: string,
  businessId: string
): Promise<BaleLookupData | null> {
  try {
    // Search by barcode field first, then by SKU
    const bale = await prisma.clothingBales.findFirst({
      where: {
        businessId,
        isActive: true,
        remainingCount: { gt: 0 },
        OR: [
          { scanCode: { equals: barcode, mode: 'insensitive' } },
          { barcode: { equals: barcode, mode: 'insensitive' } },
          { sku: { equals: barcode, mode: 'insensitive' } },
        ],
      },
      include: {
        category: { select: { name: true } },
      },
    });

    if (!bale) return null;

    return {
      bale: {
        id: bale.id,
        batchNumber: bale.batchNumber,
        sku: bale.sku,
        barcode: bale.barcode,
        unitPrice: Number(bale.unitPrice),
        remainingCount: bale.remainingCount,
        itemCount: bale.itemCount,
        bogoActive: bale.bogoActive,
        bogoRatio: bale.bogoRatio,
        categoryName: bale.category?.name || 'Unknown',
        businessId: bale.businessId,
      },
    };
  } catch (error) {
    console.error('Error looking up bale by barcode:', error);
    return null;
  }
}

/**
 * Track template usage when a product is created from a template
 */
export async function trackTemplateUsage(
  templateId: string,
  productId: string,
  userId: string
): Promise<void> {
  try {
    // Update template usage count
    await prisma.barcodeTemplates.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1,
        },
        lastUsedAt: new Date(),
      },
    });

    // Note: We could add a template_product_links table here if we want
    // to track which products were created from which templates
    // For now, we just increment the usage count
  } catch (error) {
    console.error('Error tracking template usage:', error);
    // Don't throw - this is non-critical tracking
  }
}
