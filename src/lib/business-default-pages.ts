/**
 * Business Default Pages Library
 *
 * Provides utilities for managing business default landing pages.
 * Each business type has specific pages available as default landing pages.
 */

export interface DefaultPageOption {
  value: string
  label: string
  icon: string
  path: string
}

/**
 * Get available default page options for a specific business type
 */
export function getDefaultPageOptions(businessType: string): DefaultPageOption[] {
  // Common pages available to all business types
  const common: DefaultPageOption[] = [
    { value: 'home', label: 'Business Home', icon: '🏠', path: `/${businessType}` },
    { value: 'pos', label: 'POS System', icon: '💰', path: `/${businessType}/pos` },
    { value: 'reports', label: 'Sales Reports', icon: '📊', path: `/${businessType}/reports` },
    { value: 'inventory', label: 'Inventory', icon: '📦', path: `/${businessType}/inventory` },
  ]

  // Business-type specific pages
  const businessSpecific: Record<string, DefaultPageOption[]> = {
    clothing: [
      { value: 'products', label: 'Products', icon: '👗', path: '/clothing/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/clothing/orders' },
    ],
    restaurant: [
      { value: 'menu', label: 'Menu Management', icon: '🍽️', path: '/restaurant/menu' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/restaurant/orders' },
      { value: 'reservations', label: 'Reservations', icon: '📅', path: '/restaurant/reservations' },
    ],
    grocery: [
      { value: 'products', label: 'Products', icon: '🛒', path: '/grocery/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/grocery/orders' },
    ],
    hardware: [
      { value: 'products', label: 'Products', icon: '🔧', path: '/hardware/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/hardware/orders' },
    ],
    construction: [
      { value: 'projects', label: 'Projects', icon: '🏗️', path: '/construction/projects' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/construction/orders' },
    ],
    consulting: [
      { value: 'clients', label: 'Clients', icon: '👥', path: '/consulting/clients' },
      { value: 'projects', label: 'Projects', icon: '📁', path: '/consulting/projects' },
    ],
    retail: [
      { value: 'products', label: 'Products', icon: '🏪', path: '/retail/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/retail/orders' },
    ],
  }

  return [...common, ...(businessSpecific[businessType] || [])]
}

/**
 * Get the full path for a given default page
 *
 * @param businessType - The type of business (clothing, restaurant, etc.)
 * @param defaultPage - The default page value (pos, reports, etc.)
 * @returns The full path to navigate to
 */
export function getDefaultPagePath(businessType: string, defaultPage: string | null): string {
  // If no default page specified, use home
  if (!defaultPage || defaultPage === 'home') {
    return `/${businessType}`
  }

  const options = getDefaultPageOptions(businessType)
  const option = options.find(opt => opt.value === defaultPage)

  // Return the path if found, otherwise fall back to home
  return option?.path || `/${businessType}`
}

/**
 * Validate if a default page is valid for a business type
 *
 * @param businessType - The type of business
 * @param defaultPage - The default page to validate
 * @returns True if valid, false otherwise
 */
export function isValidDefaultPage(businessType: string, defaultPage: string): boolean {
  const options = getDefaultPageOptions(businessType)
  return options.some(opt => opt.value === defaultPage)
}

/**
 * Get valid default page values for a business type (for validation)
 */
export function getValidDefaultPageValues(businessType: string): string[] {
  return getDefaultPageOptions(businessType).map(opt => opt.value)
}
