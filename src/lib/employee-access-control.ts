import { hasPermission, isSystemAdmin, SessionUser } from './permission-utils'

export interface DepartmentAccessFilter {
  canViewAllEmployees: boolean
  allowedDepartments: string[]
  allowedBusinessIds: string[]
  canManageEmployees: boolean
}

/**
 * Determines what employees a user can view based on their role and department
 */
export function getEmployeeAccessFilter(user: SessionUser): DepartmentAccessFilter {
  // System admins can see all employees across all businesses
  if (isSystemAdmin(user)) {
    return {
      canViewAllEmployees: true,
      allowedDepartments: [],
      allowedBusinessIds: [],
      canManageEmployees: true
    }
  }

  // Check if user has employee management permissions
  const canViewEmployees = hasPermission(user, 'canViewEmployees')
  const canManageEmployees = hasPermission(user, 'canManageEmployees') || hasPermission(user, 'canEditEmployees')

  if (!canViewEmployees) {
    return {
      canViewAllEmployees: false,
      allowedDepartments: [],
      allowedBusinessIds: [],
      canManageEmployees: false
    }
  }

  // Get user's active business memberships
  const activeBusinessIds = user.businessMemberships
    ?.filter(membership => membership.isActive)
    .map(membership => membership.businessId) || []

  // Business owners can see all employees in their businesses
  const isBusinessOwner = user.businessMemberships?.some(
    membership => membership.isActive && membership.role === 'business-owner'
  )

  if (isBusinessOwner) {
    return {
      canViewAllEmployees: false,
      allowedDepartments: [],
      allowedBusinessIds: activeBusinessIds,
      canManageEmployees
    }
  }

  // For managers, determine which departments they can access
  // This would typically be based on their own employee record and job title
  // For now, we'll use business type as a proxy for department
  const allowedDepartments = user.businessMemberships
    ?.filter(membership => membership.isActive)
    .map(membership => membership.businessType || 'general') || []

  return {
    canViewAllEmployees: false,
    allowedDepartments,
    allowedBusinessIds: activeBusinessIds,
    canManageEmployees
  }
}

/**
 * Builds Prisma query filters for employee access control
 */
export function buildEmployeeQueryFilter(user: SessionUser) {
  const accessFilter = getEmployeeAccessFilter(user)

  if (!accessFilter.canViewAllEmployees && accessFilter.allowedBusinessIds.length === 0) {
    // User has no access to any employees
    return {
      id: 'no-access' // This will return no results
    }
  }

  if (accessFilter.canViewAllEmployees) {
    // System admin - no filters needed
    return {}
  }

  // Build filter based on business and department access
  const filters: any = {
    primaryBusinessId: {
      in: accessFilter.allowedBusinessIds
    }
  }

  // If user has limited department access, add department filter
  if (accessFilter.allowedDepartments.length > 0) {
    filters.jobTitle = {
      department: {
        in: accessFilter.allowedDepartments
      }
    }
  }

  return filters
}

/**
 * Checks if a user can access a specific employee
 */
export async function canUserAccessEmployee(
  user: SessionUser, 
  employeeId: string,
  prisma: any
): Promise<boolean> {
  const accessFilter = getEmployeeAccessFilter(user)

  if (!accessFilter.canViewAllEmployees && accessFilter.allowedBusinessIds.length === 0) {
    return false
  }

  if (accessFilter.canViewAllEmployees) {
    return true
  }

  // Check if employee belongs to user's accessible business/department
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      jobTitle: {
        select: {
          department: true
        }
      }
    }
  })

  if (!employee) {
    return false
  }

  // Check business access
  if (!accessFilter.allowedBusinessIds.includes(employee.primaryBusinessId)) {
    return false
  }

  // Check department access if applicable
  if (accessFilter.allowedDepartments.length > 0) {
    const employeeDepartment = employee.jobTitle?.department || 'general'
    if (!accessFilter.allowedDepartments.includes(employeeDepartment)) {
      return false
    }
  }

  return true
}

/**
 * Gets departments a user can manage based on their role
 */
export function getUserManagedDepartments(user: SessionUser): string[] {
  const accessFilter = getEmployeeAccessFilter(user)
  
  if (accessFilter.canViewAllEmployees) {
    return ['all'] // System admin
  }

  if (accessFilter.allowedBusinessIds.length > 0 && accessFilter.allowedDepartments.length === 0) {
    return ['all'] // Business owner
  }

  return accessFilter.allowedDepartments
}

/**
 * Checks if user can perform specific employee management actions
 */
export function canUserPerformEmployeeAction(
  user: SessionUser,
  action: 'create' | 'edit' | 'delete' | 'view_contracts' | 'manage_leave' | 'manage_loans' | 'manage_bonuses'
): boolean {
  const accessFilter = getEmployeeAccessFilter(user)

  if (!accessFilter.canViewAllEmployees && accessFilter.allowedBusinessIds.length === 0) {
    return false
  }

  switch (action) {
    case 'create':
      return hasPermission(user, 'canCreateEmployees') || isSystemAdmin(user)
    case 'edit':
      return hasPermission(user, 'canEditEmployees') || hasPermission(user, 'canManageEmployees') || isSystemAdmin(user)
    case 'delete':
      return hasPermission(user, 'canDeleteEmployees') || isSystemAdmin(user)
    case 'view_contracts':
      return hasPermission(user, 'canViewEmployeeContracts') || isSystemAdmin(user)
    case 'manage_leave':
      return hasPermission(user, 'canManageEmployees') || isSystemAdmin(user)
    case 'manage_loans':
      return hasPermission(user, 'canManageEmployees') || isSystemAdmin(user)
    case 'manage_bonuses':
      return hasPermission(user, 'canManageEmployees') || isSystemAdmin(user)
    default:
      return false
  }
}