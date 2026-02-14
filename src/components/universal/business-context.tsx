'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// Business configuration types
export interface BusinessConfig {
  businessId: string
  businessName: string
  businessType: string
  businessDescription?: string
  isActive: boolean
  address?: string
  phone?: string
  receiptReturnPolicy?: string | null
  taxIncludedInPrice?: boolean
  taxRate?: number | null
  taxLabel?: string | null
  general?: {
    currency: string
    timezone: string
    language: string
    dateFormat: string
    numberFormat: string
    taxEnabled: boolean
    taxRate: number
  }
  pos?: {
    enableBarcodeScan: boolean
    enableReceiptPrint: boolean
    enableCashDrawer: boolean
    requireSignature: boolean
    enableTips: boolean
    defaultPaymentMethod: string
  }
  inventory?: {
    trackInventory: boolean
    autoReorderEnabled: boolean
    lowStockThreshold: number
    enableStockMovements: boolean
  }
  businessSpecific?: Record<string, any>
}

interface BusinessContextType {
  config: BusinessConfig | null
  loading: boolean
  error: string | null
  updateConfig: (updates: Partial<BusinessConfig>) => Promise<void>
  formatCurrency: (amount: number) => string
  formatDate: (date: Date | string) => string
  getBusinessFeature: (feature: string) => any
  isBusinessType: (type: string) => boolean
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

export function useBusinessContext() {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    // During build time (SSG/SSR), provide a fallback to prevent build errors
    if (typeof window === 'undefined') {
      return {
        config: null,
        loading: true,
        error: null,
        updateConfig: async () => {},
        formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
        formatDate: (date: Date | string) => new Date(date).toLocaleDateString(),
        getBusinessFeature: () => null,
        isBusinessType: () => false,
      }
    }
    throw new Error('useBusinessContext must be used within a BusinessProvider')
  }
  return context
}

interface BusinessProviderProps {
  businessId: string
  children: React.ReactNode
}

