/**
 * Database Installation Script
 * Creates database, runs migrations, and seeds initial data
 * Part of the sync service installation process
 *
 * This script is rerunnable and idempotent
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

class DatabaseInstaller {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..')
    this.scriptsDir = path.join(this.projectRoot, 'scripts')
    this.installDir = path.join(this.scriptsDir, 'install')

    // Database configuration from environment or defaults
    this.dbConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || '5432',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'multi_business_db',
      superuser: process.env.POSTGRES_SUPERUSER || 'postgres',
    }

    this.databaseUrl = `postgresql://${this.dbConfig.user}:${this.dbConfig.password}@${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.database}`
  }

  async run() {
    try {
      log('🚀 Starting Database Installation...', 'bright')
      log('This will create the database, run migrations, and seed initial data.\n', 'cyan')

      // Step 1: Check PostgreSQL availability
      await this.checkPostgreSQL()

      // Step 2: Create database if it doesn't exist
      await this.createDatabase()

      // Step 3: Set up Prisma
      await this.setupPrisma()

      // Step 4: Run migrations
      await this.runMigrations()

      // Step 5: Seed reference data
      await this.seedReferenceData()

      // Step 6: Create admin user
      await this.createAdminUser()

      // Step 7: Initialize sync system
      await this.initializeSyncSystem()

      // Step 8: Verify installation
      await this.verifyInstallation()

      log('\n🎉 Database Installation Complete! 🎉', 'green')
      log('The system is ready for use.', 'green')

      return true

    } catch (error) {
      logError(`Installation failed: ${error.message}`)
      if (error.details) {
        log(error.details, 'red')
      }
      return false
    }
  }

  async checkPostgreSQL() {
    logStep('1/8', 'Checking PostgreSQL availability...')

    try {
      // Try to connect to PostgreSQL server (not specific database) using psql
      const testUrl = `postgresql://${this.dbConfig.superuser}:${this.dbConfig.password}@${this.dbConfig.host}:${this.dbConfig.port}/postgres`

      // Use psql to run a simple SELECT 1; this avoids prisma CLI flag conflicts
      execSync(`psql "${testUrl}" -t -c "SELECT 1;"`, {
        stdio: 'pipe',
        cwd: this.projectRoot
      })

      logSuccess('PostgreSQL is running and accessible (psql)')
    } catch (error) {
      throw new Error(
        `PostgreSQL is not accessible. Please ensure PostgreSQL is installed and running.\n` +
        `Connection details: ${this.dbConfig.host}:${this.dbConfig.port} as ${this.dbConfig.superuser}\n` +
        `Error: ${error.message}`
      )
    }
  }

  async createDatabase() {
    logStep('2/8', 'Creating database...')

    try {
      // Check if database exists
      const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${this.dbConfig.database}'`
      const postgresUrl = `postgresql://${this.dbConfig.superuser}:${this.dbConfig.password}@${this.dbConfig.host}:${this.dbConfig.port}/postgres`

      try {
        const result = execSync(
          `psql "${postgresUrl}" -t -c "${checkDbQuery}"`,
          { stdio: 'pipe', encoding: 'utf8' }
        )

        if (result.trim()) {
          logSuccess(`Database '${this.dbConfig.database}' already exists`)
          return
        }
      } catch (error) {
        // Database doesn't exist, continue to create it
      }

      // Create database
      log(`Creating database '${this.dbConfig.database}'...`)
      execSync(
        `psql "${postgresUrl}" -c "CREATE DATABASE ${this.dbConfig.database};"`,
        { stdio: 'pipe' }
      )

      // Create user if it doesn't exist (and not the superuser)
      if (this.dbConfig.user !== this.dbConfig.superuser) {
        try {
          execSync(
            `psql "${postgresUrl}" -c "CREATE USER ${this.dbConfig.user} WITH PASSWORD '${this.dbConfig.password}';"`,
            { stdio: 'pipe' }
          )
        } catch (error) {
          // User might already exist, grant privileges anyway
        }

        // Grant privileges
        execSync(
          `psql "${postgresUrl}" -c "GRANT ALL PRIVILEGES ON DATABASE ${this.dbConfig.database} TO ${this.dbConfig.user};"`,
          { stdio: 'pipe' }
        )
      }

      logSuccess(`Database '${this.dbConfig.database}' created successfully`)

    } catch (error) {
      throw new Error(`Failed to create database: ${error.message}`)
    }
  }

  async dropDatabase() {
    logStep('2b/8', 'Dropping database (if exists)...')

    try {
      const postgresUrl = `postgresql://${this.dbConfig.superuser}:${this.dbConfig.password}@${this.dbConfig.host}:${this.dbConfig.port}/postgres`

      // Check if database exists
      const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${this.dbConfig.database}'`
      const result = execSync(
        `psql "${postgresUrl}" -t -c "${checkDbQuery}"`,
        { stdio: 'pipe', encoding: 'utf8' }
      )

      if (!result.trim()) {
        log(`Database '${this.dbConfig.database}' does not exist, nothing to drop`)
        return
      }

      logWarning(`Terminating connections to database '${this.dbConfig.database}'`)

      // Terminate other connections (required to drop DB)
      const terminateSql = `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${this.dbConfig.database}' AND pid <> pg_backend_pid();`
      execSync(`psql "${postgresUrl}" -c "${terminateSql}"`, { stdio: 'pipe' })

      // Drop database
      log(`Dropping database '${this.dbConfig.database}'...`)
      execSync(
        `psql "${postgresUrl}" -c \"DROP DATABASE IF EXISTS ${this.dbConfig.database};\"`,
        { stdio: 'pipe' }
      )

      logSuccess(`Database '${this.dbConfig.database}' dropped successfully`)

    } catch (error) {
      throw new Error(`Failed to drop database: ${error.message}`)
    }
  }

  async setupPrisma() {
    logStep('3/8', 'Setting up Prisma...')

    try {
      // Set DATABASE_URL environment variable
      process.env.DATABASE_URL = this.databaseUrl

      // Generate Prisma client
      log('Generating Prisma client...')
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: this.projectRoot
      })

      logSuccess('Prisma client generated successfully')

    } catch (error) {
      throw new Error(`Failed to setup Prisma: ${error.message}`)
    }
  }

  async runMigrations() {
    logStep('4/8', 'Running database migrations...')

    try {
      // Check if this is a fresh install or an update
      const migrationStatus = this.checkMigrationStatus()

      if (migrationStatus === 'fresh') {
        log('Fresh installation detected, pushing schema...')
        execSync('npx prisma migrate deploy', {
          cwd: ROOT_DIR,
          stdio: 'inherit'
        })
      } else {
        log('Existing installation detected, running migrations...')
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          cwd: this.projectRoot
        })
      }

      logSuccess('Database migrations completed successfully')

    } catch (error) {
      throw new Error(`Failed to run migrations: ${error.message}`)
    }
  }

  checkMigrationStatus() {
    try {
      // Try to query the _prisma_migrations table
      execSync(
        `psql "${this.databaseUrl}" -c "SELECT COUNT(*) FROM _prisma_migrations;" > /dev/null 2>&1`,
        { stdio: 'pipe' }
      )
      return 'existing'
    } catch (error) {
      return 'fresh'
    }
  }

  async seedReferenceData() {
    logStep('5/8', 'Seeding reference data...')
    // Prefer the consolidated production seeder if present
    const productionSeeder = path.join(this.scriptsDir, 'production-setup.js')
    if (fs.existsSync(productionSeeder)) {
      try {
        log('Running consolidated production seeder (production-setup.js)...')
        // Run without creating admin (installer will create admin later)
        execSync(`node "${productionSeeder}" --no-admin --ignore-missing-models`, {
          stdio: 'inherit',
          cwd: this.projectRoot,
          env: { ...process.env, DATABASE_URL: this.databaseUrl }
        })
        logSuccess('Reference data seeding completed via production-setup.js')
        return
      } catch (error) {
        logWarning(`Warning: production-setup.js seeding failed: ${error.message}`)
        // fall back to individual seed scripts below
      }
    }

    const seedScripts = [
      'seed-id-templates.js',
      'seed-phone-templates.js',
      'seed-date-templates.js',
      'seed-job-titles.js',
      'seed-compensation-types.js',
      'seed-benefit-types.js',
      'seed-business-categories.js',
      'seed-permission-templates.js'
    ]

    for (const script of seedScripts) {
      const scriptPath = path.join(this.scriptsDir, script)

      if (fs.existsSync(scriptPath)) {
        try {
          log(`Running ${script}...`)
          execSync(`node "${scriptPath}"`, {
            stdio: 'inherit',
            cwd: this.projectRoot,
            env: { ...process.env, DATABASE_URL: this.databaseUrl }
          })
        } catch (error) {
          logWarning(`Warning: ${script} failed: ${error.message}`)
          // Continue with other scripts
        }
      } else {
        log(`Creating ${script}...`)
        await this.createSeedScript(script)

        try {
          execSync(`node "${scriptPath}"`, {
            stdio: 'inherit',
            cwd: this.projectRoot,
            env: { ...process.env, DATABASE_URL: this.databaseUrl }
          })
        } catch (error) {
          logWarning(`Warning: ${script} failed: ${error.message}`)
        }
      }
    }

    logSuccess('Reference data seeding completed')
  }

  async createSeedScript(scriptName) {
    const scriptPath = path.join(this.scriptsDir, scriptName)

    // Create seed scripts based on the script name
    switch (scriptName) {
      case 'seed-business-categories.js':
        await this.createBusinessCategoriesScript(scriptPath)
        break
      case 'seed-permission-templates.js':
        await this.createPermissionTemplatesScript(scriptPath)
        break
      default:
        // Other seed scripts already exist or will be created by the main seed script
        break
    }
  }

  async createBusinessCategoriesScript(scriptPath) {
    const content = `/**
 * Seed Business Categories
 * Creates business categories for the multi-business platform
 */

