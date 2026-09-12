# Google Drive Integration Requirements for Multi-Instance Data Sharing

**Date:** December 6, 2025
**Repository:** multi-business-multi-apps
**Owner:** tichaonax
**Branch:** bug-fixes

## Overview

This document outlines the requirements and implementation details for enabling two or more instances of the multi-business multi-apps system to share files via Google Drive. The primary use case is daily transaction data sharing between remote grocery stores and central management systems, where stores upload daily transaction summaries that other instances can download and process to update their local databases.

## Business Requirements

### Core Functionality
- **Daily Transaction Export**: Remote stores must be able to export daily transaction data (sales, inventory changes, customer data) to a shared Google Drive location.
- **Automated Data Retrieval**: Central systems and other store instances should automatically download and process shared transaction data.
- **Multi-Instance Synchronization**: Support for multiple app instances accessing the same shared drive without conflicts.
- **Data Integrity**: Ensure transaction data remains consistent across all instances after synchronization.

### Example Workflow
1. Remote grocery store completes daily operations.
2. System exports daily transaction data to a structured file (JSON/CSV).
3. File is uploaded to a designated Google Drive folder.
4. Central system detects new file and downloads it.
5. Central system processes the data and updates its database.
6. Other store instances can similarly access and sync the data.

## Technical Requirements

### Google Drive Setup

#### 1. Google Cloud Project Configuration
- Create a Google Cloud Project in Google Cloud Console
- Enable Google Drive API
- Create a Service Account with appropriate permissions
- Generate and securely store service account credentials (JSON key file)

#### 2. Drive Folder Structure
```
/Shared-Data
├── /Daily-Transactions
│   ├── /Store-001
│   │   ├── 2025-12-06-transactions.json
│   │   └── 2025-12-05-transactions.json
│   └── /Store-002
│       ├── 2025-12-06-transactions.json
│       └── 2025-12-05-transactions.json
├── /Processed
│   └── /Store-001
│       └── 2025-12-06-processed.flag
└── /Archive
    └── /Monthly
        └── 2025-11-transactions.zip
```

#### 3. Authentication and Security
- Use Google Service Account for server-to-server authentication
- Implement OAuth2 flow for user-authorized access if needed
- Secure credential storage (environment variables, encrypted files)
- Folder-level permissions to restrict access to authorized instances

### Application Architecture

#### 1. Service Components

##### GoogleDriveService Class
```typescript
class GoogleDriveService {
  constructor(credentials: ServiceAccountCredentials)

  async authenticate(): Promise<void>
  async uploadFile(filePath: string, drivePath: string): Promise<string>
  async downloadFile(fileId: string, localPath: string): Promise<void>
  async listFiles(folderId: string): Promise<FileMetadata[]>
  async createFolder(name: string, parentId?: string): Promise<string>
  async deleteFile(fileId: string): Promise<void>
}
```

##### DailyExportService Class
```typescript
class DailyExportService {
  constructor(driveService: GoogleDriveService, dbClient: PrismaClient)

  async exportDailyTransactions(storeId: string, date: Date): Promise<string>
  async uploadToDrive(filePath: string): Promise<string>
  async markAsExported(storeId: string, date: Date): Promise<void>
}
```

##### DailyImportService Class
```typescript
class DailyImportService {
  constructor(driveService: GoogleDriveService, dbClient: PrismaClient)

  async checkForNewFiles(): Promise<string[]>
  async downloadAndProcess(fileId: string): Promise<void>
  async updateLocalDatabase(transactions: TransactionData[]): Promise<void>
  async markAsProcessed(fileId: string): Promise<void>
}
```

#### 2. Data Format Specifications

##### Transaction Export Format (JSON)
```json
{
  "storeId": "STORE-001",
  "exportDate": "2025-12-06",
  "exportTimestamp": "2025-12-06T23:59:59Z",
  "transactions": [
    {
      "id": "txn-12345",
      "timestamp": "2025-12-06T14:30:00Z",
      "type": "sale",
      "items": [
        {
          "productId": "PROD-001",
          "quantity": 2,
          "unitPrice": 5.99,
          "total": 11.98
        }
      ],
      "totalAmount": 11.98,
      "customerId": "CUST-001"
    }
  ],
  "inventoryChanges": [
    {
      "productId": "PROD-001",
      "change": -2,
      "reason": "sale"
    }
  ]
}
```

#### 3. File Naming Convention
- `YYYY-MM-DD-transactions-{storeId}.json`
- Example: `2025-12-06-transactions-STORE-001.json`

### Implementation Steps

