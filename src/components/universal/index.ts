// Universal Business System Components
// These components automatically adapt to different business types

export {
  BusinessProvider,
  useBusinessContext,
  useBusinessType,
  useBusinessFeatures,
  type BusinessConfig
} from './business-context'

export {
  UniversalProductCard,
  type UniversalProduct
} from './product-card'

export {
  UniversalCategoryNavigation,
  type UniversalCategory
} from './category-navigation'

export {
  UniversalPOS,
  usePOSCart
} from './pos-system'

export {
  UniversalProductGrid
} from './product-grid'

// Re-export commonly used types
export type BusinessType = 'clothing' | 'hardware' | 'grocery' | 'restaurant' | 'consulting'

export type ProductType = 'PHYSICAL' | 'DIGITAL' | 'SERVICE' | 'COMBO'

export type ProductCondition = 'NEW' | 'USED' | 'REFURBISHED' | 'DAMAGED' | 'EXPIRED'

export type OrderType = 'SALE' | 'RETURN' | 'EXCHANGE' | 'SERVICE' | 'RENTAL' | 'SUBSCRIPTION'

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'STORE_CREDIT' | 'LAYAWAY' | 'NET_30' | 'CHECK'
export {
  BarcodeScanner
} from './barcode-scanner'
