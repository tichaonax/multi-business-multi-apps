#!/usr/bin/env node
/**
 * Migration Data Seeding Script
 * Seeds essential reference data and admin user for production deployments
 *
 * This script is designed to be run automatically after migrations
 * and ensures all dropdown data and admin access is available.
 *
 * Usage: node scripts/seed-migration-data.js
 */

/**
 * Load environment variables from .env.local
 */
function loadEnvironmentVariables() {
  const path = require('path')
  const fs = require('fs')

  const envLocalPath = path.join(process.cwd(), '.env.local')

  if (fs.existsSync(envLocalPath)) {
    console.log('Loading environment variables from .env.local')
    const envContent = fs.readFileSync(envLocalPath, 'utf8')

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        const value = valueParts.join('=').replace(/^"(.*)"$/, '$1')
        process.env[key.trim()] = value.trim()
      }
    })
    console.log('✅ Environment variables loaded from .env.local')
  } else {
    console.warn('⚠️  .env.local file not found, using default environment')
  }
}

// Load environment variables first
loadEnvironmentVariables()

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

/**
 * Seed ID Format Templates
 */
async function seedIdTemplates() {
  console.log('🆔 Seeding ID format templates...')

  const templates = [
    {
      id: 'zw-national-id',
      name: 'Zimbabwe National ID',
      countryCode: 'ZW',
      format: '##-######?##',
      pattern: '^\\d{2}-\\d{6}[A-Z]\\d{2}$',
      example: '63-123456A78',
      description: 'Zimbabwe National Identity Card format',
      isActive: true
    },
    {
      id: 'za-id-number',
      name: 'South Africa ID Number',
      countryCode: 'ZA',
      format: '#############',
      pattern: '^\\d{13}$',
      example: '8001015009087',
      description: 'South African Identity Document number',
      isActive: true
    },
    {
      id: 'bw-omang',
      name: 'Botswana Omang',
      countryCode: 'BW',
      format: '#########',
      pattern: '^\\d{9}$',
      example: '123456789',
      description: 'Botswana National Identity Card (Omang)',
      isActive: true
    },
    {
      id: 'ke-national-id',
      name: 'Kenya National ID',
      countryCode: 'KE',
      format: '########',
      pattern: '^\\d{8}$',
      example: '12345678',
      description: 'Kenya National Identity Card',
      isActive: true
    },
    {
      id: 'zm-nrc',
      name: 'Zambia NRC',
      countryCode: 'ZM',
      format: '######/##/#',
      pattern: '^\\d{6}/\\d{2}/\\d$',
      example: '123456/78/1',
      description: 'Zambia National Registration Card',
      isActive: true
    }
  ]

  for (const template of templates) {
    if (!prisma.idFormatTemplates || typeof prisma.idFormatTemplates.upsert !== 'function') {
      console.warn('Prisma model idFormatTemplates not available - skipping ID format templates seeding');
      break;
    }

    await prisma.idFormatTemplates.upsert({
      where: { id: template.id },
      update: template,
      create: template
    })
  }

  console.log(`✅ Seeded ${templates.length} ID format templates`)
  return templates.length
}

/**
 * Seed Phone Format Templates
 * NOTE: PhoneFormatTemplate not found in current schema - skipping
 */
async function seedPhoneTemplates() {
  console.log('📱 Phone format templates not found in schema - skipping')
  return 0
}

/**
 * Seed Date Format Templates
 * NOTE: DateFormatTemplate not found in current schema - skipping
 */
async function seedDateTemplates() {
  console.log('📅 Date format templates not found in schema - skipping')
  return 0
}

/**
 * Seed Job Titles
 */
