/**
 * Business Default Pages Library
 *
 * Provides utilities for managing business default landing pages.
 * Each business type has specific pages available as default landing pages.
 *
 * Bug fix (2026): the `common` options below used to assume every business
 * type has its own `/{type}`, `/{type}/pos`, `/{type}/reports`, and
 * `/{type}/inventory` page — untrue for services/construction/consulting/
 * retail/other, which either share the universal POS or have no dedicated
 * page at all. Selecting "POS System" as a default landing page for one of
 * these types silently produced a 404 (e.g. `/services/pos`). Every path
 * below is now checked against which pages actually exist, verified
 * directly against src/app/ at the time of this fix — see the *_HAS_OWN
 * sets. If a new page is added for one of these types later, add it here
 * too, or this bug reappears for that type.
 */

export interface DefaultPageOption {
  value: string
  label: string
  icon: string
  path: string
}

// Verified against src/app/ — business types with a real page at each path.
// Anything NOT in these sets falls back to a universal/generic equivalent
// instead of a type-specific path that doesn't exist.
const HAS_OWN_HOME = new Set(['restaurant', 'grocery', 'clothing', 'hardware', 'construction', 'services'])
const HAS_OWN_POS = new Set(['restaurant', 'grocery', 'clothing', 'hardware', 'retail'])
const HAS_OWN_REPORTS = new Set(['restaurant', 'grocery', 'clothing', 'hardware', 'retail'])
const HAS_OWN_INVENTORY = new Set(['restaurant', 'grocery', 'clothing', 'hardware'])

function homePath(businessType: string): string {
  return HAS_OWN_HOME.has(businessType) ? `/${businessType}` : '/dashboard'
}

/**
 * Get available default page options for a specific business type
 */
export function getDefaultPageOptions(businessType: string): DefaultPageOption[] {
  // vehicle_service doesn't follow the generic /{businessType}/* convention below —
  // it has no root page, uses the shared universal POS, and its own pages live under
  // the hyphenated /vehicle-service/* path (the DB type value uses an underscore).
  if (businessType === 'vehicle_service') {
    return [
      { value: 'home', label: 'Jobs', icon: '🛠️', path: '/vehicle-service/jobs' },
      { value: 'pos', label: 'POS System', icon: '🚗', path: '/universal/pos' },
      { value: 'customers', label: 'Customers', icon: '🧑‍🤝‍🧑', path: '/vehicle-service/customers' },
      { value: 'parts', label: 'Parts Inventory', icon: '🧰', path: '/vehicle-service/parts' },
      { value: 'contractors', label: 'Contractors', icon: '🔧', path: '/vehicle-service/contractors' },
      { value: 'parts-requests', label: 'Parts Requests', icon: '📦', path: '/vehicle-service/parts-requests' },
      { value: 'labour-rates', label: 'Labour Rates', icon: '💵', path: '/vehicle-service/labour-rates' },
    ]
  }

  // Common pages available to all business types
  const common: DefaultPageOption[] = [
    { value: 'home', label: 'Business Home', icon: '🏠', path: homePath(businessType) },
    { value: 'pos', label: 'POS System', icon: '💰', path: HAS_OWN_POS.has(businessType) ? `/${businessType}/pos` : '/universal/pos' },
    { value: 'reports', label: 'Sales Reports', icon: '📊', path: HAS_OWN_REPORTS.has(businessType) ? `/${businessType}/reports` : '/reports' },
    ...(HAS_OWN_INVENTORY.has(businessType)
      ? [{ value: 'inventory', label: 'Inventory', icon: '📦', path: `/${businessType}/inventory` }]
      : []),
  ]

  // Business-type specific pages — only for pages confirmed to actually
  // exist. construction/consulting/retail previously listed pages
  // (projects, orders, clients, products) that were never built; removed
  // rather than pointed at a 404. restaurant's "reservations" was the same
  // — no such page exists — removed for the same reason.
  const businessSpecific: Record<string, DefaultPageOption[]> = {
    clothing: [
      { value: 'products', label: 'Products', icon: '👗', path: '/clothing/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/clothing/orders' },
    ],
    restaurant: [
      { value: 'menu', label: 'Menu Management', icon: '🍽️', path: '/restaurant/menu' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/restaurant/orders' },
    ],
    grocery: [
      { value: 'products', label: 'Products', icon: '🛒', path: '/grocery/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/grocery/orders' },
    ],
    hardware: [
      { value: 'products', label: 'Products', icon: '🔧', path: '/hardware/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/hardware/orders' },
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
  // vehicle_service has no root page at /vehicle_service (or /vehicle-service) — its
  // "home" is the Jobs page. Always resolve through its own options list below.
  if (businessType === 'vehicle_service') {
    const home = getDefaultPageOptions(businessType).find(opt => opt.value === (defaultPage || 'home'))
    return home?.path || '/vehicle-service/jobs'
  }

  // If no default page specified, use home — homePath() already accounts
  // for business types with no real root page (falls back to /dashboard).
  if (!defaultPage || defaultPage === 'home') {
    return homePath(businessType)
  }

  const options = getDefaultPageOptions(businessType)
  const option = options.find(opt => opt.value === defaultPage)

  // Return the path if found, otherwise fall back to home
  return option?.path || homePath(businessType)
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
