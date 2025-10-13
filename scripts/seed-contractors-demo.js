const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seed() {
  try {
    const businessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'contractors-demo-business'

    // Create a business entry for contractors demo if not exists
    const existing = await prisma.businesses.findUnique({ where: { id: businessId } })
    if (!existing) {
      // Ensure Business.type is set; use a value consistent with the businessType
      await prisma.businesses.create({ data: { id: businessId, name: 'Contractors Demo', type: 'services' } })
    }

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
