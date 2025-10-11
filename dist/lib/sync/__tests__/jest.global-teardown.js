module.exports = async () => {
    console.log('🧹 Cleaning up after Sync System Test Suite...');
    const startTime = global.__TEST_CONFIG__?.startTime || Date.now();
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    console.log(`⏱️  Total test duration: ${minutes}m ${seconds}s`);
    if (global.__ORIGINAL_CONSOLE__) {
        Object.assign(console, global.__ORIGINAL_CONSOLE__);
    }
    if (global.__TEST_RESOURCES__) {
        try {
            await Promise.all(global.__TEST_RESOURCES__.map(cleanup => cleanup()));
        }
        catch (error) {
            console.error('Error during global cleanup:', error);
        }
    }
    console.log('✅ Global test teardown completed');
};
