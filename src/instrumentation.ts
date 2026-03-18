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
      // Import and start the print queue worker
      const { startPrintQueueWorker } = await import('./lib/printing/print-queue-worker');

      // Start the worker
      startPrintQueueWorker();

      console.log('✅ Print queue worker initialized\n');

    } catch (error) {
      console.error('❌ Failed to start print queue worker:', error);
    }

    console.log('✅ Server instrumentation complete\n');
  }
}
