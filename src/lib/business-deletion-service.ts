/**
 * Business Deletion Service
 * 
 * Handles hard deletion of businesses and all related data.
 * Only used for demo businesses (containing '[Demo]' in name).
 * Real businesses use soft delete (isActive = false).
 * 
 * Deletion order is critical to avoid foreign key constraint violations.
 */

import { prisma } from '@/lib/prisma'

interface DeletionResult {
  success: boolean
  error?: string
  warning?: string
  deletedCounts?: {
    orderItems: number
    orders: number
    stockMovements: number
    productVariants: number
    productAttributes: number
    productImages: number
    products: number
    categories: number
    suppliers: number
    locations: number
    transactions: number
    projectContractors: number
    projects: number
    employeeContracts: number
    employeeAssignments: number
    employees: number
    vehicleTrips: number
    vehicleExpenses: number
    vehicleReimbursements: number
    vehicles: number
    menuCombos: number
    menuPromotions: number
    payrollExports: number
    laybys: number
    memberships: number
    brands: number
    customers: number
    business: boolean
  }
}

export async function deleteBusinessHard(
  businessId: string,
  userId: string | null
): Promise<DeletionResult> {
  try {
    // First, verify the business exists and get its details
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      include: {
        business_memberships: {
          where: { isActive: true },
          include: {
            users: {
              select: { name: true, email: true }
            }
          }
        },
        employees: {
          where: { isActive: true },
          select: { fullName: true, employeeNumber: true }
        }
      }
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    // Safety check: Verify this is a demo business
    const isDemoBusiness = business.name.includes('[Demo]')
    if (!isDemoBusiness) {
      return {
        success: false,
        error: 'Hard delete is only allowed for demo businesses. Use soft delete (deactivation) for real businesses.'
      }
    }

    // Safety check: No active memberships or employees
    if (business.business_memberships.length > 0) {
      const memberNames = business.business_memberships
        .map(m => m.users.name || m.users.email)
        .join(', ')

      return {
        success: false,
        error: `Cannot delete business with ${business.business_memberships.length} active member(s): ${memberNames}. Go to Admin → User Management to deactivate their membership first.`
      }
    }

    if (business.employees.length > 0) {
      const employeeNames = business.employees
        .map(e => `${e.fullName} (${e.employeeNumber})`)
        .join(', ')

      return {
        success: false,
        error: `Cannot delete business with ${business.employees.length} active employee(s): ${employeeNames}. Transfer them to another business first using the employee transfer feature.`
      }
    }

    // Perform deletion in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const deletedCounts: DeletionResult['deletedCounts'] = {
        orderItems: 0,
        orders: 0,
        stockMovements: 0,
        productVariants: 0,
        productAttributes: 0,
        productImages: 0,
        products: 0,
        categories: 0,
        suppliers: 0,
        locations: 0,
        transactions: 0,
        projectContractors: 0,
        projects: 0,
        employeeContracts: 0,
        employeeAssignments: 0,
        employees: 0,
        vehicleTrips: 0,
        vehicleExpenses: 0,
        vehicleReimbursements: 0,
        vehicles: 0,
        menuCombos: 0,
        menuPromotions: 0,
        payrollExports: 0,
        laybys: 0,
        memberships: 0,
        brands: 0,
        customers: 0,
        business: false
      }

      // 1. Delete order-related data
      const orders = await tx.businessOrders.findMany({
        where: { businessId },
        select: { id: true }
      })
      
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id)
        const { count: orderItemsCount } = await tx.businessOrderItems.deleteMany({
          where: { orderId: { in: orderIds } }
        })
        deletedCounts.orderItems = orderItemsCount
      }

      const { count: ordersCount } = await tx.businessOrders.deleteMany({
        where: { businessId }
      })
      deletedCounts.orders = ordersCount

      // 2. Delete product-related data (in dependency order)
      const products = await tx.businessProducts.findMany({
        where: { businessId },
        select: { id: true }
      })

      if (products.length > 0) {
        const productIds = products.map(p => p.id)

        // Delete stock movements
        const { count: stockCount } = await tx.businessStockMovements.deleteMany({
          where: { businessProductId: { in: productIds } }
        })
        deletedCounts.stockMovements = stockCount

        // Delete product attributes
        const { count: attrsCount } = await tx.productAttributes.deleteMany({
          where: { productId: { in: productIds } }
        })
        deletedCounts.productAttributes = attrsCount

        // Delete product images
        const { count: imagesCount } = await tx.productImages.deleteMany({
          where: { productId: { in: productIds } }
        })
        deletedCounts.productImages = imagesCount

        // Delete product variants
        const { count: variantsCount } = await tx.productVariants.deleteMany({
          where: { productId: { in: productIds } }
        })
        deletedCounts.productVariants = variantsCount
      }

      // Delete products
      const { count: productsCount } = await tx.businessProducts.deleteMany({
        where: { businessId }
      })
      deletedCounts.products = productsCount

      // 3. Delete categories
      const { count: categoriesCount } = await tx.businessCategories.deleteMany({
        where: { businessId }
      })
      deletedCounts.categories = categoriesCount

      // 4. Delete suppliers
      const { count: suppliersCount } = await tx.businessSuppliers.deleteMany({
        where: { businessId }
      })
      deletedCounts.suppliers = suppliersCount

      // 5. Delete locations
      const { count: locationsCount } = await tx.businessLocations.deleteMany({
        where: { businessId }
      })
      deletedCounts.locations = locationsCount

      // 6. Delete transactions
      const { count: transactionsCount } = await tx.businessTransactions.deleteMany({
        where: { businessId }
      })
      deletedCounts.transactions = transactionsCount

      // 7. Delete project-related data
      const projects = await tx.projects.findMany({
        where: { businessId },
        select: { id: true }
      })

      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id)
        const { count: contractorsCount } = await tx.projectContractors.deleteMany({
          where: { projectId: { in: projectIds } }
        })
        deletedCounts.projectContractors = contractorsCount
      }

      const { count: projectsCount } = await tx.projects.deleteMany({
        where: { businessId }
      })
      deletedCounts.projects = projectsCount

      // 8. Delete employee-related data
      const employees = await tx.employees.findMany({
        where: { primaryBusinessId: businessId },
        select: { id: true }
      })

      if (employees.length > 0) {
        const employeeIds = employees.map(e => e.id)

        const { count: contractsCount } = await tx.employeeContracts.deleteMany({
          where: { employeeId: { in: employeeIds } }
        })
        deletedCounts.employeeContracts = contractsCount

        const { count: assignmentsCount } = await tx.employeeBusinessAssignments.deleteMany({
          where: { employeeId: { in: employeeIds } }
        })
        deletedCounts.employeeAssignments = assignmentsCount
      }

      const { count: employeesCount } = await tx.employees.deleteMany({
        where: { primaryBusinessId: businessId }
      })
      deletedCounts.employees = employeesCount

      // 9. Delete vehicle-related data
      const vehicles = await tx.vehicles.findMany({
        where: { businessId },
        select: { id: true }
      })

      if (vehicles.length > 0) {
        const vehicleIds = vehicles.map(v => v.id)

        const { count: tripsCount } = await tx.vehicleTrips.deleteMany({
          where: { vehicleId: { in: vehicleIds } }
        })
        deletedCounts.vehicleTrips = tripsCount

        const { count: expensesCount } = await tx.vehicleExpenses.deleteMany({
          where: { vehicleId: { in: vehicleIds } }
        })
        deletedCounts.vehicleExpenses = expensesCount

        const { count: reimbursementsCount } = await tx.vehicleReimbursements.deleteMany({
          where: { vehicleId: { in: vehicleIds } }
        })
        deletedCounts.vehicleReimbursements = reimbursementsCount
      }

      const { count: vehiclesCount } = await tx.vehicles.deleteMany({
        where: { businessId }
      })
      deletedCounts.vehicles = vehiclesCount

      // 10. Delete menu-related data (restaurant-specific)
      const { count: combosCount } = await tx.menuCombos.deleteMany({
        where: { businessId }
      })
      deletedCounts.menuCombos = combosCount

      const { count: promotionsCount } = await tx.menuPromotions.deleteMany({
        where: { businessId }
      })
      deletedCounts.menuPromotions = promotionsCount

      // 11. Delete payroll exports
      const { count: exportsCount } = await tx.payrollExports.deleteMany({
        where: { businessId }
      })
      deletedCounts.payrollExports = exportsCount

      // 12. Delete laybys
      const { count: laybysCount } = await tx.customerLayby.deleteMany({
        where: { businessId }
      })
      deletedCounts.laybys = laybysCount

      // 13. Delete memberships (including inactive ones)
      const { count: membershipsCount } = await tx.businessMemberships.deleteMany({
        where: { businessId }
      })
      deletedCounts.memberships = membershipsCount

      // 14. Delete brands
      const { count: brandsCount } = await tx.businessBrands.deleteMany({
        where: { businessId }
      })
      deletedCounts.brands = brandsCount

      // 15. Delete customers
      const { count: customersCount } = await tx.businessCustomers.deleteMany({
        where: { businessId }
      })
      deletedCounts.customers = customersCount

      // 16. Finally, delete the business itself
      // (This will cascade delete: business_accounts, inter_business_loans, payroll_periods)
      await tx.businesses.delete({
        where: { id: businessId }
      })
      deletedCounts.business = true

      // 17. Create audit log
      await tx.auditLogs.create({
        data: {
          action: 'BUSINESS_HARD_DELETED',
          entityType: 'Business',
          entityId: businessId,
          ...(userId && { userId }), // Only include userId if it exists
          details: {
            businessName: business.name,
            businessType: business.type,
            deletedCounts
          }
        } as any
      })

      return deletedCounts
    })

    return {
      success: true,
      deletedCounts: result
    }
  } catch (error) {
    console.error('Error in deleteBusinessHard:', error)

    // Convert technical errors to user-friendly messages
    let userMessage = 'An unexpected error occurred while deleting the business. Please try again or contact support.'

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()

      // Prisma-specific errors
      if (errorMsg.includes('foreign key constraint')) {
        userMessage = 'Cannot delete business due to existing data dependencies. Please contact support for assistance.'
      } else if (errorMsg.includes('unique constraint')) {
        userMessage = 'A duplicate entry was detected. Please refresh the page and try again.'
      } else if (errorMsg.includes('record to delete does not exist')) {
        userMessage = 'Business not found. It may have already been deleted.'
      } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        userMessage = 'The operation took too long. Please try again.'
      } else if (errorMsg.includes('connection')) {
        userMessage = 'Database connection error. Please check your connection and try again.'
      }

      // Log the full technical error for debugging
      console.error('[Business Hard Delete] Technical error details:', error.message)
    }

    return {
      success: false,
      error: userMessage
    }
  }
}

