# Multi-Business Sync Platform Installation

Complete installation system for the multi-business peer-to-peer synchronization platform.

## Overview

This installation system provides automated setup for:

- **Database Creation**: PostgreSQL database with all required tables
- **Initial Data Seeding**: Reference data, job titles, permissions, etc.
- **Sync Service Installation**: Background service for peer-to-peer synchronization
- **Admin User Creation**: Default admin account for system management
- **Security Configuration**: Authentication keys and encryption setup

## Quick Start

### Full Installation (Recommended)

```bash
# Complete installation with database and service
npm run install:full
```

### Development Installation

```bash
# Install for development (no system service)
npm run install:dev
```

### Partial Installations

```bash
# Database only
npm run install:database

# Service only (assumes database exists)
npm run install:service
```

## Installation Options

### Command Line Options

```bash
node scripts/install/install.js [options]
```

**Available Options:**
- `--skip-database` - Skip database installation and seeding
- `--skip-service` - Skip system service installation
- `--dev-mode` - Install in development mode (no service)
- `--silent` - Minimal console output
- `--force` - Force installation (skip confirmations)
- `--help`, `-h` - Show help message

### Environment Variables

Configure installation behavior with environment variables:

#### Database Configuration
```bash
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_HOST=localhost          # Default: localhost
POSTGRES_PORT=5432              # Default: 5432
POSTGRES_USER=postgres          # Default: postgres
POSTGRES_PASSWORD=your_password # Required
POSTGRES_DB=multi_business_db   # Default: multi_business_db
```

#### Sync Service Configuration
```bash
SYNC_PORT=8765                     # Default: 8765
SYNC_REGISTRATION_KEY=your_key     # Auto-generated if not set
CREATE_SERVICE=true               # Default: true
START_SERVICE=true                # Default: true
ENABLE_AUTO_START=true            # Default: true
```

## Prerequisites

### System Requirements

- **Node.js**: Version 16 or higher
- **PostgreSQL**: Version 12 or higher
- **npm**: Latest version
- **Operating System**: Windows 10+, Linux, or macOS

### Windows-Specific Requirements

For service installation on Windows:
- Run as Administrator
- PowerShell execution policy set to allow scripts

### Linux/macOS-Specific Requirements

For service installation on Unix systems:
- Run with sudo privileges
- systemd available (most modern Linux distributions)

## Installation Process

### Phase 1: Pre-installation Checks
- Verifies Node.js version
- Checks PostgreSQL availability
- Validates project structure
- Tests port availability

### Phase 2: Dependency Installation
- Installs npm packages
- Generates Prisma client
- Installs sync service dependencies

### Phase 3: Database Setup
- Creates PostgreSQL database
- Runs schema migrations
- Seeds reference data:
  - ID format templates (5 countries)
  - Phone format templates (7 countries)
  - Date format templates (5 formats)
  - Job titles (29 titles)
  - Compensation types (15 types)
  - Benefit types (28 types)
  - Business categories (10 categories)
  - Permission templates (9 templates)

### Phase 4: Service Installation
- Creates service configuration
- Installs system service (Windows/Linux)
- Sets up health monitoring
- Configures auto-start

### Phase 5: Post-installation Setup
- Creates .env file
- Sets up log rotation
- Creates backup scripts
- Configures monitoring

### Phase 6: Verification
- Tests database connection
- Verifies service health
- Validates configuration files

## Post-Installation

### Default Admin Account

The installation creates a default admin user:
- **Email**: admin@business.local
- **Password**: admin123
- **Role**: System Administrator

**⚠️ Important**: Change the default password immediately after installation.

### Service Management

#### Windows Commands
```bash
# Start service
net start "multi-business-sync"

# Stop service
net stop "multi-business-sync"

# Check status
sc query "multi-business-sync"
```

#### Linux/macOS Commands
```bash
# Start service
sudo systemctl start multi-business-sync

# Stop service
sudo systemctl stop multi-business-sync

# Check status
sudo systemctl status multi-business-sync

# Enable auto-start
sudo systemctl enable multi-business-sync
```

### Management Scripts

The installation creates management scripts in `scripts/install/`:

- `start-service.bat/.sh` - Start the sync service
- `stop-service.bat/.sh` - Stop the sync service
- `status-service.bat/.sh` - Check service status

### Health Monitoring

The sync service provides a health check endpoint:

```bash
# Check service health
curl http://localhost:8766/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "memoryUsage": {...},
  "syncService": {...}
}
```

## Configuration

### Service Configuration

Main configuration file: `config/service-config.json`

```json
{
  "service": {
    "name": "multi-business-sync",
    "displayName": "Multi-Business Sync Service",
    "port": 8765,
    "autoStart": true
  },
  "sync": {
    "nodeId": "unique-node-id",
    "nodeName": "Node Name",
    "registrationKey": "shared-key-for-all-nodes",
    "syncInterval": 30000,
    "security": {
      "enableEncryption": true,
      "enableSignatures": true
    }
  }
}
```

### Environment Configuration

Environment file: `config/service.env`

Contains sensitive configuration like database URLs and encryption keys.

### Logging Configuration

Logs are written to `logs/` directory:
- `service.log` - General service logs
- `service-error.log` - Error logs only
- `sync.log` - Sync operation logs

## Networking

### Required Ports

The installation configures the following ports:

- **Sync Port**: 8765 (configurable)
- **Health Check Port**: 8766 (sync port + 1)
- **Web Application**: 3000 (development)

