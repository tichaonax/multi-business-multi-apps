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
- **Windows Service**: Self-hosted solution

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Database**
   - Set up PostgreSQL database
   - Update `DATABASE_URL` in `.env.local`
   - Generate and run migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. **Development**
   ```bash
   npm run dev
   ```

4. **Production Deployment**
   ```bash
   npm run build
   npm run start:server
   ```

5. **Windows Service Installation**
   ```bash
   npm run service:install
   ```

Short service command reference

- Install the Windows service:

   ```bash
   npm run service:install
   ```

- Uninstall the Windows service:

   ```bash
   npm run service:uninstall
   ```

- Start the service:

   ```bash
   npm run service:start
   ```

- Stop the service:

   ```bash
   npm run service:stop
   ```

- Restart the service:

   ```bash
   npm run service:restart
   ```

- Diagnose service/system state:

   ```bash
   npm run service:diagnose
   ```

- Quick CI-friendly smoke-check (skip DB if needed):

   ```bash
   SKIP_DB_PRECHECK=true npm run service:smoke-check
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

## Environment Variables

```env
DATABASE_URL=postgresql://username:password@localhost:5432/multi_business_db
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:8765
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run service:install` - Install as Windows service
- `npm run service:uninstall` - Remove Windows service

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

## License

ISC