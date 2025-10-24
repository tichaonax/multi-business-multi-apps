  async findServiceProcesses() {
    try {
      const processes = [];

      // CRITICAL FIX: Use unique path identifiers to avoid killing electricity-tokens service
      // Look for Node.js processes that might be our service
      const { stdout } = await execAsync(`wmic process where "name='node.exe'" get ProcessId,CommandLine,Name /format:csv`);
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const commandLine = parts[1] || '';
          const name = parts[2] || '';
          const pid = parts[3] || '';

          // Only identify processes that belong to THIS service (multi-business)
          // Check for unique identifiers in command line:
          // 1. multi-business-multi-apps path (unique to this service)
          // 2. sync-service-runner (unique to this service)
          // 3. MultiBusinessSyncService (service name)
          // NOTE: Avoid using 'service-wrapper-hybrid' as both services use it
          if (commandLine.includes('multi-business-multi-apps') ||
              commandLine.includes('sync-service-runner') ||
              commandLine.includes('MultiBusinessSyncService') ||
              commandLine.includes('Multi-Business') ||
              parseInt(pid, 10) === this.getServicePid()) {
            processes.push({
              PID: pid.trim(),
              Name: name.trim(),
              CommandLine: commandLine.trim()
            });
          }
        }
      }

      this.log(`Found ${processes.length} multi-business service processes`);
      return processes;
    } catch (error) {
      this.log(`Error finding service processes: ${error.message}`, 'WARN');
      return [];
    }
  }
