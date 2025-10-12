// One-off script to simulate promoting a driver to a user
require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

;(async () => {
  try {
    const driverId = 'dev-driver-1'
  // Username is not a field on the User model; we'll use email as the login
    const password = 'QdQzCZbs'
    const email = 'ad@hxi.com'
    const businessId = 'restaurant-demo'

    const driver = await prisma.vehicleDriver.findUnique({ where: { id: driverId } })
    if (!driver) {
      console.error('Driver not found:', driverId)
      process.exit(1)
    }

    const userEmail = driver.emailAddress || email
    if (!userEmail) {
      console.error('No email available to create user')
      process.exit(1)
    }

    const existing = await prisma.users.findUnique({ where: { email: userEmail } })
    if (existing) {
      console.error('User with email already exists:', userEmail)
      process.exit(1)
    }

    const hashed = await hash(password, 12)
    const userId = randomUUID()

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: userEmail,
          name: driver.fullName || null,
          passwordHash: hashed,
          role: 'user',
          isActive: true,
          permissions: {},
          emailVerified: null
        }
      })

      await tx.vehicleDriver.update({ where: { id: driverId }, data: { userId: newUser.id } })

      if (businessId) {
        const business = await tx.business.findUnique({ where: { id: businessId } })
        if (business) {
          await tx.businessMembership.create({
            data: {
              id: randomUUID(),
              userId: newUser.id,
              businessId,
              role: 'employee',
              permissions: {},
              isActive: true,
              joinedAt: new Date()
            }
          })
        }
      }

      return newUser
    })

  console.log('Promoted driver to user:', created.id, created.email)
  console.log('Credentials to give to driver: email=', created.email, ' password=', password)
  } catch (e) {
    console.error('Error in simulate-promote-driver:', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
})()
