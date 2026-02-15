'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ProductVariant {
  id: string
  sku: string
  name: string
  price: number
  stockQuantity?: number
  size?: string
  color?: string
  weight?: number
  barcode?: string
}

export interface Product {
  id: string
  name: string
  description?: string
  basePrice: number
  category?: string
  categoryId?: string
  imageUrl?: string
  stockQuantity?: number
  barcode?: string
  isWiFiToken?: boolean
  isR710Token?: boolean
  isService?: boolean
  productType?: string

  // Product variants
  variants?: ProductVariant[]

  // WiFi Token specific fields
  tokenConfigId?: string
  packageName?: string
  duration?: number
  durationUnit?: string
  bandwidthDownMb?: number
  bandwidthUpMb?: number
  availableQuantity?: number

  // Product condition (NEW, USED, etc.)
  condition?: string

  // Bale-specific fields (clothing)
  isBale?: boolean
  baleId?: string
  bogoActive?: boolean
  bogoRatio?: number

  // Business specific
  isCombo?: boolean
  comboItems?: any[]
  soldToday?: number
}

interface UseProductLoaderResult {
  products: Product[]
  loading: boolean
  error: string | null
  reloadProducts: () => void
}

/**
 * Product Loader Hook
 * Loads products for current business type from universal API
 */
