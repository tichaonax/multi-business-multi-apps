const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixBalance() {
  try {
    console.log('🔧 Starting balance correction...')
    
    // You'll need to replace this with your actual user ID
    // You can find it by checking your session or database
    const userId = process.argv[2] // Pass user ID as argument
    
    if (!userId) {
      console.error('❌ Please provide userId as argument: node scripts/fix-balance.js <userId>')
      process.exit(1)
    }
    
    console.log(`📊 Checking current balance for user: ${userId}`)
    
    // Get current budget entries
    const budgetEntries = await prisma.personalBudget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    
    // Calculate current balance using the same logic as API
    const currentBalance = budgetEntries.reduce((acc, entry) => {
      return entry.type === 'deposit' 
        ? acc + Number(entry.amount)
        : acc - Number(entry.amount)
    }, 0)
    
    console.log(`💰 Current balance: $${currentBalance.toFixed(2)}`)
    
    // Add $1400 correction (2 x $700 deletions that were incorrectly subtracted)
    const correctionAmount = 1400
    const expectedBalance = currentBalance + correctionAmount
    
    console.log(`🎯 Expected balance after correction: $${expectedBalance.toFixed(2)}`)
    
    // Create correction entry
    await prisma.personalBudget.create({
      data: {
        userId,
        amount: correctionAmount,
        description: 'Balance correction: Fix for deleted expense calculations',
        type: 'deposit'
      }
    })
    
    console.log(`✅ Added correction of +$${correctionAmount.toFixed(2)}`)
    
    // Verify the fix
    const updatedEntries = await prisma.personalBudget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    
    const newBalance = updatedEntries.reduce((acc, entry) => {
      return entry.type === 'deposit' 
        ? acc + Number(entry.amount)
        : acc - Number(entry.amount)
    }, 0)
    
    console.log(`🎉 New balance: $${newBalance.toFixed(2)}`)
    console.log('✅ Balance correction completed!')
    
  } catch (error) {
    console.error('❌ Error fixing balance:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixBalance()