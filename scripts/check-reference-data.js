const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkReferenceData() {
  try {
    console.log('🔍 Checking available reference data...')
    
    const jobTitles = await prisma.jobTitle.findMany({
      where: { isActive: true },
      select: { title: true }
    })
    
    const compensationTypes = await prisma.compensationType.findMany({
      where: { isActive: true },
      select: { name: true }
    })
    
    console.log('\n📋 Available Job Titles:')
    jobTitles.forEach(jt => console.log(`   • ${jt.title}`))
    
    console.log('\n💰 Available Compensation Types:')
    compensationTypes.forEach(ct => console.log(`   • ${ct.name}`))
    
    return { jobTitles, compensationTypes }
    
  } catch (error) {
    console.error('❌ Error checking reference data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  checkReferenceData()
}

module.exports = { checkReferenceData }