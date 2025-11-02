const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seed() {
  try {
    const businessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'contractors-demo-business'

    // Create a business entry for contractors demo if not exists (idempotent)
    const now = new Date()
    const business = await prisma.businesses.upsert({
      where: { id: businessId },
      update: { 
        name: 'Contractors [Demo]',
        description: 'Demo business for testing - safe to delete',
        isDemo: true,
        updatedAt: now 
      },
      create: {
        id: businessId,
        name: 'Contractors [Demo]',
        type: 'services',
        description: 'Demo business for testing - safe to delete',
        isActive: true,
        isDemo: true,
        createdAt: now,
        updatedAt: now
      }
    })
    console.log('Using business for contractors demo:', businessId)

    // STEP 2: Create type-based categories for services
    const categories = [
      { name: 'Construction Services', description: 'Building and construction' },
      { name: 'Electrical Services', description: 'Electrical installations and repairs' },
      { name: 'Plumbing Services', description: 'Plumbing installations and repairs' },
      { name: 'Painting Services', description: 'Interior and exterior painting' },
      { name: 'Carpentry Services', description: 'Woodwork and carpentry' }
    ]

    const categoryIds = {}
    for (const cat of categories) {
      // Check if category already exists for this business
      let category = await prisma.businessCategories.findFirst({
        where: {
          businessId: businessId,
          businessType: 'services',
          name: cat.name
        }
      })
      
      if (category) {
        // Update existing
        category = await prisma.businessCategories.update({
          where: { id: category.id },
          data: { description: cat.description, updatedAt: now }
        })
      } else {
        // Create new
        category = await prisma.businessCategories.create({
          data: {
            businessId: businessId,
            businessType: 'services',
            name: cat.name,
            description: cat.description,
            createdAt: now,
            updatedAt: now
          }
        })
      }
      categoryIds[cat.name] = category.id
    }
    console.log('Created categories for contractors')

    // STEP 3: Create suppliers (material suppliers for contractors)
    const suppliers = [
      { 
        number: 'CONT-SUP-001', 
        name: 'BuildRight Materials', 
        contactPerson: 'Mike Johnson',
        email: 'mike@buildright.com',
        phone: '+1-555-0101'
      },
      { 
        number: 'CONT-SUP-002', 
        name: 'ElectroSupply Co', 
        contactPerson: 'Sarah Williams',
        email: 'sarah@electrosupply.com',
        phone: '+1-555-0102'
      },
      { 
        number: 'CONT-SUP-003', 
        name: 'Plumbers Warehouse', 
        contactPerson: 'Tom Davis',
        email: 'tom@plumberswarehouse.com',
        phone: '+1-555-0103'
      }
    ]

    for (const sup of suppliers) {
      await prisma.businessSuppliers.upsert({
        where: {
          businessType_supplierNumber: {
            businessType: 'services',
            supplierNumber: sup.number
          }
        },
        update: { 
          name: sup.name,
          contactPerson: sup.contactPerson,
          email: sup.email,
          phone: sup.phone
        },
        create: {
          businessType: 'services',
          supplierNumber: sup.number,
          name: sup.name,
          contactPerson: sup.contactPerson,
          email: sup.email,
          phone: sup.phone
        }
      })
    }
    console.log('Created suppliers for contractors')

    // STEP 4: Create service offerings (products)
    const services = [
      {
        sku: 'SERV-001',
        name: 'General Construction - Per Hour',
        description: 'General construction services billed hourly',
        categoryName: 'Construction Services',
        basePrice: 75.00,
        costPrice: 50.00
      },
      {
        sku: 'SERV-002',
        name: 'Electrical Installation',
        description: 'Electrical wiring and fixture installation',
        categoryName: 'Electrical Services',
        basePrice: 95.00,
        costPrice: 65.00
      },
      {
        sku: 'SERV-003',
        name: 'Plumbing Repair',
        description: 'Plumbing repairs and installations',
        categoryName: 'Plumbing Services',
        basePrice: 85.00,
        costPrice: 55.00
      },
      {
        sku: 'SERV-004',
        name: 'Interior Painting - Per Room',
        description: 'Professional interior painting service',
        categoryName: 'Painting Services',
        basePrice: 350.00,
        costPrice: 200.00
      },
      {
        sku: 'SERV-005',
        name: 'Exterior Painting - Per Square Foot',
        description: 'Exterior painting with weather-resistant paint',
        categoryName: 'Painting Services',
        basePrice: 5.50,
        costPrice: 3.00
      },
      {
        sku: 'SERV-006',
        name: 'Custom Carpentry',
        description: 'Custom woodwork and carpentry services',
        categoryName: 'Carpentry Services',
        basePrice: 80.00,
        costPrice: 50.00
      },
      {
        sku: 'SERV-007',
        name: 'Kitchen Cabinet Installation',
        description: 'Professional kitchen cabinet installation',
        categoryName: 'Carpentry Services',
        basePrice: 1200.00,
        costPrice: 800.00
      },
      {
        sku: 'SERV-008',
        name: 'Electrical Panel Upgrade',
        description: 'Upgrade electrical panel to meet current codes',
        categoryName: 'Electrical Services',
        basePrice: 2500.00,
        costPrice: 1500.00
      },
      {
        sku: 'SERV-009',
        name: 'Bathroom Plumbing Renovation',
        description: 'Complete bathroom plumbing renovation',
        categoryName: 'Plumbing Services',
        basePrice: 3500.00,
        costPrice: 2200.00
      },
      {
        sku: 'SERV-010',
        name: 'Foundation Repair',
        description: 'Foundation inspection and repair services',
        categoryName: 'Construction Services',
        basePrice: 5000.00,
        costPrice: 3000.00
      }
    ]

    for (const service of services) {
      await prisma.businessProducts.upsert({
        where: {
          businessId_sku: {
            businessId: businessId,
            sku: service.sku
          }
        },
        update: {
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
          costPrice: service.costPrice,
          updatedAt: now
        },
        create: {
          businessId: businessId,
          businessType: 'services',
          sku: service.sku,
          name: service.name,
          description: service.description,
          categoryId: categoryIds[service.categoryName],
          basePrice: service.basePrice,
          costPrice: service.costPrice,
          isActive: true,
          productType: 'SERVICE',
          createdAt: now,
          updatedAt: now
        }
      })
    }
    console.log('Created service offerings for contractors')

    // Create some demo contractors (persons)
    const c1 = await prisma.persons.upsert({
      where: { id: `${businessId}-person-1` },
      update: {},
      create: {
        id: `${businessId}-person-1`,
        fullName: 'John Doe',
        phone: '+10000000001',
        nationalId: 'ID10001',
        email: 'john.doe@example.com',
        address: '12 Contractor Lane',
        isActive: true,
        businessId
      }
    }).catch(() => null)

    const c2 = await prisma.persons.upsert({
      where: { id: `${businessId}-person-2` },
      update: {},
      create: {
        id: `${businessId}-person-2`,
        fullName: 'Jane Smith',
        phone: '+10000000002',
        nationalId: 'ID10002',
        email: 'jane.smith@example.com',
        address: '34 Builder Ave',
        isActive: true,
        businessId
      }
    }).catch(() => null)

    // Ensure a ProjectType exists, then create a Project for this business
    const pt = await prisma.projectTypes.upsert({
      where: { id: `${businessId}-project-type-1` },
      update: {},
      create: { id: `${businessId}-project-type-1`, name: 'Demo Project Type', businessType: 'construction' }
    }).catch(() => null)

    const proj = await prisma.projects.upsert({
      where: { id: `${businessId}-proj-1` },
      update: {},
      create: {
        id: `${businessId}-proj-1`,
        name: 'Demo Construction Project',
        projectTypeId: pt ? pt.id : `${businessId}-project-type-1`,
        businessType: 'construction',
        businessId,
        status: 'active'
      }
    }).catch(() => null)

    // Assign contractors to project via ProjectContractor
    await prisma.projectContractors.upsert({
      where: { id: `${businessId}-assign-1` },
      update: {},
      create: {
        id: `${businessId}-assign-1`,
        personId: `${businessId}-person-1`,
        projectId: proj ? proj.id : `${businessId}-proj-1`,
        role: 'Lead Contractor',
        isPrimary: true
      }
    }).catch(() => null)

    await prisma.projectContractors.upsert({
      where: { id: `${businessId}-assign-2` },
      update: {},
      create: {
        id: `${businessId}-assign-2`,
        personId: `${businessId}-person-2`,
        projectId: proj ? proj.id : `${businessId}-proj-1`,
        role: 'Electrician',
        isPrimary: false
      }
    }).catch(() => null)

    console.log('Contractors demo seed complete for business:', businessId)
    await prisma.$disconnect()
  } catch (err) {
    console.error('Contractors seed failed:', err)
    await prisma.$disconnect()
    process.exitCode = 1
  }
}

seed()
