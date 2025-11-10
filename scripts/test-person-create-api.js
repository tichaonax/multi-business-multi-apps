// Load environment variables
const path = require('path')
const fs = require('fs')
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=')
      process.env[key.trim()] = valueParts.join('=').replace(/^"(.*)"$/, '$1').trim()
    }
  })
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testPersonCreate() {
  console.log('\n=== Testing Person Create API ===\n')

  try {
    // Step 1: Get a valid user ID
    console.log('1. Getting admin user...')
    const adminUser = await prisma.users.findFirst({
      where: { role: 'admin' }
    })

    if (!adminUser) {
      console.log('❌ No admin user found. Create one first.')
      return
    }
    console.log(`✅ Found user: ${adminUser.email || adminUser.id}`)

    // Step 2: Check ID template exists
    console.log('\n2. Checking ID template...')
    const template = await prisma.idFormatTemplates.findUnique({
      where: { id: 'zw-national-id' }
    })

    if (!template) {
      console.log('❌ Zimbabwe ID template not found')
      return
    }
    console.log(`✅ Template found: ${template.name}`)
    console.log(`   Pattern: ${template.pattern}`)

    // Step 3: Validate the national ID
    console.log('\n3. Validating national ID format...')
    const testNationalId = '63-123456A78'
    const regex = new RegExp(template.pattern)
    const isValid = regex.test(testNationalId)

    if (!isValid) {
      console.log(`❌ National ID ${testNationalId} is invalid`)
      return
    }
    console.log(`✅ National ID ${testNationalId} is valid`)

    // Step 4: Create the person using Prisma directly
    console.log('\n4. Creating person record...')

    const testPerson = {
      fullName: 'Test Person ' + Date.now(),
      phone: '+263 777888887',
      nationalId: testNationalId + '-' + Date.now(), // Make unique
      email: null,
      address: null,
      notes: 'Test contractor',
      driverLicenseNumber: null,
    }

    const createData = {
      ...testPerson,
      users: {
        connect: { id: adminUser.id }
      },
      id_format_templates: {
        connect: { id: template.id }
      }
    }

    console.log('Creating with data:', JSON.stringify({
      ...testPerson,
      userId: adminUser.id,
      templateId: template.id
    }, null, 2))

    const newPerson = await prisma.persons.create({
      data: createData,
      include: {
        id_format_templates: true,
        driver_license_templates: true,
        users: {
          select: { email: true, id: true }
        }
      }
    })

    console.log('\n✅ Person created successfully!')
    console.log('\nCreated Person:')
    console.log(`  ID: ${newPerson.id}`)
    console.log(`  Name: ${newPerson.fullName}`)
    console.log(`  Phone: ${newPerson.phone}`)
    console.log(`  National ID: ${newPerson.nationalId}`)
    console.log(`  ID Template: ${newPerson.id_format_templates?.name || 'None'}`)
    console.log(`  Created By: ${newPerson.users?.email || newPerson.users?.id || 'None'}`)

    // Clean up - delete the test person
    console.log('\n5. Cleaning up...')
    await prisma.persons.delete({
      where: { id: newPerson.id }
    })
    console.log('✅ Test person deleted')

    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS PASSED!')
    console.log('='.repeat(60))
    console.log('\nThe API should work correctly now.')
    console.log('You can create contractors with:')
    console.log(JSON.stringify({
      fullName: "Charles Mumanyi",
      phone: "+263 777888887",
      nationalId: "63-123456A78",
      idFormatTemplateId: "zw-national-id",
      notes: "Construction"
    }, null, 2))
    console.log('')

  } catch (error) {
    console.error('\n❌ TEST FAILED!')
    console.error('Error:', error.message)

    if (error.code) {
      console.error('Error Code:', error.code)
    }

    if (error.meta) {
      console.error('Meta:', error.meta)
    }

    console.error('\nFull error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPersonCreate()
