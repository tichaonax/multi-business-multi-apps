const { getGlobalPayrollAccount } = require('./src/lib/payroll-account-utils')

async function testPayrollAccount() {
  try {
    console.log('Testing payroll account retrieval...')
    const account = await getGlobalPayrollAccount()
    console.log('Payroll account found:', account ? {
      id: account.id,
      accountNumber: account.accountNumber,
      balance: account.balance
    } : 'No payroll account found')
  } catch (error) {
    console.error('Error testing payroll account:', error.message)
  }
}

testPayrollAccount()