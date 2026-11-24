# Multi-Business Management Platform

  A comprehensive Next.js 15 TypeScript application for managing multiple business
  operations including personal finance, construction projects, restaurant management,
  grocery inventory, clothing retail, and hardware operations. Features unified project
  management, contractor payments, expense tracking, user permissions, audit logging, and
  cross-business financial integration with support for loans, budgets, and real-time
  transaction processing..

## Features

- **Multi-Business Support**: Construction, Restaurant, Grocery, Clothing, Personal Finance modules
- **Role-Based Access Control**: Granular permissions per business module
- **POS Systems**: Touch-friendly interfaces for retail businesses
- **Real-time Chat**: Internal messaging between team members
- **Comprehensive Reporting**: Analytics and financial reports
- **Audit Logging**: Complete activity tracking
- **Backup & Restore**: Automated data protection
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile
- **Windows Service**: Self-hosted, installed from releases, with automatic migrations

## Quick Start

### Servers (production, dev server): releases, not git

Servers never have a git checkout and never build. The build machine makes a
release and the server installs it with the scripts in `C:\MBM\setup`:

```bash
npm run release        # on the build machine → releases/mbm-<date>-<commit>.zip + .sha256
```

- **Deploy a release** (local, dev server, production): [docs/runbooks/manual-deployment.md](./docs/runbooks/manual-deployment.md)
- **A new server**, moving or converting one: [docs/runbooks/new-mbm-server.md](./docs/runbooks/new-mbm-server.md)
- **Settings, certificates, printing, tills, troubleshooting**: [ADMIN-INSTALLATION-GUIDE.md](./ADMIN-INSTALLATION-GUIDE.md)

### Development machine

```bash
git clone <repository-url>
cd multi-business-multi-apps
npm install
cp .env.example .env.local   # then fill in your settings (ADMIN-INSTALLATION-GUIDE.md §1)
npm run db:deploy            # migrations
npm run dev                  # http://localhost:8080
```

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable React components
├── lib/                 # Core utilities and configurations
├── types/               # TypeScript type definitions
└── modules/             # Business-specific modules
```

## Environment Configuration

Create `.env.local` in the project root with these required variables:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/multi_business_db"

# Authentication
NEXTAUTH_URL="http://localhost:8080"
NEXTAUTH_SECRET="your-secret-key-here"

# Application
PORT=8080

# Sync Service (for multi-server deployments)
SYNC_NODE_ID="unique-per-server"
SYNC_NODE_NAME="sync-node-server1"
SYNC_REGISTRATION_KEY="same-on-all-servers"
SYNC_SERVICE_PORT=8765
```

**Generate secure values:**

*Git Bash / Linux / macOS:*
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"     # SYNC_NODE_ID
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"    # SYNC_REGISTRATION_KEY
```

*PowerShell:*
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"     # SYNC_NODE_ID
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"    # SYNC_REGISTRATION_KEY
```

*Command Prompt (CMD):*
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**📖 See [ADMIN-INSTALLATION-GUIDE.md](./ADMIN-INSTALLATION-GUIDE.md) for complete environment configuration guide**

## Available Scripts

### Releases
- `npm run release` - Build a release for the servers (`-- --ref <commit>` for another commit)
- `npm run hooks:install` - Install git hooks

### Development
- `npm run dev` - Start development server (port 8080)
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### On a server (Administrator)
- `C:\MBM\setup\00-status.ps1` - Status of everything
- `C:\MBM\setup\install-release.ps1` / `rollback-release.ps1` - Install / undo a release
- `Restart-Service multibusinesssyncservice.exe` - Restart MBM

### Database
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Create migration (development)
- `npm run db:deploy` - Apply migrations (production)

**📖 For complete command reference, see [ADMIN-INSTALLATION-GUIDE.md](./ADMIN-INSTALLATION-GUIDE.md)**

## Module Overview

### Construction Management
- Project tracking and budgeting
- Expense categorization with receipt attachments
- Progress reporting and analytics

### Restaurant POS
- Touch-friendly point of sale interface
- Menu management and table service
- Order processing and kitchen communication

### Grocery Shop
- Barcode scanning and inventory management
- Supplier tracking and purchase orders
- Expiry date monitoring and alerts

### Clothing Outlet
- Size/color variant management
- Customer loyalty and discount systems
- Seasonal inventory tracking

### Personal Finance
- Expense categorization and tracking
- Monthly spending reports and budgets
- Transfer tracking between business and personal accounts

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Audit logging for all critical actions
- Encrypted backup files
- Session management
- Peer-to-peer sync with registration key authentication

## Documentation

### Deployment & Operations
- **[docs/runbooks/manual-deployment.md](./docs/runbooks/manual-deployment.md)** - Deploying a release: local, dev server, production
- **[docs/runbooks/new-mbm-server.md](./docs/runbooks/new-mbm-server.md)** - A new server, moving, converting, renaming
- **[ADMIN-INSTALLATION-GUIDE.md](./ADMIN-INSTALLATION-GUIDE.md)** - Settings, certificates, QZ Tray, tills, troubleshooting
- **[docs/TECHNICAL-DEPLOYMENT-GUIDE.md](./docs/TECHNICAL-DEPLOYMENT-GUIDE.md)** - Architecture, workstations and agents in depth

- **[PRISMA_GUIDE.md](./PRISMA_GUIDE.md)** - Prisma best practices
  - Naming conventions
  - Safe vs dangerous commands
  - Migration workflows
  - Common issues & solutions

### Project Planning
- **[projectplan.md](./projectplan.md)** - Current project planning and implementation notes

### Getting Help
- For deployment issues, see [ADMIN-INSTALLATION-GUIDE.md - Troubleshooting](./ADMIN-INSTALLATION-GUIDE.md#7-troubleshooting)
- For Prisma/database issues, see [PRISMA_GUIDE.md](./PRISMA_GUIDE.md)
- Service logs on a server: `C:\MBM\app\windows-service\daemon\*.log`

## License

ISC