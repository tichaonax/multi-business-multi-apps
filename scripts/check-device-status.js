/**
 * Check R710 Device Status
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDeviceStatus() {
  try {
    const devices = await prisma.r710DeviceRegistry.findMany()

    console.log('\n📡 R710 Device Status:\n')

    devices.forEach((device, i) => {
      console.log(`${i + 1}. ${device.ipAddress} - ${device.description || 'No description'}`)
      console.log(`   Status: ${device.connectionStatus}`)
      console.log(`   Last Health Check: ${device.lastHealthCheck}`)
      console.log(`   Last Connected: ${device.lastConnectedAt}`)
      console.log(`   Is Active: ${device.isActive}`)
      console.log()
    })

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkDeviceStatus()