#### Phase 1: Infrastructure Setup
1. Create Google Cloud Project and enable Drive API
2. Set up Service Account and download credentials
3. Create shared folder structure in Google Drive
4. Configure environment variables for credentials

#### Phase 2: Core Service Development
1. Implement `GoogleDriveService` with authentication and basic operations
2. Create `DailyExportService` for transaction data export
3. Develop `DailyImportService` for data retrieval and processing
4. Add error handling and retry logic

#### Phase 3: Integration and Testing
1. Integrate services with existing backup/restore system
2. Implement scheduled jobs for daily export/import
3. Add conflict resolution for concurrent access
4. Test with multiple instances

#### Phase 4: Monitoring and Maintenance
1. Add logging for all file operations
2. Implement health checks for Drive connectivity
3. Create cleanup routines for old files
4. Set up alerts for sync failures

### Security Considerations

#### 1. Authentication Security
- Store service account credentials securely (not in version control)
- Use environment variables or secure key management
- Rotate credentials periodically

#### 2. Data Privacy
- Encrypt sensitive transaction data before upload
- Implement access controls at folder level
- Audit all file access and modifications

#### 3. Network Security
- Use HTTPS for all API communications
- Implement rate limiting to prevent abuse
- Monitor for unusual access patterns

### Performance Requirements

#### 1. File Size Limits
- Maximum daily transaction file size: 50MB
- Compression for large datasets
- Chunked upload for very large files

#### 2. Synchronization Timing
- Daily export: End of business day (11 PM local time)
- Import check: Every 15 minutes during business hours
- Processing timeout: 30 minutes per file

#### 3. Concurrent Access
- Support up to 10 simultaneous store instances
- Implement file locking mechanisms
- Queue processing for high-volume periods

### Error Handling and Recovery

#### 1. Network Failures
- Automatic retry with exponential backoff
- Offline queue for failed uploads
- Resume interrupted downloads

#### 2. Data Conflicts
- Version conflict detection
- Manual resolution workflows
- Audit trail for all changes

#### 3. Service Outages
- Graceful degradation during Drive outages
- Local caching of critical data
- Alert notifications for system administrators

### Dependencies and Libraries

#### Required Packages
```json
{
  "dependencies": {
    "googleapis": "^118.0.0",
    "google-auth-library": "^8.8.0",
    "@google-cloud/local-auth": "^2.1.0"
  },
  "devDependencies": {
    "@types/googleapis": "^118.0.0"
  }
}
```

### Testing Strategy

#### 1. Unit Tests
- Mock Google Drive API responses
- Test authentication flows
- Validate data transformation logic

#### 2. Integration Tests
- Test with actual Google Drive (development environment)
- Multi-instance synchronization scenarios
- Error condition handling

#### 3. End-to-End Tests
- Complete daily export/import cycle
- Performance testing with large datasets
- Failover and recovery testing

### Deployment Considerations

#### 1. Environment Configuration
- Separate Drive folders for development/staging/production
- Environment-specific service accounts
- Configuration management for credentials

#### 2. Monitoring and Logging
- Centralized logging for all sync operations
- Metrics collection for performance monitoring
- Alert system for sync failures

#### 3. Backup and Recovery
- Regular backups of shared Drive data
- Recovery procedures for data loss scenarios
- Version control for configuration changes

### Cost Analysis

#### Google Drive API Costs
- Free tier: 15 GB storage, 100 queries per 100 seconds
- Paid tier: Additional storage and higher quotas available
- Estimated monthly cost: $5-20 depending on usage

#### Development Time Estimate
- Phase 1 (Setup): 1-2 days
- Phase 2 (Core Development): 5-7 days
- Phase 3 (Integration): 3-4 days
- Phase 4 (Testing): 2-3 days
- **Total**: 11-16 days

### Success Metrics

#### 1. Functional Metrics
- 100% successful daily exports from all stores
- <5% failure rate for data imports
- <1 hour delay between export and import completion

#### 2. Performance Metrics
- Export time < 30 minutes for typical daily volume
- Import processing < 15 minutes per file
- <1% data loss or corruption during transfer

#### 3. Reliability Metrics
- 99.9% uptime for sync services
- <24 hour resolution time for critical issues
- Zero security breaches

### Next Steps

1. **Approval and Planning**: Review requirements and allocate development resources
2. **Google Cloud Setup**: Create project and configure service accounts
3. **Development Kickoff**: Begin implementation of core services
4. **Testing Phase**: Conduct thorough testing with realistic data volumes
5. **Deployment**: Roll out to production with monitoring in place

---

This document provides a comprehensive technical specification for implementing Google Drive-based file sharing between multiple instances of the multi-business multi-apps system, specifically designed for daily transaction data synchronization in a grocery store chain scenario.