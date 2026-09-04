/**
 * One-off provisioning script (not a repeatable demo seed): creates a real,
 * non-demo Vehicle Service business with a small parts catalog (real photos
 * downloaded from Wikimedia Commons, resized), a contractor, a customer, and
 * one job with one completed task — so MBM-292 (parts images) and MBM-293
 * (browsable parts picker grid) can be validated live in the running app.
 *
 * Run: npx tsx scripts/seed-vehicle-service-test-business.ts
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const IMAGE_DIR = 'C:\\Users\\ticha\\AppData\\Local\\Temp\\claude\\C--Users-ticha-apps-multi-business-multi-apps\\79056d13-ade7-4296-ae28-d7e779396bb8\\scratchpad\\vs-images'

const OWNER_EMAIL = 'tichaona@yahoo.com'
const BUSINESS_NAME = 'QA Test Vehicle Service'

interface PartSeed {
  key: string
  name: string
  sku: string
  categoryId: string
  price: number
  cost: number
  stock: number
  reorderLevel: number
  partType: 'OEM' | 'AFTERMARKET'
  vehicleMake: string
  vehicleModel?: string
  imageFile: string
}

const PARTS: PartSeed[] = [
  { key: 'oil_filter', name: 'Engine Oil Filter', sku: 'VS-OILFLT-001', categoryId: 'vscat_pfilt', price: 12.99, cost: 6.50, stock: 40, reorderLevel: 10, partType: 'AFTERMARKET', vehicleMake: 'Toyota', vehicleModel: 'Corolla', imageFile: 'oil_filter_sm.jpg' },
  { key: 'brake_pad', name: 'Front Brake Pad Set', sku: 'VS-BRKPAD-001', categoryId: 'vscat_pbrake', price: 45.00, cost: 22.00, stock: 15, reorderLevel: 5, partType: 'OEM', vehicleMake: 'Toyota', vehicleModel: 'Corolla', imageFile: 'brake_pad_sm.jpg' },
  { key: 'spark_plug', name: 'Iridium Spark Plug', sku: 'VS-SPKPLG-001', categoryId: 'vscat_pign', price: 8.50, cost: 3.75, stock: 60, reorderLevel: 15, partType: 'AFTERMARKET', vehicleMake: 'Honda', vehicleModel: 'Civic', imageFile: 'spark_plug_sm.jpg' },
  { key: 'car_battery', name: '12V Car Battery', sku: 'VS-BATT12-001', categoryId: 'vscat_pstart', price: 120.00, cost: 70.00, stock: 8, reorderLevel: 3, partType: 'AFTERMARKET', vehicleMake: 'Universal', imageFile: 'car_battery_sm.jpg' },
  { key: 'air_filter', name: 'Engine Air Filter', sku: 'VS-AIRFLT-001', categoryId: 'vscat_pfilt', price: 18.75, cost: 9.00, stock: 25, reorderLevel: 8, partType: 'AFTERMARKET', vehicleMake: 'Toyota', vehicleModel: 'Corolla', imageFile: 'air_filter_sm.jpg' },
  { key: 'alternator', name: 'Alternator 90A', sku: 'VS-ALT90A-001', categoryId: 'vscat_pstart', price: 210.00, cost: 130.00, stock: 3, reorderLevel: 5, partType: 'OEM', vehicleMake: 'Honda', vehicleModel: 'Civic', imageFile: 'alternator_sm.jpg' },
  { key: 'headlight_bulb', name: 'H7 Headlight Bulb', sku: 'VS-H7BULB-001', categoryId: 'vscat_plight', price: 15.25, cost: 6.00, stock: 0, reorderLevel: 4, partType: 'AFTERMARKET', vehicleMake: 'Universal', imageFile: 'headlight_bulb_sm.jpg' },
]

async function main() {
  const owner = await prisma.users.findUnique({ where: { email: OWNER_EMAIL } })
  if (!owner) throw new Error(`Owner user not found: ${OWNER_EMAIL}`)
  console.log(`Owner: ${owner.name} (${owner.id})`)

  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    // 1. Business + membership + accounts (mirrors POST /api/businesses)
    const business = await tx.businesses.create({
      data: {
        name: BUSINESS_NAME,
        type: 'vehicle_service',
        description: 'QA test business — seeded for MBM-292/293 validation (parts images + browsable parts picker). Safe to delete.',
        shortName: 'qa-vehicle-service',
        createdBy: owner.id,
        isDemo: false,
        business_memberships: {
          create: {
            userId: owner.id,
            role: 'business-owner',
            permissions: {},
            isActive: true,
          },
        },
      },
    })
    console.log(`Business created: ${business.id}`)

    await tx.businessAccounts.create({
      data: { businessId: business.id, balance: 0, updatedAt: now, createdBy: owner.id },
    })

    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    await tx.expenseAccounts.create({
      data: {
        accountNumber: `EXP-${dateStr}-QAVS01`,
        accountName: `${BUSINESS_NAME} Expense Account`,
        description: `Default expense account for ${BUSINESS_NAME}`,
        balance: 0,
        lowBalanceThreshold: 500,
        isActive: true,
        businessId: business.id,
        createdBy: owner.id,
      },
    })

    // 2. Parts catalog — real images uploaded as Images rows, one BusinessProduct
    // + Default ProductVariant + primary ProductImage + compatibility row each.
    for (const part of PARTS) {
      const imgPath = path.join(IMAGE_DIR, part.imageFile)
      const imgBuffer = fs.readFileSync(imgPath)
      const image = await tx.images.create({
        data: { data: imgBuffer, mimeType: 'image/jpeg', size: imgBuffer.length },
      })

      const product = await tx.businessProducts.create({
        data: {
          businessId: business.id,
          name: part.name,
          sku: part.sku,
          categoryId: part.categoryId,
          productType: 'PHYSICAL',
          condition: 'NEW',
          partType: part.partType,
          basePrice: part.price,
          costPrice: part.cost,
          businessType: 'vehicle_service',
          isActive: true,
          isAvailable: true,
          updatedAt: now,
        },
      })

      await tx.productVariants.create({
        data: {
          productId: product.id,
          name: 'Default',
          sku: `${part.sku}-DEF`,
          price: part.price,
          stockQuantity: part.stock,
          reorderLevel: part.reorderLevel,
          isActive: true,
          isAvailable: true,
          updatedAt: now,
        },
      })

      await tx.productImages.create({
        data: {
          productId: product.id,
          imageUrl: `/api/images/${image.id}`,
          imageId: image.id,
          isPrimary: true,
          businessType: 'vehicle_service',
          updatedAt: now,
        },
      })

      await tx.vehiclePartCompatibility.create({
        data: {
          productId: product.id,
          vehicleMake: part.vehicleMake,
          vehicleModel: part.vehicleModel,
        },
      })

      console.log(`  Part seeded: ${part.name} (${part.sku}) — stock ${part.stock}`)
    }

    // 3. Contractor (Person + VehicleServiceContractors + authorized for brake work)
    const contractorPerson = await tx.persons.create({
      data: { fullName: 'Kudzai Moyo', phone: '+263771234567', createdBy: owner.id },
    })
    const contractor = await tx.vehicleServiceContractors.create({
      data: { businessId: business.id, personId: contractorPerson.id, status: 'active', createdBy: owner.id },
    })
    await tx.vehicleServiceContractorServices.create({
      data: { contractorId: contractor.id, subcategoryId: 'vssc_brk2', feeAmount: 20.00, isActive: true },
    })
    await tx.vehicleServiceLabourRates.create({
      data: { businessId: business.id, subcategoryId: 'vssc_brk2', customerRate: 45.00, isActive: true, createdBy: owner.id },
    })
    console.log(`Contractor seeded: ${contractorPerson.fullName}`)

    // 4. Customer
    const customer = await tx.businessCustomers.create({
      data: {
        businessId: business.id,
        customerNumber: 'VEH-CUST-000001',
        name: 'Tapiwa Chikafu',
        phone: '+263772345678',
        businessType: 'vehicle_service',
        updatedAt: now,
      },
    })
    console.log(`Customer seeded: ${customer.name}`)

    // 5. Job with one completed task (brake pad replacement) — surfaces both
    // "Browse Parts to Attach" (Add Task) and "Bill This Job" (all tasks done).
    const job = await tx.vehicleServiceJobs.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        vehicleMake: 'Toyota',
        vehicleModel: 'Corolla',
        vehiclePlate: 'ABC-1234',
        status: 'in_progress',
        primaryContractorId: contractor.id,
        createdBy: owner.id,
      },
    })
    await tx.vehicleServiceTasks.create({
      data: {
        jobId: job.id,
        subcategoryId: 'vssc_brk2',
        contractorId: contractor.id,
        status: 'completed',
        workDescription: 'Replaced worn front brake pads',
        agreedFeeAmount: 20.00,
        customerLabourRate: 45.00,
        completedAt: now,
      },
    })
    console.log(`Job seeded: ${job.id} (Toyota Corolla, ABC-1234) — 1 completed task, ready to bill`)

    return { businessId: business.id }
  })

  console.log('\n✅ Done. Business ID:', result.businessId)
  console.log(`Visit the business switcher in the app and select "${BUSINESS_NAME}" to validate.`)
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
