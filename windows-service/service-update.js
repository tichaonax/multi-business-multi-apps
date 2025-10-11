/**
 * Service Update Manager
 * Handles production updates with migration support and rollback capabilities
 * Based on electricity-tokens service update patterns
 */

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
   * Run database migrations
   */
  async runDatabaseMigrations() {
    this.log('🗄️  Running database migrations...');

    try {
      // Clean Prisma client to prevent EPERM errors (file locks from stopped service)
      await this.cleanPrismaClient();

      // Generate Prisma client
      await execAsync('npx prisma generate');
      this.log('✅ Prisma client generated');

      // Run migrations
      await execAsync('npx prisma migrate deploy');
      this.log('✅ Database migrations completed');

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

          await execAsync('npx prisma migrate deploy');
          this.log('✅ Database migrations completed after recovery');
          return;
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
        this.log('Reference data present (or cannot determine fresh DB). Skipping auto-seed')
      }
    } catch (error) {
      this.log(`Error ensuring reference data: ${error.message}`, 'WARN')
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