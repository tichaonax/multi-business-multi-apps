// Universal Supplier Management Types
// Reusable types for supplier management across all business types

export type BusinessType = 'grocery' | 'restaurant' | 'clothing' | 'hardware' | 'construction'

export type SupplierStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export type DeliveryStatus = 'scheduled' | 'in_transit' | 'arrived' | 'receiving' | 'completed' | 'issues' | 'cancelled'

export type PaymentTerms = 'cod' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'prepaid' | 'custom'

export type ReliabilityRating = 'excellent' | 'good' | 'fair' | 'poor'

// Core universal supplier interface
export interface UniversalSupplier {
  id: string
  businessId: string
  businessType: BusinessType
  name: string
  code: string // Internal supplier code
  category: string // Primary category (e.g., "Lumber", "Produce", "Fabric")

  // Contact Information
  contact: {
    primaryContact: string
    phone: string
    email: string
    website?: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
    alternateContacts?: Array<{
      name: string
      role: string
      phone?: string
      email?: string
    }>
  }

  // Business Terms
  terms: {
    paymentTerms: PaymentTerms
    customPaymentTerms?: string
    minimumOrder: number
    currency: string
    leadTimeDays: number
    shippingTerms?: string // FOB, CIF, etc.
    warrantyDays?: number
    returnPolicy?: string
  }

  // Performance Tracking
  performance: {
    onTimeDeliveryPercent: number
    qualityScore: number // 1-10 scale
    totalOrders: number
    totalSpent: number
    lastOrderDate?: string
    reliability: ReliabilityRating
    averageLeadTime: number
    issueCount: number
    responseTimeHours: number
  }

  // Certifications and Compliance
  certifications: Array<{
    name: string
    issuedBy: string
    expirationDate?: string
    documentUrl?: string
  }>

  // Business-specific attributes (flexible for each business type)
  attributes: Record<string, any>

  // Metadata
  status: SupplierStatus
  tags: string[]
  notes: string
  createdAt: string
  updatedAt: string
  createdBy: string
  lastUpdatedBy: string
}

// Delivery tracking
export interface SupplierDelivery {
  id: string
  businessId: string
  businessType: BusinessType
  supplierId: string
  supplierName: string
  orderNumber: string
  purchaseOrderId?: string

  status: DeliveryStatus
  priority: 'low' | 'normal' | 'high' | 'urgent'

  // Scheduling
  scheduledDate: string
  scheduledTimeWindow?: {
    start: string
    end: string
  }
  actualArrivalDate?: string
  completedDate?: string

  // Items being delivered
  items: Array<{
    itemId?: string
    name: string
    description?: string
    orderedQuantity: number
    receivedQuantity?: number
    unit: string
    unitPrice: number
    totalPrice: number
    quality?: 'excellent' | 'good' | 'fair' | 'poor'
    condition?: 'perfect' | 'good' | 'acceptable' | 'damaged'
    issues?: string[]
    attributes?: Record<string, any> // Business-specific item attributes
  }>

  // Delivery details
  delivery: {
    driverName?: string
    vehicleInfo?: string
    trackingNumber?: string
    shippingCarrier?: string
    estimatedArrival?: string
    deliveryInstructions?: string
    signatureRequired: boolean
    specialHandling?: string[]
  }

  // Financial
  totalValue: number
  currency: string
  taxAmount?: number
  shippingCost?: number

  // Quality and Compliance
  requiresInspection: boolean
  inspectionCompleted?: boolean
  inspectionResults?: {
    inspector: string
    completedAt: string
    passed: boolean
    issues?: string[]
    notes?: string
  }

  // Business-specific attributes
  attributes: Record<string, any>

  // Communication
  notes: string[]
  attachments?: Array<{
    name: string
    url: string
    type: string
    uploadedBy: string
    uploadedAt: string
  }>

  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  lastUpdatedBy: string
}

// Purchase Order
export interface SupplierPurchaseOrder {
  id: string
  businessId: string
  businessType: BusinessType
  supplierId: string
  supplierName: string
  orderNumber: string

  status: 'draft' | 'sent' | 'acknowledged' | 'shipped' | 'delivered' | 'completed' | 'cancelled'

  // Order details
  orderDate: string
  requestedDeliveryDate: string
  confirmedDeliveryDate?: string

  items: Array<{
    itemId?: string
    name: string
    description?: string
    quantity: number
    unit: string
    unitPrice: number
    totalPrice: number
    attributes?: Record<string, any>
  }>

  // Financial
  subtotal: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  currency: string

  // Terms
  paymentTerms: PaymentTerms
  shippingTerms?: string

  // Business-specific attributes
  attributes: Record<string, any>

  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  approvedBy?: string
  approvedAt?: string
}

// Supplier Performance Metrics
export interface SupplierPerformanceMetrics {
  supplierId: string
  businessId: string
  period: {
    start: string
    end: string
  }

