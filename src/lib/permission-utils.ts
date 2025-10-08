import {
  BusinessPermissions,
  UserLevelPermissions,
  SYSTEM_ADMIN_PERMISSIONS,
  BUSINESS_PERMISSION_PRESETS,
  BusinessPermissionPreset,
  DEFAULT_USER_PERMISSIONS,
  ADMIN_USER_PERMISSIONS
} from '@/types/permissions'

export interface SessionUser {
  id: string
  email?: string | null
  name?: string | null
  role?: string
  // permissions can come from Prisma as JsonValue or as a plain object; allow any here for compatibility
  permissions?: any
  // businessMemberships may be absent on some session payloads (e.g. minimal next-auth session)
  businessMemberships?: {
    businessId: string
    businessName: string
    businessType?: string
    role: string
    permissions?: any
    isActive?: boolean
    joinedAt?: string | Date
    lastAccessedAt?: string | Date | null
  }[]
}
// Exported type for user-level permission keys
export type PermissionKey = keyof UserLevelPermissions


/**
 * Get effective permissions for a user in a specific business context
 */
export function getEffectivePermissions(user: SessionUser | null | undefined, businessId?: string): BusinessPermissions {
  // Handle undefined/null user
  if (!user) {
    return {} as BusinessPermissions
  }

  // System admins get full permissions regardless of business context
  if (user.role === 'admin') {
    return SYSTEM_ADMIN_PERMISSIONS as BusinessPermissions
  }

  const activeBusinessMemberships = user.businessMemberships?.filter(m => m.isActive) || []
  
  // If a specific business is requested, get permissions for that business only
  if (businessId) {
    const businessMembership = activeBusinessMemberships.find(m => m.businessId === businessId)
    if (!businessMembership) {
      // User has no access to this specific business
      return getNoAccessPermissions()
    }
    
    return getMembershipPermissions(businessMembership)
  }

  // No specific business - get highest level permissions across all businesses
  if (activeBusinessMemberships.length === 0) {
    // Special case: Check if this is a driver-only user (has only driver permissions)
    const userPermissions = user.permissions || {}
    const isDriverOnly = userPermissions.canLogDriverTrips &&
                        userPermissions.canLogDriverMaintenance &&
                        !userPermissions.canAccessPersonalFinance &&
                        !userPermissions.canManageVehicles

    if (isDriverOnly) {
      // Drivers get NO business-level permissions, only their specific user-level permissions
      return getDriverOnlyPermissions()
    }

    return getPersonalOnlyPermissions()
  }

  // Find the membership with the highest permissions (business-owner > business-manager > employee > read-only)
  const roleHierarchy: Record<string, number> = {
    'business-owner': 4,
    'business-manager': 3,
    'employee': 2,
    'read-only': 1
  }

  const highestMembership = activeBusinessMemberships.reduce((highest, current) => {
    const currentLevel = roleHierarchy[current.role] || 0
    const highestLevel = roleHierarchy[highest.role] || 0
    return currentLevel > highestLevel ? current : highest
  })

  return getMembershipPermissions(highestMembership)
}

/**
 * Get permissions for a specific business membership
 */
function getMembershipPermissions(membership: any): BusinessPermissions {
  // Get preset permissions for the role
  const presetKey = membership.role as BusinessPermissionPreset
  const presetPermissions = BUSINESS_PERMISSION_PRESETS[presetKey] || BUSINESS_PERMISSION_PRESETS['read-only']

  // Merge with any custom permissions stored in the membership
  const customPermissions = membership.permissions as Partial<BusinessPermissions>
  
  return {
    ...presetPermissions,
    ...customPermissions
  } as BusinessPermissions
}

/**
 * Get permissions for driver-only users (no business-level permissions)
 */
