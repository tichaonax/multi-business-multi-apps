import { PrismaClient } from '@prisma/client'
import type { PayeeType, GroupedPayees, AnyPayee, CreateIndividualPayeeInput } from '@/types/payee'
import { formatPayeeDisplayName } from '@/types/payee'

const prisma = new PrismaClient()

/**
 * Get all available payees grouped by type
 * @param userId - Current user ID (for filtering)
 * @param businessId - Optional business ID to filter employees
 */
export async function getAllAvailablePayees(
  userId?: string,
  businessId?: string
): Promise<GroupedPayees> {
  // Fetch all payee types in parallel
  const [users, employees, persons, businesses] = await Promise.all([
    // Get active users
    prisma.users.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    }),

    // Get active employees (optionally filtered by business)
    prisma.employees.findMany({
      where: {
        isActive: true,
        ...(businessId && { primaryBusinessId: businessId }),
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        fullName: true,
        nationalId: true,
        email: true,
        phone: true,
        jobTitleId: true,
        userId: true,
        businesses: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    }),

    // Get active persons (contractors/individuals)
    prisma.persons.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        nationalId: true,
        phone: true,
        email: true,
        address: true,
      },
      orderBy: { fullName: 'asc' },
    }),

    // Get active businesses
    prisma.businesses.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Check if current user is also an employee
  let userEmployeeRecord = null
  if (userId) {
    userEmployeeRecord = employees.find(emp => {
      // Find if this user has an associated employee record
      // We need to check if the user ID matches the employee ID or if there's a user-employee relationship
      return emp.userId === userId
    })
  }

  // Filter employees: if user is an employee, only return their own employee record
  let filteredEmployees = employees
  if (userEmployeeRecord) {
    filteredEmployees = [userEmployeeRecord]
  }

  // Transform to payee format
  return {
    users: users.map((user) => ({
      id: user.id,
      type: 'USER' as const,
      name: user.name,
      displayName: `${user.name} (${user.email})`,
      identifier: user.email,
      isActive: true,
      email: user.email,
      role: user.role,
    })),

    employees: filteredEmployees.map((employee) => ({
      id: employee.id,
      type: 'EMPLOYEE' as const,
      name: employee.fullName,
      displayName: `${employee.fullName} - ${employee.employeeNumber}`,
      identifier: employee.employeeNumber,
      isActive: true,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      nationalId: employee.nationalId,
      email: employee.email,
      phone: employee.phone,
      jobTitle: employee.job_titles?.title || undefined,
      primaryBusiness: employee.businesses
        ? {
            id: employee.businesses.id,
            name: employee.businesses.name,
          }
        : undefined,
    })),

    persons: persons.map((person) => ({
      id: person.id,
      type: 'PERSON' as const,
      name: person.fullName,
      displayName: person.nationalId
        ? `${person.fullName} (${person.nationalId})`
        : person.fullName,
      identifier: person.nationalId || person.phone,
      isActive: true,
      fullName: person.fullName,
      nationalId: person.nationalId,
      phone: person.phone,
      email: person.email,
      address: person.address,
    })),

    businesses: businesses.map((business) => ({
      id: business.id,
      type: 'BUSINESS' as const,
      name: business.name,
      displayName: `${business.name} [${business.type}]`,
      identifier: business.type,
      isActive: true,
      businessName: business.name,
      businessType: business.type,
      description: business.description,
    })),
  }
}

/**
 * Validate that a payee exists and is active
 * @param payeeType - Type of payee (USER, EMPLOYEE, PERSON, BUSINESS)
 * @param payeeId - ID of the payee
 */
