"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialLoadManager = void 0;
class InitialLoadManager {
    constructor(prisma, nodeId, registrationKey) {
        this.prisma = prisma;
        this.nodeId = nodeId;
        this.registrationKey = registrationKey;
    }
    async createDataSnapshot() {
        throw new Error('Method not implemented');
    }
    async initiateInitialLoad(targetPeer, options) {
        throw new Error('Method not implemented');
    }
    async requestInitialLoad(sourcePeer, options) {
        throw new Error('Method not implemented');
    }
    getActiveSessions() {
        throw new Error('Method not implemented');
    }
    getSession(sessionId) {
        throw new Error('Method not implemented');
    }
    async cancelSession(sessionId) {
        throw new Error('Method not implemented');
    }
}
exports.InitialLoadManager = InitialLoadManager;
