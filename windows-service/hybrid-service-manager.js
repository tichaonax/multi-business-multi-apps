/**
 * Hybrid Service Manager
 * Enhanced process management with PID tracking and force-kill capabilities
 * Based on electricity-tokens hybrid service pattern
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

class HybridServiceManager {
  constructor() {
    // Use config-driven candidate names (internal id variants then display name)
    const config = require('./config');
    const nameHelper = require('./service-name-helper');
    this.candidateNames = nameHelper.getCandidateServiceNames();
    // default to first candidate for backward compatibility
    this.serviceName = this.candidateNames[0] || (config && config.name) || 'Multi-Business Sync Service';
    this.daemonPath = path.join(__dirname, 'daemon');
    this.pidFile = path.join(this.daemonPath, 'service.pid');
    this.logFile = path.join(this.daemonPath, 'service.log');
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  async tryScCommand(cmdBuilder) {
    // cmdBuilder is a function that takes a candidate name and returns the full command
    let lastErr = null;
    const config = require('./config');
    const scCmd = (config.commands && config.commands.SC_COMMAND) || 'sc.exe';

    function buildServiceExpectedName(name) {
      if (!name) return name;
      // If already ends with .exe, return as-is
      if (/\.exe$/i.test(name)) return name;
      // Remove spaces and ensure lowercase token, then append .exe
      const token = String(name).replace(/\s+/g, '').toLowerCase();
      return `${token}.exe`;
    }

    for (const name of this.candidateNames) {
      try {
        const expectedName = buildServiceExpectedName(name);
        let cmd = cmdBuilder(expectedName);
        // Normalize commands that start with 'sc ' or 'sc.exe ' to use configured scCmd
        if (/^\s*sc(\.exe)?\s+/i.test(cmd)) {
          cmd = cmd.replace(/^\s*sc(\.exe)?\s+/i, scCmd + ' ');
        }

        const { stdout, stderr } = await execAsync(cmd);
        const out = (stdout || stderr || '').toString();
        // small debug trace so diagnostics can tell which candidate and command worked
        this.log(`sc command succeeded for candidate "${name}" using command: ${cmd}`);
        return { name, out, cmd };
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('sc command failed for all candidate names');
  }

  async runScQuery() {
    try {
      const res = await this.tryScCommand((name) => `sc query "${name}"`);
      return res.out;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    // Also log to file if available
    try {
      if (!fs.existsSync(this.daemonPath)) {
        fs.mkdirSync(this.daemonPath, { recursive: true });
      }
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      // Ignore file logging errors
    }
  }

  /**
   * Start the service using hybrid approach
   */
  async startService() {
    try {
      this.log('Starting service using hybrid approach...');

      // Check if already running
      const existingPid = this.getServicePid();
      if (existingPid && await this.isProcessRunning(existingPid)) {
        this.log(`Service already running with PID: ${existingPid}`);
        return true;
      }

  // Use Windows service control to start (try candidates)
  await this.tryScCommand((name) => `sc start "${name}"`);
      this.log('Service start command executed');

      // Wait for service to start and get PID
      await this.waitForServiceStart();

      return true;
    } catch (error) {
      this.log(`Error starting service: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Stop the service using hybrid approach
   */
  async stopService() {
    try {
      this.log('Stopping service using hybrid approach...');

      // Get current PID if available
      const pid = this.getServicePid();

      // Try graceful shutdown via Windows service control
      try {
  await this.tryScCommand((name) => `sc stop "${name}"`);
        this.log('Service stop command executed');

        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check if process is still running
        if (pid && await this.isProcessRunning(pid)) {
          this.log(`Process ${pid} still running, attempting force kill...`);
          await this.killPID(pid);
        }
      } catch (serviceError) {
        this.log(`Service control stop failed: ${serviceError.message}`, 'WARN');

        // Fallback to direct process kill
        if (pid) {
          this.log(`Attempting direct process kill of PID: ${pid}`);
          await this.killPID(pid);
        }
      }

      // Cleanup PID file
      this.cleanupPidFile();

      // Ensure no related processes remain
      await this.ensureNoServiceProcesses();

      this.log('Service stopped successfully');
      return true;
    } catch (error) {
      this.log(`Error stopping service: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Get service PID from file or system
   */
  getServicePid() {
    try {
      // Try to read from PID file first
      if (fs.existsSync(this.pidFile)) {
        const pidContent = fs.readFileSync(this.pidFile, 'utf8').trim();
        const pid = parseInt(pidContent);
        if (!isNaN(pid)) {
          return pid;
        }
      }

      // Fallback: try to find via Windows service query
      return null;
    } catch (error) {
      this.log(`Error reading PID: ${error.message}`, 'WARN');
      return null;
    }
  }

  /**
   * Check if a process is running
   */
  async isProcessRunning(pid) {
    try {
      const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
      return stdout.includes(`"${pid}"`);
    } catch (error) {
      return false;
    }
  }

  /**
   * Kill a process by PID with retries
   */
  async killPID(pid, retries = 0) {
    try {
      this.log(`Attempting to kill process PID: ${pid} (attempt ${retries + 1})`);

      // Try graceful termination first
      if (retries === 0) {
        try {
          await execAsync(`taskkill /PID ${pid}`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

          // Check if process is still running
          if (!(await this.isProcessRunning(pid))) {
            this.log(`Process ${pid} terminated gracefully`);
            return true;
          }
        } catch (gracefulError) {
          this.log(`Graceful termination failed: ${gracefulError.message}`, 'WARN');
        }
      }

      // Force kill
      await execAsync(`taskkill /F /PID ${pid}`);
      this.log(`Process ${pid} force killed`);

      // Verify termination
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await this.isProcessRunning(pid)) {
        if (retries < this.maxRetries) {
          this.log(`Process ${pid} still running, retrying...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          return await this.killPID(pid, retries + 1);
        } else {
          throw new Error(`Failed to kill process ${pid} after ${this.maxRetries} attempts`);
        }
      }

      return true;
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('not exist')) {
        this.log(`Process ${pid} no longer exists`);
        return true;
      }

      this.log(`Error killing process ${pid}: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Find processes by port
   */
  async findProcessByPort(port) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parseInt(parts[4]);
          if (!isNaN(pid)) {
            return pid;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find all service-related processes
   */
  async findServiceProcesses() {
    try {
      const processes = [];

      // Look for Node.js processes that might be our service
      const { stdout } = await execAsync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine,Name /format:csv');
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const commandLine = parts[1] || '';
          const name = parts[2] || '';
          const pid = parts[3] || '';

          // Check if this is likely our sync service
          if (commandLine.includes('sync-service-runner') ||
              commandLine.includes('service-wrapper-hybrid') ||
              commandLine.includes('Multi-Business')) {
            processes.push({
              PID: pid.trim(),
              Name: name.trim(),
              CommandLine: commandLine.trim()
            });
          }
        }
      }

      return processes;
    } catch (error) {
      this.log(`Error finding service processes: ${error.message}`, 'WARN');
      return [];
    }
  }

  /**
   * Ensure no service processes remain
   */
  async ensureNoServiceProcesses() {
    try {
      const processes = await this.findServiceProcesses();

      for (const proc of processes) {
        const pid = parseInt(proc.PID);
        if (!isNaN(pid)) {
          this.log(`Found remaining service process: ${proc.Name} (${pid})`);
          await this.killPID(pid);
        }
      }
    } catch (error) {
      this.log(`Error cleaning up service processes: ${error.message}`, 'WARN');
    }
  }

  /**
   * Wait for service to start and capture PID
   */
  async waitForServiceStart() {
    const maxWait = 30000; // 30 seconds
    const interval = 1000; // 1 second
    let waited = 0;

    while (waited < maxWait) {
      try {
        // Check if service is running
        const queryRes = await this.runScQuery();
        const stdout = queryRes || '';

        if (stdout.includes('RUNNING')) {
          // Try to find and save the PID
          const processes = await this.findServiceProcesses();
          if (processes.length > 0) {
            const pid = processes[0].PID;
            this.savePid(pid);
            this.log(`Service started with PID: ${pid}`);
            return true;
          }
        }
      } catch (error) {
        // Service might not be fully started yet
      }

      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
    }

    throw new Error('Service failed to start within timeout period');
  }

  /**
   * Save PID to file
   */
  savePid(pid) {
    try {
      if (!fs.existsSync(this.daemonPath)) {
        fs.mkdirSync(this.daemonPath, { recursive: true });
      }
      fs.writeFileSync(this.pidFile, pid.toString());
    } catch (error) {
      this.log(`Error saving PID: ${error.message}`, 'WARN');
    }
  }

  /**
   * Cleanup PID file
   */
  cleanupPidFile() {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
        this.log('PID file cleaned up');
      }
    } catch (error) {
      this.log(`Error cleaning up PID file: ${error.message}`, 'WARN');
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus() {
    // Ported from electricity-tokens: use sc.exe and buildServiceExpectedName
    const config = require('./config');
    const scCmd = config.commands.SC_COMMAND || 'sc.exe';
    // Use canonical internal service name
    const serviceName = this.serviceName;
    function buildServiceExpectedName(name) {
      // If name ends with .exe, remove it
      return name.replace(/\.exe$/i, '');
    }
    try {
      // Use runScQuery which will try candidate names and normalize to the expected .exe form
      const stdout = await this.runScQuery();
      let serviceStatus = 'UNKNOWN';
      if (stdout && stdout.includes('RUNNING')) {
        serviceStatus = 'RUNNING';
      } else if (stdout && stdout.includes('STOPPED')) {
        serviceStatus = 'STOPPED';
      }
      // PID logic unchanged
      const pid = this.getServicePid();
      let isRunning = false;
      if (pid) {
        isRunning = await this.isProcessRunning(pid);
      }
      return {
        serviceStatus,
        processRunning: isRunning,
        pid: pid,
        hasService: serviceStatus !== 'NOT_INSTALLED',
        synchronized: (serviceStatus === 'RUNNING') === isRunning
      };
    } catch (error) {
      // If sc reports the service does not exist, treat as NOT_INSTALLED
      const msg = error && error.message ? String(error.message) : String(error);
      this.log(`Error getting service status: ${msg}`, 'ERROR');
      if (msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('1060')) {
        return {
          serviceStatus: 'NOT_INSTALLED',
          processRunning: false,
          pid: null,
          hasService: false,
          synchronized: false,
          error: msg
        };
      }

      return {
        serviceStatus: 'ERROR',
        processRunning: false,
        pid: null,
        hasService: false,
        synchronized: false,
        error: msg
      };
    }
  }

  /**
   * Diagnose service health
   */
  async diagnose() {
    this.log('Running service diagnostics...');

    const status = await this.getServiceStatus();
  const syncPort = process.env.SYNC_PORT || 8765;
    const portProcess = await this.findProcessByPort(syncPort);
    const allProcesses = await this.findServiceProcesses();

    return {
      status,
      port: {
        number: syncPort,
        inUse: portProcess !== null,
        processId: portProcess
      },
      processes: allProcesses,
      files: {
        pidFileExists: fs.existsSync(this.pidFile),
        logFileExists: fs.existsSync(this.logFile),
        daemonDirExists: fs.existsSync(this.daemonPath)
      }
    };
  }
}

module.exports = HybridServiceManager;