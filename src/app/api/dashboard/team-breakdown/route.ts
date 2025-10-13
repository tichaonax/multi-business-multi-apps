import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const userBusinessIds = user.businessMemberships?.map(m => m.businessId) || []

    let breakdown = {
      users: { count: 0, list: [] as any[] },
      employees: { count: 0, list: [] as any[] },
      businessBreakdown: {} as Record<string, { users: number, employees: number, businessName: string, businessType: string }>,
      roles: {} as Record<string, number>,
      total: 0
    }

    // 1. Get Team Members (Users) with business context
    if (hasUserPermission(user, 'canViewEmployees') ||
        hasUserPermission(user, 'canManageEmployees') ||
        isSystemAdmin(user)) {

      try {
        if (isSystemAdmin(user)) {
          // System admin can see all users
          const allUsers = await prisma.users.findMany({
            where: {
              isActive: true
            },
            include: {
              businessMemberships: {
                where: { isActive: true },
                include: {
                  businesses: {
                    select: {
                      name: true,
                      type: true
                    }
                  }
                }
              }
            },
            orderBy: {
              name: 'asc'
            }
          })

          breakdown.users.count = allUsers.length
          breakdown.users.list = allUsers.map(u => {
            const businessCount = u.businessMemberships.length

            // Filter out memberships without business data first
            const validBusinessMemberships = u.businessMemberships.filter(bm => bm.business)

            // Find primary business
            const primaryBusiness = validBusinessMemberships.find(bm => bm.businesses?.id === u.lastAccessedBusinessId) || validBusinessMemberships[0]

            // Filter other businesses (exclude the primary one)
            const otherBusinesses = validBusinessMemberships.filter(bm =>
              bm.business && bm.businesses.id !== primaryBusiness?.businesses?.id
            )

            // Debug info temporarily added to response
            const debugInfo = {
              totalMemberships: u.businessMemberships.length,
              validMemberships: validBusinessMemberships.length,
              primaryBusiness: primaryBusiness?.businesses?.name,
              otherBusinessCount: otherBusinesses.length,
              otherBusinessNames: otherBusinesses.map(bm => bm.businesses?.name),
              lastAccessedBusinessId: u.lastAccessedBusinessId
            }

            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              isActive: u.isActive,
              createdAt: u.createdAt,
              businessCount,
              debugInfo, // Temporary debug info
              primaryBusiness: primaryBusiness?.business ? {
                id: primaryBusiness.businesses.id,
                name: primaryBusiness.businesses.name,
                type: primaryBusiness.businesses.type,
                role: primaryBusiness.role,
                isPrimary: true
              } : null,
              otherBusinesses: otherBusinesses.map(bm => ({
                id: bm.businesses?.id,
                name: bm.businesses?.name,
                type: bm.businesses?.type,
                role: bm.role,
                isPrimary: false
              })),
              // Keep old format for backward compatibility
              businesses: u.businessMemberships.map(bm => ({
                businessName: bm.businesses?.name,
                businessType: bm.businesses?.type,
                role: bm.role
              }))
            }
          })

          // Count roles
          allUsers.forEach(u => {
            breakdown.roles[u.role] = (breakdown.roles[u.role] || 0) + 1
          })

        } else if (userBusinessIds.length > 0) {
          // Count users in the same businesses
          const businessUsers = await prisma.businessMemberships.findMany({
            where: {
              businessId: { in: userBusinessIds },
              isActive: true
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  isActive: true,
                  createdAt: true
                }
              },
              businesses: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            },
            orderBy: {
              user: {
                name: 'asc'
              }
            }
          })

          // Remove duplicates by userId
          const uniqueUsers = businessUsers.reduce((acc, membership) => {
            if (!acc.find(u => u.users.id === membership.users.id)) {
              acc.push(membership)
            }
            return acc
          }, [] as typeof businessUsers)

          // Get complete user data with all business memberships
          const userIds = uniqueUsers.map(m => m.users.id)
          const completeUsers = await prisma.users.findMany({
            where: {
              id: { in: userIds },
              isActive: true
            },
            include: {
              businessMemberships: {
                where: { isActive: true },
                include: {
                  businesses: {
                    select: {
                      id: true,
                      name: true,
                      type: true
                    }
                  }
                }
              }
            }
          })

          breakdown.users.count = completeUsers.length
          breakdown.users.list = completeUsers.map(u => {
            const businessCount = u.businessMemberships.length

            // Filter out memberships without business data first
            const validBusinessMemberships = u.businessMemberships.filter(bm => bm.business)

            // Find primary business
            const primaryBusiness = validBusinessMemberships.find(bm => bm.businesses?.id === u.lastAccessedBusinessId) || validBusinessMemberships[0]

            // Filter other businesses (exclude the primary one)
            const otherBusinesses = validBusinessMemberships.filter(bm =>
              bm.business && bm.businesses.id !== primaryBusiness?.businesses?.id
            )

            // Debug info temporarily added to response
            const debugInfo = {
              totalMemberships: u.businessMemberships.length,
              validMemberships: validBusinessMemberships.length,
              primaryBusiness: primaryBusiness?.businesses?.name,
              otherBusinessCount: otherBusinesses.length,
              otherBusinessNames: otherBusinesses.map(bm => bm.businesses?.name),
              lastAccessedBusinessId: u.lastAccessedBusinessId
            }

            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              isActive: u.isActive,
              createdAt: u.createdAt,
              businessCount,
              debugInfo, // Temporary debug info
              primaryBusiness: primaryBusiness?.business ? {
                id: primaryBusiness.businesses.id,
                name: primaryBusiness.businesses.name,
                type: primaryBusiness.businesses.type,
                role: primaryBusiness.role,
                isPrimary: true
              } : null,
              otherBusinesses: otherBusinesses.map(bm => ({
                id: bm.businesses?.id,
                name: bm.businesses?.name,
                type: bm.businesses?.type,
                role: bm.role,
                isPrimary: false
              })),
              // Keep old format for backward compatibility
              businesses: u.businessMemberships.map(bm => ({
                businessName: bm.businesses?.name,
                businessType: bm.businesses?.type,
                role: bm.role
              }))
            }
          })

          // Count roles
          uniqueUsers.forEach(membership => {
            breakdown.roles[membership.users.role] = (breakdown.roles[membership.users.role] || 0) + 1
          })
        }
      } catch (error) {
        console.warn('Failed to fetch team users:', error)
      }
    }

    // 2. Employees section minimized - focusing on Users only
    // Note: Employee data is now consolidated under Users with business assignments
    breakdown.employees.count = 0
    breakdown.employees.list = []

    // 3. Create business breakdown
    if (isSystemAdmin(user)) {
      try {
        const businesses = await prisma.businesses.findMany({
          where: { isActive: true },
          include: {
            _count: {
              select: {
                businessMemberships: {
                  where: { isActive: true }
                },
                employees: {
                  where: { isActive: true }
                }
              }
            }
          }
        })

        businesses.forEach(business => {
          breakdown.businessBreakdown[business.id] = {
            businessName: business.name,
            businessType: business.type,
            users: business._count.businessMemberships,
            employees: business._count.employees
          }
        })
      } catch (error) {
        console.warn('Failed to fetch business breakdown:', error)
      }
    } else if (userBusinessIds.length > 0) {
      try {
        const userBusinesses = await prisma.businesses.findMany({
          where: {
            id: { in: userBusinessIds },
            isActive: true
          },
          include: {
            _count: {
              select: {
                businessMemberships: {
                  where: { isActive: true }
                },
                employees: {
                  where: { isActive: true }
                }
              }
            }
          }
        })

        userBusinesses.forEach(business => {
          breakdown.businessBreakdown[business.id] = {
            businessName: business.name,
            businessType: business.type,
            users: business._count.businessMemberships,
            employees: business._count.employees
          }
        })
      } catch (error) {
        console.warn('Failed to fetch user business breakdown:', error)
      }
    }

    // Calculate total team members
    breakdown.total = breakdown.users.count + breakdown.employees.count

    // Add summary statistics
    const summary = {
      totalUsers: breakdown.users.count,
      totalEmployees: breakdown.employees.count,
      totalTeamMembers: breakdown.total,
      businessCount: Object.keys(breakdown.businessBreakdown).length,
      roleDistribution: breakdown.roles,
      averageTeamSizePerBusiness: breakdown.total > 0 && Object.keys(breakdown.businessBreakdown).length > 0
        ? Math.round(breakdown.total / Object.keys(breakdown.businessBreakdown).length)
        : 0
    }

    return NextResponse.json({
      breakdown,
      summary
    })

  } catch (error) {
    console.error('Team breakdown fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team breakdown' },
      { status: 500 }
    )
  }
}