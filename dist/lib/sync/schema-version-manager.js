"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaVersionManager = void 0;
exports.createSchemaVersionManager = createSchemaVersionManager;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SchemaVersionManager {
    constructor(prisma, nodeId) {
        this.schemaHash = null;
        this.currentVersion = null;
        this.prisma = prisma;
        this.nodeId = nodeId;
    }
    async initialize() {
        try {
            this.schemaHash = await this.calculateSchemaHash();
            const migrationVersion = await this.getCurrentMigrationVersion();
            this.currentVersion = {
                version: migrationVersion.version,
                hash: this.schemaHash,
                migrationName: migrationVersion.name,
                appliedAt: migrationVersion.appliedAt,
                isCompatible: true
            };
            await this.updateNodeSchemaVersion();
            console.log(`📊 Schema version initialized: ${this.currentVersion.version} (${this.schemaHash.substring(0, 8)}...)`);
        }
        catch (error) {
            console.error('❌ Failed to initialize schema version manager:', error);
            throw error;
        }
    }
    async checkCompatibility(remoteNode) {
        if (!this.currentVersion) {
            throw new Error('Schema version manager not initialized');
        }
        const remoteVersion = {
            version: remoteNode.schemaVersion || 'unknown',
            hash: remoteNode.schemaHash || '',
            migrationName: remoteNode.migrationName || 'unknown',
            appliedAt: remoteNode.schemaAppliedAt ? new Date(remoteNode.schemaAppliedAt) : new Date(),
            isCompatible: remoteNode.schemaCompatible !== false
        };
        let compatibilityLevel;
        let isCompatible = false;
        let reason;
        if (this.currentVersion.hash === remoteVersion.hash) {
            compatibilityLevel = 'IDENTICAL';
            isCompatible = true;
        }
        else if (this.currentVersion.version === remoteVersion.version) {
            if (this.isVersionCompatible(this.currentVersion.version, remoteVersion.version)) {
                compatibilityLevel = 'COMPATIBLE';
                isCompatible = true;
            }
            else {
                compatibilityLevel = 'INCOMPATIBLE';
                isCompatible = false;
                reason = `Same migration version (${this.currentVersion.version}) but different schema hash`;
            }
        }
        else {
            if (this.areVersionsCompatible(this.currentVersion.version, remoteVersion.version)) {
                compatibilityLevel = 'COMPATIBLE';
                isCompatible = true;
            }
            else {
                compatibilityLevel = 'INCOMPATIBLE';
                isCompatible = false;
                reason = `Migration version mismatch: local(${this.currentVersion.version}) vs remote(${remoteVersion.version})`;
            }
        }
        return {
            isCompatible,
            localVersion: this.currentVersion,
            remoteVersion,
            compatibilityLevel,
            reason
        };
    }
    getCurrentVersion() {
        return this.currentVersion;
    }
    async calculateSchemaHash() {
        try {
            const schemaPath = path_1.default.join(process.cwd(), 'prisma', 'schema.prisma');
            if (!fs_1.default.existsSync(schemaPath)) {
                throw new Error(`Prisma schema file not found: ${schemaPath}`);
            }
            const schemaContent = fs_1.default.readFileSync(schemaPath, 'utf8');
            const normalizedSchema = schemaContent
                .replace(/\/\/.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\s+/g, ' ')
                .trim();
            const hash = crypto_1.default.createHash('sha256').update(normalizedSchema).digest('hex');
            return hash;
        }
        catch (error) {
            console.error('Failed to calculate schema hash:', error);
            throw error;
        }
    }
    async getCurrentMigrationVersion() {
        try {
            const migrationExists = await this.prisma.$queryRaw `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
        );
      `;
            if (!migrationExists[0]?.exists) {
                return {
                    version: process.env.DB_SCHEMA_VERSION || '1.0.0',
                    name: 'schema_push',
                    appliedAt: new Date()
                };
            }
            const latestMigration = await this.prisma.$queryRaw `
        SELECT
          migration_name AS "migrationName",
          applied_steps_count AS "appliedStepsCount",
          finished_at AS "finishedAt"
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1;
      `;
            if (latestMigration.length === 0) {
                return {
                    version: '0.0.0',
                    name: 'no_migrations',
                    appliedAt: new Date()
                };
            }
            const migration = latestMigration[0];
            return {
                version: this.extractVersionFromMigrationName(migration.migrationName),
                name: migration.migrationName,
                appliedAt: new Date(migration.finishedAt)
            };
        }
        catch (error) {
            console.error('Failed to get migration version:', error);
            return {
                version: process.env.DB_SCHEMA_VERSION || '1.0.0',
                name: 'fallback_version',
                appliedAt: new Date()
            };
        }
    }
    extractVersionFromMigrationName(migrationName) {
        const timestampMatch = migrationName.match(/^(\d{14})_/);
        if (timestampMatch) {
            const timestamp = timestampMatch[1];
            const year = timestamp.substring(0, 4);
            const month = timestamp.substring(4, 6);
            const day = timestamp.substring(6, 8);
            return `${year}.${month}.${day}`;
        }
        const versionMatch = migrationName.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch) {
            return versionMatch[1];
        }
        return process.env.DB_SCHEMA_VERSION || '1.0.0';
    }
    async updateNodeSchemaVersion() {
        if (!this.currentVersion) {
            return;
        }
        try {
            await this.prisma.$executeRaw `
        UPDATE sync_nodes
        SET
          schema_version = ${this.currentVersion.version},
          schema_hash = ${this.currentVersion.hash},
          migration_name = ${this.currentVersion.migrationName},
          schema_applied_at = ${this.currentVersion.appliedAt},
          updated_at = NOW()
        WHERE node_id = ${this.nodeId};
      `;
        }
        catch (error) {
            console.error('Failed to update node schema version:', error);
        }
    }
    isVersionCompatible(localVersion, remoteVersion) {
        if (localVersion === remoteVersion) {
            return true;
        }
        const local = this.parseVersion(localVersion);
        const remote = this.parseVersion(remoteVersion);
        if (local.major === remote.major) {
            return true;
        }
        const compatibilityMatrix = {
            '1': ['1'],
            '2': ['2'],
        };
        const localMajorStr = local.major.toString();
        const remoteMajorStr = remote.major.toString();
        return compatibilityMatrix[localMajorStr]?.includes(remoteMajorStr) || false;
    }
    areVersionsCompatible(localVersion, remoteVersion) {
        return this.isVersionCompatible(localVersion, remoteVersion);
    }
    parseVersion(version) {
        const parts = version.split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
        };
    }
    async getCompatibilityReport() {
        try {
            const nodes = await this.prisma.$queryRaw `
        SELECT
          node_id AS "nodeId",
          node_name AS "nodeName",
          schema_version AS "schemaVersion",
          schema_hash AS "schemaHash",
          migration_name AS "migrationName",
          schema_applied_at AS "schemaAppliedAt",
          is_active AS "isActive"
        FROM sync_nodes
        WHERE is_active = true AND node_id != ${this.nodeId};
      `;
            const nodeDetails = [];
            let compatibleCount = 0;
            let incompatibleCount = 0;
            for (const node of nodes) {
                const compatibility = await this.checkCompatibility(node);
                nodeDetails.push({
                    nodeId: node.nodeId,
                    nodeName: node.nodeName,
                    isCompatible: compatibility.isCompatible,
                    compatibilityLevel: compatibility.compatibilityLevel,
                    version: node.schemaVersion || 'unknown',
                    reason: compatibility.reason
                });
                if (compatibility.isCompatible) {
                    compatibleCount++;
                }
                else {
                    incompatibleCount++;
                }
            }
            return {
                totalNodes: nodes.length,
                compatibleNodes: compatibleCount,
                incompatibleNodes: incompatibleCount,
                nodeDetails
            };
        }
        catch (error) {
            console.error('Failed to generate compatibility report:', error);
            return {
                totalNodes: 0,
                compatibleNodes: 0,
                incompatibleNodes: 0,
                nodeDetails: []
            };
        }
    }
}
exports.SchemaVersionManager = SchemaVersionManager;
function createSchemaVersionManager(prisma, nodeId) {
    return new SchemaVersionManager(prisma, nodeId);
}
