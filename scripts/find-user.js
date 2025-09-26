const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findUser() {
  try {
    console.log('🔍 Finding users...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        personalBudgets: {
          select: {
            id: true,
            amount: true,
            type: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    })
    
    console.log('👤 Users found:')
    users.forEach(user => {
      const balance = user.personalBudgets.reduce((acc, entry) => {
        return entry.type === 'deposit' 
          ? acc + Number(entry.amount)
          : acc - Number(entry.amount)
      }, 0)
      
      console.log(`\n📧 ${user.email}`)
      console.log(`🆔 ID: ${user.id}`)
      console.log(`💰 Current Balance: $${balance.toFixed(2)}`)
      console.log(`📊 Recent budget entries: ${user.personalBudgets.length}`)
    })
    
    console.log('\n💡 To fix balance, run:')
    console.log('node scripts/fix-balance.js <USER_ID>')
    
  } catch (error) {
    console.error('❌ Error finding users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findUser()