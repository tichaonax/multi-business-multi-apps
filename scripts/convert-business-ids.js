#!/usr/bin/env node
// scripts/convert-business-ids.js
// Helper to convert specified existing business IDs to new UUIDs.
// WARNING: Run a full DB backup before using this. Test on staging first.

const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

const MODELS_TO_UPDATE = [
  'businessMembership',
  'businessCategory',
  'businessProduct',
  'businessStockMovement',
  'businessSupplier',
  'businessOrder',
  'businessAccount',
  'businessTransaction',
  'menuCombo',
  'menuPromotion',
  'businessCustomer',
  'businessBrand',
  'vehicle',
  'vehicleTrip',
  'vehicleExpense'
]

async function convertBusinessId(oldId) {
  console.log(`\n--- Converting business id: ${oldId} ---`)

  const oldBusiness = await prisma.businesses.findUnique({ where: { id: oldId } })
  if (!oldBusiness) {
    console.log(`Skipping ${oldId}: not found.`)
    return
  }

  const newId = randomUUID()
  console.log(`Creating new business record with id ${newId} (copying fields)`)

  // Build create data by copying known scalar fields (avoid relations)
  const createData = {
    id: newId,
    name: oldBusiness.name,
    type: oldBusiness.type,
    description: oldBusiness.description || null,
    isActive: oldBusiness.isActive,
    settings: oldBusiness.settings || {},
    createdBy: oldBusiness.createdBy || null,
    createdAt: oldBusiness.createdAt || new Date(),
    updatedAt: oldBusiness.updatedAt || new Date(),
    umbrellaBusinessId: oldBusiness.umbrellaBusinessId || null,
    isUmbrellaBusiness: oldBusiness.isUmbrellaBusiness || false,
    umbrellaBusinessName: oldBusiness.umbrellaBusinessName || null,
    umbrellaBusinessAddress: oldBusiness.umbrellaBusinessAddress || null,
    umbrellaBusinessEmail: oldBusiness.umbrellaBusinessEmail || null,
    umbrellaBusinessPhone: oldBusiness.umbrellaBusinessPhone || null,
    umbrellaBusinessRegistration: oldBusiness.umbrellaBusinessRegistration || null
  }

  // Create new business record
  await prisma.businesses.create({ data: createData })
  console.log('New business created')

  // Update known models that have businessId FK
  for (const model of MODELS_TO_UPDATE) {
    if (!prisma[model]) {
      console.log(`Model ${model} not found on Prisma client, skipping.`)
      continue
    }

    try {
      const res = await prisma[model].updateMany({ where: { businessId: oldId }, data: { businessId: newId } })
      console.log(`Updated ${res.count} records on ${model}`)
    } catch (err) {
      console.error(`Failed to update model ${model}:`, err.message || err)
    }
  }

  // Special-case BusinessMembership: if there are membership rows, they were updated above

  // After updating references, try to delete the old business
  try {
    await prisma.businesses.delete({ where: { id: oldId } })
    console.log(`Deleted old business ${oldId}`)
  } catch (err) {
    console.warn(`Could not delete old business ${oldId} (likely still referenced). Manual cleanup required. Error:`, err.message || err)
  }

  console.log(`Conversion of ${oldId} complete. New id: ${newId}`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: node scripts/convert-business-ids.js <old-business-id> [<old-business-id> ...]')
    process.exit(1)
  }

  console.log('This script will create a new business with a UUID and move references from the old id to the new id.')
  console.log('BACKUP YOUR DATABASE before running this script.')

  for (const oldId of args) {
    try {
      await convertBusinessId(oldId)
    } catch (err) {
      console.error('Error converting', oldId, err)
    }
  }

  await prisma.$disconnect()
}

main()
