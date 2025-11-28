import { prisma } from '@/lib/prisma'

async function testPersonalFinanceAPI() {
  try {
    const personalExpenses = await prisma.personalExpenses.findMany({
      where: {
        userId: 'test-user-id' // Use a test user ID
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        projectTransactions: {
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
            projectContractors: {
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
            constructionProjects: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            projectStages: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      take: 1 // Just test with one record
    })

    console.log('Query successful:', personalExpenses.length, 'records found')
    return true
  } catch (error) {
    console.error('Query failed:', error)
    return false
  }
}

testPersonalFinanceAPI()