function getDriverOnlyPermissions(): BusinessPermissions {
  return {
    // User-level permissions - drivers only get trip/maintenance logging
    canLogDriverTrips: true,
    canLogDriverMaintenance: true,

    // All business-level permissions are false for drivers
    canViewBusiness: false,
    canEditBusiness: false,
    canDeleteBusiness: false,
    canManageBusinessUsers: false,
    canManageBusinessSettings: false,
    canViewUsers: false,
    canInviteUsers: false,
    canEditUserPermissions: false,
    canRemoveUsers: false,
    canViewAuditLogs: false,
    canExportBusinessData: false,
    canImportBusinessData: false,
    canBackupBusiness: false,
    canRestoreBusiness: false,
    canViewEmployees: false,
    canCreateEmployees: false,
    canEditEmployees: false,
    canDeleteEmployees: false,
    canManageEmployees: false,
    canViewEmployeeContracts: false,
    canCreateEmployeeContracts: false,
    canEditEmployeeContracts: false,
    canDeleteEmployeeContracts: false,
    canManageJobTitles: false,
    canManageBenefitTypes: false,
    canManageCompensationTypes: false,
    canManageDisciplinaryActions: false,
    canViewEmployeeReports: false,
    canExportEmployeeData: false,
    canApproveSalaryIncreases: false,
    canProcessSalaryIncreases: false,
    canAccessFinancialData: false,
    canManageProjectBudgets: false,
    canManageProjectPayments: false,
    canViewCostReports: false,
    canApproveBudgetChanges: false,
    canViewProfitabilityReports: false,

    // Personal finance and other user-level permissions - all false for drivers
    canAccessPersonalFinance: false,
    canAddPersonalExpenses: false,
    canEditPersonalExpenses: false,
    canDeletePersonalExpenses: false,
    canAddMoney: false,
    canManagePersonalCategories: false,
    canManagePersonalContractors: false,
    canManagePersonalProjects: false,
    canViewPersonalReports: false,
    canExportPersonalData: false,
    canViewProjects: false,
    canCreatePersonalProjects: false,
    canCreateBusinessProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canManageProjectTypes: false,
    canViewProjectReports: false,
    canAccessCrossBusinessProjects: false,
    canAccessVehicles: false,
    canViewVehicles: false,
    canManageVehicles: false,
    canManageDrivers: false,
    canManageTrips: false,
    canManageVehicleMaintenance: false,
    canViewVehicleReports: false,
    canExportVehicleData: false,
    canManageSystemSettings: false,
    canViewSystemLogs: false,
    canManageAllBusinesses: false,
  } as BusinessPermissions
}

/**
 * Get permissions for users with no business access
 */
function getPersonalOnlyPermissions(): BusinessPermissions {
  return {
    ...BUSINESS_PERMISSION_PRESETS['read-only'],
    canAccessPersonalFinance: true,
    canAddPersonalExpenses: true,
    canEditPersonalExpenses: true,
    canAddMoney: true,
    canViewPersonalReports: true,
    canExportPersonalData: true,
  } as BusinessPermissions
}

/**
 * Get no-access permissions
 */
function getNoAccessPermissions(): BusinessPermissions {
  return BUSINESS_PERMISSION_PRESETS['read-only'] as BusinessPermissions
}

/**
 * Check if user has a specific permission (optionally in a specific business context)
 */
export function hasPermission(user: SessionUser | null | undefined, permission: string | keyof BusinessPermissions, businessId?: string): boolean {
  const effectivePermissions = getEffectivePermissions(user, businessId)
  return (effectivePermissions as any)[permission] === true
}

/**
 * Check if user has a custom permission (nested permission object)
 */
export function hasCustomPermission(user: SessionUser | null | undefined, permissionPath: string, businessId?: string): boolean {
  // Handle undefined/null user
  if (!user) {
    return false
  }

  const businessMembership = businessId
    ? user.businessMemberships?.find(m => m.businessId === businessId && m.isActive)
    : user.businessMemberships?.filter(m => m.isActive)?.[0] // Get first active membership
    
  if (!businessMembership) return false
  
  // Navigate through nested permission object using dot notation
  const pathParts = permissionPath.split('.')
  let current: any = businessMembership.permissions
  
  for (const part of pathParts) {
    if (!current || typeof current !== 'object') return false
    current = current[part]
  }
  
  return current === true
}

/**
 * Get custom permission value (for non-boolean permissions like limits)
 */
export function getCustomPermissionValue(user: SessionUser | null | undefined, permissionPath: string, businessId?: string, defaultValue: any = null): any {
  // Handle undefined/null user
  if (!user) {
    return defaultValue
  }

  const businessMembership = businessId
    ? user.businessMemberships?.find(m => m.businessId === businessId && m.isActive)
    : user.businessMemberships?.filter(m => m.isActive)?.[0]
    
  if (!businessMembership) return defaultValue
  
  const pathParts = permissionPath.split('.')
  let current: any = businessMembership.permissions
  
  for (const part of pathParts) {
    if (!current || typeof current !== 'object') return defaultValue
    current = current[part]
  }
  
  return current !== undefined ? current : defaultValue
}

/**
 * Check if user can access a business module
 */
