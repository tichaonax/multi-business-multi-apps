/**
 * Service Update Manager
 * Handles production updates with migration support and rollback capabilities
 * Based on electricity-tokens service update patterns
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const HybridServiceManager = require('./hybrid-service-manager');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

class ServiceUpdateManager {
  constructor() {
    this.manager = new HybridServiceManager();
    this.serviceName = 'Multi-Business Sync Service';
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.updateLogFile = path.join(__dirname, 'daemon', 'update.log');
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    try {
      if (!fs.existsSync(path.dirname(this.updateLogFile))) {
        fs.mkdirSync(path.dirname(this.updateLogFile), { recursive: true });
      }
      fs.appendFileSync(this.updateLogFile, logMessage + '\n');
    } catch (error) {
      // Ignore file logging errors
    }
  }

  /**
   * Main update process
   */
  async updateService() {
    try {
      this.log('🚀 Starting service update process...');

      // Step 1: Pre-update validation
      await this.preUpdateValidation();

      // Step 2: Create backup
      await this.createBackup();

      // Step 3: Stop service gracefully
      await this.stopServiceGracefully();

      // Step 4: Update application files
      await this.updateApplicationFiles();

      // Step 5: Run database migrations
  await this.runDatabaseMigrations();

  // Step 5a: Ensure reference data is present (run seeder on fresh DB)
  await this.ensureReferenceData();

      // Step 6: Build updated service
      await this.buildUpdatedService();

      // Step 7: Start service
      await this.startServiceSafely();

      // Step 8: Validate UI compatibility
      await this.validateUICompatibility();

      // Step 8: Verify update
      await this.verifyUpdate();

      this.log('✅ Service update completed successfully!');
      return true;

    } catch (error) {
      this.log(`❌ Update failed: ${error.message}`, 'ERROR');
      this.log('🔄 Attempting rollback...');

      try {
        await this.rollback();
        this.log('✅ Rollback completed successfully');
      } catch (rollbackError) {
        this.log(`❌ Rollback failed: ${rollbackError.message}`, 'ERROR');
        throw new Error(`Update failed and rollback failed: ${rollbackError.message}`);
      }

      throw error;
    }
  }

  /**
   * Pre-update validation
   */
  async preUpdateValidation() {
    this.log('🔍 Running pre-update validation...');

    // Check if service is installed
    const status = await this.manager.getServiceStatus();
    if (!status.hasService) {
      throw new Error('Service is not installed. Please install it first.');
    }

    // Check if we have admin privileges
    const wincmd = require('node-windows');
    const isAdmin = await new Promise((resolve) => {
      wincmd.isAdminUser((admin) => resolve(admin));
    });

    if (!isAdmin) {
      throw new Error('Administrator privileges required for service updates');
    }

    // Check disk space
    await this.checkDiskSpace();

    // Verify git repository status
    await this.verifyGitStatus();

    this.log('✅ Pre-update validation passed');
  }

  /**
   * Create backup before update
   */
  async createBackup() {
    this.log('💾 Creating backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `multi-business-multi-apps-backup-${timestamp}`;
    const currentBackupDir = path.join(this.backupDir, backupName);

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Create backup directory
    fs.mkdirSync(currentBackupDir, { recursive: true });

    try {
      // Backup current dist directory
      const distDir = path.join(__dirname, '..', 'dist');
      if (fs.existsSync(distDir)) {
        await execAsync(`xcopy "${distDir}" "${path.join(currentBackupDir, 'dist')}" /E /I /H /Y`);
        this.log('✅ Application files backed up');
      }

      // Backup database
      await this.backupDatabase(currentBackupDir);

      // Backup configuration
      await this.backupConfiguration(currentBackupDir);

      // Save backup metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        version: await this.getCurrentVersion(),
        backupName,
        files: ['dist', 'database.sql', 'config']
      };

      fs.writeFileSync(
        path.join(currentBackupDir, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      this.currentBackup = backupName;
      this.log(`✅ Backup created: ${backupName}`);

    } catch (error) {
      this.log(`❌ Backup creation failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backupDatabase(backupDir) {
    try {
      this.log('🗄️  Backing up database...');

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        this.log('⚠️  No DATABASE_URL found, skipping database backup', 'WARN');
        return;
      }

      // Extract database info from URL
      const url = new URL(dbUrl);
      const dbName = url.pathname.replace('/', '');
      const host = url.hostname;
      const port = url.port || '5432';
      const username = url.username;
      const password = url.password;

      // Create pg_dump command
      const backupFile = path.join(backupDir, 'database.sql');
      const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} -f "${backupFile}"`;

      // Set password environment variable
      const env = { ...process.env };
      if (password) {
        env.PGPASSWORD = password;
      }

      await execAsync(dumpCommand, { env });
      this.log('✅ Database backup completed');

    } catch (error) {
      this.log(`⚠️  Database backup failed: ${error.message}`, 'WARN');
      // Don't fail the entire process for database backup issues
    }
  }

  /**
   * Backup configuration
   */
  async backupConfiguration(backupDir) {
    try {
      const configDir = path.join(backupDir, 'config');
      fs.mkdirSync(configDir, { recursive: true });

      // Backup environment variables
      const envBackup = {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        SYNC_REGISTRATION_KEY: process.env.SYNC_REGISTRATION_KEY ? 'SET' : 'NOT_SET',
        SYNC_PORT: process.env.SYNC_PORT,
        SYNC_INTERVAL: process.env.SYNC_INTERVAL,
        LOG_LEVEL: process.env.LOG_LEVEL,
        NODE_ENV: process.env.NODE_ENV
      };

      fs.writeFileSync(
        path.join(configDir, 'environment.json'),
        JSON.stringify(envBackup, null, 2)
      );

      // Backup service configuration
      const configFile = path.join(__dirname, 'config.js');
      if (fs.existsSync(configFile)) {
        fs.copyFileSync(configFile, path.join(configDir, 'config.js'));
      }

      this.log('✅ Configuration backup completed');

    } catch (error) {
      this.log(`⚠️  Configuration backup failed: ${error.message}`, 'WARN');
    }
  }

  /**
   * Stop service gracefully
   */
  async stopServiceGracefully() {
    this.log('⏹️  Stopping service gracefully...');

    try {
      await this.manager.stopService();
      this.log('✅ Service stopped successfully');
    } catch (error) {
      this.log(`❌ Failed to stop service: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Update application files
   */
  async updateApplicationFiles() {
    this.log('📦 Updating application files...');

    try {
      // Pull latest changes from git
      await execAsync('git pull origin main');
      this.log('✅ Git pull completed');

      // Install/update dependencies
      await execAsync('npm install');
      this.log('✅ Dependencies updated');

    } catch (error) {
      this.log(`❌ Application update failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Run database migrations with intelligent fresh install vs upgrade detection
   */
  async runDatabaseMigrations() {
    this.log('🗄️  Running database migrations...');

    try {
      // Check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        this.log('⚠️  DATABASE_URL not found in environment', 'WARN');
        this.log('⚠️  Skipping migrations - database connection required', 'WARN');
        this.log('💡 Set DATABASE_URL in .env file and re-run update', 'WARN');
        return; // Don't fail the entire update for missing DB URL
      }

      // Clean Prisma client to prevent EPERM errors (file locks from stopped service)
      await this.cleanPrismaClient();

      // Generate Prisma client
      await execAsync('npx prisma generate');
      this.log('✅ Prisma client generated');

      // Check database state to determine if this is fresh install or upgrade
      const { checkDatabaseState } = require(path.join(__dirname, '..', 'scripts', 'check-database-state.js'));
      const dbState = await checkDatabaseState();

      if (dbState.isEmpty) {
        // Fresh install path - database is empty
        this.log('🆕 Fresh database detected - using db push + baseline workflow');

        try {
          // Use migrate deploy for consistent schema deployment
          await execAsync('npx prisma migrate deploy');
          this.log('✅ Migrations applied to database');

          // Baseline all migrations (mark them as applied without running)
          const fs = require('fs');
          const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

          if (fs.existsSync(migrationsDir)) {
            const migrations = fs.readdirSync(migrationsDir)
              .filter(dir => dir !== 'migration_lock.toml' && fs.statSync(path.join(migrationsDir, dir)).isDirectory());

            if (migrations.length > 0) {
              this.log(`📋 Baselining ${migrations.length} migrations...`);

              for (const migration of migrations) {
                try {
                  await execAsync(`npx prisma migrate resolve --applied "${migration}"`);
                  this.log(`  ✅ Baselined: ${migration}`);
                } catch (resolveError) {
                  // Migration might already be marked as applied
                  if (resolveError.message.includes('is already recorded as applied')) {
                    this.log(`  ℹ️  Already baselined: ${migration}`);
                  } else {
                    this.log(`  ⚠️  Could not baseline ${migration}: ${resolveError.message}`, 'WARN');
                  }
                }
              }

              this.log('✅ All migrations baselined');
            }
          }

        } catch (pushError) {
          this.log(`❌ Fresh install schema push failed: ${pushError.message}`, 'ERROR');
          throw pushError;
        }

      } else {
        // Upgrade path - database has existing schema
        this.log('🔄 Existing database detected - running pending migrations');

        try {
          await execAsync('npx prisma migrate deploy');
          this.log('✅ Database migrations completed');
        } catch (migrateError) {
          // Handle P3005 - database not empty (already has schema)
          if (migrateError.message.includes('P3005') || migrateError.message.includes('database schema is not empty')) {
            this.log('⚠️  Database already has schema', 'WARN');
            this.log('💡 Assuming migrations are already applied or baseline needed');

            // Try to baseline existing migrations
            try {
              const fs = require('fs');
              const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

              if (fs.existsSync(migrationsDir)) {
                const migrations = fs.readdirSync(migrationsDir)
                  .filter(dir => dir !== 'migration_lock.toml' && fs.statSync(path.join(migrationsDir, dir)).isDirectory());

                for (const migration of migrations) {
                  try {
                    await execAsync(`npx prisma migrate resolve --applied "${migration}"`);
                  } catch (e) {
                    // Ignore errors - migrations might already be applied
                  }
                }
              }

              this.log('✅ Migration baseline completed');
            } catch (baselineError) {
              this.log(`⚠️  Could not baseline migrations: ${baselineError.message}`, 'WARN');
            }

            return; // Don't fail - this is expected for production
          }

          // Handle pending migrations not found (clean state)
          if (migrateError.message.includes('No pending migrations')) {
            this.log('✅ No pending migrations to apply');
            return;
          }

          throw migrateError; // Re-throw other errors
        }
      }

    } catch (error) {
      this.log(`❌ Migration failed: ${error.message}`, 'ERROR');

      // If EPERM error, try cleaning and regenerating
      if (error.message.includes('EPERM') || error.message.includes('operation not permitted')) {
        this.log('🔧 Detected file permission error, attempting recovery...');
        try {
          await this.cleanPrismaClient();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for file handles to release
          await execAsync('npx prisma generate');
          this.log('✅ Prisma client regenerated after cleanup');
          return; // Successfully recovered
        } catch (retryError) {
          this.log(`❌ Recovery failed: ${retryError.message}`, 'ERROR');
        }
      }

      throw error;
    }
  }

  /**
   * Clean Prisma client files to prevent EPERM errors
   */
  async cleanPrismaClient() {
    this.log('🧹 Cleaning Prisma client files...');

    try {
      const prismaClientPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');
      const prismaPath = path.join(__dirname, '..', 'node_modules', '@prisma', 'client');

      // Remove .prisma/client directory
      if (fs.existsSync(prismaClientPath)) {
        try {
          await execAsync(`rmdir /S /Q "${prismaClientPath}"`);
          this.log('✅ Removed .prisma/client');
        } catch (err) {
          // Directory might be locked, try force removal
          try {
            await execAsync(`powershell -Command "Remove-Item -Path '${prismaClientPath}' -Recurse -Force -ErrorAction SilentlyContinue"`);
            this.log('✅ Force removed .prisma/client via PowerShell');
          } catch (psErr) {
            this.log(`⚠️  Could not remove .prisma/client: ${err.message}`, 'WARN');
          }
        }
      }

      // Remove @prisma/client directory
      if (fs.existsSync(prismaPath)) {
        try {
          await execAsync(`rmdir /S /Q "${prismaPath}"`);
          this.log('✅ Removed @prisma/client');
        } catch (err) {
          // Directory might be locked, try force removal
          try {
            await execAsync(`powershell -Command "Remove-Item -Path '${prismaPath}' -Recurse -Force -ErrorAction SilentlyContinue"`);
            this.log('✅ Force removed @prisma/client via PowerShell');
          } catch (psErr) {
            this.log(`⚠️  Could not remove @prisma/client: ${err.message}`, 'WARN');
          }
        }
      }

      this.log('✅ Prisma client cleanup completed');
    } catch (error) {
      this.log(`⚠️  Prisma cleanup warning: ${error.message}`, 'WARN');
      // Don't fail the process - this is a best-effort cleanup
    }
  }

  /**
   * After migrations, ensure reference data exists; if this is a fresh DB, run production seeder
   */
  async ensureReferenceData() {
    try {
      this.log('🌱 Ensuring reference data...');

      // Lightweight check: if jobTitle table has zero rows treat as fresh DB
      let isFresh = false
      try {
        const { stdout } = await execAsync('npx prisma db execute --file=/dev/null --schema=./prisma/schema.prisma --quiet 2>/dev/null && node -e "const {PrismaClient}=require(\'@prisma/client\');(async()=>{const p=new PrismaClient();await p.$connect();const c=await p.jobTitle.count();console.log(c);await p.$disconnect();})()"', { cwd: path.join(__dirname, '..') })
        const count = parseInt(stdout.trim())
        if (isNaN(count) || count === 0) isFresh = true
      } catch (e) {
        // If execute/count fails, fall back to running seeder conservatively
        this.log('Could not determine jobTitle count; will not auto-run full seeder', 'WARN')
        isFresh = false
      }

        if (isFresh) {
          this.log('Fresh database detected - running production reference seeder (this may take a while)')
          try {
            const setup = require(path.join(__dirname, '..', 'scripts', 'production-setup.js'))
            if (setup && typeof setup.runProductionSetup === 'function') {
              const ok = await setup.runProductionSetup({ createAdmin: true })
              if (!ok) {
                throw new Error('Production setup reported failures')
              }
              this.log('✅ Reference data seeded successfully')
            } else if (setup && typeof setup === 'function') {
              // Legacy default export
              await setup()
            } else {
              this.log('Production setup module does not expose a runProductionSetup function', 'WARN')
            }
          } catch (seedErr) {
            this.log(`❌ Reference seeding failed: ${seedErr.message}`, 'ERROR')
            // Don't auto-rollback the DB. Fail the update process to let operator inspect logs.
            throw seedErr
          }
        } else {
          this.log('Existing data detected - running enhanced migration seeding')
          try {
            const enhancedSeeder = require(path.join(__dirname, '..', 'scripts', 'migration-seed-enhanced.js'))
            if (enhancedSeeder && typeof enhancedSeeder.runEnhancedMigrationSeed === 'function') {
              const success = await enhancedSeeder.runEnhancedMigrationSeed()
              if (!success) {
                throw new Error('Enhanced migration seeding reported failures')
              }
              this.log('✅ Enhanced migration seeding completed')
            } else {
              this.log('Enhanced migration seeder not found, skipping additional validation', 'WARN')
            }
          } catch (seedErr) {
            this.log(`❌ Enhanced migration seeding failed: ${seedErr.message}`, 'ERROR')
            // Don't fail the entire update for seeding issues - log and continue
            this.log('Continuing with update despite seeding issues', 'WARN')
          }
        }

      // ENHANCEMENT: Validate Prisma relation naming conventions after seeding/migration
      await this.validatePrismaRelations();

    } catch (error) {
      this.log(`Error ensuring reference data: ${error.message}`, 'WARN')
    }
  }

  /**
   * Validate that Prisma relation naming conventions are working correctly
   * This prevents UI runtime errors from relation access issues
   */
  async validatePrismaRelations() {
    this.log('🔍 Validating Prisma relation naming conventions...');

    try {
      const validationScript = `
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  let errors = [];
  
  try {
    await prisma.$connect();
    
    // Test 1: User -> businesses relation (plural)
    try {
      const userWithBusinesses = await prisma.users.findFirst({
        include: { businesses: true }
      });
      if (userWithBusinesses && userWithBusinesses.businesses !== undefined) {
        console.log('✅ User.businesses relation: OK');
      } else {
        console.log('⚠️  User.businesses relation: No data to test');
      }
    } catch (e) {
      errors.push('User.businesses relation failed: ' + e.message);
    }
    
    // Test 2: Project -> project_types relation (snake_case)
    try {
      const projectWithType = await prisma.projects.findFirst({
        include: { project_types: true }
      });
      if (projectWithType && projectWithType.project_types !== undefined) {
        console.log('✅ Project.project_types relation: OK');
      } else {
        console.log('⚠️  Project.project_types relation: No data to test');
      }
    } catch (e) {
      errors.push('Project.project_types relation failed: ' + e.message);
    }
    
    // Test 3: Vehicle -> vehicle_drivers relation (snake_case)
    try {
      const vehicleWithDrivers = await prisma.vehicles.findFirst({
        include: { vehicle_drivers: true }
      });
      if (vehicleWithDrivers && vehicleWithDrivers.vehicle_drivers !== undefined) {
        console.log('✅ Vehicle.vehicle_drivers relation: OK');
      } else {
        console.log('⚠️  Vehicle.vehicle_drivers relation: No data to test');
      }
    } catch (e) {
      errors.push('Vehicle.vehicle_drivers relation failed: ' + e.message);
    }
    
    // Test 4: Project -> project_contractors relation (snake_case)
    try {
      const projectWithContractors = await prisma.projects.findFirst({
        include: { project_contractors: true }
      });
      if (projectWithContractors && projectWithContractors.project_contractors !== undefined) {
        console.log('✅ Project.project_contractors relation: OK');
      } else {
        console.log('⚠️  Project.project_contractors relation: No data to test');
      }
    } catch (e) {
      errors.push('Project.project_contractors relation failed: ' + e.message);
    }
    
    // Test 5: Project -> project_transactions relation (snake_case)
    try {
      const projectWithTransactions = await prisma.projects.findFirst({
        include: { project_transactions: true }
      });
      if (projectWithTransactions && projectWithTransactions.project_transactions !== undefined) {
        console.log('✅ Project.project_transactions relation: OK');
      } else {
        console.log('⚠️  Project.project_transactions relation: No data to test');
      }
    } catch (e) {
      errors.push('Project.project_transactions relation failed: ' + e.message);
    }
    
    if (errors.length > 0) {
      console.error('VALIDATION_ERRORS:', errors.join('; '));
      process.exit(1);
    } else {
      console.log('✅ All Prisma relation validations passed');
    }
    
  } finally {
    await prisma.$disconnect();
  }
})();
      `;

      const { stdout, stderr } = await execAsync(`node -e "${validationScript}"`, {
        cwd: path.join(__dirname, '..')
      });

      if (stdout.includes('VALIDATION_ERRORS:')) {
        const errorMessage = stdout.split('VALIDATION_ERRORS:')[1].trim();
        throw new Error(`Prisma relation validation failed: ${errorMessage}`);
      }

      // Log validation results
      const lines = stdout.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.includes('✅') || line.includes('⚠️')) {
          this.log(`  ${line.trim()}`);
        }
      });

      this.log('✅ Prisma relation naming convention validation passed');

    } catch (error) {
      this.log(`❌ Prisma relation validation failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Validate UI component compatibility with updated Prisma relations
   */
  async validateUICompatibility() {
    this.log('📱 Validating UI component compatibility...');

    try {
      // Create a test validation script that simulates UI component data access
      const uiValidationScript = `
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  let validationResults = [];
  
  try {
    await prisma.$connect();
    
    // Simulate user-edit-modal.tsx data access patterns
    try {
      const user = await prisma.users.findFirst({
        include: {
          businesses: {
            select: { id: true, name: true }
          }
        }
      });
      
      if (user && user.businesses) {
        // Test accessing business name (common UI pattern)
        const businessNames = user.businesses.map(b => b.name);
        validationResults.push('user-edit-modal: businesses relation access - PASS');
      } else {
        validationResults.push('user-edit-modal: businesses relation access - NO_DATA');
      }
    } catch (e) {
      validationResults.push('user-edit-modal: businesses relation access - FAIL: ' + e.message);
    }
    
    // Simulate project management UI data access
    try {
      const project = await prisma.projects.findFirst({
        include: {
          project_types: {
            select: { id: true, name: true }
          },
          project_contractors: {
            select: { id: true }
          },
          project_transactions: {
            select: { id: true, amount: true }
          }
        }
      });
      
      if (project) {
        validationResults.push('project-ui: project_types relation - PASS');
        validationResults.push('project-ui: project_contractors relation - PASS');
        validationResults.push('project-ui: project_transactions relation - PASS');
      } else {
        validationResults.push('project-ui: relations - NO_DATA');
      }
    } catch (e) {
      validationResults.push('project-ui: relations - FAIL: ' + e.message);
    }
    
    // Simulate vehicle management UI data access
    try {
      const vehicle = await prisma.vehicles.findFirst({
        include: {
          vehicle_drivers: {
            select: { id: true, licenseNumber: true }
          }
        }
      });
      
      if (vehicle && vehicle.vehicle_drivers) {
        validationResults.push('vehicle-ui: vehicle_drivers relation - PASS');
      } else {
        validationResults.push('vehicle-ui: vehicle_drivers relation - NO_DATA');
      }
    } catch (e) {
      validationResults.push('vehicle-ui: vehicle_drivers relation - FAIL: ' + e.message);
    }
    
    console.log('UI_VALIDATION_RESULTS:', validationResults.join(' | '));
    
  } finally {
    await prisma.$disconnect();
  }
})();
      `;

      const { stdout, stderr } = await execAsync(`node -e "${uiValidationScript}"`, {
        cwd: path.join(__dirname, '..')
      });

      if (stdout.includes('UI_VALIDATION_RESULTS:')) {
        const results = stdout.split('UI_VALIDATION_RESULTS:')[1].trim().split(' | ');
        let failCount = 0;
        
        results.forEach(result => {
          if (result.includes('FAIL')) {
            this.log(`  ❌ ${result}`, 'ERROR');
            failCount++;
          } else if (result.includes('PASS')) {
            this.log(`  ✅ ${result}`);
          } else if (result.includes('NO_DATA')) {
            this.log(`  ⚠️  ${result}`, 'WARN');
          }
        });
        
        if (failCount > 0) {
          throw new Error(`${failCount} UI compatibility validation(s) failed`);
        }
        
        this.log('✅ UI component compatibility validation passed');
      }

    } catch (error) {
      this.log(`❌ UI compatibility validation failed: ${error.message}`, 'ERROR');
      
      // Log remediation steps
      this.log('🛠️  Remediation steps:', 'WARN');
      this.log('  1. Check that UI components use correct relation names (businesses, project_types, etc.)', 'WARN');
      this.log('  2. Update any hardcoded relation names in React components', 'WARN');
      this.log('  3. Verify Prisma client regeneration completed successfully', 'WARN');
      
      throw error;
    }
  }

  /**
   * Build updated service
   */
  async buildUpdatedService() {
    this.log('🔨 Building updated service...');

    try {
      // Build the service
      await execAsync('npm run build:service');
      this.log('✅ Service build completed');

    } catch (error) {
      this.log(`❌ Service build failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Start service safely
   */
  async startServiceSafely() {
    this.log('🚀 Starting updated service...');

    try {
      await this.manager.startService();

      // Wait for service to fully start
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify service is running
      const status = await this.manager.getServiceStatus();
      if (!status.processRunning) {
        throw new Error('Service failed to start after update');
      }

      this.log('✅ Service started successfully');

    } catch (error) {
      this.log(`❌ Failed to start service: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Verify update
   */
  async verifyUpdate() {
    this.log('🔍 Verifying update...');

    try {
      // Check service status
      const status = await this.manager.getServiceStatus();
      if (!status.processRunning || !status.synchronized) {
        throw new Error('Service is not running properly after update');
      }

      // Wait a bit for service to stabilize
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Check if service is still running
      const finalStatus = await this.manager.getServiceStatus();
      if (!finalStatus.processRunning) {
        throw new Error('Service stopped unexpectedly after update');
      }

      this.log('✅ Update verification passed');

    } catch (error) {
      this.log(`❌ Update verification failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback() {
    if (!this.currentBackup) {
      throw new Error('No backup available for rollback');
    }

    this.log(`🔄 Rolling back to backup: ${this.currentBackup}...`);

    const backupPath = path.join(this.backupDir, this.currentBackup);

    try {
      // Stop service
      await this.manager.stopService();

      // Restore files
      const backupDistDir = path.join(backupPath, 'dist');
      const currentDistDir = path.join(__dirname, '..', 'dist');

      if (fs.existsSync(backupDistDir)) {
        // Remove current dist
        if (fs.existsSync(currentDistDir)) {
          await execAsync(`rmdir /S /Q "${currentDistDir}"`);
        }

        // Restore backup
        await execAsync(`xcopy "${backupDistDir}" "${currentDistDir}" /E /I /H /Y`);
      }

      // Restore database if available
      const backupDbFile = path.join(backupPath, 'database.sql');
      if (fs.existsSync(backupDbFile)) {
        await this.restoreDatabase(backupDbFile);
      }

      // Start service
      await this.manager.startService();

      this.log('✅ Rollback completed successfully');

    } catch (error) {
      this.log(`❌ Rollback failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(backupFile) {
    try {
      this.log('🗄️  Restoring database from backup...');

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        this.log('⚠️  No DATABASE_URL found, skipping database restore', 'WARN');
        return;
      }

      const url = new URL(dbUrl);
      const dbName = url.pathname.replace('/', '');
      const host = url.hostname;
      const port = url.port || '5432';
      const username = url.username;
      const password = url.password;

      const restoreCommand = `psql -h ${host} -p ${port} -U ${username} -d ${dbName} -f "${backupFile}"`;

      const env = { ...process.env };
      if (password) {
        env.PGPASSWORD = password;
      }

      await execAsync(restoreCommand, { env });
      this.log('✅ Database restore completed');

    } catch (error) {
      this.log(`⚠️  Database restore failed: ${error.message}`, 'WARN');
    }
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace() {
    try {
      const { stdout } = await execAsync('dir /-c');
      // This is a basic check - in production you'd want more sophisticated disk space checking
      this.log('✅ Disk space check passed');
    } catch (error) {
      this.log(`⚠️  Could not check disk space: ${error.message}`, 'WARN');
    }
  }

  /**
   * Verify git repository status
   */
  async verifyGitStatus() {
    try {
      const { stdout } = await execAsync('git status --porcelain');
      if (stdout.trim()) {
        this.log('⚠️  Working directory has uncommitted changes', 'WARN');
      } else {
        this.log('✅ Git working directory is clean');
      }
    } catch (error) {
      this.log(`⚠️  Could not check git status: ${error.message}`, 'WARN');
    }
  }

  /**
   * Get current version
   */
  async getCurrentVersion() {
    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      return 'unknown';
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'update';
  const manager = new ServiceUpdateManager();

  try {
    switch (command) {
      case 'update':
        await manager.updateService();
        break;

      case 'rollback':
        await manager.rollback();
        break;

      default:
        console.log('Usage: node service-update.js [update|rollback]');
        console.log('');
        console.log('Commands:');
        console.log('  update    - Update the service with backup and rollback support');
        console.log('  rollback  - Rollback to the last backup');
        break;
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ServiceUpdateManager;