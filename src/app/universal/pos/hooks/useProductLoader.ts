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

  // Product variants
  variants?: ProductVariant[]

  // WiFi Token specific fields
  tokenConfigId?: string
  packageName?: string
  duration?: number
  bandwidthDownMb?: number
  bandwidthUpMb?: number

  // Business specific
  isCombo?: boolean
  comboItems?: any[]
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
        `/api/universal/products?businessId=${businessId}&businessType=${businessType}&includeVariants=true`
      )

      if (!productsResponse.ok) {
        throw new Error(`Failed to load products: ${productsResponse.statusText}`)
      }

      const productsData = await productsResponse.json()

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

      // Load WiFi tokens if business supports them (ESP32)
      let wifiTokenProducts: Product[] = []
      try {
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
              tokenConfigId: token.config.id,
              packageName: token.config.packageName,
              duration: token.config.durationMinutes,
              bandwidthDownMb: token.config.bandwidthDownMb,
              bandwidthUpMb: token.config.bandwidthUpMb,
              stockQuantity: token.availableCount || 0
            }))
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
                const durationText = `${config.durationValue} ${config.durationUnit.replace('day_', '').replace('week_', '').replace('month_', '')}`
                return {
                  id: `r710_${config.id}`,
                  name: `📶 ${config.name}`,
                  description: config.description || durationText,
                  basePrice: parseFloat(item.businessPrice || config.basePrice || 0),
                  isWiFiToken: true,
                  tokenConfigId: config.id,
                  packageName: config.name,
                  duration: config.durationValue,
                  category: 'WiFi Passes',
                  stockQuantity: 999 // R710 tokens are generated on demand
                }
              })
            console.log(`📶 Loaded ${r710TokenProducts.length} R710 WiFi token products`)
          }
        }
      } catch (r710Error) {
        console.warn('Failed to load R710 WiFi tokens, continuing without them:', r710Error)
      }

      // Combine regular products, ESP32 WiFi tokens, and R710 tokens
      setProducts([...transformedProducts, ...wifiTokenProducts, ...r710TokenProducts])
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
