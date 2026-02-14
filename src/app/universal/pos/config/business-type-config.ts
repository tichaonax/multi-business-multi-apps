/**
 * Business Type Configuration
 * Defines features and settings for each business type
 */

export type ProductDisplayMode = 'grid' | 'scan' | 'list'
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'snap' | 'loyalty'

export interface BusinessTypeFeatures {
  barcodeScan?: boolean        // Show barcode scanner input
  weightInput?: boolean         // Show weight input field
  categoryFilter?: boolean      // Show category filter tabs
  comboItems?: boolean          // Support combo/bundle items
  wifiTokens?: boolean          // Support WiFi token sales
  customerLookup?: boolean      // Show customer lookup feature
  projectTracking?: boolean     // Project reference tracking
  vinTracking?: boolean         // Vehicle VIN tracking
  timeTracking?: boolean        // Time/hours tracking
  sizeColorOptions?: boolean    // Size and color selection
  businessServices?: boolean    // Support business service sales
}

export interface BusinessTypeConfig {
  productDisplayMode: ProductDisplayMode
  paymentMethods: PaymentMethod[]
  features: BusinessTypeFeatures
  receiptType: string
  defaultCategoryId?: string
  quickActionsEnabled: boolean
  displayName: string
}

export const BUSINESS_TYPE_CONFIGS: Record<string, BusinessTypeConfig> = {
  grocery: {
    displayName: 'Grocery Store',
    productDisplayMode: 'scan',
    paymentMethods: ['cash', 'card', 'snap', 'loyalty'],
    features: {
      barcodeScan: true,
      weightInput: true,
      wifiTokens: true,
      customerLookup: true,
      businessServices: true
    },
    receiptType: 'grocery',
    quickActionsEnabled: true
  },

  restaurant: {
    displayName: 'Restaurant',
    productDisplayMode: 'grid',
    paymentMethods: ['cash', 'card', 'mobile'],
    features: {
      categoryFilter: true,
      comboItems: true,
      wifiTokens: true,
      businessServices: true
    },
    receiptType: 'restaurant',
    quickActionsEnabled: true
  },

  hardware: {
    displayName: 'Hardware Store',
    productDisplayMode: 'scan',
    paymentMethods: ['cash', 'card', 'loyalty'],
    features: {
      barcodeScan: true,
      customerLookup: true,
      wifiTokens: true,
      projectTracking: true,
      businessServices: true
    },
    receiptType: 'hardware',
    quickActionsEnabled: true
  },

  clothing: {
    displayName: 'Clothing Store',
    productDisplayMode: 'grid',
    paymentMethods: ['cash', 'card', 'loyalty'],
    features: {
      barcodeScan: true,
      sizeColorOptions: true,
      customerLookup: true,
      categoryFilter: true,
      wifiTokens: true,
      businessServices: true
    },
    receiptType: 'clothing',
    quickActionsEnabled: true
  },

  construction: {
    displayName: 'Construction',
    productDisplayMode: 'list',
    paymentMethods: ['cash', 'card'],
    features: {
      projectTracking: true,
      customerLookup: true,
      barcodeScan: true,
      businessServices: true
    },
    receiptType: 'construction',
    quickActionsEnabled: true
  },

  vehicles: {
    displayName: 'Vehicle Sales',
    productDisplayMode: 'list',
    paymentMethods: ['cash', 'card'],
    features: {
      vinTracking: true,
      customerLookup: true,
      projectTracking: true,
      businessServices: true
    },
    receiptType: 'vehicles',
    quickActionsEnabled: true
  },

  consulting: {
    displayName: 'Consulting Services',
    productDisplayMode: 'list',
    paymentMethods: ['cash', 'card'],
    features: {
      timeTracking: true,
      projectTracking: true,
      customerLookup: true,
      businessServices: true
    },
    receiptType: 'consulting',
    quickActionsEnabled: true
  },

  retail: {
    displayName: 'Retail Store',
    productDisplayMode: 'grid',
    paymentMethods: ['cash', 'card', 'loyalty'],
    features: {
      barcodeScan: true,
      customerLookup: true,
      wifiTokens: true,
      categoryFilter: true,
      businessServices: true
    },
    receiptType: 'retail',
    quickActionsEnabled: true
  },

  services: {
    displayName: 'Service Business',
    productDisplayMode: 'list',
    paymentMethods: ['cash', 'card'],
    features: {
      timeTracking: true,
      customerLookup: true,
      projectTracking: true,
      wifiTokens: true,
      businessServices: true
    },
    receiptType: 'services',
    quickActionsEnabled: true
  },

  other: {
    displayName: 'General Business',
    productDisplayMode: 'grid',
    paymentMethods: ['cash', 'card'],
    features: {
      barcodeScan: true,
      customerLookup: true,
      businessServices: true
    },
    receiptType: 'default',
    quickActionsEnabled: true
  }
}

/**
 * Get configuration for a business type
 */
export function getBusinessTypeConfig(businessType: string): BusinessTypeConfig {
  return BUSINESS_TYPE_CONFIGS[businessType] || BUSINESS_TYPE_CONFIGS.other
}

/**
 * Check if a business type supports a specific feature
 */
export function hasFeature(
  businessType: string,
  feature: keyof BusinessTypeFeatures
): boolean {
  const config = getBusinessTypeConfig(businessType)
  return config.features[feature] === true
}

/**
 * Get all supported business types
 */
export function getSupportedBusinessTypes(): string[] {
  return Object.keys(BUSINESS_TYPE_CONFIGS)
}

/**
 * Get display name for business type
 */
export function getBusinessTypeDisplayName(businessType: string): string {
  const config = getBusinessTypeConfig(businessType)
  return config.displayName
}
