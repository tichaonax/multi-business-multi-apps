"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkMonitor = void 0;
exports.createNetworkMonitor = createNetworkMonitor;
const events_1 = require("events");
const os_1 = require("os");
class NetworkMonitor extends events_1.EventEmitter {
    constructor(prisma, nodeId) {
        super();
        this.isOnline = true;
        this.hasInternet = true;
        this.lastOnlineTime = new Date();
        this.checkTimer = null;
        this.connectivityChecks = [];
        this.offlineStartTime = null;
        this.prisma = prisma;
        this.nodeId = nodeId;
        this.connectivityChecks = [
            {
                method: 'http',
                target: 'https://www.google.com',
                timeout: 5000,
                interval: 30000
            },
            {
                method: 'dns',
                target: 'google.com',
                timeout: 3000,
                interval: 60000
            }
        ];
        this.setupConnectivityMonitoring();
    }
    async start() {
        await this.checkConnectivity();
        this.startPeriodicChecks();
        this.emit('started');
    }
    stop() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        this.emit('stopped');
    }
    getNetworkStatus() {
        const networkIfaces = this.getNetworkInterfaces();
        const offlineDuration = this.offlineStartTime
            ? Math.floor((new Date().getTime() - this.offlineStartTime.getTime()) / 1000)
            : 0;
        return {
            isOnline: this.isOnline,
            hasInternet: this.hasInternet,
            lastOnlineTime: this.lastOnlineTime,
            offlineDuration,
            networkInterfaces: networkIfaces
        };
    }
    async forceCheck() {
        await this.checkConnectivity();
        return this.getNetworkStatus();
    }
    addConnectivityCheck(check) {
        this.connectivityChecks.push(check);
    }
    setupConnectivityMonitoring() {
        if (process.platform === 'win32') {
            this.startPeriodicNetworkInterfaceCheck();
        }
    }
    startPeriodicChecks() {
        this.checkTimer = setInterval(async () => {
            await this.checkConnectivity();
        }, 30000);
    }
    startPeriodicNetworkInterfaceCheck() {
        let lastNetworkHash = this.getNetworkInterfaceHash();
        setInterval(() => {
            const currentNetworkHash = this.getNetworkInterfaceHash();
            if (currentNetworkHash !== lastNetworkHash) {
                lastNetworkHash = currentNetworkHash;
                this.emit('network_interface_changed', this.getNetworkInterfaces());
                this.checkConnectivity();
            }
        }, 10000);
    }
    async checkConnectivity() {
        const wasOnline = this.isOnline;
        const hadInternet = this.hasInternet;
        const hasLocalNetwork = this.hasActiveNetworkInterface();
        const hasInternetConnectivity = await this.checkInternetConnectivity();
        this.isOnline = hasLocalNetwork;
        this.hasInternet = hasInternetConnectivity;
        if (wasOnline && !this.isOnline) {
            this.offlineStartTime = new Date();
            this.lastOnlineTime = new Date();
            await this.handleOfflineTransition();
            this.emit('offline', this.getNetworkStatus());
        }
        else if (!wasOnline && this.isOnline) {
            this.offlineStartTime = null;
            await this.handleOnlineTransition();
            this.emit('online', this.getNetworkStatus());
        }
        if (hadInternet !== this.hasInternet) {
            if (this.hasInternet) {
                this.emit('internet_restored', this.getNetworkStatus());
            }
            else {
                this.emit('internet_lost', this.getNetworkStatus());
            }
        }
        this.emit('status', this.getNetworkStatus());
    }
    hasActiveNetworkInterface() {
        const interfaces = (0, os_1.networkInterfaces)();
        for (const [name, nets] of Object.entries(interfaces)) {
            if (nets) {
                for (const net of nets) {
                    if (!net.internal && net.family === 'IPv4') {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    async checkInternetConnectivity() {
        const results = await Promise.allSettled(this.connectivityChecks.map(check => this.performConnectivityCheck(check)));
        return results.some(result => result.status === 'fulfilled' && result.value === true);
    }
    async performConnectivityCheck(check) {
        try {
            switch (check.method) {
                case 'http':
                    return await this.checkHttp(check.target, check.timeout);
                case 'dns':
                    return await this.checkDns(check.target, check.timeout);
                case 'ping':
                    return await this.checkPing(check.target, check.timeout);
                default:
                    return false;
            }
        }
        catch (error) {
            return false;
        }
    }
    async checkHttp(url, timeout) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-cache'
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch (error) {
            return false;
        }
    }
    async checkDns(hostname, timeout) {
        return new Promise((resolve) => {
            const dns = require('dns');
            const timer = setTimeout(() => {
                resolve(false);
            }, timeout);
            dns.lookup(hostname, (err) => {
                clearTimeout(timer);
                resolve(!err);
            });
        });
    }
    async checkPing(target, timeout) {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            const command = process.platform === 'win32'
                ? `ping -n 1 -w ${timeout} ${target}`
                : `ping -c 1 -W ${Math.floor(timeout / 1000)} ${target}`;
            const timer = setTimeout(() => {
                resolve(false);
            }, timeout + 1000);
            exec(command, (error, stdout) => {
                clearTimeout(timer);
                if (error) {
                    resolve(false);
                }
                else {
                    resolve(stdout.includes('TTL=') || stdout.includes('ttl='));
                }
            });
        });
    }
    getNetworkInterfaces() {
        const interfaces = (0, os_1.networkInterfaces)();
        const result = [];
        for (const [name, nets] of Object.entries(interfaces)) {
            if (nets) {
                for (const net of nets) {
                    if (!net.internal) {
                        result.push({
                            name,
                            address: net.address,
                            family: net.family
                        });
                    }
                }
            }
        }
        return result;
    }
    getNetworkInterfaceHash() {
        const interfaces = this.getNetworkInterfaces();
        const interfaceString = interfaces
            .map(iface => `${iface.name}:${iface.address}`)
            .sort()
            .join('|');
        const crypto = require('crypto');
        return crypto.createHash('md5').update(interfaceString).digest('hex');
    }
    async handleOfflineTransition() {
        try {
            await this.prisma.networkPartition.create({
                data: {
                    nodeId: this.nodeId,
                    partitionType: 'NETWORK_DISCONNECTION',
                    startTime: new Date(),
                    detectedAt: new Date(),
                    isResolved: false,
                    partitionMetadata: {
                        reason: 'Network interface disconnected',
                        lastKnownPeers: [],
                        networkInterfaces: this.getNetworkInterfaces()
                    }
                }
            });
            console.log('🔌 Network disconnected - entering offline mode');
        }
        catch (error) {
            console.error('Failed to record offline transition:', error);
        }
    }
    async handleOnlineTransition() {
        try {
            await this.prisma.networkPartition.updateMany({
                where: {
                    nodeId: this.nodeId,
                    isResolved: false,
                    partitionType: 'NETWORK_DISCONNECTION'
                },
                data: {
                    isResolved: true,
                    endTime: new Date(),
                    resolutionMetadata: {
                        reconnectedAt: new Date().toISOString(),
                        networkInterfaces: this.getNetworkInterfaces()
                    }
                }
            });
            console.log('🌐 Network reconnected - resuming sync operations');
        }
        catch (error) {
            console.error('Failed to record online transition:', error);
        }
    }
}
exports.NetworkMonitor = NetworkMonitor;
function createNetworkMonitor(prisma, nodeId) {
    return new NetworkMonitor(prisma, nodeId);
}