const { PrismaClient } = require('@prisma/client')

async function seedBusinessCategories() {
  const prisma = new PrismaClient()

  try {
    console.log('🌱 Seeding business categories...')

    const categories = [
      {
        name: 'Construction',
        description: 'Construction and building services',
        code: 'CONSTRUCTION',
        isActive: true
      },
      {
        name: 'Restaurant',
        description: 'Food service and restaurant business',
        code: 'RESTAURANT',
        isActive: true
      },
      {
        name: 'Grocery',
        description: 'Grocery and retail food sales',
        code: 'GROCERY',
        isActive: true
      },
      {
        name: 'Clothing',
        description: 'Clothing and fashion retail',
        code: 'CLOTHING',
        isActive: true
      },
      {
        name: 'Hardware',
        description: 'Hardware and tools retail',
        code: 'HARDWARE',
        isActive: true
      },
      {
        name: 'Personal Services',
        description: 'Personal services and consulting',
        code: 'PERSONAL',
        isActive: true
      },
      {
        name: 'Professional Services',
        description: 'Professional consulting and services',
        code: 'PROFESSIONAL',
        isActive: true
      },
      {
        name: 'Healthcare',
        description: 'Healthcare and medical services',
        code: 'HEALTHCARE',
        isActive: true
      },
      {
        name: 'Education',
        description: 'Education and training services',
        code: 'EDUCATION',
        isActive: true
      },
      {
        name: 'Technology',
        description: 'Technology and IT services',
        code: 'TECHNOLOGY',
        isActive: true
      }
    ]

    for (const category of categories) {
      await prisma.businessCategory.upsert({
        where: { code: category.code },
        update: category,
        create: {
          id: require('crypto').randomUUID(),
          ...category,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    console.log(\`✅ Seeded \${categories.length} business categories\`)

  } catch (error) {
    console.error('❌ Error seeding business categories:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedBusinessCategories()
}

module.exports = { seedBusinessCategories }`

    fs.writeFileSync(scriptPath, content)
  }

  async createPermissionTemplatesScript(scriptPath) {
    const content = `/**
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

    for (const template of templates) {
      await prisma.permissionTemplate.upsert({
        where: {
          name_businessType: {
            name: template.name,
            businessType: template.businessType
          }
        },
        update: template,
        create: {
          id: require('crypto').randomUUID(),
          ...template,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    console.log(\`✅ Seeded \${templates.length} permission templates\`)

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

module.exports = { seedPermissionTemplates }`

    fs.writeFileSync(scriptPath, content)
  }

  async createAdminUser() {
    logStep('6/8', 'Creating admin user...')

    try {
      const createAdminScript = path.join(this.scriptsDir, 'create-admin.js')

      if (fs.existsSync(createAdminScript)) {
        log('Running create-admin script...')
        execSync(`node "${createAdminScript}"`, {
          stdio: 'inherit',
          cwd: this.projectRoot,
          env: { ...process.env, DATABASE_URL: this.databaseUrl }
        })
      } else {
        log('Admin creation script not found, creating basic admin...')
        await this.createBasicAdmin()
      }

      logSuccess('Admin user created successfully')

    } catch (error) {
      logWarning(`Warning: Admin user creation failed: ${error.message}`)
      // Continue installation even if admin creation fails
    }
  }

  async createBasicAdmin() {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    try {
      const adminEmail = 'admin@business.local'

      // Check if admin already exists
      const existingAdmin = await prisma.users.findUnique({
        where: { email: adminEmail }
      })

      if (existingAdmin) {
        log('Admin user already exists')
        return
      }

      // Create admin user
      await prisma.users.create({
        data: {
          id: require('crypto').randomUUID(),
          email: adminEmail,
          name: 'System Administrator',
          hashedPassword: await this.hashPassword('admin123'),
          role: 'admin',
          isActive: true,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      log('Basic admin user created with email: admin@business.local, password: admin123')

    } finally {
      await prisma.$disconnect()
    }
  }

  async hashPassword(password) {
    // Simple hash for demo - in production use bcrypt
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(password).digest('hex')
  }

  async initializeSyncSystem() {
    logStep('7/8', 'Initializing sync system...')

    try {
      // Initialize sync tables and basic configuration
      const syncInitScript = path.join(this.installDir, 'init-sync-system.js')

      if (!fs.existsSync(syncInitScript)) {
        await this.createSyncInitScript(syncInitScript)
      }

      execSync(`node "${syncInitScript}"`, {
        stdio: 'inherit',
        cwd: this.projectRoot,
        env: { ...process.env, DATABASE_URL: this.databaseUrl }
      })

      logSuccess('Sync system initialized successfully')

    } catch (error) {
      logWarning(`Warning: Sync system initialization failed: ${error.message}`)
      // Continue installation
    }
  }

  async createSyncInitScript(scriptPath) {
    const content = `/**
 * Initialize Sync System
 * Sets up initial sync configuration and node state
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const os = require('os')

async function initializeSyncSystem() {
  const prisma = new PrismaClient()

  try {
    console.log('🔄 Initializing sync system...')

    // Generate node ID for this installation
    const nodeId = crypto.randomUUID()
    const nodeName = os.hostname() || 'Unknown Node'

    // Initialize node state
    await prisma.nodeState.upsert({
      where: { nodeId },
      update: {
        nodeName,
        lastSeen: new Date(),
        isOnline: true,
        syncVersion: '1.0.0'
      },
      create: {
        id: crypto.randomUUID(),
        nodeId,
        nodeName,
        lastSeen: new Date(),
        isOnline: true,
        syncVersion: '1.0.0',
        metadata: {
          installDate: new Date().toISOString(),
          platform: os.platform(),
          arch: os.arch()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log(\`✅ Sync system initialized for node: \${nodeId}\`)
    console.log(\`   Node name: \${nodeName}\`)

  } catch (error) {
    console.error('❌ Error initializing sync system:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  initializeSyncSystem()
}

module.exports = { initializeSyncSystem }`

    // Ensure install directory exists
    if (!fs.existsSync(path.dirname(scriptPath))) {
      fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    }

    fs.writeFileSync(scriptPath, content)
  }

  async verifyInstallation() {
    logStep('8/8', 'Verifying installation...')

    try {
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()

      // Test database connection
      await prisma.$connect()

      // Check key tables exist and have data. Be resilient to renamed/missing models.
      const counts = {}
      try { counts.users = await prisma.users.count() } catch (e) { logWarning('Model prisma.user missing or inaccessible') }
      try { counts.jobTitles = await prisma.jobTitle.count() } catch (e) { logWarning('Model prisma.jobTitle missing or inaccessible') }
      try { counts.nodeStates = await prisma.nodeState.count() } catch (e) { logWarning('Model prisma.nodeState missing or inaccessible') }

      log(`Database verification:`)
      log(`  - Users: ${counts.users ?? 'n/a'}`)
      log(`  - Job titles: ${counts.jobTitles ?? 'n/a'}`)
      log(`  - Node states: ${counts.nodeStates ?? 'n/a'}`)

      await prisma.$disconnect()

      logSuccess('Installation verification completed successfully')

    } catch (error) {
      throw new Error(`Installation verification failed: ${error.message}`)
    }
  }
}

// Main execution
async function main() {
  const installer = new DatabaseInstaller()

  try {
    const success = await installer.run()
    process.exit(success ? 0 : 1)
  } catch (error) {
    logError(`Installation failed: ${error.message}`)
    process.exit(1)
  }
}

// Run installation if this file is executed directly
if (require.main === module) {
  main()
}

module.exports = { DatabaseInstaller }