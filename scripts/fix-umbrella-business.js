const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixUmbrellaBusiness() {
  try {
    console.log('Starting umbrella business fix...')

    // First, find the current umbrella business (restaurant-demo)
    const currentUmbrella = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true }
    })

    if (currentUmbrella) {
      console.log('Found current umbrella business:', currentUmbrella.id, currentUmbrella.name)

      // Remove umbrella flag from restaurant-demo
      if (currentUmbrella.id === 'restaurant-demo') {
        console.log('Removing umbrella flag from restaurant-demo...')
        await prisma.businesses.update({
          where: { id: 'restaurant-demo' },
          data: {
            isUmbrellaBusiness: false,
            type: 'restaurant' // Restore original type
          }
        })
        console.log('✓ Removed umbrella flag from restaurant-demo')
      }
    }

    // Check if a proper umbrella business already exists with ID 'umbrella-business'
    const properUmbrella = await prisma.businesses.findUnique({
      where: { id: 'umbrella-business' }
    })

    if (properUmbrella) {
      console.log('Proper umbrella business already exists:', properUmbrella.name)
      // Just ensure it's flagged correctly
      await prisma.businesses.update({
        where: { id: 'umbrella-business' },
        data: {
          isUmbrellaBusiness: true,
          type: 'umbrella'
        }
      })
      console.log('✓ Updated umbrella business flags')
    } else {
      // Create a new dedicated umbrella business
      console.log('Creating new umbrella business...')
      const newUmbrella = await prisma.businesses.create({
        data: {
          id: 'umbrella-business',
          name: 'Umbrella Business Settings',
          type: 'umbrella',
          isUmbrellaBusiness: true,
          umbrellaBusinessName: currentUmbrella?.umbrellaBusinessName || 'Hwanda Enterprises PBC',
          umbrellaBusinessAddress: currentUmbrella?.umbrellaBusinessAddress,
          umbrellaBusinessPhone: currentUmbrella?.umbrellaBusinessPhone,
          umbrellaBusinessEmail: currentUmbrella?.umbrellaBusinessEmail,
          umbrellaBusinessRegistration: currentUmbrella?.umbrellaBusinessRegistration,
          isActive: true,
          shortName: 'UMBR',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✓ Created new umbrella business:', newUmbrella.id)
    }

    // Verify the fix
    const allUmbrellas = await prisma.businesses.findMany({
      where: { isUmbrellaBusiness: true }
    })

    console.log('\n=== Verification ===')
    console.log('Umbrella businesses found:', allUmbrellas.length)
    allUmbrellas.forEach(b => {
      console.log(`  - ${b.id} (${b.name}) - Type: ${b.type}`)
    })

    if (allUmbrellas.length === 1 && allUmbrellas[0].id === 'umbrella-business') {
      console.log('\n✅ SUCCESS: Umbrella business is now properly configured!')
    } else {
      console.log('\n⚠️ WARNING: Multiple umbrella businesses exist. Manual cleanup needed.')
    }

  } catch (error) {
    console.error('Error fixing umbrella business:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUmbrellaBusiness()
