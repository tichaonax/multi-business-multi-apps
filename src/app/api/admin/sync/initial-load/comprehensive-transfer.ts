/**
 * Comprehensive Initial Load - Transfer ALL business data
 * This is the new implementation that transfers complete business data
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

interface TransferStats {
  transferred: number
  total: number
  bytes: bigint
}

/**
 * Transfer all business data in correct dependency order
 */
export async function transferAllBusinessData(
  sessionId: string,
  sourceNodeId: string,
  targetPeer: any,
  targetPort: number,
  regHash: string,
  options: any
) {
  const stats: TransferStats = {
    transferred: 0,
    total: 0,
    bytes: BigInt(0)
  }

  try {
    // Get non-demo businesses
    const allBusinesses = await prisma.businesses.findMany()
    const businesses = allBusinesses.filter(b => !isDemoBusinessId(b.id))
    const businessIds = businesses.map(b => b.id)

    if (businessIds.length === 0) {
      throw new Error('No businesses to transfer')
    }

    console.log(`📦 Starting transfer for ${businessIds.length} businesses`)

    // Count all records first
    const counts = await countAllRecords(businessIds)
    stats.total = Object.values(counts).reduce((sum, count) => sum + count, 0)

    await updateSession(sessionId, {
      status: 'TRANSFERRING',
      totalRecords: stats.total,
      currentStep: 'Starting comprehensive data transfer'
    })

    // Transfer in dependency order
    await transferBusinesses(sessionId, businesses, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferCategories(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferBrands(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferSuppliers(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferCustomers(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferProducts(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferProductVariants(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferProductImages(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferStockMovements(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferOrders(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferOrderItems(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferTransactions(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferAccounts(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)
    await transferLocations(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // Complete
    await updateSession(sessionId, {
      status: 'COMPLETED',
      progress: 100,
      currentStep: 'Transfer complete',
      completedAt: new Date()
    })

    console.log(`✅ Transfer complete: ${stats.transferred} records, ${stats.bytes} bytes`)

  } catch (error) {
    await updateSession(sessionId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date()
    })
    throw error
  }
}

/**
 * Count all records to be transferred
 */
async function countAllRecords(businessIds: string[]) {
  const [
    categories,
    brands,
    suppliers,
    customers,
    products,
    variants,
    images,
    stockMovements,
    orders,
    orderItems,
    transactions,
    accounts,
    locations
  ] = await Promise.all([
    prisma.businessCategories.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessBrands.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessSuppliers.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessCustomers.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessProducts.count({ where: { businessId: { in: businessIds } } }),
    prisma.productVariants.count({ where: { business_products: { businessId: { in: businessIds } } } }),
    prisma.productImages.count({ where: { business_products: { businessId: { in: businessIds } } } }),
    prisma.businessStockMovements.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessOrders.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessOrderItems.count({ where: { business_orders: { businessId: { in: businessIds } } } }),
    prisma.businessTransactions.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessAccounts.count({ where: { businessId: { in: businessIds } } }),
    prisma.businessLocations.count({ where: { businessId: { in: businessIds } } })
  ])

  return {
    businesses: businessIds.length,
    categories,
    brands,
    suppliers,
    customers,
    products,
    variants,
    images,
    stockMovements,
    orders,
    orderItems,
    transactions,
    accounts,
    locations
  }
}

// Helper functions for each table type
async function transferBusinesses(
  sessionId: string,
  businesses: any[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: `Transferring ${businesses.length} businesses` })

  for (const business of businesses) {
    await transferRecord(
      'businesses',
      business.id,
      business,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferCategories(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const categories = await prisma.businessCategories.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (categories.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${categories.length} categories` })

  for (const category of categories) {
    await transferRecord(
      'BusinessCategories',
      category.id,
      category,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferBrands(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const brands = await prisma.businessBrands.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (brands.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${brands.length} brands` })

  for (const brand of brands) {
    await transferRecord(
      'BusinessBrands',
      brand.id,
      brand,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferSuppliers(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const suppliers = await prisma.businessSuppliers.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (suppliers.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${suppliers.length} suppliers` })

  for (const supplier of suppliers) {
    await transferRecord(
      'BusinessSuppliers',
      supplier.id,
      supplier,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferCustomers(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const customers = await prisma.businessCustomers.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (customers.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${customers.length} customers` })

  for (const customer of customers) {
    await transferRecord(
      'BusinessCustomers',
      customer.id,
      customer,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferProducts(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const products = await prisma.businessProducts.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (products.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${products.length} products` })

  for (const product of products) {
    await transferRecord(
      'BusinessProducts',
      product.id,
      product,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferProductVariants(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const variants = await prisma.productVariants.findMany({
    where: {
      business_products: {
        businessId: { in: businessIds }
      }
    }
  })

  if (variants.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${variants.length} product variants` })

  for (const variant of variants) {
    await transferRecord(
      'ProductVariants',
      variant.id,
      variant,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferProductImages(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const images = await prisma.productImages.findMany({
    where: {
      business_products: {
        businessId: { in: businessIds }
      }
    }
  })

  if (images.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${images.length} product images` })

  for (const image of images) {
    await transferRecord(
      'ProductImages',
      image.id,
      image,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferStockMovements(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const movements = await prisma.businessStockMovements.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (movements.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${movements.length} stock movements` })

  for (const movement of movements) {
    await transferRecord(
      'BusinessStockMovements',
      movement.id,
      movement,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferOrders(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const orders = await prisma.businessOrders.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (orders.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${orders.length} orders` })

  for (const order of orders) {
    await transferRecord(
      'BusinessOrders',
      order.id,
      order,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferOrderItems(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const items = await prisma.businessOrderItems.findMany({
    where: {
      business_orders: {
        businessId: { in: businessIds }
      }
    }
  })

  if (items.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${items.length} order items` })

  for (const item of items) {
    await transferRecord(
      'BusinessOrderItems',
      item.id,
      item,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferTransactions(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const transactions = await prisma.businessTransactions.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (transactions.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${transactions.length} transactions` })

  for (const transaction of transactions) {
    await transferRecord(
      'BusinessTransactions',
      transaction.id,
      transaction,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferAccounts(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const accounts = await prisma.businessAccounts.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (accounts.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${accounts.length} accounts` })

  for (const account of accounts) {
    await transferRecord(
      'BusinessAccounts',
      account.id,
      account,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

async function transferLocations(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  const locations = await prisma.businessLocations.findMany({
    where: { businessId: { in: businessIds } }
  })

  if (locations.length === 0) return

  await updateSession(sessionId, { currentStep: `Transferring ${locations.length} locations` })

  for (const location of locations) {
    await transferRecord(
      'BusinessLocations',
      location.id,
      location,
      targetPeer,
      targetPort,
      sourceNodeId,
      regHash,
      sessionId,
      stats
    )
  }
}

/**
 * Generic record transfer function
 */
async function transferRecord(
  tableName: string,
  recordId: string,
  data: any,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  sessionId: string,
  stats: TransferStats
) {
  const syncEvent = {
    id: crypto.randomUUID(),
    sourceNodeId,
    table: tableName,
    recordId,
    operation: 'CREATE',
    data,
    checksum: crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
  }

  const response = await fetch(`http://${targetPeer.ipAddress}:${targetPort}/api/sync/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Node-ID': sourceNodeId,
      'X-Registration-Hash': regHash
    },
    body: JSON.stringify({
      sessionId,
      sourceNodeId,
      events: [syncEvent]
    })
  })

  if (response.ok) {
    stats.transferred++
    stats.bytes += BigInt(JSON.stringify(syncEvent).length)

    // Update progress every 10 records
    if (stats.transferred % 10 === 0) {
      const progress = Math.min(Math.round((stats.transferred / stats.total) * 100), 99)
      await updateSession(sessionId, {
        transferredRecords: stats.transferred,
        transferredBytes: stats.bytes,
        progress
      })
    }
  } else {
    const errorText = await response.text()
    throw new Error(`Failed to transfer ${tableName} ${recordId}: ${errorText}`)
  }

  // Small delay to avoid overwhelming the target
  await new Promise(resolve => setTimeout(resolve, 10))
}

/**
 * Update session status
 */
async function updateSession(sessionId: string, data: any) {
  await prisma.initialLoadSessions.update({
    where: { sessionId },
    data
  })
}

/**
 * Check if business ID is a demo business
 */
function isDemoBusinessId(businessId: string): boolean {
  if (!businessId || typeof businessId !== 'string') {
    return false
  }

  const lowerBusinessId = businessId.toLowerCase()

  return lowerBusinessId.includes('-demo-business') ||
         lowerBusinessId.endsWith('-demo') ||
         lowerBusinessId.startsWith('demo-') ||
         lowerBusinessId === 'demo'
}
