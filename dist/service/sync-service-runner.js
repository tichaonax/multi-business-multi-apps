#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncServiceRunner = void 0;
const sync_service_1 = require("../lib/sync/sync-service");
const database_hooks_1 = require("../lib/sync/database-hooks");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = require("os");
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
            port: parseInt(process.env.SYNC_PORT || '3001'),
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
    async start() {
        try {
            console.log(`Starting Sync Service: ${this.config.nodeName}`);
            console.log(`Node ID: ${this.config.nodeId}`);
            console.log(`Port: ${this.config.port}`);
            console.log(`Registration Key: ${this.config.registrationKey ? '***' : 'NOT SET'}`);
            console.log(`Data Directory: ${this.config.dataDirectory}`);
            if (!this.config.registrationKey || this.config.registrationKey === 'default-registration-key-change-in-production') {
                console.warn('⚠️  WARNING: Using default registration key! Change SYNC_REGISTRATION_KEY environment variable for production.');
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
}
exports.SyncServiceRunner = SyncServiceRunner;
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'start';
    const runner = new SyncServiceRunner();
    switch (command) {
        case 'start':
            await runner.start();
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
        case 'help':
        default:
            console.log('Usage: node sync-service-runner.js [command]');
            console.log('');
            console.log('Commands:');
            console.log('  start    Start the sync service (default)');
            console.log('  stop     Stop the sync service');
            console.log('  restart  Restart the sync service');
            console.log('  status   Show service status');
            console.log('  sync     Force manual sync');
            console.log('  help     Show this help');
            console.log('');
            console.log('Environment Variables:');
            console.log('  SYNC_REGISTRATION_KEY  Registration key for secure peer discovery');
            console.log('  SYNC_PORT              Port to run sync service on (default: 3001)');
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
