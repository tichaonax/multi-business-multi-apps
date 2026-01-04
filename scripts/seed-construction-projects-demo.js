const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Construction Projects Demo Data
 * Creates construction projects, stages, contractors, and transactions
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDecimal(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

function getDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function getDaysFromNow(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

async function seedConstructionProjects() {
  console.log('🏗️  Starting Construction Projects Demo Data Seeding...\n')

  try {
    // Get admin user
    const adminUser = await prisma.users.findFirst({
      where: { email: { contains: 'admin' } },
      select: { id: true }
    })

    if (!adminUser) {
      console.log('❌ No admin user found. Cannot create construction projects.')
      return
    }

    // ═══════════════════════════════════════════════════════════
    // CREATE PROJECT TYPES (if they don't exist)
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Creating Project Types...\n')

    const projectTypesData = [
      {
        name: 'Residential Construction',
        description: 'Single-family homes and apartments',
        businessType: 'construction'
      },
      {
        name: 'Commercial Construction',
        description: 'Office buildings and retail spaces',
        businessType: 'construction'
      },
      {
        name: 'Renovation',
        description: 'Remodeling and renovation projects',
        businessType: 'construction'
      }
    ]

    const projectTypes = {}
    let projectTypesCreated = 0

    for (const typeData of projectTypesData) {
      let projectType = await prisma.projectTypes.findUnique({
        where: { name: typeData.name }
      })

      if (!projectType) {
        projectType = await prisma.projectTypes.create({
          data: typeData
        })
        console.log(`   ✅ Created project type: ${typeData.name}`)
        projectTypesCreated++
      } else {
        console.log(`   ✅ Using existing project type: ${typeData.name}`)
      }

      projectTypes[typeData.name] = projectType
    }

    console.log(`\n   📊 Total project types: ${Object.keys(projectTypes).length} (${projectTypesCreated} new)\n`)

    // ═══════════════════════════════════════════════════════════
    // CREATE CONTRACTORS (Persons)
    // ═══════════════════════════════════════════════════════════
    console.log('👷 Creating Contractors...\n')

    const contractorsData = [
      { fullName: 'John Smith Electrical', phone: '555-0101', email: 'john.smith@electric.com', specialization: 'Electrician' },
      { fullName: 'Mike Johnson Plumbing', phone: '555-0102', email: 'mike.johnson@plumbing.com', specialization: 'Plumber' },
      { fullName: 'Sarah Davis Carpentry', phone: '555-0103', email: 'sarah.davis@carpentry.com', specialization: 'Carpenter' },
      { fullName: 'Robert Brown Painting', phone: '555-0104', email: 'robert.brown@painting.com', specialization: 'Painter' },
      { fullName: 'Emily Wilson Masonry', phone: '555-0105', email: 'emily.wilson@masonry.com', specialization: 'Mason' },
      { fullName: 'David Martinez HVAC', phone: '555-0106', email: 'david.martinez@hvac.com', specialization: 'HVAC Technician' },
      { fullName: 'Jennifer Taylor Roofing', phone: '555-0107', email: 'jennifer.taylor@roofing.com', specialization: 'Roofer' },
      { fullName: 'James Anderson Flooring', phone: '555-0108', email: 'james.anderson@flooring.com', specialization: 'Flooring Specialist' }
    ]

    const contractors = []
    let contractorsCreated = 0

    for (const contractorData of contractorsData) {
      // Check if contractor already exists
      let contractor = await prisma.persons.findFirst({
        where: { email: contractorData.email }
      })

      if (!contractor) {
        contractor = await prisma.persons.create({
          data: {
            fullName: contractorData.fullName,
            phone: contractorData.phone,
            email: contractorData.email,
            notes: `Specialization: ${contractorData.specialization}`,
            createdBy: adminUser.id
          }
        })
        console.log(`   ✅ Created contractor: ${contractorData.fullName}`)
        contractorsCreated++
      } else {
        console.log(`   ✅ Using existing contractor: ${contractorData.fullName}`)
      }

      contractors.push({ ...contractor, specialization: contractorData.specialization })
    }

    console.log(`\n   📊 Total contractors: ${contractors.length} (${contractorsCreated} new)\n`)

    // ═══════════════════════════════════════════════════════════
    // CREATE PROJECTS
    // ═══════════════════════════════════════════════════════════
    console.log('🏗️  Creating Construction Projects...\n')

    let totalProjectsCreated = 0
    let totalStagesCreated = 0
    let totalTransactionsCreated = 0

    // Check if projects already exist
    const existingProjects = await prisma.constructionProjects.count()
    if (existingProjects >= 3) {
      console.log(`   ⏭️  ${existingProjects} construction projects already exist. Skipping project creation.\n`)
    } else {
      // PROJECT 1: IN-PROGRESS PROJECT
      console.log('   📂 Creating In-Progress Project...')

      // Create Projects record first (generic project table)
      const inProgressGenericProject = await prisma.projects.create({
        data: {
          name: 'Downtown Office Building Renovation',
          description: 'Complete renovation of 5-story office building including electrical, plumbing, and interior finishing',
          projectTypeId: projectTypes['Renovation'].id,
          businessType: 'construction',
          status: 'in_progress',
          budget: 250000,
          startDate: getDaysAgo(90),
          endDate: getDaysFromNow(60),
          createdBy: adminUser.id
        }
      })

      // Create ConstructionProjects record (construction-specific table)
      const inProgressProject = await prisma.constructionProjects.create({
        data: {
          name: 'Downtown Office Building Renovation',
          description: 'Complete renovation of 5-story office building including electrical, plumbing, and interior finishing',
          status: 'in_progress',
          budget: 250000,
          startDate: getDaysAgo(90),
          endDate: getDaysFromNow(60),
          projectTypeId: projectTypes['Renovation'].id,
          createdBy: adminUser.id
        }
      })

      console.log(`      ✅ Created: ${inProgressProject.name}`)
      console.log(`         Budget: $${Number(inProgressProject.budget).toLocaleString()}`)
      console.log(`         Status: ${inProgressProject.status}`)
      totalProjectsCreated++

      // Create stages for in-progress project
      const inProgressStages = [
        {
          name: 'Planning & Design',
          description: 'Architectural plans and permits',
          status: 'completed',
          estimatedAmount: 25000,
          startDate: getDaysAgo(90),
          completionDate: getDaysAgo(75),
          orderIndex: 1
        },
        {
          name: 'Demolition',
          description: 'Remove old fixtures and prepare space',
          status: 'completed',
          estimatedAmount: 30000,
          startDate: getDaysAgo(74),
          completionDate: getDaysAgo(60),
          orderIndex: 2
        },
        {
          name: 'Electrical Work',
          description: 'New wiring and electrical systems',
          status: 'in_progress',
          estimatedAmount: 50000,
          startDate: getDaysAgo(59),
          endDate: getDaysFromNow(15),
          orderIndex: 3
        },
        {
          name: 'Plumbing',
          description: 'Install new plumbing systems',
          status: 'in_progress',
          estimatedAmount: 40000,
          startDate: getDaysAgo(50),
          endDate: getDaysFromNow(20),
          orderIndex: 4
        },
        {
          name: 'Interior Finishing',
          description: 'Painting, flooring, and final touches',
          status: 'pending',
          estimatedAmount: 60000,
          startDate: getDaysFromNow(21),
          endDate: getDaysFromNow(60),
          orderIndex: 5
        }
      ]

      for (const stageData of inProgressStages) {
        const stage = await prisma.projectStages.create({
          data: {
            ...stageData,
            projectId: inProgressGenericProject.id,
            constructionProjectId: inProgressProject.id
          }
        })
        totalStagesCreated++

        // Assign contractors to stages and create transactions
        if (stage.name === 'Electrical Work') {
          // Assign electrician
          const electrician = contractors.find(c => c.specialization === 'Electrician')
          const projectContractor = await prisma.projectContractors.create({
            data: {
              projectId: inProgressGenericProject.id,
              constructionProjectId: inProgressProject.id,
              personId: electrician.id,
              role: 'Lead Electrician',
              hourlyRate: 85,
              totalContractAmount: 50000,
              startDate: stageData.startDate,
              status: 'active'
            }
          })

          // Create expense transaction (personal expense required by schema)
          const personalExpense = await prisma.personalExpenses.create({
            data: {
              userId: adminUser.id,
              category: 'Construction',
              description: 'Electrical work payment - Downtown Office',
              amount: 15000,
              date: getDaysAgo(30)
            }
          })

          await prisma.projectTransactions.create({
            data: {
              projectId: inProgressGenericProject.id,
              constructionProjectId: inProgressProject.id,
              personalExpenseId: personalExpense.id,
              projectContractorId: projectContractor.id,
              stageId: stage.id,
              amount: 15000,
              description: 'Electrical work - first payment',
              transactionType: 'payment',
              status: 'completed',
              paymentMethod: 'check',
              paidAt: getDaysAgo(30),
              createdBy: adminUser.id
            }
          })
          totalTransactionsCreated++
        }

        if (stage.name === 'Plumbing') {
          // Assign plumber
          const plumber = contractors.find(c => c.specialization === 'Plumber')
          const projectContractor = await prisma.projectContractors.create({
            data: {
              projectId: inProgressGenericProject.id,
              constructionProjectId: inProgressProject.id,
              personId: plumber.id,
              role: 'Master Plumber',
              hourlyRate: 75,
              totalContractAmount: 40000,
              startDate: stageData.startDate,
              status: 'active'
            }
          })

          const personalExpense = await prisma.personalExpenses.create({
            data: {
              userId: adminUser.id,
              category: 'Construction',
              description: 'Plumbing work payment - Downtown Office',
              amount: 12000,
              date: getDaysAgo(20)
            }
          })

          await prisma.projectTransactions.create({
            data: {
              projectId: inProgressGenericProject.id,
              constructionProjectId: inProgressProject.id,
              personalExpenseId: personalExpense.id,
              projectContractorId: projectContractor.id,
              stageId: stage.id,
              amount: 12000,
              description: 'Plumbing work - first payment',
              transactionType: 'payment',
              status: 'completed',
              paymentMethod: 'check',
              paidAt: getDaysAgo(20),
              createdBy: adminUser.id
            }
          })
          totalTransactionsCreated++
        }
      }

      console.log(`      ✅ Created ${inProgressStages.length} stages\n`)

      // PROJECT 2: COMPLETED PROJECT
      console.log('   📂 Creating Completed Project...')

      // Create Projects record first (generic project table)
      const completedGenericProject = await prisma.projects.create({
        data: {
          name: 'Residential Home Construction',
          description: '3-bedroom single-family home with 2-car garage',
          projectTypeId: projectTypes['Residential Construction'].id,
          businessType: 'construction',
          status: 'completed',
          budget: 350000,
          startDate: getDaysAgo(365),
          endDate: getDaysAgo(30),
          createdBy: adminUser.id
        }
      })

      // Create ConstructionProjects record (construction-specific table)
      const completedProject = await prisma.constructionProjects.create({
        data: {
          name: 'Residential Home Construction',
          description: '3-bedroom single-family home with 2-car garage',
          status: 'completed',
          budget: 350000,
          startDate: getDaysAgo(365),
          endDate: getDaysAgo(30),
          projectTypeId: projectTypes['Residential Construction'].id,
          createdBy: adminUser.id
        }
      })

      console.log(`      ✅ Created: ${completedProject.name}`)
      console.log(`         Budget: $${Number(completedProject.budget).toLocaleString()}`)
      console.log(`         Status: ${completedProject.status}`)
      totalProjectsCreated++

      // Create stages for completed project (all completed)
      const completedStages = [
        {
          name: 'Foundation',
          description: 'Excavation and foundation work',
          status: 'completed',
          estimatedAmount: 50000,
          startDate: getDaysAgo(365),
          completionDate: getDaysAgo(335),
          orderIndex: 1
        },
        {
          name: 'Framing',
          description: 'Wood framing and roof structure',
          status: 'completed',
          estimatedAmount: 80000,
          startDate: getDaysAgo(334),
          completionDate: getDaysAgo(300),
          orderIndex: 2
        },
        {
          name: 'Exterior',
          description: 'Siding, windows, and roofing',
          status: 'completed',
          estimatedAmount: 70000,
          startDate: getDaysAgo(299),
          completionDate: getDaysAgo(250),
          orderIndex: 3
        },
        {
          name: 'Systems Installation',
          description: 'Electrical, plumbing, and HVAC',
          status: 'completed',
          estimatedAmount: 90000,
          startDate: getDaysAgo(249),
          completionDate: getDaysAgo(180),
          orderIndex: 4
        },
        {
          name: 'Interior Finishing',
          description: 'Drywall, flooring, painting, and trim',
          status: 'completed',
          estimatedAmount: 60000,
          startDate: getDaysAgo(179),
          completionDate: getDaysAgo(30),
          orderIndex: 5
        }
      ]

      for (const stageData of completedStages) {
        await prisma.projectStages.create({
          data: {
            ...stageData,
            projectId: completedGenericProject.id,
            constructionProjectId: completedProject.id
          }
        })
        totalStagesCreated++
      }

      console.log(`      ✅ Created ${completedStages.length} stages\n`)

      // PROJECT 3: PLANNED PROJECT
      console.log('   📂 Creating Planned Project...')

      // Create Projects record first (generic project table)
      const plannedGenericProject = await prisma.projects.create({
        data: {
          name: 'Commercial Retail Space',
          description: '10,000 sq ft retail space in shopping center',
          projectTypeId: projectTypes['Commercial Construction'].id,
          businessType: 'construction',
          status: 'planned',
          budget: 450000,
          startDate: getDaysFromNow(30),
          endDate: getDaysFromNow(210),
          createdBy: adminUser.id
        }
      })

      // Create ConstructionProjects record (construction-specific table)
      const plannedProject = await prisma.constructionProjects.create({
        data: {
          name: 'Commercial Retail Space',
          description: '10,000 sq ft retail space in shopping center',
          status: 'planned',
          budget: 450000,
          startDate: getDaysFromNow(30),
          endDate: getDaysFromNow(210),
          projectTypeId: projectTypes['Commercial Construction'].id,
          createdBy: adminUser.id
        }
      })

      console.log(`      ✅ Created: ${plannedProject.name}`)
      console.log(`         Budget: $${Number(plannedProject.budget).toLocaleString()}`)
      console.log(`         Status: ${plannedProject.status}`)
      totalProjectsCreated++

      // Create stages for planned project (all pending)
      const plannedStages = [
        {
          name: 'Site Preparation',
          description: 'Site clearing and preparation',
          status: 'pending',
          estimatedAmount: 40000,
          startDate: getDaysFromNow(30),
          endDate: getDaysFromNow(50),
          orderIndex: 1
        },
        {
          name: 'Foundation & Structure',
          description: 'Commercial-grade foundation and steel framing',
          status: 'pending',
          estimatedAmount: 150000,
          startDate: getDaysFromNow(51),
          endDate: getDaysFromNow(100),
          orderIndex: 2
        },
        {
          name: 'Building Systems',
          description: 'Commercial electrical, plumbing, and HVAC',
          status: 'pending',
          estimatedAmount: 120000,
          startDate: getDaysFromNow(101),
          endDate: getDaysFromNow(150),
          orderIndex: 3
        },
        {
          name: 'Interior Build-Out',
          description: 'Retail space finishing and fixtures',
          status: 'pending',
          estimatedAmount: 140000,
          startDate: getDaysFromNow(151),
          endDate: getDaysFromNow(210),
          orderIndex: 4
        }
      ]

      for (const stageData of plannedStages) {
        await prisma.projectStages.create({
          data: {
            ...stageData,
            projectId: plannedGenericProject.id,
            constructionProjectId: plannedProject.id
          }
        })
        totalStagesCreated++
      }

      console.log(`      ✅ Created ${plannedStages.length} stages\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    ✅ Construction Projects Demo Seeding Complete!        ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    console.log('\n📊 Summary:')
    console.log(`   Project Types: ${Object.keys(projectTypes).length} (${projectTypesCreated} new)`)
    console.log(`   Contractors: ${contractors.length} (${contractorsCreated} new)`)
    console.log(`   Projects Created: ${totalProjectsCreated}`)
    console.log(`   Total Stages: ${totalStagesCreated}`)
    console.log(`   Total Transactions: ${totalTransactionsCreated}`)

    // Get all projects summary
    const allProjects = await prisma.constructionProjects.findMany({
      include: {
        _count: {
          select: { project_stages: true }
        }
      }
    })

    console.log('\n🏗️  All Construction Projects:')
    for (const project of allProjects) {
      console.log(`   - ${project.name}`)
      console.log(`     Status: ${project.status.toUpperCase()}`)
      console.log(`     Budget: $${Number(project.budget || 0).toLocaleString()}`)
      console.log(`     Stages: ${project._count.project_stages}`)
    }

    console.log('\n👷 Contractors:')
    contractors.slice(0, 5).forEach(c => {
      console.log(`   - ${c.fullName}`)
    })
    if (contractors.length > 5) {
      console.log(`   ... and ${contractors.length - 5} more`)
    }

    console.log('\n🧪 Testing:')
    console.log('   - View construction projects dashboard')
    console.log('   - Check project stages and progress')
    console.log('   - Review contractor assignments')
    console.log('   - View project transactions')
    console.log('   - Test project status updates')

  } catch (error) {
    console.error('❌ Error seeding construction projects demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedConstructionProjects()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
