"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerDiscoveryService = void 0;
exports.createPeerDiscovery = createPeerDiscovery;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
const os_1 = require("os");
class PeerDiscoveryService extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.broadcastTimer = null;
        this.discoveredPeers = new Map();
        this.multicastAddress = '224.0.0.251';
        this.isRunning = false;
        this.options = {
            broadcastInterval: 30000,
            discoveryPort: 5353,
            serviceName: 'multi-business-sync',
            ...options
        };
    }
    async start() {
        if (this.isRunning) {
            return;
        }
        try {
            const dgram = require('dgram');
            this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.udpSocket.on('message', this.handleIncomingMessage.bind(this));
            this.udpSocket.on('error', this.handleSocketError.bind(this));
            await new Promise((resolve, reject) => {
                this.udpSocket.bind(this.options.discoveryPort, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            this.udpSocket.addMembership(this.multicastAddress);
            this.startBroadcasting();
            this.startPeerCleanup();
            this.isRunning = true;
            this.emit('started');
            console.log(`✅ Peer discovery started on port ${this.options.discoveryPort}`);
        }
        catch (error) {
            console.error('❌ Failed to start peer discovery:', error);
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        try {
            if (this.broadcastTimer) {
                clearInterval(this.broadcastTimer);
                this.broadcastTimer = null;
            }
            await this.sendGoodbyeMessage();
            if (this.udpSocket) {
                this.udpSocket.close();
                this.udpSocket = null;
            }
            this.discoveredPeers.clear();
            this.isRunning = false;
            this.emit('stopped');
            console.log('✅ Peer discovery stopped');
        }
        catch (error) {
            console.error('❌ Error stopping peer discovery:', error);
        }
    }
    getDiscoveredPeers() {
        return Array.from(this.discoveredPeers.values())
            .filter(peer => peer.isAuthenticated);
    }
    getPeer(nodeId) {
        return this.discoveredPeers.get(nodeId);
    }
    isPeerAvailable(nodeId) {
        const peer = this.discoveredPeers.get(nodeId);
        return peer ? peer.isAuthenticated : false;
    }
    async forceDiscovery() {
        if (this.isRunning) {
            await this.broadcastPresence();
        }
    }
    startBroadcasting() {
        this.broadcastPresence();
        this.broadcastTimer = setInterval(() => {
            this.broadcastPresence();
        }, this.options.broadcastInterval);
    }
    async broadcastPresence() {
        try {
            const message = this.createPresenceMessage();
            const messageBuffer = Buffer.from(JSON.stringify(message));
            this.udpSocket.send(messageBuffer, 0, messageBuffer.length, this.options.discoveryPort, this.multicastAddress);
            this.emit('broadcast', message);
        }
        catch (error) {
            console.error('Error broadcasting presence:', error);
        }
    }
    createPresenceMessage() {
        const ipAddress = this.getLocalIPAddress();
        const registrationKeyHash = this.hashRegistrationKey();
        return {
            type: 'presence',
            nodeId: this.options.nodeId,
            nodeName: this.options.nodeName,
            ipAddress,
            port: this.options.port,
            serviceName: this.options.serviceName,
            registrationKeyHash,
            capabilities: [
                'sync-v1',
                'compression',
                'encryption',
                'vector-clocks',
                'conflict-resolution'
            ],
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }
    async sendGoodbyeMessage() {
        try {
            const message = {
                type: 'goodbye',
                nodeId: this.options.nodeId,
                timestamp: new Date().toISOString()
            };
            const messageBuffer = Buffer.from(JSON.stringify(message));
            this.udpSocket.send(messageBuffer, 0, messageBuffer.length, this.options.discoveryPort, this.multicastAddress);
        }
        catch (error) {
            console.error('Error sending goodbye message:', error);
        }
    }
    handleIncomingMessage(buffer, remoteInfo) {
        try {
            const message = JSON.parse(buffer.toString());
            if (message.nodeId === this.options.nodeId) {
                return;
            }
            switch (message.type) {
                case 'presence':
                    this.handlePresenceMessage(message, remoteInfo);
                    break;
                case 'goodbye':
                    this.handleGoodbyeMessage(message);
                    break;
                case 'auth_challenge':
                    this.handleAuthChallenge(message, remoteInfo);
                    break;
                case 'auth_response':
                    this.handleAuthResponse(message);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        }
        catch (error) {
            console.error('Error parsing discovery message:', error);
        }
    }
    handlePresenceMessage(message, remoteInfo) {
        if (message.serviceName !== this.options.serviceName) {
            return;
        }
        const expectedHash = this.hashRegistrationKey();
        if (message.registrationKeyHash !== expectedHash) {
            console.warn(`Registration key mismatch from node ${message.nodeId}`);
            return;
        }
        const peer = {
            nodeId: message.nodeId,
            nodeName: message.nodeName,
            ipAddress: message.ipAddress || remoteInfo.address,
            port: message.port,
            capabilities: message.capabilities || [],
            registrationKeyHash: message.registrationKeyHash,
            lastSeen: new Date(),
            isAuthenticated: true
        };
        const wasNew = !this.discoveredPeers.has(peer.nodeId);
        this.discoveredPeers.set(peer.nodeId, peer);
        if (wasNew) {
            this.emit('peer_discovered', peer);
            console.log(`🔍 Discovered new peer: ${peer.nodeName} (${peer.nodeId})`);
        }
        else {
            this.emit('peer_updated', peer);
        }
    }
    handleGoodbyeMessage(message) {
        const peer = this.discoveredPeers.get(message.nodeId);
        if (peer) {
            this.discoveredPeers.delete(message.nodeId);
            this.emit('peer_left', peer);
            console.log(`👋 Peer left: ${peer.nodeName} (${peer.nodeId})`);
        }
    }
    handleAuthChallenge(message, remoteInfo) {
        const response = {
            type: 'auth_response',
            nodeId: this.options.nodeId,
            challengeId: message.challengeId,
            registrationKeyHash: this.hashRegistrationKey(),
            timestamp: new Date().toISOString()
        };
        const responseBuffer = Buffer.from(JSON.stringify(response));
        this.udpSocket.send(responseBuffer, 0, responseBuffer.length, remoteInfo.port, remoteInfo.address);
    }
    handleAuthResponse(message) {
        const expectedHash = this.hashRegistrationKey();
        if (message.registrationKeyHash === expectedHash) {
            const peer = this.discoveredPeers.get(message.nodeId);
            if (peer) {
                peer.isAuthenticated = true;
                this.emit('peer_authenticated', peer);
            }
        }
    }
    handleSocketError(error) {
        console.error('Peer discovery socket error:', error);
        this.emit('error', error);
    }
    startPeerCleanup() {
        setInterval(() => {
            this.cleanupStalePeers();
        }, 60000);
    }
    cleanupStalePeers() {
        const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
        for (const [nodeId, peer] of this.discoveredPeers.entries()) {
            if (peer.lastSeen < staleThreshold) {
                this.discoveredPeers.delete(nodeId);
                this.emit('peer_stale', peer);
                console.log(`🕐 Removed stale peer: ${peer.nodeName} (${peer.nodeId})`);
            }
        }
    }
    getLocalIPAddress() {
        const interfaces = (0, os_1.networkInterfaces)();
        for (const [name, nets] of Object.entries(interfaces)) {
            if (nets) {
                for (const net of nets) {
                    if (!net.internal && net.family === 'IPv4') {
                        return net.address;
                    }
                }
            }
        }
        return '127.0.0.1';
    }
    hashRegistrationKey() {
        return crypto_1.default
            .createHash('sha256')
            .update(this.options.registrationKey + this.options.serviceName)
            .digest('hex');
    }
}
exports.PeerDiscoveryService = PeerDiscoveryService;
function createPeerDiscovery(options) {
    return new PeerDiscoveryService(options);
}