/**
 * Soft delete (deactivation) for real businesses
 */
export async function deleteBusinessSoft(
  businessId: string,
  userId: string | null
): Promise<DeletionResult> {
  try {
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      include: {
        business_memberships: {
          where: { isActive: true },
          include: {
            users: {
              select: { name: true, email: true }
            }
          }
        },
        employees: {
          where: { isActive: true },
          select: { fullName: true, employeeNumber: true }
        }
      }
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    // Note: We DO NOT block deactivation if employees exist
    // Employees can remain associated with inactive businesses
    // The user can optionally transfer them to another business later

    // Automatically deactivate all active memberships for this business
    let deactivatedMembershipsCount = 0
    if (business.business_memberships.length > 0) {
      const membershipIds = business.business_memberships.map(m => m.id)
      const result = await prisma.businessMemberships.updateMany({
        where: { id: { in: membershipIds } },
        data: { isActive: false }
      })
      deactivatedMembershipsCount = result.count
    }

    // Soft delete the business
    const updated = await prisma.businesses.update({
      where: { id: businessId },
      data: { isActive: false, updatedAt: new Date() }
    })

    // Create audit log
    try {
      await prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_DEACTIVATED',
          entityType: 'Business',
          entityId: businessId,
          ...(userId && { userId }), // Only include userId if it exists
          details: {
            businessName: business.name,
            businessType: business.type,
            deactivatedMemberships: deactivatedMembershipsCount,
            membershipNames: business.business_memberships.length > 0
              ? business.business_memberships.map(m => m.users.name || m.users.email).join(', ')
              : undefined,
            employeeCount: business.employees.length,
            employeeTransferNote: business.employees.length > 0
              ? `${business.employees.length} active employee(s) remain associated with this inactive business. You can optionally transfer them to another business.`
              : undefined
          }
        } as any
      })
    } catch (e) {
      console.warn('Failed to create audit log for soft delete', e)
    }

    // Return success with informational message
    const result: DeletionResult = { success: true }

    // Build informational message about what was deactivated
    const messages: string[] = []

    if (deactivatedMembershipsCount > 0) {
      const memberNames = business.business_memberships
        .map(m => m.users.name || m.users.email)
        .join(', ')
      messages.push(`${deactivatedMembershipsCount} business membership(s) automatically deactivated: ${memberNames}`)
    }

    if (business.employees.length > 0) {
      const employeeNames = business.employees
        .map(e => `${e.fullName} (${e.employeeNumber})`)
        .join(', ')
      messages.push(`${business.employees.length} active employee(s) remain associated with this business: ${employeeNames}. You can transfer them to another business if needed.`)
    }

    if (messages.length > 0) {
      result.warning = `Business deactivated successfully. ${messages.join(' ')}`
    }

    return result
  } catch (error) {
    console.error('Error in deleteBusinessSoft:', error)

    // Convert technical errors to user-friendly messages
    let userMessage = 'An unexpected error occurred while deactivating the business. Please try again or contact support.'

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()

      // Prisma-specific errors
      if (errorMsg.includes('foreign key constraint')) {
        userMessage = 'Cannot deactivate business due to existing data dependencies. Please contact support for assistance.'
      } else if (errorMsg.includes('unique constraint')) {
        userMessage = 'A duplicate entry was detected. Please refresh the page and try again.'
      } else if (errorMsg.includes('record to update not found')) {
        userMessage = 'Business not found. It may have already been deactivated or deleted.'
      } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        userMessage = 'The operation took too long. Please try again.'
      } else if (errorMsg.includes('connection')) {
        userMessage = 'Database connection error. Please check your connection and try again.'
      }

      // Log the full technical error for debugging
      console.error('[Business Deactivation] Technical error details:', error.message)
    }

    return {
      success: false,
      error: userMessage
    }
  }
}

