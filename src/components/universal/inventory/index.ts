// Universal Inventory Components Library
// Reusable inventory management components for all business types

export { UniversalInventoryGrid } from './universal-inventory-grid'
export { UniversalInventoryForm } from './universal-inventory-form'
export { UniversalStockMovements } from './universal-stock-movements'
export { UniversalLowStockAlerts } from './universal-low-stock-alerts'
export { UniversalInventoryStats } from './universal-inventory-stats'
export { InventoryDashboardWidget } from './inventory-dashboard-widget'
export { CrossBusinessAnalytics } from './cross-business-analytics'

// Note: individual components declare many local interfaces but do not export
// them. Re-exporting those types from this barrel file caused type errors
// when the underlying modules didn't export the named types. If you need
// any of these type shapes for external usage, export them from their
// implementation files and re-add them here.