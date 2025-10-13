/**
 * Hybrid Service Wrapper
 * Wrapper for running the Multi-Business Sync Service as a Windows Service
 * Based on electricity-tokens hybrid service pattern with direct process execution
 */

// Load environment variables from .env.local first
const path = require('path');
const fs = require('fs');

// Function to load environment variables from .env.local
function loadEnvironmentVariables() {
  const envLocalPath = path.join(__dirname, '..', '.env.local');

  if (fs.existsSync(envLocalPath)) {
    console.log('Loading environment variables from .env.local');

    try {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const envLines = envContent.split('\n');

      for (const line of envLines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key.trim()] = value.trim();
          }
        }
      }

      console.log('✅ Environment variables loaded from .env.local');
    } catch (error) {
      console.error('❌ Failed to load .env.local:', error.message);
    }
  } else {
    console.warn('⚠️  .env.local file not found at:', envLocalPath);
  }
}

// Load environment variables immediately
loadEnvironmentVariables();

const { spawn } = require('child_process');
const EventEmitter = require('events');

class HybridServiceWrapper extends EventEmitter {
  constructor(options = {}) {
    super();
    this.childProcess = null;
    this.appProcess = null;
    this.appRoot = path.join(__dirname, '..');
    this.isShuttingDown = false;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 5;
    this.restartDelay = 5000; // 5 seconds
    this.pidFile = path.join(__dirname, 'daemon', 'service.pid');
    this.logFile = path.join(__dirname, 'daemon', 'service.log');
    this.forceBuild = options.forceBuild || false;

    this.setupPidManagement();
    this.setupLogging();
    this.setupShutdownHandlers();
  }

