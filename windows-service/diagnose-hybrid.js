/**
 * Hybrid Service Diagnostics
 * Comprehensive service health check and troubleshooting tool
 * Based on electricity-tokens diagnostic patterns
 */

const HybridServiceManager = require('./hybrid-service-manager');
const path = require('path');
const fs = require('fs');

class ServiceDiagnostics {
  constructor() {
    this.manager = new HybridServiceManager();
    this.serviceName = 'Multi-Business Sync Service';
  }

  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics() {
    console.log('🔍 Multi-Business Sync Service - Comprehensive Diagnostics');
    console.log('='.repeat(65));
    console.log('');

    // Basic service status
    await this.checkServiceStatus();

    // File system checks
    await this.checkFileSystem();

    // Process diagnostics
    await this.checkProcesses();

    // Network diagnostics
    await this.checkNetwork();

    // Configuration diagnostics
    await this.checkConfiguration();

    // Database connectivity
    await this.checkDatabase();

    // Performance metrics
    await this.checkPerformance();

    // Show recommendations
    await this.showRecommendations();
  }

  /**
   * Check service status
   */
  async checkServiceStatus() {
    console.log('🔧 Service Status:');

    try {
      const status = await this.manager.getServiceStatus();

      console.log(`   Windows Service: ${this.getStatusIcon(status.serviceStatus)} ${status.serviceStatus}`);
      console.log(`   Process Running: ${status.processRunning ? '✅ Yes' : '❌ No'}`);

      if (status.pid) {
        console.log(`   Process ID: ${status.pid}`);
      }

      console.log(`   Service Installed: ${status.hasService ? '✅ Yes' : '❌ No'}`);
      console.log(`   Status Synchronized: ${status.synchronized ? '✅ Yes' : '⚠️  No'}`);

      if (status.error) {
        console.log(`   Error: ❌ ${status.error}`);
      }
    } catch (error) {
      console.log(`   Error: ❌ ${error.message}`);
    }

    console.log('');
  }

  /**
   * Check file system
   */
  async checkFileSystem() {
    console.log('📁 File System:');

    const checks = [
      {
        name: 'Service Script',
        path: path.join(__dirname, '..', 'dist', 'service', 'sync-service-runner.js'),
        required: true
      },
      {
        name: 'Service Wrapper',
        path: path.join(__dirname, 'service-wrapper-hybrid.js'),
        required: true
      },
      {
        name: 'Configuration',
        path: path.join(__dirname, 'config.js'),
        required: true
      },
      {
        name: 'Daemon Directory',
        path: path.join(__dirname, 'daemon'),
        required: false
      },
      {
        name: 'PID File',
        path: path.join(__dirname, 'daemon', 'service.pid'),
        required: false
      },
      {
        name: 'Log File',
        path: path.join(__dirname, 'daemon', 'service.log'),
        required: false
      }
    ];

    for (const check of checks) {
      const exists = fs.existsSync(check.path);
      const icon = exists ? '✅' : (check.required ? '❌' : '⚠️');
      console.log(`   ${check.name}: ${icon} ${exists ? 'Exists' : 'Missing'}`);

      if (exists && check.name === 'Service Script') {
        const stats = fs.statSync(check.path);
        console.log(`     Size: ${(stats.size / 1024).toFixed(1)}KB, Modified: ${stats.mtime.toISOString()}`);
      }
    }

    console.log('');
  }

  /**
   * Check processes
   */
  async checkProcesses() {
    console.log('⚙️  Processes:');

    try {
      const processes = await this.manager.findServiceProcesses();

      if (processes.length === 0) {
        console.log('   No service processes found');
      } else {
        console.log(`   Found ${processes.length} service-related process(es):`);

        for (const proc of processes) {
          console.log(`     PID ${proc.PID}: ${proc.Name}`);
          if (proc.CommandLine && proc.CommandLine.length > 60) {
            console.log(`       ${proc.CommandLine.substring(0, 60)}...`);
          } else if (proc.CommandLine) {
            console.log(`       ${proc.CommandLine}`);
          }
        }
      }
    } catch (error) {
      console.log(`   Error: ❌ ${error.message}`);
    }

    console.log('');
  }

  /**
   * Check network
   */
  async checkNetwork() {
    console.log('🌐 Network:');

    const syncPort = process.env.SYNC_PORT || 3001;

    try {
      // Check if sync port is in use
      const portProcess = await this.manager.findProcessByPort(syncPort);
      console.log(`   Sync Port ${syncPort}: ${portProcess ? `✅ In use (PID ${portProcess})` : '⚠️  Available'}`);

      // Check network interfaces
      const { networkInterfaces } = require('os');
      const interfaces = networkInterfaces();

      let hasNetwork = false;
      let ipAddresses = [];

      for (const [name, nets] of Object.entries(interfaces)) {
        if (nets) {
          for (const net of nets) {
            if (!net.internal && net.family === 'IPv4') {
              hasNetwork = true;
              ipAddresses.push(`${name}: ${net.address}`);
            }
          }
        }
      }

      console.log(`   Network Available: ${hasNetwork ? '✅ Yes' : '❌ No'}`);
      if (hasNetwork) {
        console.log('   IP Addresses:');
        ipAddresses.forEach(addr => console.log(`     ${addr}`));
      }
    } catch (error) {
      console.log(`   Error: ❌ ${error.message}`);
    }

    console.log('');
  }

