export interface SyncNode {
  nodeId: string;
  nodeName: string;
  ipAddress: string;
  port: number;
  isActive: boolean;
  lastSeen: Date;
}

export interface SyncEvent {
  eventId: string;
  sourceNodeId: string;
  tableName: string;
  recordId: string;
  operation: string;
  changeData: any;
  beforeData?: any;
  vectorClock?: Record<string, number>;
  lamportClock?: string;
  checksum?: string;
  priority?: number;
  metadata?: any;
}

export interface NetworkPartition {
  id: string;
  nodeId: string;
  partitionType: string;
  startTime: Date;
  detectedAt: Date;
  isResolved: boolean;
  endTime?: Date;
  partitionMetadata?: any;
  resolutionMetadata?: any;
}

export interface ConflictResolution {
  id: string;
  conflictType: string;
  resolutionStrategy: string;
  sourceEventId: string;
  targetEventId?: string;
  resolvedData: any;
  resolvedBy?: string;
  resolvedAt: Date;
  eventIds: string[];
  resolution?: any;
  strategy?: string;
  metadata?: any;
}

export interface SyncMetrics {
  id: string;
  nodeId: string;
  metricDate: Date;
  eventsGenerated: number;
  eventsReceived: number;
  eventsProcessed: number;
  eventsFailed: number;
  conflictsDetected: number;
  conflictsResolved: number;
  syncLatencyMs?: number;
  networkLatencyMs?: number;
  dataTransferredBytes?: bigint;
  peersConnected?: number;
  peersDiscovered?: number;
}

export enum SyncOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export enum ResolutionStrategy {
  TIMESTAMP = 'TIMESTAMP',
  PRIORITY = 'PRIORITY',
  MANUAL = 'MANUAL',
  MERGE = 'MERGE',
  SOURCE_WINS = 'SOURCE_WINS',
  TARGET_WINS = 'TARGET_WINS',
  CUSTOM = 'CUSTOM'
}

export enum ConflictType {
  CREATE_CREATE = 'CREATE_CREATE',
  UPDATE_UPDATE = 'UPDATE_UPDATE',
  UPDATE_DELETE = 'UPDATE_DELETE',
  DELETE_UPDATE = 'DELETE_UPDATE',
  CONSTRAINT = 'CONSTRAINT'
}