export function canAccessModule(user: SessionUser | null | undefined, module: 'construction' | 'restaurant' | 'grocery' | 'clothing' | 'hardware' | 'personal' | 'vehicles'): boolean {
  // System admins have access to all modules
  if (isSystemAdmin(user)) {
    return true
  }

  // Business owners have access to all business modules
  if (isBusinessOwner(user) && module !== 'personal') {
    return true
  }

  switch (module) {
    case 'construction':
      // Use business-type-specific construction permissions
      return getCustomPermissionValue(user, 'construction.canViewProjects', undefined, false) ||
             getCustomPermissionValue(user, 'construction.canCreateProjects', undefined, false) ||
             getCustomPermissionValue(user, 'construction.canManageContractors', undefined, false)
    case 'personal':
      return hasPermission(user, 'canAccessPersonalFinance')
    case 'restaurant':
      // Use business-type-specific restaurant permissions
      return getCustomPermissionValue(user, 'restaurant.canViewMenu', undefined, false) ||
             getCustomPermissionValue(user, 'restaurant.canManageMenu', undefined, false) ||
             getCustomPermissionValue(user, 'restaurant.canViewInventory', undefined, false) ||
             getCustomPermissionValue(user, 'restaurant.canManageInventory', undefined, false)
    case 'grocery':
      // Use business-type-specific grocery permissions
      return getCustomPermissionValue(user, 'grocery.canViewInventory', undefined, false) ||
             getCustomPermissionValue(user, 'grocery.canManageInventory', undefined, false)
    case 'clothing':
      // Use business-type-specific clothing permissions
      return getCustomPermissionValue(user, 'clothing.canViewInventory', undefined, false) ||
             getCustomPermissionValue(user, 'clothing.canManageInventory', undefined, false)
    case 'hardware':
      // Use business-type-specific hardware permissions
      return getCustomPermissionValue(user, 'hardware.canViewInventory', undefined, false) ||
             getCustomPermissionValue(user, 'hardware.canManageInventory', undefined, false)
    case 'vehicles':
      // Vehicle management is a cross-business module available to business owners/managers
      return isBusinessOwner(user) ||
             hasPermission(user, 'canManageBusinessUsers') ||
             getCustomPermissionValue(user, 'vehicles.canViewVehicles', undefined, false) ||
             getCustomPermissionValue(user, 'vehicles.canManageVehicles', undefined, false)
    default:
      return false
  }
}

/**
 * Check if user is a system admin
 */
export function isSystemAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === 'admin'
}

/**
 * Check if user is a business owner of any business
 */
export function isBusinessOwner(user: SessionUser | null | undefined): boolean {
  if (!user) return false
  const activeBusinessMemberships = user.businessMemberships?.filter(m => m.isActive) || []
  return activeBusinessMemberships.some(m => m.role === 'business-owner')
}

/**
 * Get user's active business memberships
 */
export function getActiveBusinessMemberships(user: SessionUser | null | undefined) {
  // Handle undefined/null user
  if (!user) {
    return []
  }
  return user.businessMemberships?.filter(m => m.isActive) || []
}

/**
 * Get user's role in a specific business
 */
export function getUserRoleInBusiness(user: SessionUser | null | undefined, businessId: string): string | null {
  if (!user) return null
  const membership = user.businessMemberships?.find(m => m.businessId === businessId && m.isActive)
  return membership?.role || null
}

/**
 * Check if user has access to multiple businesses
 */
export function hasMultiBusinessAccess(user: SessionUser | null | undefined): boolean {
  const activeBusinesses = getActiveBusinessMemberships(user)
  return activeBusinesses.length > 1
}

/**
 * Get businesses where user has a specific role
 */
export function getBusinessesByRole(user: SessionUser | null | undefined, role: string) {
  return getActiveBusinessMemberships(user).filter(m => m.role === role)
}

/**
 * Get businesses where user has specific permission
 */
export function getBusinessesWithPermission(user: SessionUser | null | undefined, permission: string | keyof BusinessPermissions) {
  return getActiveBusinessMemberships(user).filter(membership => {
    const permissions = getMembershipPermissions(membership)
    return (permissions as any)[permission] === true
  })
}

/**
 * Check if user has permission in ANY of their businesses
 */
export function hasPermissionInAnyBusiness(user: SessionUser | null | undefined, permission: string | keyof BusinessPermissions): boolean {
  const activeBusinesses = getActiveBusinessMemberships(user)
  return activeBusinesses.some(membership => {
    const permissions = getMembershipPermissions(membership)
    return (permissions as any)[permission] === true
  })
}

