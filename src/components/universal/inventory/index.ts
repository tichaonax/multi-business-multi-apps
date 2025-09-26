// Universal Inventory Components Library
// Reusable inventory management components for all business types

export { UniversalInventoryGrid } from './universal-inventory-grid'
export { UniversalInventoryForm } from './universal-inventory-form'
export { UniversalStockMovements } from './universal-stock-movements'
export { UniversalLowStockAlerts } from './universal-low-stock-alerts'
export { UniversalInventoryStats } from './universal-inventory-stats'
export { InventoryDashboardWidget } from './inventory-dashboard-widget'
export { CrossBusinessAnalytics } from './cross-business-analytics'

// Re-export types for convenience
export type {
  UniversalInventoryItem,
  UniversalInventoryGridProps
} from './universal-inventory-grid'

export type {
  UniversalInventoryFormProps
} from './universal-inventory-form'

export type {
  StockMovement,
  UniversalStockMovementsProps
} from './universal-stock-movements'

export type {
  LowStockAlert,
  UniversalLowStockAlertsProps
} from './universal-low-stock-alerts'

export type {
  InventoryStats,
  UniversalInventoryStatsProps
} from './universal-inventory-stats'