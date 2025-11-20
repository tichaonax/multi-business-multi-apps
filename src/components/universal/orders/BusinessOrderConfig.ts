// Business-specific order configurations
export interface BusinessOrderConfig {
  orderTypes: string[]
  statuses: string[]
  features: {
    tableNumbers: boolean
    estimatedReadyTime: boolean
    kitchenTickets: boolean
    receiptPrinting: boolean
    loyaltyPrograms?: boolean
    snapEligible?: boolean
    sizeTracking?: boolean
    alterationServices?: boolean
    projectTracking?: boolean
    warrantyServices?: boolean
  }
  icons: Record<string, string>
  statusColors: Record<string, string>
  orderTypeLabels: Record<string, string>
}

export const BUSINESS_ORDER_CONFIGS: Record<string, BusinessOrderConfig> = {
  restaurant: {
    orderTypes: ['DINE_IN', 'TAKEOUT', 'DELIVERY'],
    statuses: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'],
    features: {
      tableNumbers: true,
      estimatedReadyTime: true,
      kitchenTickets: true,
      receiptPrinting: false
    },
    icons: {
      DINE_IN: '🍽️',
      TAKEOUT: '🥡',
      DELIVERY: '🚚'
    },
    statusColors: {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-orange-100 text-orange-800',
      READY: 'bg-green-100 text-green-800',
      SERVED: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    },
    orderTypeLabels: {
      DINE_IN: '🍽️ Dine In',
      TAKEOUT: '🥡 Takeout',
      DELIVERY: '🚚 Delivery'
    }
  },
  grocery: {
    orderTypes: ['SALE', 'RETURN'],
    statuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'],
    features: {
      tableNumbers: false,
      estimatedReadyTime: false,
      kitchenTickets: false,
      receiptPrinting: true,
      loyaltyPrograms: true,
      snapEligible: true
    },
    icons: {
      SALE: '🛒',
      RETURN: '↩️'
    },
    statusColors: {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-orange-100 text-orange-800',
      READY: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    },
    orderTypeLabels: {
      SALE: '🛒 Sale',
      RETURN: '↩️ Return'
    }
  },
  clothing: {
    orderTypes: ['SALE', 'RETURN', 'EXCHANGE'],
    statuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'],
    features: {
      tableNumbers: false,
      estimatedReadyTime: false,
      kitchenTickets: false,
      receiptPrinting: true,
      sizeTracking: true,
      alterationServices: true
    },
    icons: {
      SALE: '👕',
      RETURN: '↩️',
      EXCHANGE: '🔄'
    },
    statusColors: {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-orange-100 text-orange-800',
      READY: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    },
    orderTypeLabels: {
      SALE: '👕 Sale',
      RETURN: '↩️ Return',
      EXCHANGE: '🔄 Exchange'
    }
  },
  hardware: {
    orderTypes: ['SALE', 'RETURN', 'SERVICE'],
    statuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'],
    features: {
      tableNumbers: false,
      estimatedReadyTime: true,
      kitchenTickets: false,
      receiptPrinting: true,
      projectTracking: true,
      warrantyServices: true
    },
    icons: {
      SALE: '🔧',
      RETURN: '↩️',
      SERVICE: '🔧'
    },
    statusColors: {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-orange-100 text-orange-800',
      READY: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    },
    orderTypeLabels: {
      SALE: '🔧 Sale',
      RETURN: '↩️ Return',
      SERVICE: '🔧 Service'
    }
  }
}

export function getBusinessOrderConfig(businessType: string): BusinessOrderConfig {
  return BUSINESS_ORDER_CONFIGS[businessType] || BUSINESS_ORDER_CONFIGS.grocery
}