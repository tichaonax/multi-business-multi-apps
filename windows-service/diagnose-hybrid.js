/**
 * Hybrid Service Diagnostics
 * Comprehensive service health check and troubleshooting tool
 * Based on electricity-tokens diagnostic patterns
 */

const HybridServiceManager = require('./hybrid-service-manager');
const path = require('path');
const fs = require('fs');
const svcConfig = require('./config');

class ServiceDiagnostics {
  constructor() {
    this.manager = new HybridServiceManager();
    // Service name always comes from config
    this.serviceName = svcConfig.name;
  }

  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics() {
    console.log('🔍 Multi-Business Sync Service - Comprehensive Diagnostics');
    console.log('='.repeat(65));
    console.log('');

    // Print key config values for debugging (mirrors electricity-tokens style diagnostics)
    try {
      console.log('🧩 Service configuration (from config.js):');
      const cfg = svcConfig || {};
      console.log(`   name: ${cfg.name}`);
      console.log(`   displayName: ${cfg.displayName}`);
      console.log(`   script: ${cfg.script}`);
      console.log(`   SC_COMMAND: ${cfg.commands && cfg.commands.SC_COMMAND}`);
      console.log(`   nodeOptions: ${Array.isArray(cfg.nodeOptions) ? cfg.nodeOptions.join(' ') : cfg.nodeOptions}`);
      // List explicit env entries from service config
      if (Array.isArray(cfg.env)) {
        console.log('   env entries from config:');
        cfg.env.forEach(e => console.log(`     ${e.name}=${e.value ? '***' : ''}${e.value && String(e.value).length > 0 ? '(set)' : '(empty)'}`));
      }
      console.log('');
    } catch (err) {
      console.log('   Could not read service config:', err && err.message);
    }

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
      // Show service name
      console.log(`   Service name: ${this.manager.serviceName}`);

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
        name: 'App Server Build',
        path: path.join(__dirname, '..', 'dist', 'server.js'),
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

    const appPort = process.env.PORT || 8080;

    try {
      // Check if the app's port is in use
      const portProcess = await this.manager.findProcessByPort(appPort);
      console.log(`   App Port ${appPort}: ${portProcess ? `✅ In use (PID ${portProcess})` : '⚠️  Available'}`);

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
    console.log(`   Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    console.log('');
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    console.log('🗄️  Database:');

    try {
      // Look for DATABASE_URL from multiple sources: env, svcConfig.env, svcConfig fields, and common env files
      const cfg = svcConfig || {};
      const findings = [];

      const dbUrlFromEnv = process.env.DATABASE_URL;
      if (dbUrlFromEnv) findings.push({ source: 'process.env', value: dbUrlFromEnv });

      // Check svcConfig.env array
      if (Array.isArray(cfg.env)) {
        const e = cfg.env.find(x => String(x.name).toUpperCase() === 'DATABASE_URL');
        if (e && e.value) findings.push({ source: 'svcConfig.env', value: e.value });
      }

      // Check common config properties
      const dbUrlFromConfig = cfg.databaseUrl || (cfg.database && cfg.database.url) || cfg.DATABASE_URL;
      if (dbUrlFromConfig) findings.push({ source: 'svcConfig.direct', value: dbUrlFromConfig });

      // Helper to read simple KEY=VALUE env files
      const loadEnvFile = (filePath) => {
        try {
          if (!fs.existsSync(filePath)) return {};
          const txt = fs.readFileSync(filePath, 'utf8');
          const lines = txt.split(/\r?\n/);
          const out = {};
          for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;
            const eq = line.indexOf('=');
            if (eq === -1) continue;
            const k = line.slice(0, eq).trim();
            let v = line.slice(eq + 1).trim();
            // remove surrounding quotes
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            out[k] = v;
          }
          return out;
        } catch (e) {
          return {};
        }
      };

      // Check config/service.env, config/.env, project .env
      const candidateEnvFiles = [
        path.join(__dirname, '..', 'config', 'service.env'),
        path.join(__dirname, '..', 'config', '.env'),
        path.join(__dirname, '..', '.env'),
        path.join(__dirname, '..', 'config', 'service.env.local')
      ];

      for (const f of candidateEnvFiles) {
        const parsed = loadEnvFile(f);
        if (parsed && parsed.DATABASE_URL) {
          findings.push({ source: f, value: parsed.DATABASE_URL });
        }
      }

      // Print summary of findings
      const envFound = findings.length > 0;
      console.log(`   DATABASE_URL (env): ${dbUrlFromEnv ? '✅ Set' : '❌ Not set'}`);
      console.log(`   DATABASE_URL (svcConfig): ${dbUrlFromConfig ? '✅ Set' : '❌ Not set'}`);
      if (envFound) {
        console.log('   DATABASE_URL found in:');
        findings.forEach(f => console.log(`     - ${f.source}`));
      } else {
        console.log('   DATABASE_URL not found in env, svcConfig, or common env files');
      }

      const dbUrl = findings.length > 0 ? findings[0].value : null;

      if (!dbUrl) {
        console.log('   Connection: ⚠️  Skipped (DATABASE_URL not configured in env or config)');
      } else {
        // Basic URL validation
        try {
          const url = new URL(dbUrl);
          console.log(`   Database Type: ${url.protocol.replace(':', '')}`);
          console.log(`   Database Host: ${url.hostname}:${url.port || 'default'}`);
          console.log(`   Database Name: ${url.pathname.replace('/', '')}`);
        } catch (urlError) {
          console.log('   URL Format: ❌ Invalid');
        }

        // Try to test connection if Prisma is available
        try {
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

          await prisma.$connect();
          console.log('   Connection: ✅ Successful');
          await prisma.$disconnect();
        } catch (prismaError) {
          console.log(`   Connection: ❌ Failed - ${prismaError.message}`);
        }
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

    const serverBuild = path.join(__dirname, '..', 'dist', 'server.js');
    if (!fs.existsSync(serverBuild)) {
      recommendations.push('Build the app: npm run build');
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