### Firewall Configuration

For multi-node synchronization, ensure the sync port is open:

#### Windows Firewall
```bash
netsh advfirewall firewall add rule name="Multi-Business Sync" dir=in action=allow protocol=TCP localport=8765
```

#### Linux iptables
```bash
sudo iptables -A INPUT -p tcp --dport 8765 -j ACCEPT
```

#### Linux ufw
```bash
sudo ufw allow 8765/tcp
```

## Multi-Node Setup

### Adding Additional Nodes

1. Install the platform on each node using the same registration key:
   ```bash
   SYNC_REGISTRATION_KEY="shared-key" npm run install:full
   ```

2. Ensure network connectivity between nodes

3. Configure unique node names for identification

4. Monitor sync status through the admin dashboard

### Registration Key Management

All nodes in a sync network must share the same registration key:

1. Generate a secure key for the first installation
2. Use the same key for all subsequent installations
3. Store the key securely
4. Rotate keys periodically using the admin dashboard

## Backup and Recovery

### Automated Backups

The installation creates backup scripts:

```bash
# Create database backup
npm run backup:database

# Automated daily backups (set up with cron/task scheduler)
node scripts/backup-database.js
```

### Manual Backup

```bash
# Backup database
pg_dump "postgresql://user:pass@host:port/db" > backup.sql

# Backup configuration
cp -r config/ backup-config/
cp .env backup-env
```

### Recovery

```bash
# Restore database
psql "postgresql://user:pass@host:port/db" < backup.sql

# Restore configuration
cp -r backup-config/ config/
cp backup-env .env

# Restart service
npm run sync-service:restart
```

## Monitoring and Maintenance

### Log Rotation

Automatic log rotation is configured:

```bash
# Manual log rotation
npm run rotate:logs
```

### Service Monitoring

Automated service monitoring:

```bash
# Start monitoring
npm run monitor:service
```

### Health Checks

Regular health checks ensure service availability:

```bash
# Manual health check
curl http://localhost:8766/health

# Sync system validation
npm run validate:sync
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql "postgresql://user:pass@host:port/db" -c "SELECT 1"
```

#### Service Start Issues
```bash
# Check service logs
tail -f logs/service-error.log

# Verify configuration
node -c config/service-config.json
```

#### Port Conflicts
```bash
# Check port usage (Windows)
netstat -an | findstr ":8765"

# Check port usage (Linux/macOS)
sudo lsof -i :8765
```

#### Permission Issues
```bash
# Fix file permissions (Linux/macOS)
sudo chown -R $(whoami) .
chmod +x scripts/install/*.sh

# Run as administrator (Windows)
# Right-click Command Prompt -> "Run as administrator"
```

### Recovery Commands

```bash
# Reinstall database only
npm run install:database --force

# Reinstall service only
npm run install:service --force

# Complete reinstallation
npm run install:full --force

# Reset to development mode
npm run install:dev --force
```

### Getting Help

1. **Check Logs**: Review logs in `logs/` directory
2. **Run Validation**: Use `npm run validate:sync`
3. **Review Configuration**: Check `config/` files
4. **Test Components**: Use individual test scripts

### Support Resources

- **Installation Guide**: This README
- **Sync Documentation**: `src/lib/sync/__tests__/README.md`
- **API Documentation**: Available at `/api-docs` when running
- **Admin Dashboard**: Available at `/admin/sync`

## Security Considerations

### Initial Security Setup

1. **Change Default Passwords**: Update admin account password
2. **Secure Registration Key**: Use a strong, unique registration key
3. **Network Security**: Configure firewalls appropriately
4. **SSL/TLS**: Consider enabling HTTPS for production
5. **Access Control**: Restrict admin dashboard access

### Regular Security Maintenance

1. **Rotate Keys**: Periodically rotate registration and encryption keys
2. **Update Dependencies**: Keep npm packages updated
3. **Monitor Logs**: Review security audit logs regularly
4. **Backup Security**: Secure backup storage and access

## Advanced Configuration

### Custom Installation

For custom installations, modify the installation scripts:

1. **Database Schema**: Edit `prisma/schema.prisma`
2. **Seed Data**: Modify scripts in `scripts/`
3. **Service Configuration**: Update `scripts/install/install-service.js`
4. **Environment Variables**: Set custom values before installation

### Integration with Existing Systems

The platform can integrate with existing systems:

1. **Database Integration**: Connect to existing PostgreSQL instances
2. **Authentication**: Integrate with existing auth systems
3. **Monitoring**: Connect to existing monitoring infrastructure
4. **Backup Systems**: Integrate with existing backup solutions

## Migration and Upgrades

### Version Upgrades

When upgrading to newer versions:

1. **Backup Current System**: Create full backup before upgrade
2. **Stop Services**: Stop sync service before upgrade
3. **Run Migrations**: Execute database migrations
4. **Update Configuration**: Review and update configuration files
5. **Restart Services**: Start services after upgrade
6. **Verify Operation**: Confirm everything works correctly

### Data Migration

For migrating from other systems:

1. **Export Data**: Extract data from existing systems
2. **Transform Data**: Convert to platform format
3. **Import Data**: Use provided import scripts
4. **Validate Data**: Verify data integrity
5. **Test Sync**: Confirm synchronization works

This installation system provides a robust, automated setup for the multi-business synchronization platform with comprehensive error handling, validation, and recovery options.