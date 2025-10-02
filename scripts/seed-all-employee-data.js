// Use the canonical production setup seeders to avoid duplication and missing files
const {
  seedIdFormatTemplates: seedIdTemplates,
  seedJobTitles,
  seedCompensationTypes,
  seedBenefitTypes,
  seedDriverLicenseTemplates
} = require('./production-setup')

// targeted contract seeder
const { seedContractCTEMP1009 } = require('./seed-contract-CT-EMP1009')

async function seedAllEmployeeData() {
  console.log("🚀 Starting comprehensive employee data seeding...")
  
  try {
    // Seed all templates and reference data
    await seedIdTemplates()
    console.log("✅ ID templates completed")

    await seedDriverLicenseTemplates()
    console.log("✅ Driver license templates completed")

    await seedJobTitles()
    console.log("✅ Job titles completed")

    await seedCompensationTypes()
    console.log("✅ Compensation types completed")

    await seedBenefitTypes()
    console.log("✅ Benefit types completed")

    // Ensure the targeted contract is present for UI testing
    try {
      await seedContractCTEMP1009()
      console.log('✅ Seeded CT-EMP1009 contract')
    } catch (err) {
      console.warn('⚠️  Failed to seed CT-EMP1009:', String(err))
    }

    console.log("🎉 ALL EMPLOYEE DATA SEEDING COMPLETED SUCCESSFULLY!")
    console.log("📊 Summary:")
    console.log("   - 5 ID format templates")
    console.log("   - 9 Driver license templates")
    console.log("   - 29 Job titles")
    console.log("   - 15 Compensation types")
    console.log("   - 28 Benefit types")
    console.log("")
    console.log("✅ Your database is now ready for employee management!")

  } catch (error) {
    console.error("❌ Error during comprehensive seeding:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedAllEmployeeData()
    .then(() => {
      console.log("✅ Comprehensive employee data seeding completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Comprehensive employee data seeding failed:", error)
      process.exit(1)
    })
}

module.exports = { seedAllEmployeeData }