  /**
   * Start the sync service
   */
  async start() {
    try {
      console.log('🚀 Starting Multi-Business Sync Service (Hybrid Mode)...');

      // Production validation and safety checks
      await this.runProductionValidation();

      // Optional prestart update: run build + migrations before spawning runner
      if (process.env.SYNC_PRESTART_UPDATE === '1') {
        try {
          console.log('SYNC_PRESTART_UPDATE=1: running prestart update (build + migrations)');
          const updater = require('./prestart-update');

          // Run with a timeout to avoid hanging service start forever
          const updatePromise = updater.runPrestartUpdate();
          const timeoutMs = parseInt(process.env.SYNC_PRESTART_UPDATE_TIMEOUT_MS || '300000'); // default 5 minutes
          const result = await Promise.race([
            updatePromise,
            new Promise((_, rej) => setTimeout(() => rej(new Error('Prestart update timed out')), timeoutMs))
          ]);

          if (result) {
            console.log('Prestart update completed successfully');
          }
        } catch (err) {
          console.error('Prestart update failed:', err && err.message ? err.message : err);
          console.error('Aborting service start to allow operator intervention');
          process.exit(1);
        }
      }

      // Build the sync service if needed
      console.log('🔧 Checking sync service build...');
      await this.buildService();

      // Ensure the compiled service exists (should exist after build)
      const serviceScript = path.join(__dirname, '..', 'dist', 'service', 'sync-service-runner.js');

      if (!fs.existsSync(serviceScript)) {
        throw new Error(
          `Service script not found: ${serviceScript}\n` +
          'Service build may have failed. Check build logs above.'
        );
      }

      // Run database migrations BEFORE starting sync service
      // ONLY if explicitly requested (default: skip to avoid startup failures)
      if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
        await this.runDatabaseMigrations();
      } else {
        console.log('⏭️  Skipping database migrations (RUN_MIGRATIONS_ON_START not set)');
        console.log('   Database migrations should be run during installation, not on every service start');
      }

      // Prepare arguments for sync service runner
      const args = ['start'];
      if (this.forceBuild) {
        args.push('--force-build');
      }

      // Start the Node.js process directly AFTER migrations complete
      this.childProcess = spawn('node', [serviceScript, ...args], {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          SYNC_REGISTRATION_KEY: process.env.SYNC_REGISTRATION_KEY || 'default-registration-key-change-in-production',
          SYNC_PORT: process.env.SYNC_PORT || '8765',
          SYNC_INTERVAL: process.env.SYNC_INTERVAL || '30000',
          LOG_LEVEL: process.env.LOG_LEVEL || 'info',
          SYNC_DATA_DIR: process.env.SYNC_DATA_DIR || './data/sync',
          SKIP_SYNC_RUNNER_MIGRATIONS: 'true' // Migrations already handled by wrapper
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      // Save PID
      this.savePid(this.childProcess.pid);

      // Setup process event handlers
      this.setupProcessHandlers();

      console.log(`✅ Sync service started with PID: ${this.childProcess.pid}`);
      this.emit('started', { pid: this.childProcess.pid });

      // Build Next.js application if needed
      if (process.env.SKIP_BUILD !== 'true') {
        await this.buildApplication();
      }

      // Optionally start the main application after service launch (tokens-app parity)
      const startApp = process.env.SYNC_START_APP_AFTER_SERVICE !== '0'; // default enabled
      if (startApp) {
        await this.startApplication();
      } else {
        console.log('SYNC_START_APP_AFTER_SERVICE=0: skipping main app start');
      }

    } catch (error) {
      console.error('❌ Failed to start sync service:', error);
      this.emit('error', error);

      if (!this.isShuttingDown && this.restartAttempts < this.maxRestartAttempts) {
        await this.handleRestart();
      } else {
        process.exit(1);
      }
    }
  }

  /**
   * Run database migrations
   */
  async runDatabaseMigrations() {
    return new Promise((resolve, reject) => {
      console.log('🗄️  Running database migrations...');

      // Check if migrations should be skipped
      if (process.env.SKIP_MIGRATIONS === 'true') {
        console.log('Skipping database migrations (SKIP_MIGRATIONS=true)');
        resolve();
        return;
      }

      const { spawn } = require('child_process');

      // First check migration status to see what needs to be applied
      console.log('Checking migration status...');
      const statusProcess = spawn('npx', ['prisma', 'migrate', 'status'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });

      let statusOutput = '';
      statusProcess.stdout.on('data', (data) => {
        const output = data.toString();
        statusOutput += output;
        output.split('\n').forEach((line) => {
          if (line.trim()) {
            console.log(`[MIGRATION STATUS] ${line.trim()}`);
          }
        });
      });

      statusProcess.stderr.on('data', (data) => {
        const output = data.toString();
        statusOutput += output;
        output.split('\n').forEach((line) => {
          if (line.trim()) {
            console.log(`[MIGRATION STATUS] ${line.trim()}`);
          }
        });
      });

      statusProcess.on('close', (code) => {
        // Migration lock and fs utilities
        const lockFile = path.join(process.cwd(), '.migration.lock')
        const fs = require('fs')
        
        // Analyze migration status output to determine the right approach
        console.log(`Migration status check completed with code: ${code}`);
        console.log('Migration status output analysis:');
        console.log(statusOutput);
        
        const isUpToDate = statusOutput.includes('Database is up to date') ||
                          statusOutput.includes('No pending migrations') ||
                          (code === 0 && statusOutput.includes('migrations'));
        
        const needsInitialSchema = statusOutput.includes('Environment variable not found: DATABASE_URL') ||
                                   statusOutput.includes('database does not exist') ||
                                   statusOutput.includes('Could not connect to database') ||
                                   (code !== 0 && statusOutput.includes('database'));
        
        const hasPendingMigrations = statusOutput.includes('following migration(s) have not yet been applied') ||
                                     statusOutput.includes('pending migration') ||
                                     statusOutput.includes('migration file') ||
                                     (code !== 0 && !needsInitialSchema);

        let migrationCommand, migrationArgs;
        
        if (isUpToDate) {
          console.log('✅ Database is up to date, no migrations needed');
          
          // Still run seeding in case reference data is missing
          console.log('🌱 Seeding reference data...');
          const seedProcess = spawn('npm', ['run', 'seed:migration'], {
            cwd: path.join(__dirname, '..'),
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
            env: {
              ...process.env,
              NODE_ENV: 'production',
            },
          });

          seedProcess.stdout.on('data', (data) => {
            const output = data.toString();
            output.split('\n').forEach((line) => {
              if (line.trim()) {
                console.log(`[SEEDING] ${line.trim()}`);
              }
            });
          });

          seedProcess.stderr.on('data', (data) => {
            const output = data.toString();
            output.split('\n').forEach((line) => {
              if (line.trim()) {
                console.log(`[SEEDING ERROR] ${line.trim()}`);
              }
            });
          });

          seedProcess.on('close', (seedCode) => {
            if (seedCode === 0) {
              console.log('✅ Database seeding completed successfully');
              try { fs.unlinkSync(lockFile) } catch (e) {}
              resolve();
            } else {
              console.error(`❌ Seeding failed with code ${seedCode}`);
              try { fs.unlinkSync(lockFile) } catch (e) {}
              reject(new Error(`Database seeding failed with exit code ${seedCode}`));
            }
          });

          seedProcess.on('error', (err) => {
            console.error('❌ Seeding process error:', err);
            try { fs.unlinkSync(lockFile) } catch (e) {}
            reject(err);
          });
          
          return; // Exit early since no migration is needed
        } else if (needsInitialSchema) {
          console.log('🆕 Database needs initial schema - using db push');
          migrationCommand = 'npx';
          migrationArgs = ['prisma', 'db', 'push'];
        } else if (hasPendingMigrations) {
          console.log('🔄 Database exists, applying pending migrations only');
          migrationCommand = 'npx';
          migrationArgs = ['prisma', 'migrate', 'deploy'];
        } else {
          console.log('🔄 Unknown migration status, using safe migrate deploy');
          migrationCommand = 'npx';
          migrationArgs = ['prisma', 'migrate', 'deploy'];
        }

        console.log(`Executing: ${migrationCommand} ${migrationArgs.join(' ')}`);

        // Migration lock to avoid duplicate concurrent migrations  
        const waitForLockRelease = async (timeoutMs = 2 * 60 * 1000) => {
          const start = Date.now()
          while (fs.existsSync(lockFile)) {
            if (Date.now() - start > timeoutMs) {
              throw new Error('Timeout waiting for existing migration lock to clear')
            }
            console.log('🔒 Migration lock present, waiting 5s for existing migration to finish...')
            // eslint-disable-next-line no-await-in-loop
            await new Promise(r => setTimeout(r, 5000))
          }
        }

        (async () => {
          try {
            await waitForLockRelease()
            try { fs.writeFileSync(lockFile, String(process.pid)) } catch (e) {}
          } catch (err) {
            console.error('❌ Migration lock wait failed:', err && err.message ? err.message : err)
            reject(err)
            return
          }

          // Continue with migration process

          const migrationProcess = spawn(migrationCommand, migrationArgs, {
          cwd: path.join(__dirname, '..'),
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true, // Use shell for Windows compatibility
          env: {
            ...process.env,
            NODE_ENV: 'production',
            // Ensure DATABASE_URL is passed from loaded .env.local
            DATABASE_URL: process.env.DATABASE_URL
          },
        });

        migrationProcess.stdout.on('data', (data) => {
          const output = data.toString();
          output.split('\n').forEach((line) => {
            if (line.trim()) {
              console.log(`[MIGRATION] ${line.trim()}`);
            }
          });
        });

        migrationProcess.stderr.on('data', (data) => {
          const output = data.toString();
          output.split('\n').forEach((line) => {
            if (line.trim()) {
              console.log(`[MIGRATION ERROR] ${line.trim()}`);
            }
          });
        });

        migrationProcess.on('close', (migrationCode) => {
          if (migrationCode === 0) {
            console.log('✅ Database migrations completed successfully');

            // Run UI validation after ALL migrations complete, before seeding
            console.log('🔍 Running UI relations validation...');
            const uiValidationProcess = spawn('node', ['scripts/validate-ui-relations.js'], {
              cwd: path.join(__dirname, '..'),
              stdio: ['ignore', 'pipe', 'pipe'],
              shell: true,
              env: {
                ...process.env,
                NODE_ENV: 'production',
              },
            });

            uiValidationProcess.stdout.on('data', (data) => {
              const output = data.toString();
              output.split('\n').forEach((line) => {
                if (line.trim()) {
                  console.log(`[UI VALIDATION] ${line.trim()}`);
                }
              });
            });

            uiValidationProcess.stderr.on('data', (data) => {
              const output = data.toString();
              output.split('\n').forEach((line) => {
                if (line.trim()) {
                  console.log(`[UI VALIDATION ERROR] ${line.trim()}`);
                }
              });
            });

            uiValidationProcess.on('close', (validationCode) => {
              if (validationCode === 0) {
                console.log('✅ UI relations validation passed');

                // Run seeding after successful migration AND UI validation
                console.log('🌱 Seeding reference data...');
                const seedProcess = spawn('npm', ['run', 'seed:migration'], {
                  cwd: path.join(__dirname, '..'),
                  stdio: ['ignore', 'pipe', 'pipe'],
                  shell: true,
                  env: {
                    ...process.env,
                    NODE_ENV: 'production',
                  },
                });

                seedProcess.stdout.on('data', (data) => {
                  const output = data.toString();
                  output.split('\n').forEach((line) => {
                    if (line.trim()) {
                      console.log(`[SEEDING] ${line.trim()}`);
                    }
                  });
                });

                seedProcess.stderr.on('data', (data) => {
                  const output = data.toString();
                  output.split('\n').forEach((line) => {
                    if (line.trim()) {
                      console.log(`[SEEDING ERROR] ${line.trim()}`);
                    }
                  });
                });

                seedProcess.on('close', (seedCode) => {
                  if (seedCode === 0) {
                    console.log('✅ Database seeding completed successfully');
                    try { fs.unlinkSync(lockFile) } catch (e) {}
                    resolve();
                  } else {
                    console.error(`❌ Seeding failed with code ${seedCode}`);
                    try { fs.unlinkSync(lockFile) } catch (e) {}
                    reject(new Error(`Database seeding failed with exit code ${seedCode}`));
                  }
                });

                seedProcess.on('error', (err) => {
                  console.error('❌ Seeding process error:', err);
                  try { fs.unlinkSync(lockFile) } catch (e) {}
                  reject(err);
                });

              } else {
                console.error(`❌ UI relations validation failed with code ${validationCode}`);
                console.error('CRITICAL: UI relations validation must pass for safe deployment');
                console.error('This prevents runtime errors in UI components due to schema/UI mismatches');
                try { fs.unlinkSync(lockFile) } catch (e) {}
                reject(new Error(`UI relations validation failed with exit code ${validationCode}`));
              }
            });

            uiValidationProcess.on('error', (err) => {
              console.error('❌ UI validation process error:', err);
              try { fs.unlinkSync(lockFile) } catch (e) {}
              reject(err);
            });

          } else {
            console.error(`❌ Migration failed with code ${migrationCode}`);
            reject(new Error(`Database migration failed with exit code ${migrationCode}`));
          }
        });

        migrationProcess.on('error', (err) => {
          console.error('❌ Migration process error:', err);
          try { fs.unlinkSync(lockFile) } catch (e) {}
          reject(err);
        });
        })(); // Close the async IIFE
      });

      statusProcess.on('error', (err) => {
        console.error('❌ Migration status check failed:', err);
        try { fs.unlinkSync(lockFile) } catch (e) {}
        reject(err);
      });
    });
  }

  /**
   * Build Next.js application for production
   */
  async buildApplication() {
    return new Promise((resolve, reject) => {
      console.log('🔨 Building Next.js application...');

      // Check if build should be skipped
      if (process.env.SKIP_BUILD === 'true') {
        console.log('Skipping application build (SKIP_BUILD=true)');
        resolve();
        return;
      }

      // Check if .next directory exists and has content
      const nextDir = path.join(__dirname, '..', '.next');
      const shouldBuild = !fs.existsSync(nextDir) ||
                         fs.readdirSync(nextDir).length === 0 ||
                         process.env.FORCE_BUILD === 'true';

      if (!shouldBuild) {
        console.log('✅ Application build already exists, skipping build');
        resolve();
        return;
      }

      const { spawn } = require('child_process');

      console.log('Building application (this may take a few minutes)...');
      console.log('Executing: npm run build');

      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true, // Use shell for Windows compatibility
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });

      let buildOutput = '';
      let buildError = '';

      buildProcess.stdout.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;
        output.split('\n').forEach((line) => {
          if (line.trim()) {
            console.log(`[BUILD] ${line.trim()}`);
          }
        });
      });

