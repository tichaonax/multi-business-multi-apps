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
    // Check product_barcodes table
    const matchedBarcode = await prisma.productBarcodes.findFirst({
      where: {
        code: barcode,
        product: {
          businessId: businessId,
        },
      },
      include: {
        product: {
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
                shortName: true,
                businessType: true,
              },
            },
            product_categories: {
              select: {
                id: true,
                name: true,
                emoji: true,
              },
            },
            product_variants: {
              include: {
                variant_barcodes: true,
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
            select: { id: true, name: true, shortName: true, businessType: true },
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
            businessType: skuProduct.businesses?.businessType,
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

    if (matchedBarcode) {
      const product = matchedBarcode.product;

      // Check if barcode matches a specific variant
      let variantId: string | undefined;
      const matchingVariant = product.product_variants?.find((v) =>
        v.variant_barcodes?.some((vb) => vb.code === barcode)
      );
      if (matchingVariant) {
        variantId = matchingVariant.id;
      }

      return {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          sku: product.sku,
          businessType: product.businesses?.businessType,
          productType: product.productType,
          condition: product.condition,
          category: product.product_categories
            ? {
                id: product.product_categories.id,
                name: product.product_categories.name,
                emoji: product.product_categories.emoji,
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
            barcode: v.variant_barcodes?.[0]?.code,
            barcodes: v.variant_barcodes?.map((vb) => ({
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
      };
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
    // Find template with matching barcode value
    const template = await prisma.barcodeTemplates.findFirst({
      where: {
        barcodeValue: barcode,
        businessId: businessId,
        isActive: true,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
            businessType: true,
          },
        },
        print_jobs: {
          where: {
            barcodeData: barcode,
          },
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
        businessType: template.business.businessType || 'general',
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
