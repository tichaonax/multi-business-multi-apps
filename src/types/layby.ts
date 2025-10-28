// Layby Type Definitions

export type LaybyStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED' | 'ON_HOLD'

export type InstallmentFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'CUSTOM'

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'STORE_CREDIT' | 'LAYAWAY' | 'NET_30' | 'CHECK'

export interface LaybyItem {
  productVariantId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  productName?: string
  sku?: string
}

export interface CustomerLayby {
  id: string
  laybyNumber: string
  businessId: string
  customerId: string | null

  // Status & Financial
  status: LaybyStatus
  totalAmount: number
  depositAmount: number
  depositPercent: number
  balanceRemaining: number
  totalPaid: number

  // Terms & Schedule
  installmentAmount: number | null
  installmentFrequency: InstallmentFrequency | null
  paymentDueDate: string | null
  completionDueDate: string | null

  // Fees & Charges
  serviceFee: number
  lateFee: number
  administrationFee: number
  totalFees: number

  // Items & Release
  items: LaybyItem[]
  itemsReleased: boolean
  itemsReleasedAt: string | null
  itemsReleasedBy: string | null

  // Metadata
  notes: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  cancellationRefund: number | null

  // Relations (optional - included when expanded)
  business?: {
    id: string
    name: string
    type: string
  }
  customer?: {
    id: string
    name: string
    customerNumber: string
    phone?: string
    email?: string
    address?: string
  }
  creator?: {
    id: string
    name: string
    email?: string
  }
  payments?: CustomerLaybyPayment[]
  _count?: {
    payments: number
  }
}

export interface CustomerLaybyPayment {
  id: string
  laybyId: string
  receiptNumber: string

  // Payment Details
  amount: number
  paymentMethod: PaymentMethod
  paymentReference: string | null

  // Metadata
  paymentDate: string
  processedBy: string
  notes: string | null
  isRefund: boolean
  refundedPaymentId: string | null

  // Relations (optional - included when expanded)
  processor?: {
    id: string
    name: string
    email?: string
  }
  refundedPayment?: {
    id: string
    receiptNumber: string
    amount: number
  }
  refunds?: CustomerLaybyPayment[]
}

export interface CreateLaybyPayload {
  businessId: string
  customerId: string
  items: LaybyItem[]
  depositPercent: number
  installmentAmount?: number
  installmentFrequency?: InstallmentFrequency
  paymentDueDate?: string
  completionDueDate?: string
  serviceFee?: number
  administrationFee?: number
  notes?: string
}

export interface UpdateLaybyPayload {
  notes?: string
  paymentDueDate?: string
  completionDueDate?: string
  installmentAmount?: number
  installmentFrequency?: InstallmentFrequency
}

export interface RecordPaymentPayload {
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
}

export interface RefundPaymentPayload {
  reason: string
  notes?: string
}

export interface CompleteLaybyPayload {
  notes?: string
  createOrder?: boolean
}

export interface HoldLaybyPayload {
  reason: string
  notes?: string
}

export interface ReactivateLaybyPayload {
  notes?: string
  updateDueDate?: boolean
  newPaymentDueDate?: string
  newCompletionDueDate?: string
}

// API Response Types
export interface LaybyListResponse {
  data: CustomerLayby[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
}

export interface LaybyResponse {
  data: CustomerLayby
  message?: string
}

export interface PaymentResponse {
  data: {
    payment: CustomerLaybyPayment
    layby: CustomerLayby
    transaction?: {
      id: string
      amount: number
    }
  }
  message: string
  isFullyPaid?: boolean
  balanceRemaining?: number
}

export interface RefundResponse {
  data: {
    refund: CustomerLaybyPayment
    layby: CustomerLayby
    transaction?: {
      id: string
      amount: number
    }
  }
  message: string
  refundAmount: number
  newBalanceRemaining: number
  statusChanged: boolean
}

export interface CompleteLaybyResponse {
  data: {
    layby: CustomerLayby
    order?: any
  }
  message: string
  orderCreated: boolean
}