/**
 * User-Level Permission Functions (Business-Agnostic)
 */

/**
 * Check if user has a specific user-level permission (stored in User.permissions)
 */
// Type-safe wrapper to convert string literals to PermissionKey at call sites
export function asUserPermission(permission: string): PermissionKey | null {
  const allowedKeys = Object.keys(DEFAULT_USER_PERMISSIONS) as string[]
  return allowedKeys.includes(permission) ? (permission as PermissionKey) : null
}

export function hasUserPermission(user: SessionUser | null | undefined, permission: string | keyof UserLevelPermissions): boolean {
  // Handle undefined/null user
  if (!user) {
    return false
  }

  // Normalize permission: if a string is provided, try to map to PermissionKey
  let key: PermissionKey | null
  if (typeof permission === 'string') {
    key = asUserPermission(permission)
    if (!key) {
      // Unknown permission string - be conservative and return false
      return false
    }
  } else {
    key = permission
  }

  // System admins always have full user-level permissions
  if (user.role === 'admin') {
    return ADMIN_USER_PERMISSIONS[key] === true
  }

  // Check user-level permissions directly from User.permissions
  const userPermissions = user.permissions as Partial<UserLevelPermissions>
  return userPermissions[key] === true
}

/**
 * Get effective user-level permissions for a user
 */
export function getUserLevelPermissions(user: SessionUser | null | undefined): UserLevelPermissions {
  // System admins get full user-level permissions
  if (user?.role === 'admin') {
    return ADMIN_USER_PERMISSIONS
  }

  // Merge user's permissions with defaults
  const userPermissions = (user?.permissions as Partial<UserLevelPermissions>) || {}
  return {
    ...DEFAULT_USER_PERMISSIONS,
    ...userPermissions,
  }
}

/**
 * Set user-level permissions for a user (returns updated permissions object)
 */
export function setUserLevelPermissions(
  currentPermissions: Partial<UserLevelPermissions>,
  newPermissions: Partial<UserLevelPermissions>
): UserLevelPermissions {
  return {
    ...DEFAULT_USER_PERMISSIONS,
    ...currentPermissions,
    ...newPermissions,
  }
}

/**
 * Helper function to check combined permissions (user-level OR business-level)
 * This is useful for permissions that can be granted at either level
 */
export function hasEitherPermission(
  user: SessionUser | null | undefined,
  userLevelPermission: keyof UserLevelPermissions,
  businessLevelPermission: keyof BusinessPermissions,
  businessId?: string
): boolean {
  // Check user-level permission first
  if (hasUserPermission(user, userLevelPermission)) {
    return true
  }

  // Fallback to business-level permission
  return hasPermission(user, businessLevelPermission, businessId)
}

/**
 * Project Creation Permission Functions
 */

/**
 * Check if user can create personal projects (user-level permission)
 */
export function canCreatePersonalProjects(user: SessionUser | null | undefined): boolean {
  return hasUserPermission(user, 'canCreatePersonalProjects')
}

/**
 * Check if user can create business projects (user-level permission + business membership)
 */
export function canCreateBusinessProjects(user: SessionUser | null | undefined): boolean {
  return hasUserPermission(user, 'canCreateBusinessProjects')
}

/**
 * Check if user can create projects for a specific business type
 */
export function canCreateProjectsForBusinessType(user: SessionUser | null | undefined, businessType: string): boolean {
  // System admins can create projects for any business type
  if (isSystemAdmin(user)) {
    return true
  }

  // For personal projects, check user-level permission
  if (businessType === 'personal') {
    return canCreatePersonalProjects(user)
  }

  // For business projects, check both user-level and business-type permissions
  return canCreateBusinessProjects(user) &&
         hasCustomPermission(user, `${businessType}.canCreateProjects`)
}

/**
 * Get available business types for project creation based on user permissions
 */
export function getAvailableBusinessTypesForProjects(user: SessionUser | null | undefined): Array<{value: string, label: string}> {
  const businessTypes = [
    { value: 'personal', label: 'Personal' },
    { value: 'construction', label: 'Construction' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'hardware', label: 'Hardware' }
  ]

  return businessTypes.filter(type => canCreateProjectsForBusinessType(user, type.value))
}

/**
 * Get user's active businesses where they can create projects
 */
