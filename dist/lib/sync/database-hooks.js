"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installSyncMiddleware = installSyncMiddleware;
exports.initializeSyncSystem = initializeSyncSystem;
exports.generateNodeId = generateNodeId;
const change_tracker_1 = require("./change-tracker");
const crypto_1 = __importDefault(require("crypto"));
function installSyncMiddleware(prisma, options) {
    if (typeof prisma.$use !== 'function') {
        console.warn('⚠️ Prisma client does not expose $use(); sync middleware will be disabled.');
        return;
    }
    const changeTracker = (0, change_tracker_1.getChangeTracker)(prisma, options.nodeId, options.registrationKey);
    prisma.$use(async (params, next) => {
        if (options.enabled === false) {
            return next(params);
        }
        const { model, action } = params;
        const excludedModels = [
            'Account', 'Session', 'VerificationToken', 'AuditLog',
            'SyncNode', 'SyncEvent', 'ConflictResolution', 'SyncSession',
            'NetworkPartition', 'SyncMetrics', 'SyncConfiguration'
        ];
        if (!model || excludedModels.includes(model)) {
            return next(params);
        }
        switch (action) {
            case 'create':
                return handleCreate(params, next, changeTracker, model, prisma);
            case 'update':
                return handleUpdate(params, next, changeTracker, model, prisma);
            case 'upsert':
                return handleUpsert(params, next, changeTracker, model, prisma);
            case 'delete':
                return handleDelete(params, next, changeTracker, model, prisma);
            case 'createMany':
                return handleCreateMany(params, next, changeTracker, model, prisma);
            case 'updateMany':
                return handleUpdateMany(params, next, changeTracker, model, prisma);
            case 'deleteMany':
                return handleDeleteMany(params, next, changeTracker, model, prisma);
            default:
                return next(params);
        }
    });
}
async function handleCreate(params, next, changeTracker, model, prisma) {
    const result = await next(params);
    try {
        if (result && result.id) {
            await changeTracker.trackCreate(model.toLowerCase(), result.id, result, getPriority(model, 'create'));
        }
    }
    catch (error) {
        console.error(`Failed to track CREATE for ${model}:`, error);
    }
    return result;
}
async function handleUpdate(params, next, changeTracker, model, prisma) {
    let beforeData = null;
    try {
        if (params.where) {
            beforeData = await prisma[model.toLowerCase()].findUnique({
                where: params.where
            });
        }
    }
    catch (error) {
        console.warn(`Failed to fetch before data for ${model}:`, error);
    }
    const result = await next(params);
    try {
        if (result && result.id) {
            await changeTracker.trackUpdate(model.toLowerCase(), result.id, result, beforeData, getPriority(model, 'update'));
        }
    }
    catch (error) {
        console.error(`Failed to track UPDATE for ${model}:`, error);
    }
    return result;
}
async function handleUpsert(params, next, changeTracker, model, prisma) {
    let existingRecord = null;
    try {
        if (params.where) {
            existingRecord = await prisma[model.toLowerCase()].findUnique({
                where: params.where
            });
        }
    }
    catch (error) {
        console.warn(`Failed to check existing record for ${model}:`, error);
    }
    const result = await next(params);
    try {
        if (result && result.id) {
            if (existingRecord) {
                await changeTracker.trackUpdate(model.toLowerCase(), result.id, result, existingRecord, getPriority(model, 'update'));
            }
            else {
                await changeTracker.trackCreate(model.toLowerCase(), result.id, result, getPriority(model, 'create'));
            }
        }
    }
    catch (error) {
        console.error(`Failed to track UPSERT for ${model}:`, error);
    }
    return result;
}
async function handleDelete(params, next, changeTracker, model, prisma) {
    let beforeData = null;
    try {
        if (params.where) {
            beforeData = await prisma[model.toLowerCase()].findUnique({
                where: params.where
            });
        }
    }
    catch (error) {
        console.warn(`Failed to fetch before data for ${model}:`, error);
    }
    const result = await next(params);
    try {
        if (beforeData && beforeData.id) {
            await changeTracker.trackDelete(model.toLowerCase(), beforeData.id, beforeData, getPriority(model, 'delete'));
        }
    }
    catch (error) {
        console.error(`Failed to track DELETE for ${model}:`, error);
    }
    return result;
}
async function handleCreateMany(params, next, changeTracker, model, prisma) {
    const result = await next(params);
    try {
        if (params.data && Array.isArray(params.data)) {
            const priority = getPriority(model, 'create');
            for (const data of params.data) {
                const tempId = crypto_1.default.randomUUID();
                await changeTracker.trackCreate(model.toLowerCase(), tempId, data, priority);
            }
        }
    }
    catch (error) {
        console.error(`Failed to track CREATE_MANY for ${model}:`, error);
    }
    return result;
}
async function handleUpdateMany(params, next, changeTracker, model, prisma) {
    let affectedRecords = [];
    try {
        if (params.where) {
            affectedRecords = await prisma[model.toLowerCase()].findMany({
                where: params.where
            });
        }
    }
    catch (error) {
        console.warn(`Failed to fetch affected records for ${model}:`, error);
    }
    const result = await next(params);
    try {
        const priority = getPriority(model, 'update');
        for (const record of affectedRecords) {
            const updatedData = { ...record, ...params.data };
            await changeTracker.trackUpdate(model.toLowerCase(), record.id, updatedData, record, priority);
        }
    }
    catch (error) {
        console.error(`Failed to track UPDATE_MANY for ${model}:`, error);
    }
    return result;
}
async function handleDeleteMany(params, next, changeTracker, model, prisma) {
    let affectedRecords = [];
    try {
        if (params.where) {
            affectedRecords = await prisma[model.toLowerCase()].findMany({
                where: params.where
            });
        }
    }
    catch (error) {
        console.warn(`Failed to fetch affected records for ${model}:`, error);
    }
    const result = await next(params);
    try {
        const priority = getPriority(model, 'delete');
        for (const record of affectedRecords) {
            await changeTracker.trackDelete(model.toLowerCase(), record.id, record, priority);
        }
    }
    catch (error) {
        console.error(`Failed to track DELETE_MANY for ${model}:`, error);
    }
    return result;
}
function getPriority(model, operation) {
    const highPriorityModels = [
        'User', 'Business', 'Employee', 'BusinessOrder', 'PersonalExpense'
    ];
    const mediumPriorityModels = [
        'BusinessProduct', 'BusinessCustomer', 'Vehicle', 'ProjectTransaction'
    ];
    if (operation === 'delete') {
        return highPriorityModels.includes(model) ? 9 : 7;
    }
    if (operation === 'create' && highPriorityModels.includes(model)) {
        return 8;
    }
    if (operation === 'update' && highPriorityModels.includes(model)) {
        return 7;
    }
    if (mediumPriorityModels.includes(model)) {
        return operation === 'delete' ? 6 : 5;
    }
    return 4;
}
async function initializeSyncSystem(prisma, options) {
    try {
        installSyncMiddleware(prisma, options);
        const changeTracker = (0, change_tracker_1.getChangeTracker)(prisma, options.nodeId, options.registrationKey);
        await changeTracker.initializeNode(options.nodeName, options.ipAddress, options.port || 8765);
        console.log(`✅ Sync system initialized for node: ${options.nodeId}`);
    }
    catch (error) {
        console.error('❌ Failed to initialize sync system:', error);
        throw error;
    }
}
function generateNodeId() {
    const { networkInterfaces } = require('os');
    const interfaces = networkInterfaces();
    let macAddress = '';
    for (const [name, nets] of Object.entries(interfaces)) {
        if (nets && Array.isArray(nets)) {
            for (const net of nets) {
                if (net.mac && net.mac !== '00:00:00:00:00:00') {
                    macAddress = net.mac;
                    break;
                }
            }
        }
        if (macAddress)
            break;
    }
    if (!macAddress) {
        const hostname = require('os').hostname();
        macAddress = hostname + '-' + Math.random().toString(36).substring(2, 15);
    }
    return crypto_1.default.createHash('sha256')
        .update(macAddress)
        .digest('hex')
        .substring(0, 16);
}
