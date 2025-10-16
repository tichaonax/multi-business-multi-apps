const { PrismaClient } = require('@prisma/client')

async function testSyncChange() {
  const prisma = new PrismaClient()
  
  try {
    console.log('=== Testing Sync Functionality ===')
    
    // First, let's see what tables we have and check current data
    try {
      const employees = await prisma.employee.findMany({
        take: 3,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' }
      })
      console.log(`\nFound ${employees.length} employees:`)
      employees.forEach(emp => {
        console.log(`  - ${emp.firstName} ${emp.lastName} (${emp.email}) - Updated: ${emp.updatedAt}`)
      })
      
      // Make a test change - update the first employee's email with a timestamp
      if (employees.length > 0) {
        const testEmployee = employees[0]
        const timestamp = new Date().toISOString().slice(11, 19) // HH:MM:SS format
        const newEmail = `test-sync-${timestamp}@company.com`
        
        console.log(`\n🔄 Making test change...`)
        console.log(`   Updating ${testEmployee.firstName} ${testEmployee.lastName}'s email to: ${newEmail}`)
        
        const updated = await prisma.employee.update({
          where: { id: testEmployee.id },
          data: { email: newEmail },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            updatedAt: true
          }
        })
        
        console.log(`✅ Updated successfully!`)
        console.log(`   New record: ${updated.firstName} ${updated.lastName} (${updated.email}) - Updated: ${updated.updatedAt}`)
        console.log(`\n📍 Check the other server's UI to see if this change appears!`)
        console.log(`   Employee ID ${updated.id} should now have email: ${updated.email}`)
        
      } else {
        console.log('⚠️  No employees found to update')
      }
      
    } catch (error) {
      console.error('Error with employee table:', error.message)
    }
    
    // Check recent sync events
    try {
      console.log('\n=== Recent Sync Events ===')
      const syncEvents = await prisma.syncEvent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tableName: true,
          operation: true,
          createdAt: true,
          nodeId: true,
          recordId: true
        }
      })
      
      syncEvents.forEach(event => {
        console.log(`  - ${event.tableName}.${event.operation} (ID: ${event.recordId}) by ${event.nodeId} at ${event.createdAt}`)
      })
      
    } catch (error) {
      console.error('Error checking sync events:', error.message)
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testSyncChange().catch(console.error)