/**
 * Get deletion impact summary (what will be deleted)
 */
export async function getDeletionImpact(businessId: string) {
  try {
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return null
    }

    const isDemoBusiness = business.name.includes('[Demo]')

    // Get employee details with primary business info
    const employees = await prisma.employees.findMany({
      where: { primaryBusinessId: businessId },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        primaryBusinessId: true,
        isActive: true,
        businesses: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Get active membership details with user info
    const memberships = await prisma.businessMemberships.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Count related records
    const [
      ordersCount,
      productsCount,
      categoriesCount,
      suppliersCount,
      locationsCount,
      projectsCount,
      vehiclesCount,
      customersCount
    ] = await Promise.all([
      prisma.businessOrders.count({ where: { businessId } }),
      prisma.businessProducts.count({ where: { businessId } }),
      prisma.businessCategories.count({ where: { businessId } }),
      prisma.businessSuppliers.count({ where: { businessId } }),
      prisma.businessLocations.count({ where: { businessId } }),
      prisma.projects.count({ where: { businessId } }),
      prisma.vehicles.count({ where: { businessId } }),
      prisma.businessCustomers.count({ where: { businessId } })
    ])

    return {
      businessName: business.name,
      businessType: business.type,
      isDemoBusiness,
      relatedRecords: {
        orders: ordersCount,
        products: productsCount,
        categories: categoriesCount,
        suppliers: suppliersCount,
        locations: locationsCount,
        projects: projectsCount,
        employees: employees.length,
        vehicles: vehiclesCount,
        memberships: memberships.length,
        customers: customersCount
      },
      membershipDetails: memberships.map(membership => ({
        id: membership.id,
        userId: membership.users.id,
        userName: membership.users.name || membership.users.email,
        userEmail: membership.users.email,
        role: membership.role,
        isActive: membership.isActive
      })),
      employeeDetails: employees.map(emp => ({
        id: emp.id,
        fullName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        primaryBusinessId: emp.primaryBusinessId,
        primaryBusinessName: emp.businesses.name,
        isActive: emp.isActive
      }))
    }
  } catch (error) {
    console.error('Error getting deletion impact:', error)
    return null
  }
}
