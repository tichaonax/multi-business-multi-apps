import { UniversalOrder, BusinessOrder } from './types'
import { getBusinessOrderConfig } from './BusinessOrderConfig'

export function transformOrderForBusiness(order: UniversalOrder, businessType: string): BusinessOrder {
  const config = getBusinessOrderConfig(businessType)

  // Extract customer info from attributes or business_customers
  const customerInfo = order.attributes?.customerInfo || order.business_customers
  const customerName = customerInfo?.name || order.attributes?.customerName || 'Walk-in Customer'
  const customerPhone = customerInfo?.phone || order.attributes?.customerPhone || ''
  const customerEmail = customerInfo?.email || order.attributes?.customerEmail || ''

  // Extract business-specific attributes
  const tableNumber = order.attributes?.tableNumber || ''
  const estimatedReadyTime = order.attributes?.estimatedReadyTime || ''
  const isKitchenTicket = order.attributes?.ticketType === 'KITCHEN' || order.orderType === 'KITCHEN_TICKET'

  // Map order type to display version
  const displayOrderType = config.orderTypes.includes(order.orderType) ? order.orderType : 'SALE'

  return {
    ...order,
    displayOrderType,
    availableStatuses: config.statuses,
    features: config.features,
    icon: config.icons[order.orderType] || config.icons[displayOrderType] || '📋',
    customerName,
    customerPhone,
    customerEmail,
    tableNumber,
    estimatedReadyTime,
    isKitchenTicket
  }
}

export function transformOrdersForBusiness(orders: UniversalOrder[], businessType: string): BusinessOrder[] {
  return orders.map(order => transformOrderForBusiness(order, businessType))
}

export function getOrderStatusColor(status: string, businessType: string): string {
  const config = getBusinessOrderConfig(businessType)
  return config.statusColors[status] || 'bg-gray-100 text-gray-800'
}

export function getOrderTypeLabel(orderType: string, businessType: string): string {
  const config = getBusinessOrderConfig(businessType)
  return config.orderTypeLabels[orderType] || orderType
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleString()
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'preparing':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'ready':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'completed':
      return 'bg-green-500 text-white dark:bg-green-600'
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'refunded':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export function getStatusIcon(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return '⏳'
    case 'confirmed':
      return '✅'
    case 'preparing':
      return '👨‍🍳'
    case 'ready':
      return '📦'
    case 'completed':
      return '🎉'
    case 'cancelled':
      return '❌'
    case 'refunded':
      return '↩️'
    default:
      return '📋'
  }
}