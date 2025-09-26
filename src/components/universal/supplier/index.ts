// Universal Supplier Components Library
// Reusable supplier management components for all business types

export { UniversalSupplierGrid } from './universal-supplier-grid'
export { UniversalSupplierForm } from './universal-supplier-form'

// Re-export types for convenience
export type {
  UniversalSupplier,
  UniversalSupplierGridProps,
  UniversalSupplierFormProps,
  UniversalSupplierDashboardProps,
  SupplierDelivery,
  SupplierPurchaseOrder,
  SupplierPerformanceMetrics,
  HardwareSupplierAttributes,
  GrocerySupplierAttributes,
  RestaurantSupplierAttributes,
  BusinessType,
  SupplierStatus,
  DeliveryStatus,
  PaymentTerms,
  ReliabilityRating
} from '@/types/supplier'