const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testPayeePaymentAPI() {
  console.log('=== Testing Payee Payment API ===\n')

  try {
    // Find a payee with expense account payments
    console.log('1. Finding payees with expense account payments...')

    // Check for employee payees
    const employeePayments = await prisma.expenseAccountPayments.findFirst({
      where: {
        payeeType: 'EMPLOYEE',
        status: 'SUBMITTED',
      },
      include: {
        payeeEmployee: {
          select: { id: true, fullName: true, employeeNumber: true },
        },
        expenseAccount: {
          select: { accountName: true, accountNumber: true },
        },
      },
    })

    if (employeePayments) {
      console.log('✅ Found employee payee:')
      console.log(`   ID: ${employeePayments.payeeEmployeeId}`)
      console.log(`   Name: ${employeePayments.payeeEmployee?.fullName}`)
      console.log(`   Employee Number: ${employeePayments.payeeEmployee?.employeeNumber}`)
      console.log(`   Payment Amount: $${employeePayments.amount}`)
      console.log(`   From Account: ${employeePayments.expenseAccount.accountName} (${employeePayments.expenseAccount.accountNumber})`)
      console.log()

      // Get total payments to this employee
      const totalStats = await prisma.expenseAccountPayments.aggregate({
        where: {
          payeeType: 'EMPLOYEE',
          payeeEmployeeId: employeePayments.payeeEmployeeId,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
        _count: { id: true },
      })

      console.log(`   Total Payments: ${totalStats._count.id}`)
      console.log(`   Total Amount: $${totalStats._sum.amount}`)
      console.log()

      // Get payments by account
      const accountBreakdown = await prisma.expenseAccountPayments.groupBy({
        by: ['expenseAccountId'],
        where: {
          payeeType: 'EMPLOYEE',
          payeeEmployeeId: employeePayments.payeeEmployeeId,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
        _count: { id: true },
      })

      console.log(`   Payment breakdown by account:`)
      for (const account of accountBreakdown) {
        const accountInfo = await prisma.expenseAccounts.findUnique({
          where: { id: account.expenseAccountId },
          select: { accountName: true, accountNumber: true },
        })
        console.log(`   - ${accountInfo?.accountName} (${accountInfo?.accountNumber}): ${account._count.id} payments, $${account._sum.amount}`)
      }
      console.log()

      // Test API URL construction
      console.log('📋 API Test URLs for this employee:')
      console.log(`   Payments: GET /api/expense-account/payees/EMPLOYEE/${employeePayments.payeeEmployeeId}/payments`)
      console.log(`   Reports:  GET /api/expense-account/payees/EMPLOYEE/${employeePayments.payeeEmployeeId}/reports`)
      console.log()
    } else {
      console.log('⚠️  No employee payee with payments found')
      console.log()
    }

    // Check for person payees
    const personPayments = await prisma.expenseAccountPayments.findFirst({
      where: {
        payeeType: 'PERSON',
        status: 'SUBMITTED',
      },
      include: {
        payeePerson: {
          select: { id: true, fullName: true, nationalId: true },
        },
        expenseAccount: {
          select: { accountName: true, accountNumber: true },
        },
      },
    })

    if (personPayments) {
      console.log('✅ Found person/contractor payee:')
      console.log(`   ID: ${personPayments.payeePersonId}`)
      console.log(`   Name: ${personPayments.payeePerson?.fullName}`)
      console.log(`   National ID: ${personPayments.payeePerson?.nationalId}`)
      console.log(`   Payment Amount: $${personPayments.amount}`)
      console.log(`   From Account: ${personPayments.expenseAccount.accountName}`)
      console.log()

      const totalStats = await prisma.expenseAccountPayments.aggregate({
        where: {
          payeeType: 'PERSON',
          payeePersonId: personPayments.payeePersonId,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
        _count: { id: true },
      })

      console.log(`   Total Payments: ${totalStats._count.id}`)
      console.log(`   Total Amount: $${totalStats._sum.amount}`)
      console.log()

      console.log('📋 API Test URLs for this person:')
      console.log(`   Payments: GET /api/expense-account/payees/PERSON/${personPayments.payeePersonId}/payments`)
      console.log(`   Reports:  GET /api/expense-account/payees/PERSON/${personPayments.payeePersonId}/reports`)
      console.log()
    } else {
      console.log('⚠️  No person/contractor payee with payments found')
      console.log()
    }

    // Check for business payees
    const businessPayments = await prisma.expenseAccountPayments.findFirst({
      where: {
        payeeType: 'BUSINESS',
        status: 'SUBMITTED',
      },
      include: {
        payeeBusiness: {
          select: { id: true, name: true, type: true },
        },
        expenseAccount: {
          select: { accountName: true, accountNumber: true },
        },
      },
    })

    if (businessPayments) {
      console.log('✅ Found business payee:')
      console.log(`   ID: ${businessPayments.payeeBusinessId}`)
      console.log(`   Name: ${businessPayments.payeeBusiness?.name}`)
      console.log(`   Type: ${businessPayments.payeeBusiness?.type}`)
      console.log(`   Payment Amount: $${businessPayments.amount}`)
      console.log(`   From Account: ${businessPayments.expenseAccount.accountName}`)
      console.log()

      const totalStats = await prisma.expenseAccountPayments.aggregate({
        where: {
          payeeType: 'BUSINESS',
          payeeBusinessId: businessPayments.payeeBusinessId,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
        _count: { id: true },
      })

      console.log(`   Total Payments: ${totalStats._count.id}`)
      console.log(`   Total Amount: $${totalStats._sum.amount}`)
      console.log()

      console.log('📋 API Test URLs for this business:')
      console.log(`   Payments: GET /api/expense-account/payees/BUSINESS/${businessPayments.payeeBusinessId}/payments`)
      console.log(`   Reports:  GET /api/expense-account/payees/BUSINESS/${businessPayments.payeeBusinessId}/reports`)
      console.log()
    } else {
      console.log('⚠️  No business payee with payments found')
      console.log()
    }

    // Check for user payees
    const userPayments = await prisma.expenseAccountPayments.findFirst({
      where: {
        payeeType: 'USER',
        status: 'SUBMITTED',
      },
      include: {
        payeeUser: {
          select: { id: true, name: true, email: true },
        },
        expenseAccount: {
          select: { accountName: true, accountNumber: true },
        },
      },
    })

    if (userPayments) {
      console.log('✅ Found user payee:')
      console.log(`   ID: ${userPayments.payeeUserId}`)
      console.log(`   Name: ${userPayments.payeeUser?.name}`)
      console.log(`   Email: ${userPayments.payeeUser?.email}`)
      console.log(`   Payment Amount: $${userPayments.amount}`)
      console.log(`   From Account: ${userPayments.expenseAccount.accountName}`)
      console.log()

      const totalStats = await prisma.expenseAccountPayments.aggregate({
        where: {
          payeeType: 'USER',
          payeeUserId: userPayments.payeeUserId,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
        _count: { id: true },
      })

      console.log(`   Total Payments: ${totalStats._count.id}`)
      console.log(`   Total Amount: $${totalStats._sum.amount}`)
      console.log()

      console.log('📋 API Test URLs for this user:')
      console.log(`   Payments: GET /api/expense-account/payees/USER/${userPayments.payeeUserId}/payments`)
      console.log(`   Reports:  GET /api/expense-account/payees/USER/${userPayments.payeeUserId}/reports`)
      console.log()
    } else {
      console.log('⚠️  No user payee with payments found')
      console.log()
    }

    // Summary
    console.log('\n=== Summary ===')
    console.log('To test the APIs, use the URLs shown above with a logged-in session.')
    console.log('Example with curl (replace with actual IDs and session cookie):')
    console.log('  curl -H "Cookie: next-auth.session-token=..." \\')
    console.log('    http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/payments')
    console.log()
    console.log('Query parameters supported:')
    console.log('  - startDate: YYYY-MM-DD')
    console.log('  - endDate: YYYY-MM-DD')
    console.log('  - limit: number (default: 100)')
    console.log('  - offset: number (default: 0)')
    console.log('  - accountId: specific expense account ID (optional)')
    console.log()

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPayeePaymentAPI()