export function getBusinessesForProjectCreation(user: SessionUser | null | undefined): Array<{id: string, name: string, type: string}> {
  if (!canCreateBusinessProjects(user)) {
    return []
  }

  const activeBusinesses = getActiveBusinessMemberships(user)
  return activeBusinesses
    .filter(membership => {
      // For now, return all active business memberships
      // Business type permission will be checked at project creation time
      return true
    })
    .map(membership => ({
      id: membership.businessId,
      name: membership.businessName,
      type: 'business' // Generic type since we need to get the actual business type from the API
    }))
}

/**
 * Example usage functions for granular permissions
 */

// Example: Check if user can view a specific report type in a business
export function canViewReportType(user: SessionUser | null | undefined, businessId: string, reportType: string): boolean {
  return hasCustomPermission(user, `reports.canView${reportType}Reports`, businessId)
}

// Example: Check if user can approve expenses up to a certain amount
export function canApproveExpense(user: SessionUser | null | undefined, businessId: string | undefined, amount: number): boolean {
  const maxApprovalAmount = getCustomPermissionValue(user, 'financialLimits.canApproveExpensesUpTo', businessId, 0)
  return amount <= maxApprovalAmount
}

// Example: Check if user can work at current time (time-based permissions)
export function canWorkAtCurrentTime(user?: SessionUser | null, businessId?: string): boolean {
  const timeRestrictions = getCustomPermissionValue(user, 'timeRestrictions', businessId, null)
  if (!timeRestrictions) return true // No restrictions
  
  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  
  // Check allowed hours
  if (timeRestrictions.allowedHours) {
    const startHour = parseInt(timeRestrictions.allowedHours.start.split(':')[0])
    const endHour = parseInt(timeRestrictions.allowedHours.end.split(':')[0])
    if (currentHour < startHour || currentHour >= endHour) {
      return false
    }
  }
  
  // Check allowed days
  if (timeRestrictions.allowedDays && !timeRestrictions.allowedDays.includes(currentDay)) {
    return false
  }
  
  return true
}

/**
 * Business-Agnostic Payroll Permission Functions
 * These handle cross-business payroll capabilities and umbrella period access
 */

/**
 * Check if user has business-agnostic manager payroll permissions
 * These permissions allow viewing umbrella periods and overriding business restrictions
 */
export function hasBusinessAgnosticPayrollAccess(user: SessionUser | null | undefined): boolean {
  if (!user) return false

  // System admins always have business-agnostic access
  if (isSystemAdmin(user)) return true

  // Check for explicit business-agnostic umbrella payroll permission
  return hasUserPermission(user, 'canAccessUmbrellaPayroll')
}

/**
 * Check if user can view a specific payroll period based on business context
 */
export function canViewPayrollPeriod(
  user: SessionUser | null | undefined,
  period: { businessId: string; isUmbrella?: boolean }
): boolean {
  if (!user) return false

  // System admins can view all periods
  if (isSystemAdmin(user)) return true

  // If it's an umbrella period, need business-agnostic permission
  if (period.isUmbrella) {
    return hasBusinessAgnosticPayrollAccess(user)
  }

  // For regular business periods, check if user is member of that business
  const memberships = getActiveBusinessMemberships(user)
  return memberships.some(m => m.businessId === period.businessId)
}

/**
 * Check if user can export payroll (business-level or business-agnostic)
 */
export function canExportPayroll(user: SessionUser | null | undefined, businessId?: string): boolean {
  if (!user) return false

  // System admin always can
  if (isSystemAdmin(user)) return true

  // Check business-agnostic permission first
  if (hasUserPermission(user, 'canExportPayrollAcrossBusinesses')) {
    return true
  }

  // Check business-level permission
  return hasPermission(user, 'canExportPayroll', businessId)
}

/**
 * Check if user can reset exported payroll (business-level or business-agnostic)
 */
export function canResetExportedPayroll(user: SessionUser | null | undefined, businessId?: string): boolean {
  if (!user) return false

  // System admin always can
  if (isSystemAdmin(user)) return true

  // Check business-agnostic permission first
  if (hasUserPermission(user, 'canResetPayrollAcrossBusinesses')) {
    return true
  }

  // Check business-level permission
  return hasPermission(user, 'canResetExportedPayrollToPreview', businessId)
}

/**
 * Check if user can delete payroll (business-level or business-agnostic)
 */
export function canDeletePayroll(user: SessionUser | null | undefined, businessId?: string): boolean {
  if (!user) return false

  // System admin always can
  if (isSystemAdmin(user)) return true

  // Check business-agnostic permission first
  if (hasUserPermission(user, 'canDeletePayrollAcrossBusinesses')) {
    return true
  }

  // Check business-level permission
  return hasPermission(user, 'canDeletePayroll', businessId)
}