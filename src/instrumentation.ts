/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts
 * Perfect for starting background services like the print queue worker
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('\n🔧 Initializing server instrumentation...\n');

    try {
      // Start the print queue worker using node directly
      const { spawn } = require('child_process');
      const path = require('path');

      let restartCount = 0;
      const MAX_RESTARTS = 10;
      const BASE_DELAY = 5000; // 5 seconds

      const startWorker = () => {
        if (restartCount >= MAX_RESTARTS) {
          console.error(`❌ Print worker failed to start after ${MAX_RESTARTS} attempts. Giving up.`);
          return;
        }

        const workerPath = path.join(process.cwd(), 'simple-print-worker.js');
        const worker = spawn(process.execPath, [workerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false, // Keep attached to main process
          cwd: process.cwd(),
          env: { ...process.env, NODE_ENV: 'production' }
        });

        worker.stdout.on('data', (data: Buffer) => {
          console.log('Print worker:', data.toString().trim());
        });

        worker.stderr.on('data', (data: Buffer) => {
          console.error('Print worker error:', data.toString().trim());
        });

        worker.on('error', (err: any) => {
          console.error('Print worker failed to start:', err);
        });

        worker.on('exit', (code: any) => {
          restartCount++;

          if (code === 0) {
            // Normal exit - don't restart
            console.log('Print worker exited normally (code 0)');
            return;
          }

          // Calculate exponential backoff delay
          const delay = Math.min(BASE_DELAY * Math.pow(2, restartCount - 1), 300000); // Max 5 minutes

          console.error(`Print worker crashed with code ${code} (attempt ${restartCount}/${MAX_RESTARTS}). Restarting in ${delay/1000}s...`);

          setTimeout(startWorker, delay);
        });

        // Reset restart count on successful start
        restartCount = 0;

        return worker;
      };

      // Start the worker
      startWorker();

      console.log('✅ Print queue worker started with crash recovery');

    } catch (error) {
      console.error('❌ Failed to start print queue worker:', error);
    }

    console.log('✅ Server instrumentation complete\n');
  }
}