  delivery: {
    totalDeliveries: number
    onTimeDeliveries: number
    onTimePercent: number
    averageLeadTime: number
    earlyDeliveries: number
    lateDeliveries: number
  }

  quality: {
    totalOrders: number
    qualityScore: number // 1-10 average
    defectRate: number // percentage
    returnRate: number // percentage
    complaintCount: number
  }

  financial: {
    totalSpent: number
    averageOrderValue: number
    paymentOnTime: number
    paymentLate: number
    disputeCount: number
  }

  communication: {
    responseTimeHours: number
    issueResolutionDays: number
    communicationRating: number // 1-10
  }

  compliance: {
    certificationsCurrent: number
    certificationsExpired: number
    auditsPassed: number
    auditsFailed: number
  }
}

// Business-specific supplier attributes

// Hardware store supplier attributes
export interface HardwareSupplierAttributes {
  // Material categories
  materialCategories: Array<{
    category: string
    subcategories: string[]
  }>

  // Pricing and ordering
  bulkPricing: {
    enabled: boolean
    tiers?: Array<{
      minimumQuantity: number
      discountPercent: number
    }>
  }

  // Delivery capabilities
  deliveryOptions: {
    standardDelivery: boolean
    expeditedDelivery: boolean
    jobSiteDelivery: boolean
    liftGateService: boolean
    appointmentRequired: boolean
  }

  // Seasonal information
  seasonality: {
    peakSeason?: Array<{ start: string; end: string }>
    availabilityIssues?: string[]
  }

  // Cut-to-size services
  customServices: {
    cutToSize: boolean
    drilling: boolean
    threading: boolean
    customOrders: boolean
  }

  // Contractor relationships
  contractorAccount: {
    hasAccount: boolean
    creditLimit?: number
    specialPricing: boolean
    dedicatedRep?: string
  }
}

// Grocery supplier attributes
export interface GrocerySupplierAttributes {
  // Cold chain and temperature
  coldChain: {
    required: boolean
    temperatureRanges: Array<{
      product: string
      minTemp: number
      maxTemp: number
      unit: 'F' | 'C'
    }>
    certifications: string[]
  }

  // Food safety
  foodSafety: {
    haccp: boolean
    sqf: boolean
    brc: boolean
    otherCertifications: string[]
    lastAuditDate?: string
    auditScore?: number
  }

  // Organic and specialty
  specialty: {
    organic: boolean
    glutenFree: boolean
    nonGmo: boolean
    fairTrade: boolean
    local: boolean
    kosher: boolean
    halal: boolean
  }

  // Delivery scheduling
  deliverySchedule: {
    standardDays: string[]
    cutoffTimes: Record<string, string>
    emergencyDelivery: boolean
  }
}

// Restaurant supplier attributes
export interface RestaurantSupplierAttributes {
  // Food service specific
  foodService: {
    dailyDelivery: boolean
    weekendDelivery: boolean
    menuConsulting: boolean
    seasonalMenus: boolean
    customPortions: boolean
  }

  // Sourcing
  sourcing: {
    farmToTable: boolean
    sustainableSourcing: boolean
    localSourcing: boolean
    traceable: boolean
  }

  // Kitchen integration
  kitchenIntegration: {
    recipeCosting: boolean
    portionControl: boolean
    nutritionalData: boolean
  }
}

// Component Props Types
export interface UniversalSupplierGridProps {
  businessId: string
  businessType: BusinessType
  suppliers?: UniversalSupplier[]
  loading?: boolean
  onSupplierEdit?: (supplier: UniversalSupplier) => void
  onSupplierView?: (supplier: UniversalSupplier) => void
  onSupplierDelete?: (supplier: UniversalSupplier) => void
  onCreateOrder?: (supplier: UniversalSupplier) => void
  showActions?: boolean
  layout?: 'table' | 'grid' | 'cards'
  allowSearch?: boolean
  allowFiltering?: boolean
  allowSorting?: boolean
  showBusinessSpecificFields?: boolean
  customFields?: Array<{
    key: string
    label: string
    render?: (supplier: UniversalSupplier) => React.ReactNode
  }>
}

export interface UniversalSupplierFormProps {
  businessId: string
  businessType: BusinessType
  supplier?: UniversalSupplier
  onSubmit: (supplierData: Partial<UniversalSupplier>) => void
  onCancel: () => void
  loading?: boolean
  customFields?: Array<{
    name: string
    label: string
    type: string
    options?: Array<{ value: string; label: string }>
    section: string
    required?: boolean
    placeholder?: string
    fields?: Array<any> // For grouped fields
  }>
}

export interface UniversalSupplierDashboardProps {
  businessId: string
  businessType: BusinessType
  showDeliveries?: boolean
  showPerformance?: boolean
  showOrders?: boolean
  maxDeliveries?: number
  dateRange?: {
    start: string
    end: string
  }
}