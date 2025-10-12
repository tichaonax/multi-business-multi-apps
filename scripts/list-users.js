const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listUsers() {
  try {
    const users = await prisma.users.findMany({ take: 50, select: { id: true, email: true, role: true, passwordHash: true, isActive: true } })
    console.log('Found users:', users.length)
    for (const u of users) {
      console.log({ id: u.id, email: u.email, role: u.role, hasPasswordHash: !!u.passwordHash, isActive: u.isActive })
    }
  } catch (err) {
    console.error('Error listing users:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) listUsers()

module.exports = { listUsers }
