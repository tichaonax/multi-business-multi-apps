const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testBusinessesAPI() {
  console.log('🧪 TESTING /api/businesses ENDPOINT LOGIC\n')
  console.log('=' .repeat(60))

  try {
    // Simulate admin user query (lines 23-51 in route.ts)
    console.log('\n📋 TEST 1: Admin User Query (with business_accounts)')
    console.log('-'.repeat(60))

    const adminBusinesses = await prisma.businesses.findMany({
      where: {
        isActive: true,
        type: {
          not: 'umbrella'
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        isActive: true,
        isDemo: true,
        createdAt: true,
        updatedAt: true,
        business_accounts: {
          select: {
            id: true,
            balance: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    })

    console.log(`✅ Found ${adminBusinesses.length} businesses (admin query)`)
    console.log('\nBusinesses with accounts:')
    let withAccounts = 0
    let withoutAccounts = 0

    adminBusinesses.forEach((b, index) => {
      const hasAccount = b.business_accounts !== null
      const balance = hasAccount ? Number(b.business_accounts.balance) : 0

      if (hasAccount) {
        withAccounts++
        console.log(`   ${index + 1}. ✓ ${b.name} (${b.type})`)
        console.log(`      Account ID: ${b.business_accounts.id}`)
        console.log(`      Balance: $${balance.toFixed(2)}`)
      } else {
        withoutAccounts++
        console.log(`   ${index + 1}. ✗ ${b.name} (${b.type}) - NO ACCOUNT`)
      }
    })

    console.log(`\n   Summary: ${withAccounts} with accounts, ${withoutAccounts} without accounts`)

    // Test the filter logic from deposit-form.tsx
    console.log('\n📋 TEST 2: Filter Logic from deposit-form.tsx')
    console.log('-'.repeat(60))

    const businessesWithAccounts = adminBusinesses.filter((b) => b.business_accounts)
    console.log(`✅ Filter found ${businessesWithAccounts.length} businesses with accounts`)

    // Test the transformation logic
    const transformedBusinesses = businessesWithAccounts.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      balance: b.business_accounts?.balance || 0
    }))

    console.log('\nTransformed for dropdown:')
    transformedBusinesses.forEach((b, index) => {
      console.log(`   ${index + 1}. ${b.name} (${b.type}) - Balance: $${Number(b.balance).toFixed(2)}`)
    })

    // Simulate the API response
    console.log('\n📋 TEST 3: Simulated API Response')
    console.log('-'.repeat(60))

    const apiResponse = {
      businesses: adminBusinesses,
      isAdmin: true
    }

    console.log('✅ API would return:')
    console.log(`   businesses: Array(${apiResponse.businesses.length})`)
    console.log(`   isAdmin: ${apiResponse.isAdmin}`)
    console.log(`   businesses[0].business_accounts: ${apiResponse.businesses[0].business_accounts ? 'Present ✓' : 'Missing ✗'}`)

    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Total businesses: ${adminBusinesses.length}`)
    console.log(`✅ Businesses with accounts: ${withAccounts}`)
    console.log(`✅ Would populate dropdown: ${transformedBusinesses.length > 0 ? 'YES' : 'NO'}`)
    console.log(`✅ Dropdown would have ${transformedBusinesses.length} options`)

    if (transformedBusinesses.length > 0) {
      console.log('\n🎉 SUCCESS! The dropdown should now be populated!')
    } else {
      console.log('\n⚠️  WARNING: No businesses would appear in dropdown')
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

testBusinessesAPI()