export function BusinessProvider({ businessId, children }: BusinessProviderProps) {
  const [config, setConfig] = useState<BusinessConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create fallback configuration when business not found or API unavailable
  const createFallbackConfig = (businessId: string): BusinessConfig => {
    // Determine business type from businessId or path
    let businessType = 'general'
    if (typeof window !== 'undefined') {
      if (businessId.includes('grocery') || window.location.pathname.includes('/grocery')) {
        businessType = 'grocery'
      } else if (businessId.includes('clothing') || window.location.pathname.includes('/clothing')) {
        businessType = 'clothing'
      } else if (businessId.includes('hardware') || window.location.pathname.includes('/hardware')) {
        businessType = 'hardware'
      }
    }

    return {
      businessId,
      businessName: `Demo ${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Store`,
      businessType,
      businessDescription: `Demo ${businessType} business for testing purposes`,
      isActive: true,
      general: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en-US',
        dateFormat: 'MM/dd/yyyy',
        numberFormat: 'en-US',
        taxEnabled: false,
        taxRate: 0
      },
      pos: {
        enableBarcodeScan: true,
        enableReceiptPrint: true,
        enableCashDrawer: false,
        requireSignature: false,
        enableTips: businessType === 'restaurant',
        defaultPaymentMethod: 'card'
      },
      inventory: {
        trackInventory: true,
        autoReorderEnabled: false,
        lowStockThreshold: 10,
        enableStockMovements: true
      },
      businessSpecific: getBusinessSpecificDefaults(businessType)
    }
  }

  // Get business-specific default configuration
  const getBusinessSpecificDefaults = (businessType: string): Record<string, any> => {
    switch (businessType) {
      case 'grocery':
        return {
          freshness: { trackExpiryDates: true, fifoRotation: true },
          pricing: { weightUnit: 'lbs', supportsPLU: true },
          dietary: { organicLabeling: true, allergenWarnings: true }
        }
      case 'clothing':
        return {
          sizing: { standards: ['US', 'EU'], trackSizeMatrix: true },
          seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
          returnsPolicy: { returnPeriodDays: 30, exchangeAllowed: true }
        }
      case 'hardware':
        return {
          measurements: { units: 'Imperial', supportsCutToSize: true },
          bulkOrdering: { minimumQuantity: 10, volumeDiscounts: true },
          warranty: { defaultWarrantyMonths: 12, extendedWarranty: true }
        }
      default:
        return {}
    }
  }

  useEffect(() => {
    if (!businessId) return

    const fetchConfig = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/universal/business-config?businessId=${businessId}`)

        // If fetch fails (network error, API not available), use fallback
        if (!response) {
          console.warn('API not available, using fallback configuration')
          setConfig(createFallbackConfig(businessId))
          return
        }

        const data = await response.json()

        if (!response.ok) {
          // If business not found, use fallback configuration
          if (response.status === 404 || (data.error && data.error.includes('Business not found'))) {
            console.warn(`Business ${businessId} not found, using fallback configuration`)
            setConfig(createFallbackConfig(businessId))
            return
          }
          throw new Error(data.error || 'Failed to fetch business configuration')
        }

        if (data.success) {
          setConfig(data.data)
        } else {
          throw new Error(data.error || 'Invalid response format')
        }
      } catch (err) {
        // For network errors or API not available, use fallback config
        if (err instanceof Error && (err.message.includes('fetch') || err.message.includes('Network') || err.name === 'TypeError')) {
          console.warn('Network error or API not available, using fallback configuration')
          setConfig(createFallbackConfig(businessId))
        } else {
          console.warn('Error fetching config, using fallback:', err)
          setConfig(createFallbackConfig(businessId))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [businessId])

  const updateConfig = async (updates: Partial<BusinessConfig>) => {
    if (!config) return

    try {
      setError(null)

      const updatedConfig = { ...config, ...updates }
      const response = await fetch('/api/universal/business-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update business configuration')
      }

      if (data.success) {
        setConfig(data.data)
      } else {
        throw new Error(data.error || 'Invalid response format')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      throw err
    }
  }

  const formatCurrency = (amount: number | string | undefined | null): string => {
    // Handle Prisma Decimal (returned as string) and regular numbers
    // Parse string to number if needed, otherwise use as-is
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    const validAmount = typeof numericAmount === 'number' && !isNaN(numericAmount) ? numericAmount : 0

    if (!config?.general?.currency) return `$${validAmount.toFixed(2)}`

    try {
      return new Intl.NumberFormat(config.general.language || 'en-US', {
        style: 'currency',
        currency: config.general.currency,
      }).format(validAmount)
    } catch {
      return `$${validAmount.toFixed(2)}`
    }
  }

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (!config?.general?.dateFormat) {
      return dateObj.toLocaleDateString()
    }

    try {
      const locale = config.general.language || 'en-US'
      return dateObj.toLocaleDateString(locale)
    } catch {
      return dateObj.toLocaleDateString()
    }
  }

  const getBusinessFeature = (feature: string): any => {
    if (!config) return null

    // Check in business-specific config first
    if (config.businessSpecific && config.businessSpecific[feature] !== undefined) {
      return config.businessSpecific[feature]
    }

    // Check in general sections
    const sections = ['general', 'pos', 'inventory', 'notifications']
    for (const section of sections) {
      const sectionConfig = config[section as keyof BusinessConfig] as any
      if (sectionConfig && sectionConfig[feature] !== undefined) {
        return sectionConfig[feature]
      }
    }

    return null
  }

  const isBusinessType = (type: string): boolean => {
    return config?.businessType === type
  }

  const contextValue: BusinessContextType = {
    config,
    loading,
    error,
    updateConfig,
    formatCurrency,
    formatDate,
    getBusinessFeature,
    isBusinessType,
  }

  return (
    <BusinessContext.Provider value={contextValue}>
      {children}
    </BusinessContext.Provider>
  )
}

// Custom hooks for common business type checks
export function useBusinessType() {
  const { config } = useBusinessContext()
  return config?.businessType || null
}

export function useBusinessFeatures() {
  const { getBusinessFeature, isBusinessType } = useBusinessContext()

  return {
    // Common features
    hasInventoryTracking: () => getBusinessFeature('trackInventory') ?? false,
    hasPOS: () => getBusinessFeature('enableBarcodeScan') ?? false,
    hasTips: () => getBusinessFeature('enableTips') ?? false,

    // Business type checks
    isClothing: () => isBusinessType('clothing'),
    isHardware: () => isBusinessType('hardware'),
    isGrocery: () => isBusinessType('grocery'),
    isRestaurant: () => isBusinessType('restaurant'),
    isConsulting: () => isBusinessType('consulting'),

    // Business-specific features
    clothingFeatures: {
      getSizingStandards: () => getBusinessFeature('sizing')?.standards || ['US'],
      getSeasons: () => getBusinessFeature('seasons') || ['Spring', 'Summer', 'Fall', 'Winter'],
      getReturnPeriod: () => getBusinessFeature('returnsPolicy')?.returnPeriodDays || 30,
    },

    hardwareFeatures: {
      getMeasurementUnits: () => getBusinessFeature('measurements')?.units || 'Imperial',
      getBulkMinimum: () => getBusinessFeature('bulkOrdering')?.minimumQuantity || 10,
      getWarrantyMonths: () => getBusinessFeature('warranty')?.defaultWarrantyMonths || 12,
    },

    groceryFeatures: {
      hasExpiryTracking: () => getBusinessFeature('freshness')?.trackExpiryDates ?? true,
      getWeightUnit: () => getBusinessFeature('pricing')?.weightUnit || 'lbs',
      hasOrganicLabeling: () => getBusinessFeature('dietary')?.organicLabeling ?? true,
    },

    restaurantFeatures: {
      hasTableService: () => getBusinessFeature('service')?.tableService ?? true,
      getSpiceLevels: () => getBusinessFeature('menu')?.spiceLevels || ['Mild', 'Medium', 'Spicy'],
      getLoyaltyRate: () => getBusinessFeature('loyalty')?.pointsPerDollar || 1,
    },

    consultingFeatures: {
      getHourlyRate: () => getBusinessFeature('services')?.defaultHourlyRate || 150,
      hasProjectTracking: () => getBusinessFeature('projects')?.trackTimeByPhase ?? true,
      getPaymentTerms: () => getBusinessFeature('billing')?.paymentTerms || 'Net-30',
    }
  }
}