const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const SAMPLE_BUSINESSES = [
  {
    name: "Fashion Forward Boutique",
    type: "clothing",
    description: "Modern clothing and accessories for all ages",
    settings: {
      currency: "USD",
      timezone: "America/New_York",
      features: ["pos", "inventory", "customers", "discounts"]
    }
  },
  {
    name: "Builder's Hardware Store",
    type: "hardware",
    description: "Tools and supplies for construction and home improvement",
    settings: {
      currency: "USD",
      timezone: "America/New_York",
      features: ["pos", "inventory", "suppliers", "bulk_pricing"]
    }
  },
  {
    name: "Fresh Market Grocery",
    type: "grocery",
    description: "Fresh produce and everyday essentials",
    settings: {
      currency: "USD",
      timezone: "America/New_York",
      features: ["pos", "inventory", "expiry_tracking", "weight_pricing"]
    }
  },
  {
    name: "Bella Vista Restaurant",
    type: "restaurant",
    description: "Fine dining experience with seasonal menu",
    settings: {
      currency: "USD",
      timezone: "America/New_York",
      features: ["pos", "reservations", "menu_management", "table_service"]
    }
  },
  {
    name: "Strategic Solutions Consulting",
    type: "consulting",
    description: "Business strategy and operational consulting services",
    settings: {
      currency: "USD",
      timezone: "America/New_York",
      features: ["project_management", "time_tracking", "client_portal", "invoicing"]
    }
  }
]

async function createSampleBusinesses() {
  console.log("🏢 Creating sample businesses for universal system testing...")

  try {
    let createdCount = 0
    let updatedCount = 0

    for (const businessData of SAMPLE_BUSINESSES) {
      const existing = await prisma.business.findFirst({
        where: {
          name: businessData.name,
          type: businessData.type
        }
      })

      const result = await prisma.business.upsert({
        where: {
          id: existing?.id || "non-existent-id"
        },
        update: {
          description: businessData.description,
          settings: businessData.settings,
          isActive: true
        },
        create: {
          name: businessData.name,
          type: businessData.type,
          description: businessData.description,
          settings: businessData.settings,
          isActive: true
        }
      })

      if (existing) {
        updatedCount++
        console.log(`  🔄 Updated: ${result.name} (${result.type})`)
      } else {
        createdCount++
        console.log(`  ✅ Created: ${result.name} (${result.type})`)
      }
    }

    console.log(`🎉 Sample businesses completed: ${createdCount} created, ${updatedCount} updated`)
    return { createdCount, updatedCount }

  } catch (error) {
    console.error("❌ Error creating sample businesses:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createSampleBusinesses()
    .then(() => {
      console.log("✅ Sample businesses creation completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Sample businesses creation failed:", error)
      process.exit(1)
    })
}

module.exports = { createSampleBusinesses, SAMPLE_BUSINESSES }