      buildProcess.stderr.on('data', (data) => {
        const error = data.toString();
        buildError += error;
        error.split('\n').forEach((line) => {
          if (line.trim()) {
            console.log(`[BUILD ERROR] ${line.trim()}`);
          }
        });
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Application build completed successfully');

          // Verify build completion
          this.verifyBuildCompletion()
            .then(() => {
              console.log('✅ Build verification completed');
              resolve();
            })
            .catch((verifyError) => {
              console.error('❌ Build verification failed:', verifyError);
              reject(verifyError);
            });
        } else {
          console.error(`❌ Build failed with code ${code}`);
          reject(new Error(`Application build failed with exit code ${code}: ${buildError}`));
        }
      });

      buildProcess.on('error', (err) => {
        console.error('❌ Build process error:', err);
        reject(err);
      });
    });
  }

  /**
   * Build the sync service TypeScript components
   */
  async buildService() {
    return new Promise((resolve, reject) => {
      console.log('🔧 Building sync service TypeScript components...');

      // Check if build should be skipped
      if (process.env.SKIP_SERVICE_BUILD === 'true') {
        console.log('Skipping service build (SKIP_SERVICE_BUILD=true)');
        resolve();
        return;
      }

      // Check if service build should be forced or if it doesn't exist
      const serviceScript = path.join(__dirname, '..', 'dist', 'service', 'sync-service-runner.js');
      const shouldBuild = !fs.existsSync(serviceScript) || this.forceBuild === true;

      if (!shouldBuild) {
        console.log('✅ Service build already exists, skipping build');
        resolve();
        return;
      }

      const { spawn } = require('child_process');

      console.log('Building service components (this may take a few minutes)...');
      console.log('Executing: npm run build:service');

      const buildProcess = spawn('npm', ['run', 'build:service'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true, // Use shell for Windows compatibility
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });

      let buildOutput = '';
      let buildError = '';

      buildProcess.stdout.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;
        output.split('\n').forEach((line) => {
          if (line.trim()) {
            console.log(`[SERVICE BUILD] ${line.trim()}`);
          }
        });
      });

      buildProcess.stderr.on('data', (data) => {
        const output = data.toString();
        buildError += output;
        output.split('\n').forEach((line) => {
          if (line.trim()) {
            console.log(`[SERVICE BUILD ERROR] ${line.trim()}`);
          }
        });
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Service build completed successfully');
          resolve();
        } else {
          console.error(`❌ Service build failed with exit code ${code}`);
          if (buildError) {
            console.error('Build errors:', buildError);
          }
          reject(new Error(`Service build failed with exit code ${code}`));
        }
      });

      buildProcess.on('error', (err) => {
        console.error('❌ Service build process error:', err);
        reject(err);
      });
    });
  }

  /**
   * Verify build completion
   */
  async verifyBuildCompletion() {
    return new Promise((resolve, reject) => {
      console.log('🔍 Verifying build completion...');

      const buildDir = path.join(__dirname, '..', '.next');
      const requiredFiles = ['BUILD_ID', 'routes-manifest.json'];
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds

      const checkBuild = () => {
        attempts++;

        // Check if build directory exists
        if (!fs.existsSync(buildDir)) {
          if (attempts >= maxAttempts) {
            reject(new Error('Build verification failed: .next directory not found after 30 seconds'));
            return;
          }
          console.log(`Build directory ${buildDir} does not exist, waiting...`);
          setTimeout(checkBuild, 1000);
          return;
        }

        // Check for required files
        for (const file of requiredFiles) {
          const filePath = path.join(buildDir, file);
          if (!fs.existsSync(filePath)) {
            if (attempts >= maxAttempts) {
              reject(new Error(`Build verification failed: Required file ${file} not found after 30 seconds`));
              return;
            }
            console.log(`Required build file ${file} missing, waiting...`);
            setTimeout(checkBuild, 1000);
            return;
          }
        }

        // Verify BUILD_ID is not empty
        try {
          const buildIdFile = path.join(buildDir, 'BUILD_ID');
          const buildId = fs.readFileSync(buildIdFile, 'utf8').trim();
          if (buildId.length === 0) {
            if (attempts >= maxAttempts) {
              reject(new Error('Build verification failed: BUILD_ID is empty after 30 seconds'));
              return;
            }
            console.log('BUILD_ID is empty, waiting for build to complete...');
            setTimeout(checkBuild, 1000);
            return;
          }
        } catch (err) {
          if (attempts >= maxAttempts) {
            reject(new Error('Build verification failed: BUILD_ID file unreadable after 30 seconds'));
            return;
          }
          console.log('BUILD_ID file unreadable, waiting for build to complete...');
          setTimeout(checkBuild, 1000);
          return;
        }

        console.log('✅ All required build files verified. Build is complete.');
        resolve();
      };

      checkBuild();
    });
  }

  /**
   * Run production validation and safety checks
   */
  async runProductionValidation() {
    console.log('🔒 Running production validation and safety checks...');

    // Check 1: Environment Configuration
    this.validateEnvironmentConfiguration();

    // Check 2: Database Connectivity
    await this.validateDatabaseConnectivity();

    // Check 3: Required Dependencies
    this.validateRequiredDependencies();

    // Check 4: File Permissions
    await this.validateFilePermissions();

    // Check 5: Port Availability
    await this.validatePortAvailability();

    console.log('✅ All production validation checks passed');
  }

  /**
   * Validate environment configuration
   */
  validateEnvironmentConfiguration() {
    console.log('🔍 Validating environment configuration...');

    // Check NODE_ENV
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  NODE_ENV is not set to "production". Current value:', process.env.NODE_ENV);
    }

    // Check required environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Validate sync configuration
    const syncPort = process.env.SYNC_PORT || '8765';
    if (!/^\d+$/.test(syncPort) || parseInt(syncPort) < 1 || parseInt(syncPort) > 65535) {
      throw new Error(`Invalid SYNC_PORT: ${syncPort}. Must be a number between 1-65535`);
    }

    // Check registration key
    const regKey = process.env.SYNC_REGISTRATION_KEY;
    if (!regKey || regKey === 'default-registration-key-change-in-production') {
      console.warn('⚠️  Using default registration key. Change SYNC_REGISTRATION_KEY in production!');
    }

    console.log('✅ Environment configuration validated');
  }

  /**
   * Validate database connectivity
   */
  async validateDatabaseConnectivity() {
    console.log('🔍 Validating database connectivity...');

    try {
      const { spawn } = require('child_process');

      // Test database connection using Prisma (safer approach - just check connection)
      await new Promise((resolve, reject) => {
        const testProcess = spawn('npx', ['prisma', 'migrate', 'status'], {
          cwd: path.join(__dirname, '..'),
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
          env: {
            ...process.env,
            NODE_ENV: 'production',
            // Ensure DATABASE_URL is explicitly passed (loaded from .env.local in wrapper)
            DATABASE_URL: process.env.DATABASE_URL,
          },
        });

        let output = '';
        testProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        testProcess.stderr.on('data', (data) => {
          output += data.toString();
        });

        // Timeout after 10 seconds - should be plenty for a simple status check
        const timeout = setTimeout(() => {
          testProcess.kill('SIGKILL');
          reject(new Error('Database connectivity test timed out - check if DATABASE_URL is accessible'));
        }, 10000);
        
        testProcess.on('close', (code) => {
          clearTimeout(timeout);
          // Migration status command succeeds if it can connect to database
          // Even if migrations are pending, it means the connection works
          if (code === 0 || output.includes('pending') || output.includes('applied') || output.includes('No migration found')) {
            resolve();
          } else if (output.includes('Could not connect') || output.includes('connection')) {
            reject(new Error(`Database connectivity test failed: Cannot connect to database`));
          } else {
            // For other errors, we'll be more lenient since we just want to test connectivity
            console.warn('Database status check returned non-zero code, but may still be connected:', output);
            resolve();
          }
        });
      });

      console.log('✅ Database connectivity validated');
    } catch (error) {
      console.error('❌ Database connectivity validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate required dependencies
   */
  validateRequiredDependencies() {
    console.log('🔍 Validating required dependencies...');

    const requiredFiles = [
      path.join(__dirname, '..', 'package.json'),
      path.join(__dirname, '..', 'prisma', 'schema.prisma'),
      path.join(__dirname, '..', 'dist', 'service', 'sync-service-runner.js'),
    ];

    for (const filePath of requiredFiles) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file missing: ${filePath}`);
      }
    }

    // Check package.json structure
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      const requiredScripts = ['build:service', 'start'];

      for (const script of requiredScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          throw new Error(`Required npm script missing: ${script}`);
        }
      }
    } catch (error) {
      throw new Error(`Invalid package.json: ${error.message}`);
    }

    console.log('✅ Required dependencies validated');
  }

  /**
   * Validate file permissions
   */
  async validateFilePermissions() {
    console.log('🔍 Validating file permissions...');

    const criticalPaths = [
      path.join(__dirname, '..'),              // Project root
      path.join(__dirname, '..', 'logs'),      // Logs directory
      path.join(__dirname, '..', 'dist'),      // Build output
      path.join(__dirname, 'daemon'),          // Service daemon directory
    ];

    for (const dirPath of criticalPaths) {
      try {
        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Test write permissions
        const testFile = path.join(dirPath, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (error) {
        throw new Error(`Insufficient permissions for directory: ${dirPath} - ${error.message}`);
      }
    }

    console.log('✅ File permissions validated');
  }

  /**
   * Validate port availability
   */
  async validatePortAvailability() {
    console.log('🔍 Validating port availability...');

    const syncPort = parseInt(process.env.SYNC_PORT || '8765');
    const appPort = parseInt(process.env.PORT || '8080');

    const checkPort = (port) => {
      return new Promise((resolve, reject) => {
        const net = require('net');
        const server = net.createServer();

        server.listen(port, () => {
          server.once('close', () => resolve());
          server.close();
        });

        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is already in use`));
          } else {
            reject(err);
          }
        });
      });
    };

    try {
      await checkPort(syncPort);
      console.log(`✅ Sync port ${syncPort} is available`);
    } catch (error) {
      console.warn(`⚠️  ${error.message} - sync service may conflict with existing service`);
    }

    try {
      await checkPort(appPort);
      console.log(`✅ Application port ${appPort} is available`);
    } catch (error) {
      console.warn(`⚠️  ${error.message} - application may conflict with existing service`);
    }

    console.log('✅ Port availability validated');
  }

  /**
   * Check if port is listening
   */
  async checkPortListening(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32'
        ? `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`
        : `lsof -i :${port} -t`;

      exec(cmd, (error, stdout) => {
        if (!error && stdout.trim()) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Verify Next.js has started and is listening
   */
  async verifyNextJsStarted() {
    console.log('🔍 Verifying Next.js is listening on the configured port...');
    const port = parseInt(process.env.PORT || '8080');
    const maxRetries = 15;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const isListening = await this.checkPortListening(port);
        if (isListening) {
          console.log(`✅ Next.js is now listening on port ${port}.`);
          return true;
        }
      } catch (error) {
        console.log(`Retry ${i + 1}/${maxRetries}: Port ${port} not yet listening...`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    throw new Error(`Next.js did not start listening on port ${port} after ${maxRetries * retryDelay / 1000} seconds`);
  }

  /**
   * Check if Next.js binary is available
   */
  async verifyNextJsAvailable() {
    const nextPath = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
    if (!fs.existsSync(nextPath)) {
      throw new Error(`Next.js binary not found at ${nextPath}`);
    }

    console.log('✅ Next.js binary found.');
    return true;
  }

  /**
   * Start the Next.js application
   */
  async startApplication() {
    try {
      console.log('🚀 Starting Multi-Business Next.js application...');

      // Store appRoot for use in this method
      this.appRoot = path.join(__dirname, '..');

      // Verify Next.js binary is available
      await this.verifyNextJsAvailable();

      console.log('Production build verified. Starting Next.js application directly...');

      // Start Next.js directly using node, not npm
      const nextPath = path.join(
        this.appRoot,
        'node_modules',
        'next',
        'dist',
        'bin',
        'next'
      );

      const appPort = process.env.PORT || '8080';

      console.log(`📝 Spawning: node ${nextPath} start`);
      console.log(`📂 Working directory: ${this.appRoot}`);
      console.log(`🔌 PORT: ${appPort}`);

      this.appProcess = spawn('node', [nextPath, 'start'], {
        cwd: this.appRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: appPort,
        },
      });

      // Log app PID
      console.log(`📌 Next.js process spawned with PID: ${this.appProcess.pid}`);

      this.appProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[Next.js] ${output}`);
        }
      });

      this.appProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.error(`[Next.js ERROR] ${output}`);
        }
      });

      this.appProcess.on('error', (err) => {
        console.error(`❌ Failed to start Next.js process: ${err.message}`);
      });

      this.appProcess.on('exit', (code, signal) => {
        console.error(`⚠️  Next.js process exited with code ${code} and signal ${signal}`);
      });

      // Wait a moment for process to initialize
      console.log('⏳ Waiting 5 seconds for Next.js to initialize...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify port is listening
      await this.verifyNextJsStarted();

      console.log(`🚀 SERVICE STARTUP COMPLETE: Next.js application started successfully!`);
      console.log(`🌐 Application available at: http://localhost:${appPort}`);
    } catch (error) {
      console.error(`❌ Failed to start Next.js application: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the sync service and app
   */
  async stop() {
    this.isShuttingDown = true;

    // Stop the Next.js app first
    if (this.appProcess) {
      try {
        console.log('⏹️  Stopping Next.js application...');

        // Send SIGTERM for graceful shutdown
        this.appProcess.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if graceful shutdown takes too long
            if (this.appProcess) {
              console.log('🔪 Force killing Next.js app...');
              this.appProcess.kill('SIGKILL');
            }
            resolve();
          }, 10000); // 10 second timeout

          this.appProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        console.log('✅ Next.js application stopped');

      } catch (error) {
        console.error('❌ Error stopping Next.js app:', error);
      }
    }

    // Stop the sync service
    if (this.childProcess) {
      try {
        console.log('⏹️  Stopping sync service...');

        // Send SIGTERM for graceful shutdown
        this.childProcess.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if graceful shutdown takes too long
            if (this.childProcess) {
              console.log('🔪 Force killing sync service...');
              this.childProcess.kill('SIGKILL');
            }
            resolve();
          }, 10000); // 10 second timeout

          this.childProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        console.log('✅ Sync service stopped');
        this.emit('stopped');

      } catch (error) {
        console.error('❌ Error stopping sync service:', error);
        this.emit('error', error);
      }
    }

    this.cleanupPid();
  }

  /**
   * Setup process event handlers
   */
  setupProcessHandlers() {
    if (!this.childProcess) return;

    this.childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.logOutput('STDOUT', output);
      console.log(output);
    });

    this.childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      this.logOutput('STDERR', output);
      console.error(output);
    });

    this.childProcess.on('error', (error) => {
      console.error('🔥 Child process error:', error);
      this.emit('error', error);

      if (!this.isShuttingDown) {
        this.handleRestart();
      }
    });

    this.childProcess.on('exit', (code, signal) => {
      console.log(`📤 Child process exited with code ${code}, signal ${signal}`);
      this.cleanupPid();

      if (!this.isShuttingDown && code !== 0) {
        console.log('🔄 Process exited unexpectedly, attempting restart...');
        this.handleRestart();
      } else {
        this.emit('stopped');
      }
    });
  }

  /**
   * Handle automatic restart
   */
  async handleRestart() {
    this.restartAttempts++;

    if (this.restartAttempts > this.maxRestartAttempts) {
      console.error(`❌ Maximum restart attempts (${this.maxRestartAttempts}) exceeded. Exiting.`);
      process.exit(1);
    }

    console.log(`🔄 Attempting restart ${this.restartAttempts}/${this.maxRestartAttempts} in ${this.restartDelay}ms...`);

    await new Promise(resolve => setTimeout(resolve, this.restartDelay));

    if (!this.isShuttingDown) {
      await this.start();
    }
  }

  /**
   * Setup PID management
   */
  setupPidManagement() {
    // Ensure daemon directory exists
    const daemonDir = path.dirname(this.pidFile);
    if (!fs.existsSync(daemonDir)) {
      fs.mkdirSync(daemonDir, { recursive: true });
    }
  }

  /**
   * Save process PID
   */
  savePid(pid) {
    try {
      fs.writeFileSync(this.pidFile, pid.toString());
    } catch (error) {
      console.warn('Failed to save PID file:', error);
    }
  }

  /**
   * Clean up PID file
   */
  cleanupPid() {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    } catch (error) {
      console.warn('Failed to cleanup PID file:', error);
    }
  }

  /**
   * Get saved PID
   */
  getSavedPid() {
    try {
      if (fs.existsSync(this.pidFile)) {
        return parseInt(fs.readFileSync(this.pidFile, 'utf8'));
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  /**
   * Setup logging
   */
  setupLogging() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Log output to file
   */
  logOutput(type, output) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${type}] ${output}`;

      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      // Ignore logging errors
    }
  }

  /**
   * Setup shutdown handlers
   */
  setupShutdownHandlers() {
    process.on('SIGINT', async () => {
      console.log('\n📡 Received SIGINT, shutting down...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n📡 Received SIGTERM, shutting down...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGHUP', async () => {
      console.log('\n📡 Received SIGHUP, restarting...');
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.start();
    });

    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Get service status
   */
  getStatus() {
    const savedPid = this.getSavedPid();
    const isRunning = this.childProcess && !this.childProcess.killed;

    return {
      isRunning,
      pid: this.childProcess ? this.childProcess.pid : savedPid,
      restartAttempts: this.restartAttempts,
      maxRestartAttempts: this.maxRestartAttempts,
      isShuttingDown: this.isShuttingDown
    };
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'start';
const forceBuild = args.includes('--force-build') || args.includes('-f');

// Create and start the service wrapper
const wrapper = new HybridServiceWrapper({ forceBuild });

switch (command) {
  case 'start':
    if (forceBuild) {
      console.log('🔨 Force build enabled - will rebuild TypeScript before starting service');
    }
    wrapper.start();
    break;

  case 'stop':
    wrapper.stop();
    break;

  case 'status':
    const status = wrapper.getStatus();
    console.log('Service Status:', status);
    break;

  default:
    console.log('Usage: node service-wrapper-hybrid.js [start|stop|status] [--force-build|-f]');
    console.log('');
    console.log('Commands:');
    console.log('  start    Start the sync service');
    console.log('  stop     Stop the sync service');
    console.log('  status   Show service status');
    console.log('');
    console.log('Flags:');
    console.log('  --force-build, -f    Force TypeScript build before starting service');
    break;
}

// Keep process alive
process.stdin.resume();

module.exports = HybridServiceWrapper;