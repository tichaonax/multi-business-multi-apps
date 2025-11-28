import { prisma } from '@/lib/prisma'

async function testQuery() {
  try {
    const result = await prisma.personalExpenses.findMany({
      where: {
        userId: 'test-user-id'
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project_transactions: {
          select: {
            id: true,
            paymentMethod: true,
            transactionType: true,
            paymentCategory: true,
            status: true,
            notes: true,
            persons: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            },
            project_contractors: {
              include: {
                persons: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            construction_projects: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            project_stages: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      take: 1
    })
    console.log('Query successful:', result.length, 'records')
    return true
  } catch (error) {
    console.error('Query failed:', error.message)
    return false
  }
}

testQuery()