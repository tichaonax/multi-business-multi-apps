/**
 * Seed Promo Campaigns Demo — All Businesses
 * Creates PromoCampaigns for all 4 demo businesses, then issues
 * CustomerRewards to customers who have met the spending threshold.
 * ~30% of qualifying rewards are marked as REDEEMED.
 *
 * Idempotent — safe to run multiple times.
 * Requires: seed-demo-customers-all-businesses.js must have run first.
 * Run: node scripts/seed-promo-campaigns-demo.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Deterministic hash
function hash(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}
function rnd(seed) {
  const h1 = hash(seed)
  const h2 = hash(`${seed}-r2`)
  return ((h1 * 31 + h2) % 100000) / 100000
}

// Campaign definitions per business type
const CAMPAIGNS_BY_TYPE = {
  restaurant: [
    {
      name: 'Loyal Diner Reward',
      description: 'Earn $5 store credit every time you spend $50 with us.',
      spendThreshold: 50,
      rewardAmount: 5,
    },
    {
      name: 'VIP Feast Reward',
      description: 'Our top diners earn $20 credit when they spend $150.',
      spendThreshold: 150,
      rewardAmount: 20,
    },
  ],
  grocery: [
    {
      name: 'Regular Shopper Reward',
      description: 'Spend $80 and earn $8 store credit.',
      spendThreshold: 80,
      rewardAmount: 8,
    },
    {
      name: 'Bulk Buyer Bonus',
      description: 'Wholesale shoppers spending $200+ earn $25 credit.',
      spendThreshold: 200,
      rewardAmount: 25,
    },
  ],
  hardware: [
    {
      name: 'Trade Discount Reward',
      description: 'Contractors and trade customers earn $10 credit on $100 spend.',
      spendThreshold: 100,
      rewardAmount: 10,
    },
  ],
  clothing: [
    {
      name: 'Fashion Reward',
      description: 'Shop $60 or more and earn $6 store credit.',
      spendThreshold: 60,
      rewardAmount: 6,
    },
    {
      name: 'Style VIP Reward',
      description: 'Our style icons earn $15 credit when they spend $120.',
      spendThreshold: 120,
      rewardAmount: 15,
    },
  ],
}

// Short coupon code hash (stable/deterministic)
function couponCode(prefix, customerId, campaignId) {
  const h = hash(`${customerId}-${campaignId}`) % 999999
  return `${prefix}-RWD-${String(h).padStart(6, '0')}`
}

async function seedPromoCampaigns() {
  console.log('\n🎁 Seeding promo campaigns for all businesses...\n')

  // Resolve admin user for createdBy
  let adminUser = await prisma.users.findUnique({ where: { email: 'admin@business.local' } })
  if (!adminUser) {
    console.error('❌ Admin user not found. Run create-admin first.')
    process.exitCode = 1
    return
  }

  const now = new Date()
  const periodYear = now.getFullYear()
  const periodMonth = now.getMonth() + 1  // 1-based

  let totalCampaigns = 0
  let totalIssued = 0
  let totalRedeemed = 0

  for (const [businessType, campaignDefs] of Object.entries(CAMPAIGNS_BY_TYPE)) {
    const business = await prisma.businesses.findFirst({
      where: { type: businessType, isDemo: true },
    })
    if (!business) {
      console.log(`⚠️  No demo business for type "${businessType}" — skipping`)
      continue
    }

    console.log(`📍 ${business.name} (${business.id})`)

    // Upsert campaigns
    const campaigns = []
    for (const def of campaignDefs) {
      let campaign = await prisma.promoCampaigns.findFirst({
        where: { businessId: business.id, name: def.name },
      })
      if (!campaign) {
        campaign = await prisma.promoCampaigns.create({
          data: {
            businessId: business.id,
            name: def.name,
            description: def.description,
            isActive: true,
            spendThreshold: def.spendThreshold,
            rewardType: 'CREDIT',
            rewardAmount: def.rewardAmount,
            rewardValidDays: 30,
            createdBy: adminUser.id,
          },
        })
        totalCampaigns++
        console.log(`  ✅ Campaign: "${def.name}" (Spend $${def.spendThreshold} → $${def.rewardAmount} credit)`)
      } else {
        console.log(`  ⏭️  Campaign exists: "${def.name}"`)
      }
      campaigns.push(campaign)
    }

    // Load customers for this business
    const customers = await prisma.businessCustomers.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true, customerNumber: true, totalSpent: true },
    })

    // Issue rewards to qualifying customers
    const prefix = business.id.split('-')[0].toUpperCase().slice(0, 4)
    for (const customer of customers) {
      const spent = Number(customer.totalSpent)
      for (const campaign of campaigns) {
        if (spent < Number(campaign.spendThreshold)) continue

        // Idempotent: check if reward already exists for this customer+campaign+period
        const existing = await prisma.customerRewards.findFirst({
          where: {
            customerId: customer.id,
            campaignId: campaign.id,
            periodYear,
            periodMonth,
          },
        })
        if (existing) continue

        const code = couponCode(prefix, customer.id, campaign.id)
        const expiresAt = new Date(now.getTime() + 30 * 24 * 3600000)

        // ~30% chance of being already REDEEMED
        const isRedeemed = rnd(`redeem-${customer.id}-${campaign.id}`) < 0.30
        const redeemedAt = isRedeemed
          ? new Date(now.getTime() - Math.floor(rnd(`redeemDate-${customer.id}`) * 14) * 24 * 3600000)
          : null

        await prisma.customerRewards.create({
          data: {
            businessId: business.id,
            customerId: customer.id,
            campaignId: campaign.id,
            rewardType: 'CREDIT',
            rewardAmount: campaign.rewardAmount,
            periodSpend: customer.totalSpent,
            couponCode: code,
            status: isRedeemed ? 'REDEEMED' : 'ISSUED',
            periodYear,
            periodMonth,
            expiresAt,
            redeemedAt,
          },
        })

        totalIssued++
        if (isRedeemed) totalRedeemed++
      }
    }

    const businessIssued = await prisma.customerRewards.count({ where: { businessId: business.id } })
    console.log(`  🎟️  ${businessIssued} rewards issued for this business`)
  }

  console.log(`\n✅ Promo campaign seed complete`)
  console.log(`   📋 ${totalCampaigns} new campaigns created`)
  console.log(`   🎟️  ${totalIssued} new rewards issued`)
  console.log(`   ✅ ${totalRedeemed} already redeemed`)
}

async function main() {
  try {
    await seedPromoCampaigns()
  } catch (err) {
    console.error('Promo campaigns seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

module.exports = { seedPromoCampaigns }
