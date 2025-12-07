/**
 * Seed Permission Templates
 * Creates permission templates for different business types and roles
 */

const { PrismaClient } = require('@prisma/client')

async function seedPermissionTemplates() {
  const prisma = new PrismaClient()

  try {
    console.log('🌱 Seeding permission templates...')

    const templates = [
      {
        name: 'Construction Manager',
        businessType: 'construction',
        description: 'Full access to construction business operations',
        permissions: {
          construction: {
            projects: ['read', 'write', 'delete'],
            contractors: ['read', 'write'],
            materials: ['read', 'write'],
            equipment: ['read', 'write'],
            reports: ['read', 'write']
          },
          employees: ['read', 'write'],
          reports: ['read', 'write'],
          settings: ['read']
        },
        isActive: true
      },
      {
        name: 'Construction Worker',
        businessType: 'construction',
        description: 'Basic construction operations access',
        permissions: {
          construction: {
            projects: ['read'],
            contractors: ['read'],
            materials: ['read'],
            equipment: ['read']
          },
          employees: ['read'],
          reports: ['read']
        },
        isActive: true
      },
      {
        name: 'Restaurant Manager',
        businessType: 'restaurant',
        description: 'Full access to restaurant operations',
        permissions: {
          restaurant: {
            menu: ['read', 'write', 'delete'],
            orders: ['read', 'write', 'delete'],
            inventory: ['read', 'write'],
            pos: ['read', 'write'],
            reports: ['read', 'write']
          },
          employees: ['read', 'write'],
          reports: ['read', 'write'],
          settings: ['read']
        },
        isActive: true
      },
      {
        name: 'Restaurant Staff',
        businessType: 'restaurant',
        description: 'Basic restaurant operations access',
        permissions: {
          restaurant: {
            menu: ['read'],
            orders: ['read', 'write'],
            pos: ['read', 'write'],
            inventory: ['read']
          },
          employees: ['read']
        },
        isActive: true
      },
      {
        name: 'Store Manager',
        businessType: 'grocery',
        description: 'Full access to grocery store operations',
        permissions: {
          grocery: {
            inventory: ['read', 'write', 'delete'],
            pos: ['read', 'write'],
            suppliers: ['read', 'write'],
            produce: ['read', 'write'],
            reports: ['read', 'write']
          },
          employees: ['read', 'write'],
          reports: ['read', 'write'],
          settings: ['read']
        },
        isActive: true
      },
      {
        name: 'Cashier',
        businessType: 'grocery',
        description: 'POS and basic inventory access',
        permissions: {
          grocery: {
            inventory: ['read'],
            pos: ['read', 'write']
          }
        },
        isActive: true
      },
      {
        name: 'Clothing Store Manager',
        businessType: 'clothing',
        description: 'Full access to clothing store operations',
        permissions: {
          clothing: {
            inventory: ['read', 'write', 'delete'],
            pos: ['read', 'write'],
            customers: ['read', 'write'],
            suppliers: ['read', 'write'],
            products: ['read', 'write', 'delete']
          },
          employees: ['read', 'write'],
          reports: ['read', 'write'],
          settings: ['read']
        },
        isActive: true
      },
      {
        name: 'Sales Associate',
        businessType: 'clothing',
        description: 'Sales and customer service access',
        permissions: {
          clothing: {
            inventory: ['read'],
            pos: ['read', 'write'],
            customers: ['read', 'write'],
            products: ['read']
          }
        },
        isActive: true
      },
      {
        name: 'System Administrator',
        businessType: 'all',
        description: 'Full system administration access',
        permissions: {
          admin: ['read', 'write', 'delete'],
          users: ['read', 'write', 'delete'],
          businesses: ['read', 'write', 'delete'],
          settings: ['read', 'write', 'delete'],
          reports: ['read', 'write'],
          sync: ['read', 'write', 'delete']
        },
        isActive: true
      }
    ]

    // PermissionTemplate model does not expose a compound unique for (name, businessType).
    // Use findFirst by natural key then update/create accordingly. Use a default admin user as createdBy
    let adminUser = await prisma.users.findFirst({ where: { email: 'admin@business.local' } })
    if (!adminUser) {
      // create a minimal system admin for ownership of templates
      // Use fixed ID for consistency across all fresh installs
      adminUser = await prisma.users.create({
        data: {
          id: 'admin-system-user-default',  // Fixed ID for system admin
          email: 'admin@business.local',
          name: 'System Administrator',
          passwordHash: require('crypto').createHash('sha256').update('admin123').digest('hex'),
          role: 'admin',
          isActive: true,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('ℹ️  Created default admin user for permission templates:', adminUser.id)
    }

    for (const template of templates) {
      const existing = await prisma.permissionTemplate.findFirst({ where: { name: template.name, businessType: template.businessType } })
      if (existing) {
        await prisma.permissionTemplate.update({ where: { id: existing.id }, data: { ...template, updatedAt: new Date() } })
      } else {
        await prisma.permissionTemplate.create({
          data: {
            id: require('crypto').randomUUID(),
            ...template,
            createdBy: adminUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
    }

    console.log(`✅ Seeded ${templates.length} permission templates`)

  } catch (error) {
    console.error('❌ Error seeding permission templates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedPermissionTemplates()
}

module.exports = { seedPermissionTemplates }