export async function validatePayee(
  payeeType: PayeeType,
  payeeId: string
): Promise<{ valid: boolean; error?: string; payee?: AnyPayee }> {
  try {
    let payee: any = null

    switch (payeeType) {
      case 'USER':
        payee = await prisma.users.findUnique({
          where: { id: payeeId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        })

        if (!payee) {
          return { valid: false, error: 'User not found' }
        }
        if (!payee.isActive) {
          return { valid: false, error: 'User is inactive' }
        }

        return {
          valid: true,
          payee: {
            id: payee.id,
            type: 'USER',
            name: payee.name,
            displayName: `${payee.name} (${payee.email})`,
            identifier: payee.email,
            isActive: payee.isActive,
            email: payee.email,
            role: payee.role,
          },
        }

      case 'EMPLOYEE':
        payee = await prisma.employees.findUnique({
          where: { id: payeeId },
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true,
            email: true,
            phone: true,
            jobTitleId: true,
            job_titles: {
              select: {
                title: true,
              },
            },
            isActive: true,
            businesses: {
              select: { id: true, name: true },
            },
          },
        })

        if (!payee) {
          return { valid: false, error: 'Employee not found' }
        }
        if (!payee.isActive) {
          return { valid: false, error: 'Employee is inactive' }
        }

        return {
          valid: true,
          payee: {
            id: payee.id,
            type: 'EMPLOYEE',
            name: payee.fullName,
            displayName: `${payee.fullName} - ${payee.employeeNumber}`,
            identifier: payee.employeeNumber,
            isActive: payee.isActive,
            employeeNumber: payee.employeeNumber,
            fullName: payee.fullName,
            nationalId: payee.nationalId,
            email: payee.email,
            phone: payee.phone,
            jobTitle: payee.job_titles?.title || undefined,
            primaryBusiness: payee.businesses,
          },
        }

      case 'PERSON':
        payee = await prisma.persons.findUnique({
          where: { id: payeeId },
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            phone: true,
            email: true,
            address: true,
            isActive: true,
          },
        })

        if (!payee) {
          return { valid: false, error: 'Person not found' }
        }
        if (!payee.isActive) {
          return { valid: false, error: 'Person is inactive' }
        }

        return {
          valid: true,
          payee: {
            id: payee.id,
            type: 'PERSON',
            name: payee.fullName,
            displayName: payee.nationalId
              ? `${payee.fullName} (${payee.nationalId})`
              : payee.fullName,
            identifier: payee.nationalId || payee.phone,
            isActive: payee.isActive,
            fullName: payee.fullName,
            nationalId: payee.nationalId,
            phone: payee.phone,
            email: payee.email,
            address: payee.address,
          },
        }

      case 'BUSINESS':
        payee = await prisma.businesses.findUnique({
          where: { id: payeeId },
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            isActive: true,
          },
        })

        if (!payee) {
          return { valid: false, error: 'Business not found' }
        }
        if (!payee.isActive) {
          return { valid: false, error: 'Business is inactive' }
        }

        return {
          valid: true,
          payee: {
            id: payee.id,
            type: 'BUSINESS',
            name: payee.name,
            displayName: `${payee.name} [${payee.type}]`,
            identifier: payee.type,
            isActive: payee.isActive,
            businessName: payee.name,
            businessType: payee.type,
            description: payee.description,
          },
        }

      default:
        return { valid: false, error: 'Invalid payee type' }
    }
  } catch (error) {
    console.error('Error validating payee:', error)
    return { valid: false, error: 'Failed to validate payee' }
  }
}

/**
 * Create a new individual payee (Person record)
 * @param data - Person data (fullName, nationalId, phone, email, address)
 * @param createdBy - User ID creating the person
 */
export async function createIndividualPayee(
  data: CreateIndividualPayeeInput,
  createdBy: string
): Promise<{ success: boolean; error?: string; person?: any }> {
  try {
    // Validate required fields
    if (!data.fullName || data.fullName.trim() === '') {
      return { success: false, error: 'Full name is required' }
    }

    // Check if nationalId is unique (if provided)
    if (data.nationalId) {
      const existing = await prisma.persons.findFirst({
        where: { nationalId: data.nationalId },
      })

      if (existing) {
        return {
          success: false,
          error: `Person with National ID ${data.nationalId} already exists`,
        }
      }
    }

    // Generate unique ID (format: IND-001, IND-002, etc.)
    const personId = await generateIndividualId()

    // Create person record
    const person = await prisma.persons.create({
      data: {
        id: personId,
        fullName: data.fullName.trim(),
        nationalId: data.nationalId?.trim() || null,
        phone: data.phone?.trim() || '',
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        isActive: true,
        createdBy,
      },
    })

    return {
      success: true,
      person: {
        id: person.id,
        type: 'PERSON',
        name: person.fullName,
        displayName: person.nationalId
          ? `${person.fullName} (${person.nationalId})`
          : person.fullName,
        identifier: person.nationalId || person.phone,
        isActive: person.isActive,
        fullName: person.fullName,
        nationalId: person.nationalId,
        phone: person.phone,
        email: person.email,
        address: person.address,
      },
    }
  } catch (error) {
    console.error('Error creating individual payee:', error)
    return { success: false, error: 'Failed to create individual payee' }
  }
}

