// Manual trigger for print queue processing
const { triggerQueueProcessing } = require('./src/lib/printing/print-queue-worker.ts');

console.log('Manually triggering print queue processing...');

triggerQueueProcessing()
  .then(() => {
    console.log('Queue processing completed');
  })
  .catch((error) => {
    console.error('Error during queue processing:', error);
  });