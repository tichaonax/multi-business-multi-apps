// Universal order types and interfaces
export interface OrderItem {
  id: string
  productVariantId: string
  quantity: number
  unitPrice: number
  discountAmount: number
  totalPrice: number
  productName?: string
  variantName?: string
  attributes?: Record<string, any>
}

export interface UniversalOrder {
  id: string
  orderNumber: string
  businessId: string
  businessType: string
  customerId?: string
  employeeId?: string
  orderType: string
  status: string
  paymentStatus: string
  paymentMethod?: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  notes?: string
  attributes?: Record<string, any>
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  businesses?: {
    name: string
    type: string
  }
  business_customers?: {
    id: string
    name: string
    customerNumber: string
  }
  employees?: {
    id: string
    fullName: string
    employeeNumber: string
  }
}

export interface BusinessOrder extends UniversalOrder {
  displayOrderType: string
  availableStatuses: string[]
  features: Record<string, any>
  icon: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  tableNumber?: string
  estimatedReadyTime?: string
  isKitchenTicket?: boolean
}

export interface OrderFilters {
  searchTerm: string
  statusFilter: string
  typeFilter: string
  paymentFilter: string
  startDate?: string
  endDate?: string
}

export interface OrderStats {
  totalOrders: number
  totalRevenue: number
  completedRevenue: number
  pendingRevenue: number
  pendingOrders: number
  completedToday: number
  averageOrderValue: number
}

export interface OrderUpdateRequest {
  id: string
  status?: string
  paymentStatus?: string
  paymentMethod?: string
  notes?: string
  attributes?: Record<string, any>
}