  /**
   * Check configuration
   */
  async checkConfiguration() {
    console.log('⚙️  Configuration:');

    const config = {
      registrationKey: process.env.SYNC_REGISTRATION_KEY || 'default-registration-key-change-in-production',
      port: process.env.SYNC_PORT || '3001',
      syncInterval: process.env.SYNC_INTERVAL || '30000',
      logLevel: process.env.LOG_LEVEL || 'info',
      dataDir: process.env.SYNC_DATA_DIR || './data/sync'
    };

    const isDefaultKey = !process.env.SYNC_REGISTRATION_KEY ||
                        process.env.SYNC_REGISTRATION_KEY === 'default-registration-key-change-in-production';

    console.log(`   Registration Key: ${isDefaultKey ? '⚠️  DEFAULT (CHANGE FOR PRODUCTION)' : '✅ Custom'}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Sync Interval: ${config.syncInterval}ms`);
    console.log(`   Log Level: ${config.logLevel}`);
    console.log(`   Data Directory: ${config.dataDir}`);

    // Check if data directory exists
    const dataDirExists = fs.existsSync(config.dataDir);
    console.log(`   Data Dir Exists: ${dataDirExists ? '✅ Yes' : '⚠️  No'}`);

    console.log('');
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    console.log('🗄️  Database:');

    try {
      // Check if DATABASE_URL is set
      const dbUrl = process.env.DATABASE_URL;
      console.log(`   DATABASE_URL: ${dbUrl ? '✅ Set' : '❌ Not set'}`);

      if (dbUrl) {
        // Basic URL validation
        try {
          const url = new URL(dbUrl);
          console.log(`   Database Type: ${url.protocol.replace(':', '')}`);
          console.log(`   Database Host: ${url.hostname}:${url.port || 'default'}`);
          console.log(`   Database Name: ${url.pathname.replace('/', '')}`);
        } catch (urlError) {
          console.log(`   URL Format: ❌ Invalid`);
        }
      }

      // Try to test connection if Prisma is available
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        await prisma.$connect();
        console.log(`   Connection: ✅ Successful`);

        await prisma.$disconnect();
      } catch (prismaError) {
        console.log(`   Connection: ❌ Failed - ${prismaError.message}`);
      }
    } catch (error) {
      console.log(`   Error: ❌ ${error.message}`);
    }

    console.log('');
  }

  /**
   * Check performance
   */
  async checkPerformance() {
    console.log('📊 Performance:');

    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      console.log(`   Diagnostic Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);

      // System memory
      const os = require('os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      console.log(`   System Memory: ${(usedMem / 1024 / 1024 / 1024).toFixed(1)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(1)}GB used`);
      console.log(`   CPU Cores: ${os.cpus().length}`);
      console.log(`   Platform: ${os.platform()} ${os.arch()}`);
      console.log(`   Node.js: ${process.version}`);

      // Check disk space for data directory
      const dataDir = process.env.SYNC_DATA_DIR || './data/sync';
      try {
        const stats = fs.statSync(dataDir);
        console.log(`   Data Directory: ✅ Accessible`);
      } catch (statError) {
        console.log(`   Data Directory: ⚠️  Not accessible`);
      }
    } catch (error) {
      console.log(`   Error: ❌ ${error.message}`);
    }

    console.log('');
  }

  /**
   * Show recommendations
   */
  async showRecommendations() {
    console.log('💡 Recommendations:');

    const status = await this.manager.getServiceStatus();
    const isDefaultKey = !process.env.SYNC_REGISTRATION_KEY ||
                        process.env.SYNC_REGISTRATION_KEY === 'default-registration-key-change-in-production';

    const recommendations = [];

    if (!status.hasService) {
      recommendations.push('Install the Windows service: npm run service:install');
    }

    if (!status.processRunning && status.hasService) {
      recommendations.push('Start the service: npm run service:start');
    }

    if (!status.synchronized) {
      recommendations.push('Service and process status are out of sync - consider restarting');
    }

    if (isDefaultKey) {
      recommendations.push('Set a secure registration key: set SYNC_REGISTRATION_KEY=your-secure-key');
    }

    const serviceScript = path.join(__dirname, '..', 'dist', 'service', 'sync-service-runner.js');
    if (!fs.existsSync(serviceScript)) {
      recommendations.push('Build the service: npm run build:service');
    }

    if (!process.env.DATABASE_URL) {
      recommendations.push('Set DATABASE_URL environment variable');
    }

    if (recommendations.length === 0) {
      console.log('   ✅ No issues detected - service appears healthy!');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('');
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    switch (status) {
      case 'RUNNING': return '✅';
      case 'STOPPED': return '⏹️';
      case 'NOT_INSTALLED': return '❌';
      default: return '⚠️';
    }
  }
}

// Run diagnostics if this is the main module
async function main() {
  const diagnostics = new ServiceDiagnostics();

  try {
    await diagnostics.runDiagnostics();

    console.log('🎛️  Service Management:');
    console.log('   npm run service:install    - Install Windows service');
    console.log('   npm run service:start      - Start the service');
    console.log('   npm run service:stop       - Stop the service');
    console.log('   npm run service:restart    - Restart the service');
    console.log('   npm run service:diagnose   - Run this diagnostic (current command)');
    console.log('');

  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ServiceDiagnostics;