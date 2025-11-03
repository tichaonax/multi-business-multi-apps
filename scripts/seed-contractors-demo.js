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
      { name: 'General Construction', description: 'General contracting and construction management services' },
      { name: 'Electrical', description: 'Electrical installations, repairs, and upgrades' },
      { name: 'Plumbing', description: 'Plumbing installations, repairs, and maintenance' },
      { name: 'HVAC', description: 'Heating, ventilation, and air conditioning services' },
      { name: 'Painting & Finishing', description: 'Interior and exterior painting and finishing work' },
      { name: 'Carpentry & Millwork', description: 'Custom woodwork, cabinets, and carpentry services' },
      { name: 'Flooring', description: 'Floor installation and refinishing services' },
      { name: 'Roofing', description: 'Roof installation, repair, and maintenance' },
      { name: 'Masonry', description: 'Brick, stone, and concrete work' },
      { name: 'Landscaping', description: 'Landscape design and installation services' }
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
        number: 'SUP-001', 
        name: 'BuildRight Supply Co.', 
        contactPerson: 'Mike Johnson',
        email: 'mike@buildright.com',
        phone: '+12635551234001',
        address: '1500 Industrial Blvd, Suite 200',
        productsSupplied: 'Lumber, Plywood, 2x4s, 2x6s, Framing materials, Concrete, Cement, Rebar, Construction hardware, Fasteners'
      },
      { 
        number: 'SUP-002', 
        name: 'ElectroTech Distributors', 
        contactPerson: 'Sarah Williams',
        email: 'sarah@electrotechdist.com',
        phone: '+12635551234002',
        address: '2800 Commerce Drive',
        productsSupplied: 'Electrical wire, Circuit breakers, Electrical panels, Outlets, Switches, Conduit, Junction boxes, LED fixtures, Smart home devices'
      },
      { 
        number: 'SUP-003', 
        name: 'Pro Plumbing Supply', 
        contactPerson: 'Tom Davis',
        email: 'tom@proplumbingsupply.com',
        phone: '+12635551234003',
        address: '950 Warehouse Lane',
        productsSupplied: 'PVC pipes, Copper pipes, PEX tubing, Fittings, Valves, Water heaters, Faucets, Toilets, Sinks, Drains'
      },
      { 
        number: 'SUP-004', 
        name: 'HVAC Parts Depot', 
        contactPerson: 'Jennifer Martinez',
        email: 'jmartinez@hvacpartsdepot.com',
        phone: '+12635551234004',
        address: '4200 Air Conditioning Way',
        productsSupplied: 'AC units, Furnaces, Heat pumps, Thermostats, Ductwork, Air filters, Refrigerant, HVAC controls, Ventilation fans'
      },
      { 
        number: 'SUP-005', 
        name: 'Premier Paint & Finish', 
        contactPerson: 'Robert Chen',
        email: 'robert@premierpaint.com',
        phone: '+12635551234005',
        address: '3100 Color Street',
        productsSupplied: 'Interior paint, Exterior paint, Primer, Stain, Varnish, Paint brushes, Rollers, Spray equipment, Drop cloths, Tape'
      },
      { 
        number: 'SUP-006', 
        name: 'Hardwood Lumber Specialists', 
        contactPerson: 'Amanda Foster',
        email: 'afoster@hardwoodlumber.com',
        phone: '+12635551234006',
        address: '7800 Sawmill Road',
        productsSupplied: 'Hardwood flooring, Oak, Maple, Cherry, Walnut, Cabinet grade lumber, Trim molding, Crown molding, Baseboards'
      },
      { 
        number: 'SUP-007', 
        name: 'Tile & Stone Emporium', 
        contactPerson: 'David Lee',
        email: 'david@tileandstoneemp.com',
        phone: '+12635551234007',
        address: '5500 Marble Avenue',
        productsSupplied: 'Ceramic tile, Porcelain tile, Natural stone, Marble, Granite, Grout, Thin-set mortar, Tile saws, Spacers, Sealers'
      },
      { 
        number: 'SUP-008', 
        name: 'Roofing Materials Direct', 
        contactPerson: 'Lisa Thompson',
        email: 'lthompson@roofingdirect.com',
        phone: '+12635551234008',
        address: '9200 Shingle Boulevard',
        productsSupplied: 'Asphalt shingles, Metal roofing, Underlayment, Flashing, Ridge vents, Gutters, Downspouts, Roof cement, Roofing nails'
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
          phone: sup.phone,
          address: sup.address,
          productsSupplied: sup.productsSupplied
        },
        create: {
          businessType: 'services',
          supplierNumber: sup.number,
          name: sup.name,
          contactPerson: sup.contactPerson,
          email: sup.email,
          phone: sup.phone,
          address: sup.address,
          productsSupplied: sup.productsSupplied
        }
      })
    }
    console.log('Created suppliers for contractors')

    // STEP 4: Create service offerings (products)
    const services = [
      // General Construction
      {
        sku: 'GC-001',
        name: 'General Contractor - Labor Hour',
        description: 'Skilled general contracting labor, hourly rate for project management and coordination',
        categoryName: 'General Construction',
        basePrice: 85.00,
        costPrice: 60.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'GC-002',
        name: 'Foundation Repair & Waterproofing',
        description: 'Complete foundation inspection, crack repair, and waterproofing services',
        categoryName: 'General Construction',
        basePrice: 4500.00,
        costPrice: 2800.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'GC-003',
        name: 'Structural Framing',
        description: 'Wall framing, roof trusses, and structural support installation',
        categoryName: 'General Construction',
        basePrice: 65.00,
        costPrice: 45.00,
        unitOfMeasure: 'hour'
      },
      
      // Electrical
      {
        sku: 'EL-001',
        name: 'Licensed Electrician - Hour',
        description: 'Certified electrician hourly rate for installations, repairs, and troubleshooting',
        categoryName: 'Electrical',
        basePrice: 95.00,
        costPrice: 65.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'EL-002',
        name: 'Electrical Panel Upgrade (200A)',
        description: 'Upgrade to 200-amp electrical panel with circuit breakers, includes permit',
        categoryName: 'Electrical',
        basePrice: 2800.00,
        costPrice: 1700.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'EL-003',
        name: 'Whole House Rewiring',
        description: 'Complete electrical rewiring for residential property up to 2000 sqft',
        categoryName: 'Electrical',
        basePrice: 8500.00,
        costPrice: 5200.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'EL-004',
        name: 'Outlet & Switch Installation',
        description: 'Installation of electrical outlets, switches, and cover plates',
        categoryName: 'Electrical',
        basePrice: 75.00,
        costPrice: 45.00,
        unitOfMeasure: 'unit'
      },
      
      // Plumbing
      {
        sku: 'PL-001',
        name: 'Licensed Plumber - Hour',
        description: 'Certified plumber hourly rate for installations, repairs, and maintenance',
        categoryName: 'Plumbing',
        basePrice: 90.00,
        costPrice: 60.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'PL-002',
        name: 'Bathroom Plumbing Package',
        description: 'Complete bathroom plumbing installation: toilet, sink, shower/tub fixtures',
        categoryName: 'Plumbing',
        basePrice: 3200.00,
        costPrice: 1900.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'PL-003',
        name: 'Water Heater Installation',
        description: 'Installation of 40-50 gallon water heater, includes removal of old unit',
        categoryName: 'Plumbing',
        basePrice: 1800.00,
        costPrice: 1100.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'PL-004',
        name: 'Kitchen Sink & Faucet Install',
        description: 'Installation of kitchen sink, faucet, and garbage disposal connection',
        categoryName: 'Plumbing',
        basePrice: 650.00,
        costPrice: 400.00,
        unitOfMeasure: 'project'
      },
      
      // HVAC
      {
        sku: 'HV-001',
        name: 'HVAC Technician - Hour',
        description: 'Licensed HVAC technician for installations, repairs, and maintenance',
        categoryName: 'HVAC',
        basePrice: 110.00,
        costPrice: 75.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'HV-002',
        name: 'Central AC Unit Installation',
        description: 'Installation of 3-ton central air conditioning unit with 10-year warranty',
        categoryName: 'HVAC',
        basePrice: 5500.00,
        costPrice: 3500.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'HV-003',
        name: 'Furnace Replacement',
        description: '80,000 BTU high-efficiency furnace installation with ductwork inspection',
        categoryName: 'HVAC',
        basePrice: 4200.00,
        costPrice: 2700.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'HV-004',
        name: 'Ductwork Cleaning & Sealing',
        description: 'Complete ductwork cleaning and air sealing service for improved efficiency',
        categoryName: 'HVAC',
        basePrice: 800.00,
        costPrice: 450.00,
        unitOfMeasure: 'project'
      },
      
      // Painting & Finishing
      {
        sku: 'PT-001',
        name: 'Professional Painter - Hour',
        description: 'Experienced painter hourly rate for interior and exterior work',
        categoryName: 'Painting & Finishing',
        basePrice: 55.00,
        costPrice: 35.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'PT-002',
        name: 'Interior Room Painting',
        description: 'Complete interior room painting: walls, ceiling, trim (up to 12x12 room)',
        categoryName: 'Painting & Finishing',
        basePrice: 450.00,
        costPrice: 250.00,
        unitOfMeasure: 'room'
      },
      {
        sku: 'PT-003',
        name: 'Exterior House Painting',
        description: 'Professional exterior painting with premium weather-resistant paint',
        categoryName: 'Painting & Finishing',
        basePrice: 6.50,
        costPrice: 3.80,
        unitOfMeasure: 'sqft'
      },
      {
        sku: 'PT-004',
        name: 'Cabinet Refinishing',
        description: 'Kitchen or bathroom cabinet sanding, priming, and refinishing',
        categoryName: 'Painting & Finishing',
        basePrice: 2200.00,
        costPrice: 1300.00,
        unitOfMeasure: 'project'
      },
      
      // Carpentry & Millwork
      {
        sku: 'CR-001',
        name: 'Master Carpenter - Hour',
        description: 'Skilled carpenter for custom woodwork, framing, and finish carpentry',
        categoryName: 'Carpentry & Millwork',
        basePrice: 75.00,
        costPrice: 50.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'CR-002',
        name: 'Custom Kitchen Cabinets',
        description: 'Design and installation of custom kitchen cabinetry (10 linear feet)',
        categoryName: 'Carpentry & Millwork',
        basePrice: 1800.00,
        costPrice: 1100.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'CR-003',
        name: 'Crown Molding Installation',
        description: 'Installation of decorative crown molding throughout room',
        categoryName: 'Carpentry & Millwork',
        basePrice: 12.00,
        costPrice: 7.00,
        unitOfMeasure: 'foot'
      },
      {
        sku: 'CR-004',
        name: 'Deck Construction',
        description: 'Custom deck construction with composite or pressure-treated lumber',
        categoryName: 'Carpentry & Millwork',
        basePrice: 45.00,
        costPrice: 28.00,
        unitOfMeasure: 'sqft'
      },
      
      // Flooring
      {
        sku: 'FL-001',
        name: 'Flooring Installer - Hour',
        description: 'Professional flooring installation specialist',
        categoryName: 'Flooring',
        basePrice: 65.00,
        costPrice: 42.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'FL-002',
        name: 'Hardwood Floor Installation',
        description: 'Installation of solid hardwood flooring with finishing',
        categoryName: 'Flooring',
        basePrice: 12.50,
        costPrice: 7.80,
        unitOfMeasure: 'sqft'
      },
      {
        sku: 'FL-003',
        name: 'Laminate Flooring Install',
        description: 'Installation of laminate flooring with underlayment',
        categoryName: 'Flooring',
        basePrice: 6.50,
        costPrice: 4.00,
        unitOfMeasure: 'sqft'
      },
      {
        sku: 'FL-004',
        name: 'Tile Floor Installation',
        description: 'Ceramic or porcelain tile installation with grout and sealing',
        categoryName: 'Flooring',
        basePrice: 15.00,
        costPrice: 9.50,
        unitOfMeasure: 'sqft'
      },
      
      // Roofing
      {
        sku: 'RF-001',
        name: 'Roofing Crew - Hour',
        description: 'Professional roofing crew for installations and repairs',
        categoryName: 'Roofing',
        basePrice: 95.00,
        costPrice: 65.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'RF-002',
        name: 'Asphalt Shingle Roof Replacement',
        description: 'Complete roof replacement with architectural shingles, 25-year warranty',
        categoryName: 'Roofing',
        basePrice: 8.50,
        costPrice: 5.20,
        unitOfMeasure: 'sqft'
      },
      {
        sku: 'RF-003',
        name: 'Roof Inspection & Repair',
        description: 'Comprehensive roof inspection with minor leak repairs',
        categoryName: 'Roofing',
        basePrice: 450.00,
        costPrice: 280.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'RF-004',
        name: 'Gutter Installation',
        description: 'Seamless aluminum gutter installation with downspouts',
        categoryName: 'Roofing',
        basePrice: 18.00,
        costPrice: 11.00,
        unitOfMeasure: 'foot'
      },
      
      // Masonry
      {
        sku: 'MS-001',
        name: 'Mason - Hour',
        description: 'Skilled mason for brick, stone, and concrete work',
        categoryName: 'Masonry',
        basePrice: 70.00,
        costPrice: 48.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'MS-002',
        name: 'Brick Patio Installation',
        description: 'Custom brick patio with sand base and polymeric sand joints',
        categoryName: 'Masonry',
        basePrice: 28.00,
        costPrice: 17.00,
        unitOfMeasure: 'sqft'
      },
      {
        sku: 'MS-003',
        name: 'Stone Veneer Installation',
        description: 'Natural or manufactured stone veneer for exterior walls',
        categoryName: 'Masonry',
        basePrice: 35.00,
        costPrice: 22.00,
        unitOfMeasure: 'sqft'
      },
      {
        sku: 'MS-004',
        name: 'Concrete Driveway',
        description: 'Poured concrete driveway with proper grading and reinforcement',
        categoryName: 'Masonry',
        basePrice: 12.00,
        costPrice: 7.50,
        unitOfMeasure: 'sqft'
      },
      
      // Landscaping
      {
        sku: 'LS-001',
        name: 'Landscaper - Hour',
        description: 'Professional landscaper for design and installation services',
        categoryName: 'Landscaping',
        basePrice: 60.00,
        costPrice: 40.00,
        unitOfMeasure: 'hour'
      },
      {
        sku: 'LS-002',
        name: 'Lawn Installation (Sod)',
        description: 'Professional sod installation with soil preparation',
        categoryName: 'Landscaping',
        basePrice: 2.80,
        costPrice: 1.70,
        unitOfMeasure: 'sqft'
      },
      {
        sku: 'LS-003',
        name: 'Sprinkler System Installation',
        description: 'Automated irrigation system with timer and zone control',
        categoryName: 'Landscaping',
        basePrice: 3500.00,
        costPrice: 2200.00,
        unitOfMeasure: 'project'
      },
      {
        sku: 'LS-004',
        name: 'Tree & Shrub Planting',
        description: 'Professional planting service including soil amendment and mulch',
        categoryName: 'Landscaping',
        basePrice: 150.00,
        costPrice: 95.00,
        unitOfMeasure: 'unit'
      }
    ]

    for (const service of services) {
      // Include unit of measure in the description if specified
      const fullDescription = service.unitOfMeasure 
        ? `${service.description} (Unit: ${service.unitOfMeasure})`
        : service.description

      await prisma.businessProducts.upsert({
        where: {
          businessId_sku: {
            businessId: businessId,
            sku: service.sku
          }
        },
        update: {
          name: service.name,
          description: fullDescription,
          basePrice: service.basePrice,
          costPrice: service.costPrice,
          updatedAt: now
        },
        create: {
          businessId: businessId,
          businessType: 'services',
          sku: service.sku,
          name: service.name,
          description: fullDescription,
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
    console.log(`Created ${services.length} service offerings for contractors`)

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
