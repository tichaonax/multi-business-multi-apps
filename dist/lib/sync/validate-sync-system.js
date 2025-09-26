"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncSystemValidator = void 0;
const sync_service_1 = require("./sync-service");
const security_manager_1 = require("./security-manager");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};
class SyncSystemValidator {
    constructor() {
        this.results = [];
    }
    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }
    async runTest(name, testFn) {
        const startTime = Date.now();
        this.log(`\n🔄 ${name}...`, 'cyan');
        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.results.push({ test: name, status: 'pass', duration });
            this.log(`✅ ${name} - PASSED (${duration}ms)`, 'green');
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const message = error instanceof Error ? error.message : String(error);
            this.results.push({ test: name, status: 'fail', message, duration });
            this.log(`❌ ${name} - FAILED (${duration}ms)`, 'red');
            this.log(`   Error: ${message}`, 'red');
        }
    }
    skipTest(name, reason) {
        this.results.push({ test: name, status: 'skip', message: reason });
        this.log(`⏭️  ${name} - SKIPPED (${reason})`, 'yellow');
    }
    async validateDependencies() {
        await this.runTest('Validate Dependencies', async () => {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            const dgram = await Promise.resolve().then(() => __importStar(require('dgram')));
            const os = await Promise.resolve().then(() => __importStar(require('os')));
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            if (!PrismaClient)
                throw new Error('PrismaClient not available');
            if (!crypto)
                throw new Error('crypto module not available');
            if (!dgram)
                throw new Error('dgram module not available');
            if (!os)
                throw new Error('os module not available');
            if (!fs)
                throw new Error('fs module not available');
        });
    }
    async validateSyncServiceCreation() {
        await this.runTest('SyncService Creation', async () => {
            const config = {
                nodeId: 'validation-node-1',
                nodeName: 'Validation Node 1',
                registrationKey: 'validation-key-123',
                port: 9001,
                syncInterval: 30000,
                enableAutoStart: false,
                logLevel: 'info',
                dataDirectory: './validation-data',
                maxLogSize: 1024 * 1024,
                maxLogFiles: 3,
                security: {
                    enableEncryption: true,
                    enableSignatures: true,
                }
            };
            const syncService = new sync_service_1.SyncService(config);
            const status = syncService.getStatus();
            if (status.nodeId !== 'validation-node-1') {
                throw new Error('Node ID not set correctly');
            }
            if (status.nodeName !== 'Validation Node 1') {
                throw new Error('Node name not set correctly');
            }
            if (status.isRunning !== false) {
                throw new Error('Service should not be running initially');
            }
        });
    }
    async validateSecurityManagerCreation() {
        await this.runTest('SecurityManager Creation', async () => {
            const securityManager = (0, security_manager_1.createSecurityManager)({
                nodeId: 'validation-security-node',
                registrationKey: 'validation-security-key',
                enableEncryption: true,
                enableSignatures: true,
            });
            if (!securityManager) {
                throw new Error('SecurityManager not created');
            }
            const requiredMethods = [
                'initialize', 'shutdown', 'authenticatePeer', 'establishSecureSession',
                'validateSession', 'encryptData', 'decryptData', 'getAuditLogs',
                'getSecurityStats', 'rotateRegistrationKey', 'revokeSession'
            ];
            for (const method of requiredMethods) {
                if (typeof securityManager[method] !== 'function') {
                    throw new Error(`SecurityManager missing method: ${method}`);
                }
            }
            await securityManager.shutdown();
        });
    }
    async validateDatabaseConnection() {
        await this.runTest('Database Connection', async () => {
            try {
                const prisma = new client_1.PrismaClient();
                await prisma.$connect();
                await prisma.$queryRaw `SELECT 1 as test`;
                await prisma.$disconnect();
            }
            catch (error) {
                if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                    throw new Error('Database connection refused - ensure PostgreSQL is running');
                }
                throw error;
            }
        });
    }
    async validateSyncServiceLifecycle() {
        await this.runTest('SyncService Lifecycle', async () => {
            const config = {
                nodeId: 'lifecycle-test-node',
                nodeName: 'Lifecycle Test Node',
                registrationKey: 'lifecycle-test-key',
                port: 9002,
                syncInterval: 30000,
                enableAutoStart: false,
                logLevel: 'error',
                dataDirectory: './lifecycle-test-data',
                maxLogSize: 1024 * 1024,
                maxLogFiles: 1,
            };
            const syncService = new sync_service_1.SyncService(config);
            await syncService.start();
            let status = syncService.getStatus();
            if (!status.isRunning) {
                throw new Error('Service not running after start');
            }
            await syncService.restart();
            status = syncService.getStatus();
            if (!status.isRunning) {
                throw new Error('Service not running after restart');
            }
            await syncService.stop();
            status = syncService.getStatus();
            if (status.isRunning) {
                throw new Error('Service still running after stop');
            }
        });
    }
    async validateSecurityAuthentication() {
        await this.runTest('Security Authentication', async () => {
            const securityManager = (0, security_manager_1.createSecurityManager)({
                nodeId: 'auth-test-node',
                registrationKey: 'auth-test-key',
                enableEncryption: true,
                enableSignatures: true,
                auditEnabled: false,
            });
            await securityManager.initialize();
            const peer = {
                nodeId: 'test-peer',
                address: '192.168.1.100',
                port: 8080
            };
            const correctKeyHash = (0, crypto_1.createHash)('sha256')
                .update('auth-test-key')
                .digest('hex');
            const authResult = await securityManager.authenticatePeer(peer, correctKeyHash);
            if (!authResult.success) {
                throw new Error(`Authentication failed: ${authResult.errorMessage}`);
            }
            if (!authResult.authToken) {
                throw new Error('Auth token not provided');
            }
            const incorrectKeyHash = 'incorrect-hash';
            const failAuthResult = await securityManager.authenticatePeer(peer, incorrectKeyHash);
            if (failAuthResult.success) {
                throw new Error('Authentication should have failed with incorrect key');
            }
            await securityManager.shutdown();
        });
    }
    async validateDataEncryption() {
        await this.runTest('Data Encryption', async () => {
            const securityManager = (0, security_manager_1.createSecurityManager)({
                nodeId: 'encryption-test-node',
                registrationKey: 'encryption-test-key',
                enableEncryption: true,
                enableSignatures: true,
                auditEnabled: false,
            });
            await securityManager.initialize();
            const testData = {
                message: 'test encrypted data',
                timestamp: new Date().toISOString(),
                value: 12345
            };
            const sessionKey = 'test-session-key-for-encryption';
            const encryptResult = await securityManager.encryptData(testData, sessionKey);
            if (!encryptResult.success) {
                throw new Error(`Encryption failed: ${encryptResult.errorMessage}`);
            }
            if (!encryptResult.encryptedData || !encryptResult.signature) {
                throw new Error('Encrypted data or signature missing');
            }
            const decryptResult = await securityManager.decryptData(encryptResult.encryptedData, encryptResult.signature, sessionKey);
            if (!decryptResult.success) {
                throw new Error(`Decryption failed: ${decryptResult.errorMessage}`);
            }
            const decryptedData = decryptResult.data;
            if (JSON.stringify(decryptedData) !== JSON.stringify(testData)) {
                throw new Error('Decrypted data does not match original');
            }
            await securityManager.shutdown();
        });
    }
    async validateConfigurationVariations() {
        await this.runTest('Configuration Variations', async () => {
            const minimalConfig = {
                nodeName: 'Minimal Node',
                registrationKey: 'minimal-key',
                port: 9003,
                syncInterval: 10000,
                enableAutoStart: false,
                logLevel: 'error',
                dataDirectory: './minimal-data',
                maxLogSize: 1024,
                maxLogFiles: 1,
            };
            const minimalService = new sync_service_1.SyncService(minimalConfig);
            const minimalStatus = minimalService.getStatus();
            if (!minimalStatus.nodeId) {
                throw new Error('Node ID should be auto-generated');
            }
            const noSecurityConfig = {
                ...minimalConfig,
                nodeName: 'No Security Node',
                port: 9004,
                security: {
                    enableEncryption: false,
                    enableSignatures: false,
                }
            };
            const noSecurityService = new sync_service_1.SyncService(noSecurityConfig);
            const noSecurityStatus = noSecurityService.getStatus();
            if (!noSecurityStatus.nodeId) {
                throw new Error('Node ID should be set for no-security config');
            }
            const customSecurityConfig = {
                ...minimalConfig,
                nodeName: 'Custom Security Node',
                port: 9005,
                security: {
                    enableEncryption: true,
                    enableSignatures: true,
                    keyRotationEnabled: true,
                    keyRotationInterval: 12 * 60 * 60 * 1000,
                    sessionTimeout: 30 * 60 * 1000,
                    maxFailedAttempts: 10,
                    rateLimitWindow: 30 * 1000,
                    rateLimitMaxRequests: 50,
                }
            };
            const customSecurityService = new sync_service_1.SyncService(customSecurityConfig);
            const customSecurityStatus = customSecurityService.getStatus();
            if (!customSecurityStatus.nodeId) {
                throw new Error('Node ID should be set for custom security config');
            }
        });
    }
    async validateErrorHandling() {
        await this.runTest('Error Handling', async () => {
            const invalidPortConfig = {
                nodeName: 'Invalid Port Node',
                registrationKey: 'invalid-port-key',
                port: -1,
                syncInterval: 10000,
                enableAutoStart: false,
                logLevel: 'error',
                dataDirectory: './invalid-port-data',
                maxLogSize: 1024,
                maxLogFiles: 1,
            };
            const invalidPortService = new sync_service_1.SyncService(invalidPortConfig);
            const emptyKeyConfig = {
                nodeName: 'Empty Key Node',
                registrationKey: '',
                port: 9006,
                syncInterval: 10000,
                enableAutoStart: false,
                logLevel: 'error',
                dataDirectory: './empty-key-data',
                maxLogSize: 1024,
                maxLogFiles: 1,
            };
            const emptyKeyService = new sync_service_1.SyncService(emptyKeyConfig);
            const status = invalidPortService.getStatus();
            if (status.isRunning) {
                throw new Error('Service should not be running with invalid config');
            }
            const syncStats = await invalidPortService.getSyncStats().catch(() => null);
            const securityStats = await invalidPortService.getSecurityStats();
            if (securityStats.totalAuthentications < 0) {
                throw new Error('Security stats should have valid default values');
            }
        });
    }
    async validateMultipleServices() {
        await this.runTest('Multiple Services', async () => {
            const services = [];
            try {
                for (let i = 0; i < 3; i++) {
                    const config = {
                        nodeId: `multi-service-node-${i}`,
                        nodeName: `Multi Service Node ${i}`,
                        registrationKey: 'multi-service-shared-key',
                        port: 9010 + i,
                        syncInterval: 30000,
                        enableAutoStart: false,
                        logLevel: 'error',
                        dataDirectory: `./multi-service-data-${i}`,
                        maxLogSize: 1024 * 1024,
                        maxLogFiles: 1,
                    };
                    const service = new sync_service_1.SyncService(config);
                    services.push(service);
                    await service.start();
                    const status = service.getStatus();
                    if (!status.isRunning) {
                        throw new Error(`Service ${i} failed to start`);
                    }
                    if (status.nodeId !== `multi-service-node-${i}`) {
                        throw new Error(`Service ${i} has incorrect node ID`);
                    }
                }
                for (let i = 0; i < services.length; i++) {
                    const status = services[i].getStatus();
                    if (!status.isRunning) {
                        throw new Error(`Service ${i} stopped unexpectedly`);
                    }
                }
            }
            finally {
                for (const service of services) {
                    try {
                        await service.stop();
                    }
                    catch (error) {
                    }
                }
            }
        });
    }
    async validateMemoryUsage() {
        await this.runTest('Memory Usage', async () => {
            const initialMemory = process.memoryUsage();
            for (let i = 0; i < 10; i++) {
                const config = {
                    nodeId: `memory-test-node-${i}`,
                    nodeName: `Memory Test Node ${i}`,
                    registrationKey: 'memory-test-key',
                    port: 9020 + i,
                    syncInterval: 30000,
                    enableAutoStart: false,
                    logLevel: 'error',
                    dataDirectory: `./memory-test-data-${i}`,
                    maxLogSize: 1024,
                    maxLogFiles: 1,
                };
                const service = new sync_service_1.SyncService(config);
                await service.start();
                await service.stop();
            }
            if (global.gc) {
                global.gc();
            }
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const maxAllowedIncrease = 50 * 1024 * 1024;
            if (memoryIncrease > maxAllowedIncrease) {
                throw new Error(`Excessive memory usage increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
            }
        });
    }
    async printSummary() {
        this.log('\n' + '='.repeat(60), 'bright');
        this.log('SYNC SYSTEM VALIDATION SUMMARY', 'bright');
        this.log('='.repeat(60), 'bright');
        const passed = this.results.filter(r => r.status === 'pass');
        const failed = this.results.filter(r => r.status === 'fail');
        const skipped = this.results.filter(r => r.status === 'skip');
        this.log(`\n📊 Results:`, 'bright');
        this.log(`   ✅ Passed: ${passed.length}`, 'green');
        this.log(`   ❌ Failed: ${failed.length}`, failed.length > 0 ? 'red' : 'green');
        this.log(`   ⏭️  Skipped: ${skipped.length}`, 'yellow');
        this.log(`   📈 Total: ${this.results.length}`, 'bright');
        if (failed.length > 0) {
            this.log(`\n❌ Failed Tests:`, 'red');
            for (const failure of failed) {
                this.log(`   • ${failure.test}: ${failure.message}`, 'red');
            }
        }
        if (skipped.length > 0) {
            this.log(`\n⏭️  Skipped Tests:`, 'yellow');
            for (const skip of skipped) {
                this.log(`   • ${skip.test}: ${skip.message}`, 'yellow');
            }
        }
        const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
        this.log(`\n⏱️  Total Duration: ${totalDuration}ms`, 'cyan');
        const successRate = Math.round((passed.length / (passed.length + failed.length)) * 100);
        this.log(`\n📊 Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');
        if (failed.length === 0) {
            this.log(`\n🎉 ALL VALIDATIONS PASSED! 🎉`, 'green');
            this.log('The sync system is ready for use.', 'green');
        }
        else {
            this.log(`\n⚠️  VALIDATION ISSUES FOUND`, 'red');
            this.log('Please address the failed tests before using the sync system.', 'red');
        }
        this.log('\n' + '='.repeat(60), 'bright');
    }
    async run() {
        this.log('🚀 Starting Sync System Validation...', 'bright');
        this.log('This will test all major components of the sync system.\n', 'cyan');
        await this.validateDependencies();
        await this.validateDatabaseConnection();
        await this.validateSyncServiceCreation();
        await this.validateSecurityManagerCreation();
        await this.validateSyncServiceLifecycle();
        await this.validateSecurityAuthentication();
        await this.validateDataEncryption();
        await this.validateConfigurationVariations();
        await this.validateErrorHandling();
        await this.validateMultipleServices();
        await this.validateMemoryUsage();
        await this.printSummary();
        const hasFailures = this.results.some(r => r.status === 'fail');
        return !hasFailures;
    }
}
exports.SyncSystemValidator = SyncSystemValidator;
async function main() {
    const validator = new SyncSystemValidator();
    try {
        const success = await validator.run();
        process.exit(success ? 0 : 1);
    }
    catch (error) {
        console.error('❌ Validation script failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
