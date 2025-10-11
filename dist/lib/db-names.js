"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.getDbName = getDbName;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mappingPath = path_1.default.join(process.cwd(), 'scripts', 'prisma-relation-renames-fuzzy-filtered.json');
let RAW = [];
try {
    if (fs_1.default.existsSync(mappingPath)) {
        const raw = fs_1.default.readFileSync(mappingPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
            RAW = parsed;
    }
}
catch (err) {
}
const PRISMA_TO_DB = new Map();
const DB_TO_PRISMA = new Map();
for (const m of RAW) {
    if (!m || typeof m.from !== 'string')
        continue;
    const db = m.from;
    const prisma = typeof m.to === 'string' ? m.to : null;
    if (prisma) {
        PRISMA_TO_DB.set(prisma, db);
        DB_TO_PRISMA.set(db, prisma);
    }
}
function getDbName(name) {
    if (DB_TO_PRISMA.has(name))
        return name;
    if (PRISMA_TO_DB.has(name))
        return PRISMA_TO_DB.get(name);
    return name;
}
exports.db = Object.fromEntries(Array.from(PRISMA_TO_DB.entries()).map(([p, d]) => [p, d]));
exports.default = {
    getDbName,
    db: exports.db,
};
