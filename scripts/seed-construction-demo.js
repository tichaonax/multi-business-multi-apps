#!/usr/bin/env node

/**
 * Seed Construction Demo Business
 * 
 * Creates a demo construction business with:
 * - Business entity (BuildRight [Demo])
 * - Sample construction projects (active, completed, planning)
 * - Construction services (framing, roofing, electrical, plumbing, etc.)
 * - Service categories (structural, finishing, MEP, site work, etc.)
 * - Suppliers for construction materials and equipment
 * 
 * Usage:
 *   node scripts/seed-construction-demo.js
 * 
 * Options:
 *   Set FORCE_RESEED=true to recreate all data even if it exists
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const FORCE_RESEED = process.env.FORCE_RESEED === 'true'

async function main() {
  console.log('🏗️  Seeding Construction Demo Business...\n')

  try {
    // 1. Create or update the demo construction business
    console.log('📋 Step 1: Creating/updating construction business...')
    
    const business = await prisma.businesses.upsert({
      where: { id: 'construction-demo-business' },
      update: {
        name: 'BuildRight [Demo]',
        type: 'construction',
        description: 'Full-service construction company specializing in residential and commercial projects',
        isDemo: true,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        id: 'construction-demo-business',
        name: 'BuildRight [Demo]',
        type: 'construction',
        description: 'Full-service construction company specializing in residential and commercial projects',
        isActive: true,
        isDemo: true,
        settings: {},
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Business: ${business.name} (ID: ${business.id})\n`)

    // 2. Verify project types exist
    console.log('📋 Step 2: Verifying construction project types...')
    
    const projectTypes = await prisma.projectTypes.findMany({
      where: { businessType: 'construction', isActive: true }
    })
    
    if (projectTypes.length === 0) {
      console.log('❌ No construction project types found!')
      console.log('   Run: node scripts/setup-project-management-schema.js')
      console.log('   This will create required project types for construction.\n')
      await prisma.$disconnect()
      process.exit(1)
    }
    
    console.log(`✅ Found ${projectTypes.length} project types\n`)

    // 3. Create sample projects
    console.log('📋 Step 3: Creating sample projects...')
    
    const projects = [
      {
        id: 'demo-project-residential-1',
        name: 'Oak Street Residence',
        description: 'New 3-bedroom single-family home construction with modern amenities',
        businessType: 'construction',
        businessId: business.id,
        projectTypeId: projectTypes.find(pt => pt.name === 'New Construction')?.id || projectTypes[0].id,
        status: 'active',
        budget: 450000,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-03-31'),
        createdAt: new Date('2024-08-15'),
        updatedAt: new Date()
      },
      {
        id: 'demo-project-renovation-1',
        name: 'Downtown Office Renovation',
        description: 'Complete interior renovation of 5000 sq ft commercial office space',
        businessType: 'construction',
        businessId: business.id,
        projectTypeId: projectTypes.find(pt => pt.name === 'Renovation')?.id || projectTypes[0].id,
        status: 'active',
        budget: 275000,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2025-01-15'),
        createdAt: new Date('2024-09-15'),
        updatedAt: new Date()
      },
      {
        id: 'demo-project-repair-1',
        name: 'Maple Building Roof Repair',
        description: 'Emergency roof repair and replacement after storm damage',
        businessType: 'construction',
        businessId: business.id,
        projectTypeId: projectTypes.find(pt => pt.name === 'Repair & Maintenance')?.id || projectTypes[0].id,
        status: 'completed',
        budget: 45000,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-08-15'),
        createdAt: new Date('2024-06-20'),
        updatedAt: new Date()
      },
      {
        id: 'demo-project-commercial-1',
        name: 'Harbor View Retail Complex',
        description: 'New 15,000 sq ft retail center with 6 commercial units',
        businessType: 'construction',
        businessId: business.id,
        projectTypeId: projectTypes.find(pt => pt.name === 'New Construction')?.id || projectTypes[0].id,
        status: 'planning',
        budget: 1200000,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-12-31'),
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date()
      },
      {
        id: 'demo-project-demolition-1',
        name: 'Old Warehouse Demolition',
        description: 'Safe demolition and site clearance of 20,000 sq ft industrial warehouse',
        businessType: 'construction',
        businessId: business.id,
        projectTypeId: projectTypes.find(pt => pt.name === 'Demolition')?.id || projectTypes[0].id,
        status: 'completed',
        budget: 85000,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-06-15'),
        createdAt: new Date('2024-04-15'),
        updatedAt: new Date()
      }
    ]

    let projectsCreated = 0
    let projectsUpdated = 0
    
    for (const project of projects) {
      const existing = await prisma.projects.findUnique({ where: { id: project.id } })
      
      await prisma.projects.upsert({
        where: { id: project.id },
        update: {
          name: project.name,
          description: project.description,
          status: project.status,
          budget: project.budget,
          startDate: project.startDate,
          endDate: project.endDate,
          updatedAt: new Date()
        },
        create: project
      })
      
      if (existing) {
        console.log(`  ♻️  Updated project: ${project.name} (${project.status})`)
        projectsUpdated++
      } else {
        console.log(`  ✅ Created project: ${project.name} (${project.status})`)
        projectsCreated++
      }
    }
    
    console.log(`\n✅ Projects: ${projectsCreated} created, ${projectsUpdated} updated\n`)

    // 4. Create service categories
    console.log('📋 Step 4: Creating service categories...')
    
    const categories = [
      { name: 'Structural Work', description: 'Foundation, framing, and structural components' },
      { name: 'Exterior Services', description: 'Roofing, siding, and exterior finishes' },
      { name: 'Electrical Systems', description: 'Electrical installation and wiring' },
      { name: 'Plumbing Systems', description: 'Plumbing installation and fixtures' },
      { name: 'HVAC Systems', description: 'Heating, ventilation, and air conditioning' },
      { name: 'Interior Finishing', description: 'Drywall, painting, and interior finishes' },
      { name: 'Flooring', description: 'Flooring installation and refinishing' },
      { name: 'Masonry', description: 'Brick, stone, and concrete work' },
      { name: 'Carpentry', description: 'Custom woodwork and cabinetry' },
      { name: 'Site Work', description: 'Excavation, grading, and landscaping' },
      { name: 'Demolition', description: 'Demolition and site clearance services' },
      { name: 'Specialty Services', description: 'Custom and specialized construction services' }
    ]

    const createdCategories = []
    let categoriesCreated = 0
    let categoriesUpdated = 0
    
    for (const cat of categories) {
      const existing = await prisma.businessCategories.findUnique({
        where: {
          businessType_name: {
            businessType: 'construction',
            name: cat.name
          }
        }
      })
      
      const category = await prisma.businessCategories.upsert({
        where: {
          businessType_name: {
            businessType: 'construction',
            name: cat.name
          }
        },
        update: {
          description: cat.description,
          businessId: business.id,
          updatedAt: new Date()
        },
        create: {
          ...cat,
          businessId: business.id,
          businessType: 'construction',
          isActive: true,
          updatedAt: new Date()
        }
      })
      
      createdCategories.push(category)
      
      if (existing) {
        console.log(`  ♻️  Updated category: ${cat.name}`)
        categoriesUpdated++
      } else {
        console.log(`  ✅ Created category: ${cat.name}`)
        categoriesCreated++
      }
    }
    
    console.log(`\n✅ Categories: ${categoriesCreated} created, ${categoriesUpdated} updated\n`)

    // 5. Create construction services
    console.log('📋 Step 5: Creating construction services...')
    
    const services = [
      // Structural Work
      { name: 'Foundation Installation', category: 'Structural Work', description: 'Concrete foundation and footings', price: 25000, cost: 18000 },
      { name: 'Steel Framing', category: 'Structural Work', description: 'Structural steel frame construction', price: 35000, cost: 25000 },
      { name: 'Wood Framing', category: 'Structural Work', description: 'Traditional wood frame construction', price: 28000, cost: 20000 },
      { name: 'Concrete Slab', category: 'Structural Work', description: 'Poured concrete slab foundation', price: 15000, cost: 11000 },
      
      // Exterior Services
      { name: 'Asphalt Shingle Roofing', category: 'Exterior Services', description: 'Standard asphalt shingle roof installation', price: 12000, cost: 8500 },
      { name: 'Metal Roofing', category: 'Exterior Services', description: 'Commercial-grade metal roof system', price: 18000, cost: 13000 },
      { name: 'Vinyl Siding Installation', category: 'Exterior Services', description: 'Exterior vinyl siding with insulation', price: 10000, cost: 7000 },
      { name: 'Brick Veneer', category: 'Exterior Services', description: 'Decorative brick exterior finish', price: 15000, cost: 11000 },
      { name: 'Window Installation', category: 'Exterior Services', description: 'Energy-efficient window replacement', price: 8000, cost: 5500 },
      
      // Electrical Systems
      { name: 'Electrical Rough-In', category: 'Electrical Systems', description: 'Initial electrical wiring installation', price: 8000, cost: 5500 },
      { name: 'Electrical Panel Upgrade', category: 'Electrical Systems', description: '200-amp electrical panel installation', price: 3500, cost: 2500 },
      { name: 'Lighting Installation', category: 'Electrical Systems', description: 'Interior and exterior lighting fixtures', price: 4000, cost: 2800 },
      { name: 'Generator Installation', category: 'Electrical Systems', description: 'Backup generator system setup', price: 6000, cost: 4200 },
      
      // Plumbing Systems
      { name: 'Plumbing Rough-In', category: 'Plumbing Systems', description: 'Initial plumbing pipe installation', price: 7000, cost: 5000 },
      { name: 'Bathroom Plumbing', category: 'Plumbing Systems', description: 'Complete bathroom fixture installation', price: 5000, cost: 3500 },
      { name: 'Kitchen Plumbing', category: 'Plumbing Systems', description: 'Kitchen sink and appliance connections', price: 3500, cost: 2500 },
      { name: 'Water Heater Installation', category: 'Plumbing Systems', description: 'Tank or tankless water heater setup', price: 2500, cost: 1800 },
      
      // HVAC Systems
      { name: 'Central AC Installation', category: 'HVAC Systems', description: 'Complete central air conditioning system', price: 8500, cost: 6000 },
      { name: 'Furnace Installation', category: 'HVAC Systems', description: 'High-efficiency heating system', price: 6000, cost: 4200 },
      { name: 'Ductwork Installation', category: 'HVAC Systems', description: 'HVAC duct system fabrication and installation', price: 5000, cost: 3500 },
      { name: 'Mini-Split System', category: 'HVAC Systems', description: 'Ductless heating and cooling system', price: 4500, cost: 3200 },
      
      // Interior Finishing
      { name: 'Drywall Installation', category: 'Interior Finishing', description: 'Complete drywall hanging and taping', price: 6000, cost: 4000 },
      { name: 'Interior Painting', category: 'Interior Finishing', description: 'Professional interior paint application', price: 4500, cost: 3000 },
      { name: 'Trim Carpentry', category: 'Interior Finishing', description: 'Baseboards, crown molding, and door trim', price: 3500, cost: 2400 },
      { name: 'Ceiling Installation', category: 'Interior Finishing', description: 'Drop ceiling or drywall ceiling system', price: 4000, cost: 2800 },
      
      // Flooring
      { name: 'Hardwood Floor Installation', category: 'Flooring', description: 'Solid hardwood flooring with finish', price: 8000, cost: 5500 },
      { name: 'Tile Floor Installation', category: 'Flooring', description: 'Ceramic or porcelain tile flooring', price: 6000, cost: 4200 },
      { name: 'Carpet Installation', category: 'Flooring', description: 'Wall-to-wall carpet with padding', price: 3500, cost: 2500 },
      { name: 'Laminate Flooring', category: 'Flooring', description: 'Laminate plank flooring installation', price: 4000, cost: 2800 },
      
      // Masonry
      { name: 'Concrete Driveway', category: 'Masonry', description: 'Poured concrete driveway with finish', price: 8000, cost: 5500 },
      { name: 'Brick Walkway', category: 'Masonry', description: 'Decorative brick paver walkway', price: 4500, cost: 3200 },
      { name: 'Stone Fireplace', category: 'Masonry', description: 'Custom stone fireplace installation', price: 7000, cost: 5000 },
      { name: 'Retaining Wall', category: 'Masonry', description: 'Structural retaining wall construction', price: 6000, cost: 4200 },
      
      // Carpentry
      { name: 'Custom Cabinetry', category: 'Carpentry', description: 'Kitchen or bathroom custom cabinets', price: 12000, cost: 8500 },
      { name: 'Built-In Shelving', category: 'Carpentry', description: 'Custom built-in shelving units', price: 3500, cost: 2500 },
      { name: 'Deck Construction', category: 'Carpentry', description: 'Outdoor deck with railings', price: 8000, cost: 5500 },
      { name: 'Door Installation', category: 'Carpentry', description: 'Interior and exterior door replacement', price: 2000, cost: 1400 },
      
      // Site Work
      { name: 'Excavation', category: 'Site Work', description: 'Site excavation and earth moving', price: 8000, cost: 5500 },
      { name: 'Grading & Leveling', category: 'Site Work', description: 'Land grading and leveling services', price: 5000, cost: 3500 },
      { name: 'Landscaping', category: 'Site Work', description: 'Professional landscaping design and installation', price: 6000, cost: 4200 },
      { name: 'Drainage System', category: 'Site Work', description: 'Site drainage and water management', price: 4500, cost: 3200 },
      
      // Demolition
      { name: 'Interior Demolition', category: 'Demolition', description: 'Safe interior structure removal', price: 5000, cost: 3500 },
      { name: 'Building Demolition', category: 'Demolition', description: 'Complete structure demolition', price: 15000, cost: 11000 },
      { name: 'Debris Removal', category: 'Demolition', description: 'Construction debris hauling and disposal', price: 2500, cost: 1800 },
      
      // Specialty Services
      { name: 'Insulation Installation', category: 'Specialty Services', description: 'Spray foam or batt insulation', price: 4500, cost: 3200 },
      { name: 'Waterproofing', category: 'Specialty Services', description: 'Basement and foundation waterproofing', price: 6000, cost: 4200 },
      { name: 'Permit & Inspection', category: 'Specialty Services', description: 'Building permit acquisition and inspection coordination', price: 2000, cost: 1500 },
      { name: 'Project Management', category: 'Specialty Services', description: 'Full construction project management services', price: 10000, cost: 7000 }
    ]

    let servicesCreated = 0
    let servicesUpdated = 0
    let servicesSkipped = 0
    
    for (let i = 0; i < services.length; i++) {
      const svc = services[i]
      const category = createdCategories.find(c => c.name === svc.category)
      
      if (!category) {
        console.log(`  ⚠️  Category not found for service: ${svc.name} (${svc.category})`)
        servicesSkipped++
        continue
      }

      const sku = `CONST-${String(i + 1).padStart(3, '0')}`
      
      const existing = await prisma.businessProducts.findUnique({
        where: {
          businessId_sku: {
            businessId: business.id,
            sku: sku
          }
        }
      })
      
      await prisma.businessProducts.upsert({
        where: {
          businessId_sku: {
            businessId: business.id,
            sku: sku
          }
        },
        update: {
          name: svc.name,
          description: svc.description,
          basePrice: svc.price,
          costPrice: svc.cost,
          categoryId: category.id,
          updatedAt: new Date()
        },
        create: {
          businessId: business.id,
          name: svc.name,
          sku: sku,
          description: svc.description,
          basePrice: svc.price,
          costPrice: svc.cost,
          productType: 'SERVICE',
          categoryId: category.id,
          businessType: 'construction',
          isActive: true,
          updatedAt: new Date()
        }
      })
      
      if (existing) {
        servicesUpdated++
      } else {
        servicesCreated++
      }
    }
    
    console.log(`✅ Services: ${servicesCreated} created, ${servicesUpdated} updated${servicesSkipped > 0 ? `, ${servicesSkipped} skipped` : ''}\n`)

    // 6. Create suppliers
    console.log('📋 Step 6: Creating suppliers...')
    
    const suppliers = [
      {
        name: 'BuildMart Supply Co.',
        email: 'orders@buildmart.demo',
        phone: '+1-555-BUILD-11',
        address: '100 Supply Road',
        productsSupplied: 'Lumber, Plywood, 2x4s, 2x6s, 2x8s, Framing materials, Structural beams, Treated lumber, OSB boards'
      },
      {
        name: 'Concrete Solutions Inc.',
        email: 'sales@concretesolutions.demo',
        phone: '+1-555-BUILD-12',
        address: '200 Concrete Blvd',
        productsSupplied: 'Ready-mix concrete, Concrete blocks, Cement, Rebar, Wire mesh, Concrete additives, Footings, Foundation materials'
      },
      {
        name: 'ElectroPro Distributors',
        email: 'info@electropro.demo',
        phone: '+1-555-BUILD-13',
        address: '300 Electric Ave',
        productsSupplied: 'Electrical wire, Circuit breakers, Electrical panels, Conduit, Junction boxes, Switches, Outlets, Lighting fixtures'
      },
      {
        name: 'Master Plumbing Supply',
        email: 'sales@masterplumbing.demo',
        phone: '+1-555-BUILD-14',
        address: '400 Pipe Street',
        productsSupplied: 'PVC pipes, Copper pipes, PEX tubing, Fittings, Valves, Fixtures, Water heaters, Drain systems'
      },
      {
        name: 'Climate Control HVAC',
        email: 'orders@climatecontrol.demo',
        phone: '+1-555-BUILD-15',
        address: '500 HVAC Lane',
        productsSupplied: 'AC units, Furnaces, Heat pumps, Thermostats, Ductwork, Vents, Registers, Air filters'
      },
      {
        name: 'TopCoat Paint & Finishes',
        email: 'info@topcoat.demo',
        phone: '+1-555-BUILD-16',
        address: '600 Color Way',
        productsSupplied: 'Interior paint, Exterior paint, Primer, Stain, Varnish, Paint supplies, Brushes, Rollers, Tape'
      },
      {
        name: 'FloorPro Distributors',
        email: 'sales@floorpro.demo',
        phone: '+1-555-BUILD-17',
        address: '700 Floor Avenue',
        productsSupplied: 'Hardwood flooring, Tile, Carpet, Laminate, Vinyl, Underlayment, Adhesives, Grout'
      },
      {
        name: 'Roofing Depot',
        email: 'orders@roofingdepot.demo',
        phone: '+1-555-BUILD-18',
        address: '800 Roof Road',
        productsSupplied: 'Asphalt shingles, Metal roofing, Underlayment, Flashing, Gutters, Downspouts, Roof vents'
      },
      {
        name: 'Stone & Masonry Supply',
        email: 'info@stonemason.demo',
        phone: '+1-555-BUILD-19',
        address: '900 Mason Street',
        productsSupplied: 'Bricks, Natural stone, Pavers, Concrete blocks, Mortar, Grout, Stone veneer, Retaining wall blocks'
      },
      {
        name: 'ToolWorks Equipment Rental',
        email: 'rentals@toolworks.demo',
        phone: '+1-555-BUILD-20',
        address: '1000 Tool Boulevard',
        productsSupplied: 'Power tools, Hand tools, Scaffolding, Ladders, Safety equipment, Heavy machinery rental, Generators'
      }
    ]

    let suppliersCreated = 0
    let suppliersUpdated = 0
    
    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i]
      const supplierNumber = `CONST-SUP-${String(i + 1).padStart(3, '0')}`
      
      const existing = await prisma.businessSuppliers.findUnique({
        where: {
          businessType_supplierNumber: {
            businessType: 'construction',
            supplierNumber: supplierNumber
          }
        }
      })
      
      await prisma.businessSuppliers.upsert({
        where: {
          businessType_supplierNumber: {
            businessType: 'construction',
            supplierNumber: supplierNumber
          }
        },
        update: {
          ...supplier,
          businessId: business.id,
          updatedAt: new Date()
        },
        create: {
          ...supplier,
          supplierNumber: supplierNumber,
          businessId: business.id,
          businessType: 'construction',
          isActive: true,
          updatedAt: new Date()
        }
      })
      
      if (existing) {
        console.log(`  ♻️  Updated supplier: ${supplier.name}`)
        suppliersUpdated++
      } else {
        console.log(`  ✅ Created supplier: ${supplier.name}`)
        suppliersCreated++
      }
    }
    
    console.log(`\n✅ Suppliers: ${suppliersCreated} created, ${suppliersUpdated} updated\n`)

    // Summary
    console.log('═'.repeat(60))
    console.log('🎉 CONSTRUCTION DEMO SEEDING COMPLETED!')
    console.log('═'.repeat(60))
    
    // Get final counts from database
    const finalStats = {
      projects: await prisma.projects.count({ where: { businessId: business.id } }),
      activeProjects: await prisma.projects.count({ where: { businessId: business.id, status: 'active' } }),
      categories: await prisma.businessCategories.count({ where: { businessType: 'construction' } }),
      services: await prisma.businessProducts.count({ where: { businessId: business.id } }),
      suppliers: await prisma.businessSuppliers.count({ where: { businessType: 'construction' } })
    }
    
    console.log(`
📊 Summary:
   • Business: ${business.name}
   • Business ID: ${business.id}
   • Demo Flag: ${business.isDemo ? '✅ Enabled' : '❌ Disabled'}
   
   • Projects: ${finalStats.projects} (${finalStats.activeProjects} active)
   • Service Categories: ${finalStats.categories}
   • Services: ${finalStats.services}
   • Suppliers: ${finalStats.suppliers}

🔗 Access the construction dashboard at:
   http://localhost:8080/construction

✅ Demo business is ready for testing!
`)

  } catch (error) {
    console.error('\n❌ Error seeding construction demo:', error.message)
    console.error('\nStack trace:', error.stack)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
