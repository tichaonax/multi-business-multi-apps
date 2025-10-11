#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncServiceRunner = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env.local') });
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env') });
const sync_service_1 = require("../lib/sync/sync-service");
const database_hooks_1 = require("../lib/sync/database-hooks");
const fs_1 = __importDefault(require("fs"));
const os_1 = require("os");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SyncServiceRunner {
    constructor() {
        this.service = null;
        this.restartAttempts = 0;
        this.isShuttingDown = false;
        this.config = this.loadConfiguration();
        this.setupErrorHandlers();
    }
    loadConfiguration() {
        const configPath = path_1.default.join(process.cwd(), 'data', 'sync', 'config.json');
        const defaultConfig = {
            ...(0, sync_service_1.getDefaultSyncConfig)(),
            nodeId: (0, database_hooks_1.generateNodeId)(),
            nodeName: `sync-node-${(0, os_1.hostname)()}`,
            registrationKey: process.env.SYNC_REGISTRATION_KEY || 'default-registration-key-change-in-production',
            port: parseInt(process.env.SYNC_PORT || '8765'),
            syncInterval: parseInt(process.env.SYNC_INTERVAL || '30000'),
            enableAutoStart: true,
            logLevel: process.env.LOG_LEVEL || 'info',
            dataDirectory: path_1.default.join(process.cwd(), 'data', 'sync'),
            maxLogSize: 10 * 1024 * 1024,
            maxLogFiles: 5,
            autoRestart: true,
            restartDelay: 5000,
            maxRestartAttempts: 5
        };
        try {
            if (fs_1.default.existsSync(configPath)) {
                const configFile = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
                return { ...defaultConfig, ...configFile };
            }
        }
        catch (error) {
            console.warn('Failed to load config file, using defaults:', error);
        }
        return defaultConfig;
    }
    saveConfiguration() {
        try {
            const configPath = path_1.default.join(this.config.dataDirectory, 'config.json');
            const configDir = path_1.default.dirname(configPath);
            if (!fs_1.default.existsSync(configDir)) {
                fs_1.default.mkdirSync(configDir, { recursive: true });
            }
            fs_1.default.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
        }
        catch (error) {
            console.error('Failed to save configuration:', error);
        }
    }
    async runDatabaseSetup() {
        try {
            console.log('🗄️  Running database migrations...');
            await execAsync('npx prisma migrate deploy', {
                cwd: process.cwd(),
                env: { ...process.env }
            });
            console.log('✅ Database migrations completed');
            await this.verifyDatabaseSchema();
            console.log('🌱 Seeding reference data...');
            await execAsync('npm run seed:migration', {
                cwd: process.cwd(),
                env: { ...process.env }
            });
            console.log('✅ Database seeding completed');
        }
        catch (error) {
            console.error('❌ Database setup failed:', error instanceof Error ? error.message : error);
            console.log('💥 Sync service cannot start without a properly configured database');
            throw new Error(`Database setup failed: ${error instanceof Error ? error.message : error}`);
        }
    }
    async verifyDatabaseSchema() {
        try {
            console.log('🔍 Verifying database schema...');
            await execAsync('npx prisma db pull --force', {
                cwd: process.cwd(),
                env: { ...process.env }
            });
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            try {
                const res = await prisma.$queryRaw `SELECT 1 as ok FROM information_schema.tables WHERE table_name = 'sync_nodes' LIMIT 1`;
                const hasTable = Array.isArray(res) ? res.length > 0 : !!res;
                if (!hasTable) {
                    throw new Error('sync_nodes table not found');
                }
                console.log('✅ Database schema verification completed');
            }
            finally {
                await prisma.$disconnect();
            }
        }
        catch (error) {
            console.error('❌ Database schema verification failed:', error instanceof Error ? error.message : error);
            throw new Error(`Database schema is not ready: ${error instanceof Error ? error.message : error}`);
        }
    }
    async start(options = {}) {
        try {
            console.log(`Starting Sync Service: ${this.config.nodeName}`);
            console.log(`Node ID: ${this.config.nodeId}`);
            console.log(`Port: ${this.config.port}`);
            console.log(`Registration Key: ${this.config.registrationKey ? '***' : 'NOT SET'}`);
            console.log(`Data Directory: ${this.config.dataDirectory}`);
            if (!this.config.registrationKey || this.config.registrationKey === 'default-registration-key-change-in-production') {
                console.warn('⚠️  WARNING: Using default registration key! Change SYNC_REGISTRATION_KEY environment variable for production.');
            }
            if (await this.isBuildRequired(options.forceBuild)) {
                await this.forceBuild();
            }
            if (process.env.SKIP_SYNC_RUNNER_MIGRATIONS !== 'true') {
                await this.runDatabaseSetup();
            }
            else {
                console.log('🔄 Skipping database setup (handled by service wrapper)');
                await this.verifyDatabaseSchema();
            }
            this.service = (0, sync_service_1.createSyncService)(this.config);
            this.setupServiceEventHandlers();
            this.saveConfiguration();
            await this.service.start();
            this.restartAttempts = 0;
            console.log('🚀 Sync service started successfully');
        }
        catch (error) {
            console.error('❌ Failed to start sync service:', error);
            if (this.config.autoRestart && !this.isShuttingDown) {
                await this.handleRestart(error);
            }
            else {
                process.exit(1);
            }
        }
    }
    async stop() {
        this.isShuttingDown = true;
        if (this.service) {
            try {
                console.log('Stopping sync service...');
                await this.service.stop();
                console.log('✅ Sync service stopped');
            }
            catch (error) {
                console.error('Error stopping sync service:', error);
            }
        }
    }
    async restart() {
        console.log('Restarting sync service...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.start();
    }
    async handleRestart(error) {
        this.restartAttempts++;
        if (this.restartAttempts > this.config.maxRestartAttempts) {
            console.error(`❌ Maximum restart attempts (${this.config.maxRestartAttempts}) exceeded. Exiting.`);
            process.exit(1);
        }
        console.log(`🔄 Attempting restart ${this.restartAttempts}/${this.config.maxRestartAttempts} in ${this.config.restartDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
        if (!this.isShuttingDown) {
            await this.start();
        }
    }
    setupServiceEventHandlers() {
        if (!this.service)
            return;
        this.service.on('started', (status) => {
            console.log('📡 Service started:', status.nodeName);
        });
        this.service.on('stopped', () => {
            console.log('⏹️  Service stopped');
        });
        this.service.on('peer_discovered', (peer) => {
            console.log(`🔍 Peer discovered: ${peer.nodeName} (${peer.ipAddress}:${peer.port})`);
        });
        this.service.on('peer_left', (peer) => {
            console.log(`👋 Peer left: ${peer.nodeName}`);
        });
        this.service.on('sync_completed', ({ peer, sentEvents, receivedEvents }) => {
            console.log(`🔄 Sync completed with ${peer.nodeName}: ↑${sentEvents} ↓${receivedEvents}`);
        });
        this.service.on('sync_failed', ({ peer, error }) => {
            console.error(`❌ Sync failed with ${peer.nodeName}:`, error.message);
        });
        this.service.on('conflict_resolved', (conflict) => {
            console.log(`⚖️  Conflict resolved using ${conflict.strategy}`);
        });
        this.service.on('health_check', (status) => {
            if (this.config.logLevel === 'debug') {
                console.log(`💓 Health: ${status.peersConnected} peers, uptime: ${Math.round(status.uptime / 1000)}s`);
            }
        });
    }
    setupErrorHandlers() {
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught Exception:', error);
            if (this.config.autoRestart && !this.isShuttingDown) {
                await this.handleRestart(error);
            }
            else {
                process.exit(1);
            }
        });
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            if (this.config.autoRestart && !this.isShuttingDown) {
                await this.handleRestart(reason);
            }
            else {
                process.exit(1);
            }
        });
        process.on('SIGINT', async () => {
            console.log('\n📡 Received SIGINT, shutting down gracefully...');
            await this.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\n📡 Received SIGTERM, shutting down gracefully...');
            await this.stop();
            process.exit(0);
        });
        if (process.platform === 'win32') {
            process.on('SIGHUP', async () => {
                console.log('\n📡 Received SIGHUP, restarting...');
                await this.restart();
            });
        }
    }
    getStatus() {
        return this.service ? this.service.getStatus() : null;
    }
    async forceSync() {
        if (this.service) {
            await this.service.forceSync();
        }
    }
    async isBuildRequired(forceBuild = false) {
        try {
            console.log('🔍 Checking if build is required...');
            if (forceBuild) {
                console.log('🔨 Force build requested - skipping build detection');
                return true;
            }
            const fs = require('fs');
            const path = require('path');
            const distPath = path.join(process.cwd(), 'dist/service');
            console.log(`🔍 Checking dist directory: ${distPath}`);
            if (!fs.existsSync(distPath)) {
                console.log('🔍 Build required: dist directory missing');
                return true;
            }
            const mainServiceFile = path.join(distPath, 'sync-service-runner.js');
            console.log(`🔍 Checking main service file: ${mainServiceFile}`);
            if (!fs.existsSync(mainServiceFile)) {
                console.log('🔍 Build required: main service file missing');
                return true;
            }
            const buildInfoFile = path.join(distPath, 'build-info.json');
            console.log(`🔍 Checking build info file: ${buildInfoFile}`);
            if (!fs.existsSync(buildInfoFile)) {
                console.log('🔍 Build required: no build info file found');
                return true;
            }
            const currentCommit = await this.getCurrentGitCommit();
            const lastBuildCommit = this.getLastBuildCommit(buildInfoFile);
            if (!currentCommit) {
                if (lastBuildCommit) {
                    console.log('⚠️  Cannot determine current commit but build info exists - assuming build is current');
                    return false;
                }
                else {
                    console.log('🔍 Build required: no git access and no build commit info');
                    return true;
                }
            }
            if (!lastBuildCommit) {
                console.log('🔍 Build required: current commit detected but no last build commit info');
                return true;
            }
            if (currentCommit !== lastBuildCommit) {
                console.log(`🔍 Build required: code changes detected ${lastBuildCommit.substring(0, 8)} → ${currentCommit.substring(0, 8)}`);
                return true;
            }
            console.log(`✅ Build not required: both at commit ${currentCommit.substring(0, 8)}`);
            return false;
        }
        catch (error) {
            console.log('🔍 Build required: error checking build status, building to be safe');
            return true;
        }
    }
    async getCurrentGitCommit() {
        try {
            const fs = require('fs');
            const path = require('path');
            const gitHeadFile = path.join(process.cwd(), '.git', 'HEAD');
            if (fs.existsSync(gitHeadFile)) {
                try {
                    const headContent = fs.readFileSync(gitHeadFile, 'utf8').trim();
                    if (headContent.startsWith('ref: ')) {
                        const refPath = headContent.substring(5);
                        const refFile = path.join(process.cwd(), '.git', refPath);
                        if (fs.existsSync(refFile)) {
                            const commit = fs.readFileSync(refFile, 'utf8').trim();
                            if (commit && commit.length === 40) {
                                return commit;
                            }
                        }
                    }
                    else if (headContent.length === 40) {
                        return headContent;
                    }
                }
                catch (err) {
                }
            }
            try {
                const { execSync } = require('child_process');
                const commit = execSync('git rev-parse HEAD', {
                    cwd: process.cwd(),
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'ignore'],
                }).trim();
                if (commit && commit.length === 40) {
                    return commit;
                }
            }
            catch (err) {
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    getLastBuildCommit(buildInfoFile) {
        try {
            const fs = require('fs');
            if (fs.existsSync(buildInfoFile)) {
                const buildInfo = JSON.parse(fs.readFileSync(buildInfoFile, 'utf8'));
                return buildInfo.gitCommit;
            }
        }
        catch (err) {
        }
        return null;
    }
    async forceBuild() {
        try {
            console.log('🔨 Building TypeScript files...');
            await execAsync('npx tsc --project tsconfig.service.json', {
                cwd: process.cwd(),
                env: { ...process.env }
            });
            console.log('✅ TypeScript build completed successfully');
            await this.createBuildInfo();
        }
        catch (error) {
            console.error('❌ TypeScript build failed:', error instanceof Error ? error.message : error);
            throw new Error(`Build failed: ${error instanceof Error ? error.message : error}`);
        }
    }
    async createBuildInfo() {
        try {
            const fs = require('fs');
            const path = require('path');
            const distPath = path.join(process.cwd(), 'dist/service');
            if (!fs.existsSync(distPath)) {
                fs.mkdirSync(distPath, { recursive: true });
                console.log('📁 Created dist/service directory');
            }
            const currentCommit = await this.getCurrentGitCommit();
            const buildInfo = {
                buildTimestamp: new Date().toISOString(),
                gitCommit: currentCommit,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            };
            const buildInfoFile = path.join(distPath, 'build-info.json');
            fs.writeFileSync(buildInfoFile, JSON.stringify(buildInfo, null, 2));
            console.log(`📝 Created build-info.json with commit: ${currentCommit ? currentCommit.substring(0, 8) : 'unknown'}`);
        }
        catch (error) {
            console.warn('⚠️  Warning: Could not create build-info.json:', error instanceof Error ? error.message : error);
        }
    }
}
exports.SyncServiceRunner = SyncServiceRunner;
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'start';
    const flags = {
        forceBuild: args.includes('--force-build') || args.includes('-f'),
        verbose: args.includes('--verbose') || args.includes('-v')
    };
    const runner = new SyncServiceRunner();
    switch (command) {
        case 'start':
            await runner.start({ forceBuild: flags.forceBuild });
            break;
        case 'stop':
            await runner.stop();
            break;
        case 'restart':
            await runner.restart();
            break;
        case 'status':
            const status = runner.getStatus();
            if (status) {
                console.log('Service Status:');
                console.log(`  Running: ${status.isRunning}`);
                console.log(`  Node: ${status.nodeName} (${status.nodeId})`);
                console.log(`  Uptime: ${Math.round(status.uptime / 1000)}s`);
                console.log(`  Peers: ${status.peersConnected}`);
                console.log(`  Events Synced: ${status.totalEventsSynced}`);
                console.log(`  Conflicts Resolved: ${status.conflictsResolved}`);
                console.log(`  Sync Errors: ${status.syncErrors}`);
            }
            else {
                console.log('Service is not running');
            }
            break;
        case 'sync':
            await runner.forceSync();
            console.log('Manual sync triggered');
            break;
        case 'build':
            await runner.forceBuild();
            console.log('TypeScript build completed');
            break;
        case 'help':
        default:
            console.log('Usage: node sync-service-runner.js [command] [flags]');
            console.log('');
            console.log('Commands:');
            console.log('  start    Start the sync service (default)');
            console.log('  stop     Stop the sync service');
            console.log('  restart  Restart the sync service');
            console.log('  status   Show service status');
            console.log('  sync     Force manual sync');
            console.log('  build    Force TypeScript build compilation');
            console.log('  help     Show this help');
            console.log('');
            console.log('Flags:');
            console.log('  --force-build, -f      Force TypeScript build before starting service');
            console.log('  --verbose, -v          Enable verbose output');
            console.log('');
            console.log('Examples:');
            console.log('  node sync-service-runner.js start --force-build');
            console.log('  node sync-service-runner.js start -f');
            console.log('  node sync-service-runner.js build');
            console.log('');
            console.log('Environment Variables:');
            console.log('  SYNC_REGISTRATION_KEY  Registration key for secure peer discovery');
            console.log('  SYNC_PORT              Port to run sync service on (default: 8765)');
            console.log('  SYNC_INTERVAL          Sync interval in milliseconds (default: 30000)');
            console.log('  LOG_LEVEL              Log level: error, warn, info, debug (default: info)');
            break;
    }
    if (command === 'start') {
        process.stdin.resume();
    }
}
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Service runner error:', error);
        process.exit(1);
    });
}
