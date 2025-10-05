const { PrismaClient } = require('@prisma/client')
;(async () => {
  const prisma = new PrismaClient()
  try {
    const id = process.argv[2]
    const name = process.argv[3] || 'Auto-created Test Business'
    const type = process.argv[4] || 'restaurant'
    if (!id) return console.error('Usage: node scripts/create-business.js <id> [name] [type]')

    const existing = await prisma.business.findUnique({ where: { id } })
    if (existing) {
      console.log('Business already exists:')
      console.log(JSON.stringify(existing, null, 2))
      return
    }

    const b = await prisma.business.create({
      data: {
        id,
        name,
        type,
        description: 'Auto-created for testing',
        settings: {},
        isActive: true
      }
    })
    console.log('Created business:')
    console.log(JSON.stringify(b, null, 2))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
})()