export function useProductLoader(
  businessId: string | null | undefined,
  businessType: string
): UseProductLoaderResult {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    if (!businessId) {
      setProducts([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Load regular products
      const productsResponse = await fetch(
        `/api/universal/products?businessId=${businessId}&businessType=${businessType}&includeVariants=true&limit=5000`
      )

      if (!productsResponse.ok) {
        throw new Error(`Failed to load products: ${productsResponse.statusText}`)
      }

      const productsJson = await productsResponse.json()
      const productsData = Array.isArray(productsJson) ? productsJson : (productsJson.data || [])

      // Transform products to match our interface
      const transformedProducts: Product[] = productsData.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: parseFloat(product.basePrice || product.price || 0),
        category: product.category?.name,
        categoryId: product.categoryId,
        imageUrl: product.imageUrl || product.images?.[0]?.url,
        stockQuantity: product.stockQuantity,
        barcode: product.barcode,
        productType: product.productType,
        condition: product.condition || 'NEW',
        isService: product.productType === 'SERVICE',
        isCombo: product.isCombo,
        comboItems: product.comboItems,
        variants: product.variants?.map((variant: any) => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name || variant.variantName,
          price: parseFloat(variant.price || product.basePrice || 0),
          stockQuantity: variant.stockQuantity,
          size: variant.size,
          color: variant.color,
          weight: variant.weight,
          barcode: variant.barcode
        }))
      }))

      // Load ESP32 WiFi tokens only if ESP32 integration is enabled
      let wifiTokenProducts: Product[] = []
      try {
        // Check if ESP32 portal integration exists for this business
        const integrationResponse = await fetch(
          `/api/business/${businessId}/portal-integration`
        )
        const hasEsp32Integration = integrationResponse.ok && (await integrationResponse.json()).integration

        if (hasEsp32Integration) {
          const wifiResponse = await fetch(
            `/api/business/${businessId}/wifi-tokens?includeConfig=true`
          )

          if (wifiResponse.ok) {
            const wifiData = await wifiResponse.json()

            // Transform WiFi tokens to products
            wifiTokenProducts = wifiData
              .filter((token: any) => token.config) // Only tokens with configs
              .map((token: any) => ({
                id: `wifi_${token.config.id}`,
                name: `WiFi: ${token.config.packageName}`,
                description: `${Math.floor(token.config.durationMinutes / 60)}h ${token.config.durationMinutes % 60}m - ${token.config.bandwidthDownMb}MB Down / ${token.config.bandwidthUpMb}MB Up`,
                basePrice: parseFloat(token.config.priceAmount || 0),
                isWiFiToken: true,
                isR710Token: false,
                tokenConfigId: token.config.id,
                packageName: token.config.packageName,
                duration: token.config.durationMinutes,
                bandwidthDownMb: token.config.bandwidthDownMb,
                bandwidthUpMb: token.config.bandwidthUpMb,
                stockQuantity: token.availableCount || 0,
                availableQuantity: token.availableCount || 0
              }))
          }
        }
      } catch (wifiError) {
        console.warn('Failed to load ESP32 WiFi tokens, continuing without them:', wifiError)
      }

      // Load R710 WiFi tokens if business supports them
      let r710TokenProducts: Product[] = []
      try {
        const r710Response = await fetch(
          `/api/business/${businessId}/r710-tokens`
        )

        if (r710Response.ok) {
          const r710Data = await r710Response.json()

          if (r710Data.menuItems && r710Data.menuItems.length > 0) {
            // Transform R710 menu items to products
            r710TokenProducts = r710Data.menuItems
              .filter((item: any) => item.isActive && item.tokenConfig?.isActive)
              .map((item: any) => {
                const config = item.tokenConfig
                const durationUnit = (config.durationUnit || '').replace('day_', '').replace('week_', '').replace('month_', '')
                const durationText = `${config.durationValue} ${durationUnit}`
                const available = item.availableCount || 0
                return {
                  id: `r710_${config.id}`,
                  name: `📶 ${config.name}`,
                  description: config.description || durationText,
                  basePrice: parseFloat(item.businessPrice || config.basePrice || 0),
                  isWiFiToken: true,
                  isR710Token: true,
                  tokenConfigId: config.id,
                  packageName: config.name,
                  duration: config.durationValue,
                  durationUnit: durationUnit,
                  category: 'WiFi Passes',
                  stockQuantity: available,
                  availableQuantity: available
                }
              })
            console.log(`📶 Loaded ${r710TokenProducts.length} R710 WiFi token products`)
          }
        }
      } catch (r710Error) {
        console.warn('Failed to load R710 WiFi tokens, continuing without them:', r710Error)
      }

      // Load sold today stats
      let soldTodayCounts: Record<string, number> = {}
      try {
        const statsResponse = await fetch(`/api/restaurant/product-stats?businessId=${businessId}`)
        if (statsResponse.ok) {
          const statsJson = await statsResponse.json()
          const statsData = statsJson.data || []
          statsData.forEach((stat: any) => {
            soldTodayCounts[stat.productId] = stat.soldToday || 0
          })
        }
      } catch (statsError) {
        console.warn('Failed to load product stats, continuing without them:', statsError)
      }

      // Load bale products for clothing businesses
      let baleProducts: Product[] = []
      if (businessType === 'clothing') {
        try {
          const baleResponse = await fetch(
            `/api/clothing/bales?businessId=${businessId}`
          )

          if (baleResponse.ok) {
            const baleJson = await baleResponse.json()
            const balesData = baleJson.data || []

            baleProducts = balesData
              .filter((bale: any) => bale.isActive && bale.remainingCount > 0)
              .map((bale: any) => ({
                id: `bale_${bale.id}`,
                name: `${bale.category?.name || 'Bale'} - ${bale.batchNumber}`,
                description: bale.notes || `${bale.remainingCount} of ${bale.itemCount} items remaining`,
                basePrice: parseFloat(bale.unitPrice || 0),
                category: bale.category?.name || 'Bales',
                barcode: bale.barcode || bale.sku,
                stockQuantity: bale.remainingCount,
                condition: 'USED',
                isBale: true,
                baleId: bale.id,
                bogoActive: bale.bogoActive,
                bogoRatio: bale.bogoRatio
              }))

            console.log(`Loaded ${baleProducts.length} bale products for clothing POS`)
          }
        } catch (baleError) {
          console.warn('Failed to load bale products, continuing without them:', baleError)
        }
      }

      // Filter out $0 products (except WiFi tokens and R710 tokens which may be free)
      const filteredProducts = transformedProducts.filter(p => p.basePrice > 0)

      // Merge soldToday into all products
      const allProducts = [...filteredProducts, ...baleProducts, ...wifiTokenProducts, ...r710TokenProducts]
      allProducts.forEach(p => {
        p.soldToday = soldTodayCounts[p.id] || 0
      })

      // Combine regular products, ESP32 WiFi tokens, and R710 tokens
      setProducts(allProducts)
    } catch (err) {
      console.error('Error loading products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [businessId, businessType])

  // Load products when businessId or businessType changes
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    products,
    loading,
    error,
    reloadProducts: loadProducts
  }
}