async function seedJobTitles() {
  console.log('💼 Seeding job titles...')

  const jobTitles = [
    // Construction
    { title: 'Site Supervisor', description: 'Supervises construction site operations', department: 'Construction', level: 'supervisor' },
    { title: 'Civil Engineer', description: 'Designs and oversees civil engineering projects', department: 'Engineering', level: 'professional' },
    { title: 'Project Manager', description: 'Manages construction projects from start to finish', department: 'Management', level: 'manager' },
    { title: 'Mason', description: 'Skilled worker specializing in stone and brick work', department: 'Construction', level: 'skilled' },
    { title: 'Carpenter', description: 'Skilled worker specializing in wood construction', department: 'Construction', level: 'skilled' },
    { title: 'Electrician', description: 'Installs and maintains electrical systems', department: 'Construction', level: 'skilled' },
    { title: 'Plumber', description: 'Installs and maintains plumbing systems', department: 'Construction', level: 'skilled' },
    { title: 'Painter', description: 'Applies paint and finishes to buildings', department: 'Construction', level: 'skilled' },
    { title: 'Welder', description: 'Joins metal parts through welding', department: 'Construction', level: 'skilled' },
    { title: 'Foreman', description: 'Leads construction crews and ensures quality', department: 'Construction', level: 'supervisor' },

    // Management & Administration
    { title: 'General Manager', description: 'Overall business operations management', department: 'Management', level: 'senior' },
    { title: 'Operations Manager', description: 'Manages daily business operations', department: 'Operations', level: 'manager' },
    { title: 'Human Resources Manager', description: 'Manages employee relations and policies', department: 'HR', level: 'manager' },
    { title: 'Finance Manager', description: 'Manages financial operations and planning', department: 'Finance', level: 'manager' },
    { title: 'Accountant', description: 'Handles financial records and transactions', department: 'Finance', level: 'professional' },
    { title: 'Secretary', description: 'Provides administrative support', department: 'Administration', level: 'support' },
    { title: 'Receptionist', description: 'Handles front desk and customer service', department: 'Administration', level: 'support' },

    // Sales & Marketing
    { title: 'Sales Manager', description: 'Manages sales team and strategies', department: 'Sales', level: 'manager' },
    { title: 'Sales Representative', description: 'Sells products and services to customers', department: 'Sales', level: 'professional' },
    { title: 'Marketing Manager', description: 'Develops and executes marketing strategies', department: 'Marketing', level: 'manager' },

    // Operations
    { title: 'Warehouse Manager', description: 'Manages warehouse operations and inventory', department: 'Operations', level: 'manager' },
    { title: 'Inventory Clerk', description: 'Tracks and manages inventory levels', department: 'Operations', level: 'support' },
    { title: 'Quality Control Inspector', description: 'Ensures quality standards are met', department: 'Quality', level: 'professional' },
    { title: 'Safety Officer', description: 'Ensures workplace safety compliance', department: 'Safety', level: 'professional' },

    // Technical
    { title: 'IT Support Specialist', description: 'Provides technical support and maintenance', department: 'IT', level: 'professional' },
    { title: 'Network Administrator', description: 'Manages computer networks and systems', department: 'IT', level: 'professional' },

    // Customer Service
    { title: 'Customer Service Representative', description: 'Assists customers with inquiries and issues', department: 'Customer Service', level: 'support' },
    { title: 'Customer Service Manager', description: 'Manages customer service operations', department: 'Customer Service', level: 'manager' },

    // General
    { title: 'Driver', description: 'Operates company vehicles for transportation', department: 'Operations', level: 'support' }
  ]

  let seededCount = 0
  for (const jobTitle of jobTitles) {
    if (!prisma.jobTitles || typeof prisma.jobTitles.upsert !== 'function') {
      console.warn('Prisma model jobTitles not available - skipping job titles seeding');
      break;
    }

    await prisma.jobTitles.upsert({
      where: { title: jobTitle.title },
      update: jobTitle,
      create: {
        id: require('crypto').randomUUID(),
        ...jobTitle,
        responsibilities: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    seededCount++
  }

  console.log(`✅ Seeded ${seededCount} job titles`)
  return seededCount
}

/**
 * Seed Compensation Types
 */
async function seedCompensationTypes() {
  console.log('💰 Seeding compensation types...')

  const compensationTypes = [
    { name: 'Hourly Rate', type: 'hourly', baseAmount: null, commissionPercentage: null },
    { name: 'Monthly Salary', type: 'salary', baseAmount: null, commissionPercentage: null },
    { name: 'Weekly Wage', type: 'weekly', baseAmount: null, commissionPercentage: null },
    { name: 'Daily Rate', type: 'daily', baseAmount: null, commissionPercentage: null },
    { name: 'Commission Only', type: 'commission', baseAmount: null, commissionPercentage: null },
    { name: 'Base + Commission', type: 'base_commission', baseAmount: null, commissionPercentage: null },
    { name: 'Project Based', type: 'project', baseAmount: null, commissionPercentage: null },
    { name: 'Piece Rate', type: 'piece', baseAmount: null, commissionPercentage: null },
    { name: 'Annual Salary', type: 'annual', baseAmount: null, commissionPercentage: null },
    { name: 'Contract Rate', type: 'contract', baseAmount: null, commissionPercentage: null },
    { name: 'Performance Based', type: 'performance', baseAmount: null, commissionPercentage: null },
    { name: 'Retainer', type: 'retainer', baseAmount: null, commissionPercentage: null },
    { name: 'Consulting Fee', type: 'consulting', baseAmount: null, commissionPercentage: null },
    { name: 'Freelance Rate', type: 'freelance', baseAmount: null, commissionPercentage: null },
    { name: 'Stipend', type: 'stipend', baseAmount: null, commissionPercentage: null }
  ]

  let seededCount = 0
  for (const compensationType of compensationTypes) {
    if (!prisma.compensationTypes || typeof prisma.compensationTypes.upsert !== 'function') {
      console.warn('Prisma model compensationTypes not available - skipping compensation types seeding');
      break;
    }

    await prisma.compensationTypes.upsert({
      where: { name: compensationType.name },
      update: compensationType,
      create: {
        id: require('crypto').randomUUID(),
        ...compensationType,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    seededCount++
  }

  console.log(`✅ Seeded ${seededCount} compensation types`)
  return seededCount
}

/**
 * Seed Benefit Types
 */
async function seedBenefitTypes() {
  console.log('🏥 Seeding benefit types...')

  const benefitTypes = [
    // Insurance Benefits
    { name: 'Health Insurance', type: 'insurance', defaultAmount: null, isPercentage: false },
    { name: 'Medical Aid', type: 'insurance', defaultAmount: null, isPercentage: false },
    { name: 'Dental Insurance', type: 'insurance', defaultAmount: null, isPercentage: false },
    { name: 'Life Insurance', type: 'insurance', defaultAmount: null, isPercentage: false },
    { name: 'Disability Insurance', type: 'insurance', defaultAmount: null, isPercentage: false },

    // Retirement Benefits
    { name: 'Pension Fund', type: 'retirement', defaultAmount: null, isPercentage: true },
    { name: 'Provident Fund', type: 'retirement', defaultAmount: null, isPercentage: true },
    { name: 'Retirement Savings', type: 'retirement', defaultAmount: null, isPercentage: true },

    // Allowances
    { name: 'Housing Allowance', type: 'allowance', defaultAmount: null, isPercentage: false },
    { name: 'Transport Allowance', type: 'allowance', defaultAmount: null, isPercentage: false },
    { name: 'Meal Allowance', type: 'allowance', defaultAmount: null, isPercentage: false },
    { name: 'Phone Allowance', type: 'allowance', defaultAmount: null, isPercentage: false },
    { name: 'Internet Allowance', type: 'allowance', defaultAmount: null, isPercentage: false },
    { name: 'Uniform Allowance', type: 'allowance', defaultAmount: null, isPercentage: false },
    { name: 'Tool Allowance', type: 'allowance', defaultAmount: null, isPercentage: false },

    // Time Off
    { name: 'Annual Leave', type: 'time_off', defaultAmount: 21, isPercentage: false },
    { name: 'Sick Leave', type: 'time_off', defaultAmount: 10, isPercentage: false },
    { name: 'Maternity Leave', type: 'time_off', defaultAmount: 90, isPercentage: false },
    { name: 'Paternity Leave', type: 'time_off', defaultAmount: 5, isPercentage: false },
    { name: 'Study Leave', type: 'time_off', defaultAmount: null, isPercentage: false },

    // Other Benefits
    { name: 'Performance Bonus', type: 'bonus', defaultAmount: null, isPercentage: true },
    { name: 'Annual Bonus', type: 'bonus', defaultAmount: null, isPercentage: true },
    { name: 'Overtime Pay', type: 'compensation', defaultAmount: 1.5, isPercentage: true },
    { name: 'Night Shift Differential', type: 'compensation', defaultAmount: 10, isPercentage: true },
    { name: 'Weekend Differential', type: 'compensation', defaultAmount: 15, isPercentage: true },
    { name: 'Training Budget', type: 'development', defaultAmount: null, isPercentage: false },
    { name: 'Professional Development', type: 'development', defaultAmount: null, isPercentage: false },

    // Company Benefits
    { name: 'Company Vehicle', type: 'company', defaultAmount: null, isPercentage: false }
  ]

  let seededCount = 0
  for (const benefitType of benefitTypes) {
    if (!prisma.benefitTypes || typeof prisma.benefitTypes.upsert !== 'function') {
      console.warn('Prisma model benefitTypes not available - skipping benefit types seeding');
      break;
    }

    await prisma.benefitTypes.upsert({
      where: { name: benefitType.name },
      update: benefitType,
      create: {
        id: require('crypto').randomUUID(),
        ...benefitType,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    seededCount++
  }

  console.log(`✅ Seeded ${seededCount} benefit types`)
  return seededCount
}

/**
 * Create Admin User
 */
async function createAdminUser() {
  console.log('👤 Creating admin user...')

  const adminEmail = 'admin@business.local'

  // Check if admin already exists
  const existingAdmin = await prisma.users.findUnique({
    where: { email: adminEmail }
  })

  if (existingAdmin) {
    console.log('✅ Admin user already exists')
    return 1
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 12)

  // Create admin user
  const adminUser = await prisma.users.create({
    data: {
      id: require('crypto').randomUUID(),
      email: adminEmail,
      name: 'System Administrator',
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true
    }
  })

  console.log('✅ Admin user created successfully')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Password: admin123`)
  console.log(`   Role: admin`)
  return 1
}

/**
 * Create Default Business for Admin
 */
async function createDefaultBusiness() {
  console.log('🏢 Creating default business for admin...')

  const adminEmail = 'admin@business.local'

  // Find admin user
  const adminUser = await prisma.users.findUnique({
    where: { email: adminEmail }
  })

  if (!adminUser) {
    console.log('⚠️  Admin user not found - skipping default business creation')
    return 0
  }

  // Check if admin already has a business
  const existingMembership = await prisma.businessMemberships.findFirst({
    where: { userId: adminUser.id }
  })

  if (existingMembership) {
    console.log('✅ Admin already has business membership')
    return 1
  }

  // Generate unique shortName
  let shortName = 'default'
  let counter = 1
  while (await prisma.businesses.findFirst({ where: { shortName } })) {
    shortName = `default${counter}`
    counter++
  }

  // Create default business
  const business = await prisma.businesses.create({
    data: {
      id: require('crypto').randomUUID(),
      name: 'Default Business',
      type: 'other',
      description: 'Default business created during system setup',
      shortName,
      createdBy: adminUser.id,
      isActive: true,
      isDemo: false
    }
  })

  // Create business membership for admin as business-owner
  const BUSINESS_OWNER_PERMISSIONS = {
    // Business Management - Full access
    canViewBusiness: true,
    canEditBusiness: true,
    canDeleteBusiness: true,
    canManageBusinessUsers: true,
    canManageBusinessSettings: true,

    // User Management - Full access
    canViewUsers: true,
    canInviteUsers: true,
    canEditUserPermissions: true,
    canRemoveUsers: true,
    canViewAuditLogs: true,

    // Data Management - Full access
    canExportBusinessData: true,
    canImportBusinessData: true,
    canBackupBusiness: true,
    canRestoreBusiness: true,

    // Employee Management - Full access
    canViewEmployees: true,
    canCreateEmployees: true,
    canEditEmployees: true,
    canDeleteEmployees: true,
    canManageEmployees: true,
    canViewEmployeeContracts: true,
    canCreateEmployeeContracts: true,
    canEditEmployeeContracts: true,
    canApproveEmployeeContracts: true,
    canDeleteEmployeeContracts: true,
    canManageJobTitles: true,
    canManageBenefitTypes: true,
    canManageCompensationTypes: true,
    canManageDisciplinaryActions: true,
    canViewEmployeeReports: true,
    canExportEmployeeData: true,
    canApproveSalaryIncreases: true,
    canProcessSalaryIncreases: true,

    // Financial Management - Full access
    canAccessFinancialData: true,
    canManageProjectBudgets: true,
    canManageProjectPayments: true,
    canViewCostReports: true,
    canApproveBudgetChanges: true,
    canViewProfitabilityReports: true,

    // Customer Management - Full access
    canAccessCustomers: true,
    canViewCustomers: true,
    canManageCustomers: true,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canManageDivisionAccounts: true,
    canManageLaybys: true,
    canManageCredit: true,
    canViewCustomerReports: true,
    canExportCustomerData: true,
    canLinkCustomerAccounts: true,

    // Payroll Management - Full access
    canAccessPayroll: true,
    canManagePayroll: true,
    canCreatePayrollPeriod: true,
    canEditPayrollEntry: true,
    canApprovePayroll: true,
    canExportPayroll: true,
    canResetExportedPayrollToPreview: true,
    canDeletePayroll: true,
    canPrintPayrollEntryDetails: true,
    canEnterPaySlips: true,
    canReconcilePayroll: true,
    canViewPayrollReports: true,
    canManageAdvances: true,

    // Payroll Account Management - Full access
    canAccessPayrollAccount: true,
    canViewPayrollAccountBalance: true,
    canMakePayrollDeposits: true,
    canMakePayrollPayments: true,
    canAdjustPaymentAmounts: true,
    canIssuePaymentVouchers: true,
    canCompletePayments: true,
    canViewPayrollHistory: true,
    canExportPayrollPayments: true,

    // Expense Account Management - Full access
    canAccessExpenseAccount: true,
    canCreateExpenseAccount: true,
    canMakeExpenseDeposits: true,
    canMakeExpensePayments: true,
    canViewExpenseReports: true,
    canCreateIndividualPayees: true,
    canDeleteExpenseAccounts: true,
    canAdjustExpensePayments: true,

    // Supplier Management - Full access
    canViewSuppliers: true,
    canCreateSuppliers: true,
    canEditSuppliers: true,
    canDeleteSuppliers: true,
    canManageSupplierCatalog: true,

    // Location Management - Full access
    canViewLocations: true,
    canCreateLocations: true,
    canEditLocations: true,
    canDeleteLocations: true,
  };

  await prisma.businessMemberships.create({
    data: {
      id: require('crypto').randomUUID(),
      businessId: business.id,
      userId: adminUser.id,
      role: 'business-owner',
      permissions: BUSINESS_OWNER_PERMISSIONS,
      isActive: true
    }
  })

  console.log('✅ Default business created for admin')
  console.log(`   Business Name: ${business.name}`)
  console.log(`   Business ID: ${business.id}`)
  console.log(`   Short Name: ${business.shortName}`)
  return 1
}

/**
 * Seed Expense Categories
 */
async function seedExpenseCategories() {
  console.log('💰 Seeding expense categories...')

  // Check if expense categories already exist
  const existingDomains = await prisma.expenseDomains.count()

  if (existingDomains > 0) {
    console.log(`✅ Expense categories already seeded (${existingDomains} domains found)`)
    // Return actual counts from database
    const categoriesCount = await prisma.expenseCategories.count()
    const subcategoriesCount = await prisma.expenseSubcategories.count()
    return { domains: existingDomains, categories: categoriesCount, subcategories: subcategoriesCount }
  }

  try {
    // Import and run the expense category seed
    const { runExpenseCategorySeed } = require('../src/lib/seed-data/expense-categories-seed.js')
    await runExpenseCategorySeed()
    console.log('✅ Expense categories seeded successfully')

    // Get actual counts after seeding
    const domainsCount = await prisma.expenseDomains.count()
    const categoriesCount = await prisma.expenseCategories.count()
    const subcategoriesCount = await prisma.expenseSubcategories.count()

    return { domains: domainsCount, categories: categoriesCount, subcategories: subcategoriesCount }
  } catch (error) {
    console.error('⚠️  Failed to seed expense categories:', error.message)
    console.log('   You can manually seed expense categories later with:')
    console.log('   npx tsx src/lib/seed-data/expense-categories-seed.ts')
    return { domains: 0, categories: 0, subcategories: 0 }
  }
}

/**
 * Grant Expense Account Permissions to Admin User
 */
async function grantExpensePermissionsToAdmin() {
  console.log('💳 Granting expense account permissions to admin user...')

  const adminEmail = 'admin@business.local'

  // Find the admin user
  const adminUser = await prisma.users.findUnique({
    where: { email: adminEmail }
  })

  if (!adminUser) {
    console.log('⚠️  Admin user not found - skipping permission grant')
    return
  }

  // Check if admin already has expense permissions
  const currentPermissions = adminUser.permissions || {}
  if (currentPermissions.canAccessExpenseAccount) {
    console.log('✅ Admin already has expense account permissions')
    return
  }

  // Grant all expense account permissions
  const expensePermissions = {
    canAccessExpenseAccount: true,
    canCreateExpenseAccount: true,
    canMakeExpenseDeposits: true,
    canMakeExpensePayments: true,
    canViewExpenseReports: true,
    canCreateIndividualPayees: true,
    canDeleteExpenseAccounts: true,
    canAdjustExpensePayments: true
  }

  // Update admin user with expense permissions
  await prisma.users.update({
    where: { email: adminEmail },
    data: {
      permissions: {
        ...currentPermissions,
        ...expensePermissions
      }
    }
  })

  console.log('✅ Granted expense account permissions to admin user')
}

/**
 * Seed Test Expense Accounts
 */
async function seedExpenseAccounts() {
  console.log('💳 Seeding test expense accounts...')

  // Check if expense accounts already exist
  const existingAccounts = await prisma.expenseAccounts.count()

  if (existingAccounts > 0) {
    console.log(`✅ Expense accounts already seeded (${existingAccounts} accounts found)`)
    return existingAccounts
  }

  // Find admin user to create accounts
  const adminUser = await prisma.users.findUnique({
    where: { email: 'admin@business.local' }
  })

  if (!adminUser) {
    console.log('⚠️  Admin user not found - skipping expense account seeding')
    return 0
  }

  // Create test expense accounts
  const accounts = [
    {
      id: `acc_${Date.now()}_general`,
      accountName: 'General Expenses',
      accountNumber: 'EXP-001',
      description: 'General business expense account for operational costs',
      balance: 0.00,
      createdBy: adminUser.id,
      isActive: true
    },
    {
      id: `acc_${Date.now()}_travel`,
      accountName: 'Travel & Accommodation',
      accountNumber: 'EXP-002',
      description: 'Expense account for business travel and accommodation',
      balance: 0.00,
      createdBy: adminUser.id,
      isActive: true
    },
    {
      id: `acc_${Date.now()}_supplies`,
      accountName: 'Office Supplies',
      accountNumber: 'EXP-003',
      description: 'Expense account for office supplies and equipment',
      balance: 0.00,
      createdBy: adminUser.id,
      isActive: true
    }
  ]

  let createdCount = 0

  for (const account of accounts) {
    try {
      await prisma.expenseAccounts.create({
        data: account
      })
      createdCount++

      // Only create initial deposit if balance is greater than 0
      if (account.balance > 0) {
        await prisma.expenseAccountDeposits.create({
          data: {
            id: `dep_${Date.now()}_${account.id}`,
            expenseAccountId: account.id,
            sourceType: 'MANUAL',
            amount: account.balance,
            depositDate: new Date(),
            manualNote: `Initial deposit for ${account.accountName}`,
            createdBy: adminUser.id
          }
        })
      }
    } catch (error) {
      console.error(`⚠️  Failed to create expense account ${account.accountName}:`, error.message)
    }
  }

  console.log(`✅ Created ${createdCount} test expense accounts with zero balance`)
  return createdCount
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 Starting migration data seeding...')
  console.log('')

  // Track actual seeding counts
  const seedingStats = {
    idTemplates: 0,
    phoneTemplates: 0,
    dateTemplates: 0,
    jobTitles: 0,
    compensationTypes: 0,
    benefitTypes: 0,
    expenseDomains: 0,
    expenseCategories: 0,
    expenseSubcategories: 0,
    adminUsers: 0,
    defaultBusinesses: 0,
    expenseAccounts: 0
  }

  try {
    // Preflight: ensure critical tables exist before attempting upserts
    try {
        // Cast regclass to text so Prisma can deserialize the value
        // Check both the Prisma model-based name (camelCase) and the actual DB table (snake_case)
        const candidates = ['public.idFormatTemplates', 'public.id_format_templates']

        let found = false
        let foundName = null

        for (const candidate of candidates) {
          // parameterize candidate so we don't interpolate raw strings into SQL
          const tableCheck = await prisma.$queryRaw`SELECT to_regclass(${candidate})::text as tbl`

          // Normalize result shapes returned by Prisma: could be array of rows or single object
          let exists = false
          if (Array.isArray(tableCheck)) {
            exists = !!(tableCheck[0] && (tableCheck[0].tbl || tableCheck[0].tbl === '')) && tableCheck[0].tbl !== null
          } else if (tableCheck && typeof tableCheck === 'object') {
            exists = !!(tableCheck.tbl || tableCheck.tbl === '')
          }

          if (exists) {
            found = true
            foundName = candidate
            break
          }
        }

        if (!found) {
          throw new Error('Required table not found. Expected one of: public.idFormatTemplates or public.id_format_templates. Ensure database exists and run `npx prisma db push --force-reset` or apply migrations before seeding.')
        } else {
          console.log(`✅ Preflight: found table ${foundName}`)
        }
    } catch (err) {
      console.error('❌ Preflight check failed:', err && err.message ? err.message : err)
      throw err
    }

    // Seed all reference data
    seedingStats.idTemplates = await seedIdTemplates()
    seedingStats.phoneTemplates = await seedPhoneTemplates()
    seedingStats.dateTemplates = await seedDateTemplates()
    seedingStats.jobTitles = await seedJobTitles()
    seedingStats.compensationTypes = await seedCompensationTypes()
    seedingStats.benefitTypes = await seedBenefitTypes()

    // Seed expense categories and capture counts
    const expenseStats = await seedExpenseCategories()
    seedingStats.expenseDomains = expenseStats.domains
    seedingStats.expenseCategories = expenseStats.categories
    seedingStats.expenseSubcategories = expenseStats.subcategories

    // NOTE: Clothing categories are now seeded via migration:
    // prisma/migrations/20251127140000_seed_complete_clothing_categories/migration.sql
    // This runs automatically with `npx prisma migrate deploy`

    // Create admin user
    seedingStats.adminUsers = await createAdminUser()

    // NOTE: Default business removed - users should create their first business via UI
    // seedingStats.defaultBusinesses = await createDefaultBusiness()

    // Grant expense account permissions to admin
    await grantExpensePermissionsToAdmin()

    // Seed test expense accounts
    seedingStats.expenseAccounts = await seedExpenseAccounts()

    console.log('')
    console.log('🎉 Migration data seeding completed successfully!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`   • ${seedingStats.idTemplates} ID format templates`)
    console.log(`   • ${seedingStats.phoneTemplates} Phone format templates`)
    console.log(`   • ${seedingStats.dateTemplates} Date format templates`)
    console.log(`   • ${seedingStats.jobTitles} Job titles`)
    console.log(`   • ${seedingStats.compensationTypes} Compensation types`)
    console.log(`   • ${seedingStats.benefitTypes} Benefit types`)
    console.log(`   • ${seedingStats.expenseDomains} Expense domains`)
    console.log(`   • ${seedingStats.expenseCategories} Expense categories`)
    console.log(`   • ${seedingStats.expenseSubcategories} Expense subcategories`)
    console.log(`   • ${seedingStats.adminUsers} Admin user (admin@business.local / admin123)`)
    // console.log(`   • ${seedingStats.defaultBusinesses} Default business for admin`)
    console.log('   • Expense account permissions granted to admin')
    console.log(`   • ${seedingStats.expenseAccounts} Test expense accounts (zero balance - ready for funding)`)
    console.log('')
    console.log('✅ Database is now ready for production use!')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  ;(async () => {
    const argv = process.argv.slice(2)

    // Helper CLI flags for quick lookup / small edits without running full seeding
    const listFlag = argv.includes('--list-benefits')
    const searchIndex = argv.findIndex(a => a === '--search-benefit')
    const addIndex = argv.findIndex(a => a === '--add-benefit')

    // Utility: list all benefit types
    async function listBenefitTypes() {
      if (!prisma.benefitTypes || typeof prisma.benefitTypes.findMany !== 'function') {
        console.warn('Prisma model benefitTypes not available - cannot list benefit types')
        return
      }
      const rows = await prisma.benefitTypes.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] })
      console.log(`Found ${rows.length} benefit types:`)
      for (const r of rows) {
        console.log(` - ${r.name} [type=${r.type}]${r.isActive ? '' : ' (inactive)'}${r.defaultAmount !== null && r.defaultAmount !== undefined ? ` default=${r.defaultAmount}` : ''}`)
      }
    }

    // Utility: search benefit types by substring (case-insensitive)
    async function searchBenefitTypes(term) {
      if (!term) {
        console.error('Please provide a search term after --search-benefit')
        process.exit(2)
      }
      if (!prisma.benefitTypes || typeof prisma.benefitTypes.findMany !== 'function') {
        console.warn('Prisma model benefitTypes not available - cannot search benefit types')
        return
      }
      const rows = await prisma.benefitTypes.findMany({ where: { name: { contains: term, mode: 'insensitive' } }, orderBy: [{ name: 'asc' }] })
      console.log(`Search results for "${term}": ${rows.length} matches`)
      for (const r of rows) console.log(` - ${r.name} [type=${r.type}]`)
    }

    // Utility: add a benefit type (JSON string or simple name:type pair)
    async function addBenefitType(payload) {
      if (!prisma.benefitTypes || typeof prisma.benefitTypes.upsert !== 'function') {
        console.warn('Prisma model benefitTypes not available - cannot add benefit type')
        return
      }

      let obj = null
      // Accept JSON string or shorthand name:type
      try {
        if (typeof payload === 'string' && payload.trim().startsWith('{')) {
          obj = JSON.parse(payload)
        } else if (typeof payload === 'string' && payload.includes(':')) {
          const [name, type] = payload.split(':').map(s => s.trim())
          obj = { name, type }
        } else {
          throw new Error('Invalid payload')
        }
      } catch (err) {
        console.error('Invalid --add-benefit payload. Provide JSON or "Name:Type". Example: --add-benefit "{\"name\":\"Tool Allowance\",\"type\":\"allowance\",\"defaultAmount\":50}"')
        process.exit(2)
      }

      if (!obj.name || !obj.type) {
        console.error('Benefit must include at least name and type')
        process.exit(2)
      }

      // Normalize: prevent duplicates by name (case-insensitive)
      const existing = await prisma.benefitTypes.findFirst({ where: { name: { equals: obj.name, mode: 'insensitive' } } })
      if (existing) {
        console.log(`Benefit type already exists: ${existing.name} [type=${existing.type}]`)
        return
      }

      const created = await prisma.benefitTypes.create({ data: {
        id: require('crypto').randomUUID(),
        name: obj.name,
        type: obj.type,
        defaultAmount: obj.defaultAmount !== undefined ? obj.defaultAmount : null,
        isPercentage: !!obj.isPercentage,
        isActive: obj.isActive !== undefined ? !!obj.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      }})

      console.log(`Created benefit type: ${created.name} [type=${created.type}]`)
    }

    try {
      if (listFlag) {
        await listBenefitTypes()
        await prisma.$disconnect()
        process.exit(0)
      }

      if (searchIndex !== -1) {
        const term = argv[searchIndex + 1]
        await searchBenefitTypes(term)
        await prisma.$disconnect()
        process.exit(0)
      }

      if (addIndex !== -1) {
        const payload = argv[addIndex + 1]
        await addBenefitType(payload)
        await prisma.$disconnect()
        process.exit(0)
      }

      // Default behavior: run full seeding
      await main()
      process.exit(0)
    } catch (error) {
      console.error('💥 Seeding failed:', error)
      await prisma.$disconnect()
      process.exit(1)
    }
  })()
}

module.exports = { seedMigrationData: main }