/**
 * Generate unique individual ID (format: IND-001, IND-002, etc.)
 */
export async function generateIndividualId(): Promise<string> {
  // Find the highest individual ID
  const lastPerson = await prisma.persons.findFirst({
    where: {
      id: {
        startsWith: 'IND-',
      },
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      id: true,
    },
  })

  let sequence = 1
  if (lastPerson && lastPerson.id.startsWith('IND-')) {
    const lastSequence = parseInt(lastPerson.id.replace('IND-', ''))
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `IND-${sequence.toString().padStart(3, '0')}`
}

/**
 * Get payee by type and ID
 * @param payeeType - Type of payee
 * @param payeeId - ID of payee
 */
export async function getPayee(payeeType: PayeeType, payeeId: string): Promise<AnyPayee | null> {
  const result = await validatePayee(payeeType, payeeId)
  return result.valid && result.payee ? result.payee : null
}

/**
 * Search payees across all types
 * @param searchTerm - Search term to filter by name/identifier
 * @param businessId - Optional business ID to filter employees
 */
export async function searchPayees(
  searchTerm: string,
  businessId?: string
): Promise<GroupedPayees> {
  const term = searchTerm.toLowerCase().trim()

  if (!term) {
    return getAllAvailablePayees(undefined, businessId)
  }

  // Search across all payee types
  const [users, employees, persons, businesses] = await Promise.all([
    prisma.users.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    }),

    prisma.employees.findMany({
      where: {
        isActive: true,
        ...(businessId && { primaryBusinessId: businessId }),
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { employeeNumber: { contains: term, mode: 'insensitive' } },
          { nationalId: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        employeeNumber: true,
        fullName: true,
        nationalId: true,
        email: true,
        phone: true,
        jobTitleId: true,
        userId: true,
        job_titles: {
          select: { title: true },
        },
        businesses: {
          select: { id: true, name: true },
        },
      },
      orderBy: { fullName: 'asc' },
    }),

    prisma.persons.findMany({
      where: {
        isActive: true,
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { nationalId: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        nationalId: true,
        phone: true,
        email: true,
        address: true,
      },
      orderBy: { fullName: 'asc' },
    }),

    prisma.businesses.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { type: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Transform to payee format (same as getAllAvailablePayees)
  return {
    users: users.map((user) => ({
      id: user.id,
      type: 'USER' as const,
      name: user.name,
      displayName: `${user.name} (${user.email})`,
      identifier: user.email,
      isActive: true,
      email: user.email,
      role: user.role,
    })),

    employees: employees.map((employee) => ({
      id: employee.id,
      type: 'EMPLOYEE' as const,
      name: employee.fullName,
      displayName: `${employee.fullName} - ${employee.employeeNumber}`,
      identifier: employee.employeeNumber,
      isActive: true,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      nationalId: employee.nationalId,
      email: employee.email,
      phone: employee.phone,
      jobTitle: employee.job_titles?.title || undefined,
      primaryBusiness: employee.businesses
        ? {
            id: employee.businesses.id,
            name: employee.businesses.name,
          }
        : undefined,
    })),

    persons: persons.map((person) => ({
      id: person.id,
      type: 'PERSON' as const,
      name: person.fullName,
      displayName: person.nationalId
        ? `${person.fullName} (${person.nationalId})`
        : person.fullName,
      identifier: person.nationalId || person.phone,
      isActive: true,
      fullName: person.fullName,
      nationalId: person.nationalId,
      phone: person.phone,
      email: person.email,
      address: person.address,
    })),

    businesses: businesses.map((business) => ({
      id: business.id,
      type: 'BUSINESS' as const,
      name: business.name,
      displayName: `${business.name} [${business.type}]`,
      identifier: business.type,
      isActive: true,
      businessName: business.name,
      businessType: business.type,
      description: business.description,
    })),
  }
}

/**
 * Format payee display name (re-export from types)
 */
export { formatPayeeDisplayName }
