"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncCompatibilityGuard = void 0;
exports.createSyncCompatibilityGuard = createSyncCompatibilityGuard;
// Normalize remote node objects from either snake_case (DB/raw) or camelCase (Prisma)
function getField(obj) {
    for (var _i = 1; _i < arguments.length; _i++) {
        var k = arguments[_i];
        if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined)
            return obj[k];
    }
    return undefined;
}
function normalizeRemoteNode(remoteNode) {
    if (!remoteNode || typeof remoteNode !== 'object')
        return { nodeId: 'unknown', nodeName: 'unknown', schemaVersion: 'unknown' };
    return {
        nodeId: String(getField(remoteNode, 'nodeId') || 'unknown'),
        nodeName: String(getField(remoteNode, 'nodeName') || 'unknown'),
        schemaVersion: String(getField(remoteNode, 'schemaVersion') || 'unknown'),
        schemaHash: getField(remoteNode, 'schemaHash'),
        migrationName: getField(remoteNode, 'migrationName'),
        schemaAppliedAt: getField(remoteNode, 'schemaAppliedAt'),
        schemaCompatible: (function () {
            var v = getField(remoteNode, 'schemaCompatible');
            return v !== undefined ? Boolean(v) : true;
        })()
    };
}
class SyncCompatibilityGuard {
    constructor(schemaVersionManager) {
        this.recentAttempts = [];
        this.maxAttemptHistory = 100;
        this.schemaVersionManager = schemaVersionManager;
    }
    async isSyncAllowed(remoteNode) {
        try {
            const normalized = normalizeRemoteNode(remoteNode);
            const compatibilityCheck = await this.schemaVersionManager.checkCompatibility(normalized);
            const attempt = {
                remoteNode: {
                    nodeId: normalized.nodeId,
                    nodeName: normalized.nodeName,
                    schemaVersion: normalized.schemaVersion
                },
                timestamp: new Date(),
                allowed: compatibilityCheck.isCompatible,
                reason: compatibilityCheck.reason,
                localVersion: compatibilityCheck.localVersion?.version,
                remoteVersion: compatibilityCheck.remoteVersion?.version
            };
            this.recordAttempt(attempt);
            if (!compatibilityCheck.isCompatible) {
                const reason = compatibilityCheck.reason || 'Schema versions are incompatible';
                console.warn(`🚫 Sync blocked with ${normalized.nodeName}: ${reason}`);
                return {
                    allowed: false,
                    reason,
                    compatibilityCheck
                };
            }
            const level = compatibilityCheck.compatibilityLevel;
            console.log(`✅ Sync allowed with ${normalized.nodeName} (${level})`);
            return {
                allowed: true,
                compatibilityCheck
            };
        }
        catch (error) {
            console.error('Failed to check sync compatibility:', error);
            const normalized = normalizeRemoteNode(remoteNode);
            const attempt = {
                remoteNode: {
                    nodeId: normalized.nodeId,
                    nodeName: normalized.nodeName,
                    schemaVersion: 'unknown'
                },
                timestamp: new Date(),
                allowed: false,
                reason: `Compatibility check failed: ${error instanceof Error ? error.message : String(error)}`
            };
            this.recordAttempt(attempt);
            return {
                allowed: false,
                reason: 'Failed to verify schema compatibility'
            };
        }
    }
    getSyncAttemptHistory() {
        return [...this.recentAttempts].reverse();
    }
    getSyncAttemptStats() {
        const totalAttempts = this.recentAttempts.length;
        const allowedAttempts = this.recentAttempts.filter(a => a.allowed).length;
        const blockedAttempts = totalAttempts - allowedAttempts;
        const successRate = totalAttempts > 0 ? (allowedAttempts / totalAttempts) * 100 : 0;
        const recentBlocks = this.recentAttempts
            .filter(a => !a.allowed)
            .slice(-10)
            .reverse();
        return {
            totalAttempts,
            allowedAttempts,
            blockedAttempts,
            successRate,
            recentBlocks
        };
    }
    clearAttemptHistory() {
        this.recentAttempts = [];
    }
    getCompatibilityIssuesSummary() {
        const blockedAttempts = this.recentAttempts.filter(a => !a.allowed);
        const nodeIssues = new Map();
        blockedAttempts.forEach(attempt => {
            const nodeId = attempt.remoteNode.nodeId;
            if (!nodeIssues.has(nodeId)) {
                nodeIssues.set(nodeId, []);
            }
            nodeIssues.get(nodeId).push(attempt);
        });
        const incompatibleNodes = Array.from(nodeIssues.entries()).map(([nodeId, attempts]) => {
            const latestAttempt = attempts[attempts.length - 1];
            return {
                nodeId,
                nodeName: latestAttempt.remoteNode.nodeName,
                lastAttempt: latestAttempt.timestamp,
                reason: latestAttempt.reason || 'Unknown compatibility issue',
                localVersion: latestAttempt.localVersion,
                remoteVersion: latestAttempt.remoteVersion
            };
        });
        const reasonCounts = new Map();
        blockedAttempts.forEach(attempt => {
            const reason = attempt.reason || 'Unknown';
            if (!reasonCounts.has(reason)) {
                reasonCounts.set(reason, { count: 0, nodes: new Set() });
            }
            const entry = reasonCounts.get(reason);
            entry.count++;
            entry.nodes.add(attempt.remoteNode.nodeId);
        });
        const commonIssues = Array.from(reasonCounts.entries())
            .map(([reason, data]) => ({
            reason,
            count: data.count,
            affectedNodes: Array.from(data.nodes)
        }))
            .sort((a, b) => b.count - a.count);
        return {
            incompatibleNodes,
            commonIssues
        };
    }
    recordAttempt(attempt) {
        this.recentAttempts.push(attempt);
        if (this.recentAttempts.length > this.maxAttemptHistory) {
            this.recentAttempts.shift();
        }
    }
}
exports.SyncCompatibilityGuard = SyncCompatibilityGuard;
function createSyncCompatibilityGuard(schemaVersionManager) {
    return new SyncCompatibilityGuard(schemaVersionManager);
}
