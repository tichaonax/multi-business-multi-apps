const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

// Comprehensive test data for ALL tables (excluding sync/chat/audit tables)
const seedData = {
  // Core system data (no dependencies)
  systemSettings: [
    {
      id: 'system-settings-main',
      allowSelfRegistration: true,
      defaultRegistrationRole: 'employee',
      defaultRegistrationPermissions: { read: true, write: false, delete: false },
      requireAdminApproval: false,
      maxUsersPerBusiness: 50,
      globalDateFormat: 'dd/mm/yyyy',
      defaultCountryCode: 'ZW',
      defaultMileageUnit: 'km',
      maxPaymentWithoutId: 100.00
    }
  ],

  emojiLookup: [
    {
      id: 'emoji-001',
      emoji: '🍎',
      description: 'Red apple fruit',
      name: 'Apple',
      source: 'unicode',
      usageCount: 0
    },
    {
      id: 'emoji-002',
      emoji: '🚗',
      description: 'Red car',
      name: 'Car',
      source: 'unicode',
      usageCount: 0
    }
  ],

  // Reference data
  jobTitles: [
    {
      id: 'job-title-001',
      title: 'Store Manager',
      description: 'Manages store operations',
      responsibilities: ['Oversee daily operations', 'Manage staff', 'Handle customer complaints'],
      isActive: true
    },
    {
      id: 'job-title-002',
      title: 'Cashier',
      description: 'Handles customer transactions',
      responsibilities: ['Process payments', 'Handle returns', 'Maintain cash register'],
      isActive: true
    }
  ],

  compensationTypes: [
    {
      id: 'comp-type-001',
      name: 'Hourly Wage',
      type: 'hourly',
      description: 'Hourly wage compensation',
      baseAmount: 15.00,
      isActive: true
    },
    {
      id: 'comp-type-002',
      name: 'Salary',
      type: 'salary',
      description: 'Monthly salary compensation',
      baseAmount: 50000.00,
      isActive: true
    }
  ],

  benefitTypes: [
    {
      id: 'benefit-type-test-001',
      name: 'Test Health Insurance',
      description: 'Test medical health coverage',
      type: 'insurance',
      isActive: true,
      defaultAmount: 200.00,
      isPercentage: false
    },
    {
      id: 'benefit-type-test-002',
      name: 'Test Paid Time Off',
      description: 'Test vacation and sick days',
      type: 'pto',
      isActive: true,
      defaultAmount: 10.00,
      isPercentage: false
    }
  ],

  permissionTemplates: [
    {
      id: 'perm-template-001',
      name: 'Admin Template',
      permissions: { read: true, write: true, delete: true, admin: true },
      businessType: 'retail',
      createdBy: 'user-test-seed-001',
      isActive: true
    },
    {
      id: 'perm-template-002',
      name: 'Employee Template',
      permissions: { read: true, write: true },
      businessType: 'retail',
      createdBy: 'user-test-seed-001',
      isActive: true
    }
  ],

  idFormatTemplates: [
    {
      id: 'id-format-001',
      name: 'Employee ID Format',
      pattern: 'EMP-{YYYY}-{000}',
      example: 'EMP-2025-001',
      isActive: true
    }
  ],

  driverLicenseTemplates: [
    {
      id: 'driver-license-001',
      name: 'Standard Driver License',
      description: 'US driver license template',
      pattern: '[A-Z]{1}[0-9]{7}',
      example: 'D1234567',
      countryCode: 'US',
      isActive: true
    }
  ],

  projectTypes: [
    {
      id: 'project-type-001',
      name: 'Construction Project',
      description: 'Building construction projects',
      businessType: 'construction',
      isActive: true
    }
  ],

  inventoryDomains: [
    {
      id: 'inv-domain-001',
      businessType: 'grocery',
      name: 'Grocery',
      emoji: '🛒',
      description: 'Grocery store inventory',
      isActive: true
    }
  ],

  inventorySubcategories: [
    {
      id: 'inv-sub-001',
      categoryId: 'category_clothing_0_bags',
      name: 'Test Subcategory',
      description: 'Test subcategory for validation',
      emoji: '📦'
    }
  ],

  expenseDomains: [
    {
      id: 'exp-domain-001',
      name: 'Office Supplies',
      emoji: '📎',
      description: 'Office and stationery expenses',
      isActive: true
    }
  ],

  expenseCategories: [
    {
      id: 'exp-cat-001',
      domainId: 'exp-domain-001',
      name: 'Pens and Paper',
      emoji: '✏️',
      color: '#3B82F6',
      description: 'Writing instruments and paper products',
      requiresSubcategory: false
    }
  ],

  expenseSubcategories: [
    {
      id: 'exp-sub-001',
      categoryId: 'exp-cat-001',
      name: 'Ballpoint Pens',
      emoji: '🖊️',
      description: 'Standard ballpoint pens'
    }
  ],

  // Users and authentication
  users: [
    {
      id: 'user-test-seed-001',
      name: 'Test Admin',
      email: 'testadmin@test.com',
      passwordHash: '$2b$10$hashedpasswordhere',
      role: 'admin',
      isActive: true
    },
    {
      id: 'user-test-seed-002',
      name: 'Test Employee',
      email: 'testemp@test.com',
      passwordHash: '$2b$10$hashedpasswordhere',
      role: 'employee',
      isActive: true
    }
  ],

  accounts: [
    {
      id: 'account-001',
      userId: 'user-test-seed-001',
      type: 'oauth',
      provider: 'google',
      providerAccountId: 'google-123',
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
      expiresAt: 1234567890,
      tokenType: 'Bearer',
      scope: 'email profile',
      idToken: 'id-token',
      sessionState: null
    }
  ],

  sessions: [
    {
      id: 'session-001',
      sessionToken: 'session-token-123',
      userId: 'user-test-seed-001',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
  ],

  // Businesses
  businesses: [
    {
      id: 'biz-test-grocery-seed',
      name: 'Test Grocery Store',
      type: 'grocery',
      description: 'A test grocery business for seed data',
      isActive: true,
      isDemo: false,
      createdBy: 'user-test-seed-001'
    },
    {
      id: 'biz-test-restaurant-seed',
      name: 'Test Restaurant',
      type: 'restaurant',
      description: 'A test restaurant business for seed data',
      isActive: true,
      isDemo: false,
      createdBy: 'user-test-seed-001'
    }
  ],

  businessMemberships: [
    {
      id: 'membership-001',
      userId: 'user-test-seed-001',
      businessId: 'biz-test-grocery-seed',
      role: 'owner',
      permissions: ['read', 'write', 'delete', 'admin'],
      isActive: true,
      joinedAt: new Date(),
      invitedBy: 'user-test-seed-001'
    },
    {
      id: 'membership-002',
      userId: 'user-test-seed-002',
      businessId: 'biz-test-grocery-seed',
      role: 'employee',
      permissions: ['read', 'write'],
      isActive: true,
      joinedAt: new Date(),
      invitedBy: 'user-test-seed-001'
    }
  ],

  businessAccounts: [
    {
      id: 'biz-account-001',
      businessId: 'biz-test-grocery-seed',
      balance: 10000.00,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  businessLocations: [
    {
      id: 'location-001',
      businessId: 'biz-test-grocery-seed',
      locationCode: 'MAIN',
      name: 'Main Store',
      updatedAt: new Date()
    }
  ],

  businessBrands: [
    {
      id: 'brand-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      name: 'Premium Brand',
      description: 'High quality products',
      logoUrl: null,
      website: null,
      isActive: true,
      attributes: { premium: true },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Persons (customers and employees)
  persons: [
    {
      id: 'person-001',
      fullName: 'John Doe',
      email: 'john.doe@test.com',
      phone: '555-1000',
      address: '789 Employee St',
      nationalId: 'NAT001'
    },
    {
      id: 'person-002',
      fullName: 'Jane Customer',
      email: 'jane.customer@test.com',
      phone: '555-2000',
      address: '321 Customer Ave',
      nationalId: 'NAT002'
    }
  ],

  // Employees and related data
  employees: [
    {
      id: 'employee-001',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john.doe@test.com',
      phone: '555-1000',
      address: '789 Employee St',
      employeeNumber: 'EMP001',
      nationalId: '123456789',
      hireDate: new Date('2024-01-01'),
      startDate: new Date('2024-01-01'),
      primaryBusinessId: 'biz-test-grocery-seed',
      jobTitleId: 'job-title-002',
      compensationTypeId: 'comp-type-001',
      employmentStatus: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  employeeBusinessAssignments: [
    {
      id: 'emp-assign-001',
      employeeId: 'employee-001',
      businessId: 'biz-test-grocery-seed',
      isPrimary: true,
      isActive: true,
      startDate: new Date(),
      assignedBy: 'user-test-seed-001'
    }
  ],

  employeeContracts: [
    {
      id: 'contract-001',
      employeeId: 'employee-001',
      contractNumber: 'CONTRACT-001',
      jobTitleId: 'job-title-002',
      compensationTypeId: 'comp-type-001',
      primaryBusinessId: 'biz-test-grocery-seed',
      baseSalary: 31200.00,
      additionalBusinesses: [],
      startDate: new Date('2024-01-01'),
      endDate: null,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  contractBenefits: [
    {
      id: 'contract-benefit-001',
      contractId: 'contract-001',
      benefitTypeId: 'benefit-type-test-001',
      amount: 200.00,
      createdAt: new Date()
    }
  ],

  contractRenewals: [
    {
      id: 'renewal-001',
      employeeId: 'employee-001',
      originalContractId: 'contract-001',
      renewalDueDate: new Date('2025-01-01'),
      notes: 'Annual salary increase',
      createdAt: new Date()
    }
  ],

  employeeBenefits: [
    {
      id: 'emp-benefit-001',
      employeeId: 'employee-001',
      benefitTypeId: 'benefit-type-test-002',
      amount: 10.00,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
      createdAt: new Date()
    }
  ],

  employeeAllowances: [
    {
      id: 'allowance-001',
      employeeId: 'employee-001',
      type: 'meal',
      amount: 50.00,
      payrollMonth: 1,
      payrollYear: 2024,
      createdAt: new Date()
    }
  ],

  employeeBonuses: [
    {
      id: 'bonus-001',
      employeeId: 'employee-001',
      type: 'performance',
      amount: 500.00,
      reason: 'Performance bonus',
      createdAt: new Date()
    }
  ],

  employeeSalaryIncreases: [
    {
      id: 'salary-inc-001',
      employeeId: 'employee-001',
      previousSalary: 31200.00,
      increaseAmount: 1300.00,
      increasePercent: 4.17,
      newSalary: 32500.00,
      effectiveDate: new Date('2024-07-01'),
      reason: 'Annual review',
      createdAt: new Date()
    }
  ],

  employeeLeaveBalance: [
    {
      id: 'leave-bal-001',
      employeeId: 'employee-001',
      year: 2024,
      annualLeaveDays: 20,
      sickLeaveDays: 10,
      usedAnnualDays: 5,
      usedSickDays: 2,
      remainingAnnual: 15,
      remainingSick: 8,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  employeeLeaveRequests: [
    {
      id: 'leave-req-001',
      employeeId: 'employee-001',
      leaveType: 'vacation',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-08-05'),
      daysRequested: 5,
      reason: 'Family vacation',
      status: 'approved',
      approvedBy: 'employee-001',
      approvedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  employeeLoans: [
    {
      id: 'loan-001',
      employeeId: 'employee-001',
      loanAmount: 1000.00,
      monthlyDeduction: 85.00,
      totalMonths: 12,
      remainingBalance: 1000.00,
      remainingMonths: 12,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  employeeLoanPayments: [
    {
      id: 'loan-pay-001',
      loanId: 'loan-001',
      amount: 85.00,
      paymentDate: new Date('2024-02-01'),
      createdAt: new Date()
    }
  ],

  employeeDeductions: [
    {
      id: 'deduction-001',
      employeeId: 'employee-001',
      type: 'loan_payment',
      amount: 85.00,
      reason: 'Monthly loan repayment',
      createdAt: new Date()
    }
  ],

  employeeDeductionPayments: [
    {
      id: 'ded-pay-001',
      deductionId: 'deduction-001',
      amount: 85.00,
      paymentDate: new Date('2024-02-01'),
      createdAt: new Date()
    }
  ],

  // Customers
  businessCustomers: [
    {
      id: 'customer-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      customerNumber: 'CUST001',
      name: 'Jane Customer',
      email: 'jane.customer@test.com',
      phone: '555-2000',
      customerType: 'INDIVIDUAL',
      loyaltyPoints: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Suppliers
  businessSuppliers: [
    {
      id: 'supplier-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      supplierNumber: 'SUP001',
      name: 'Fresh Foods Inc',
      contactPerson: 'Bob Supplier',
      email: 'bob@freshfoods.com',
      phone: '555-3000',
      address: '456 Supplier Blvd',
      paymentTerms: 'Net 30',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  supplierProducts: [
    {
      id: 'sup-prod-001',
      supplierId: 'supplier-001',
      productId: 'product-001',
      supplierSku: 'FF-APPLE-001',
      supplierPrice: 1.00,
      minimumOrder: 10,
      leadTimeDays: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Products and inventory
  businessCategories: [
    {
      id: 'category-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      name: 'Fruits',
      description: 'Fresh fruits and vegetables',
      parentId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  businessProducts: [
    {
      id: 'product-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      name: 'Red Apples',
      sku: 'APPLE-RED-001',
      basePrice: 2.50,
      isActive: true,
      categoryId: 'category-001',
      brandId: 'brand-001',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  productVariants: [
    {
      id: 'variant-001',
      productId: 'product-001',
      name: 'Medium Size',
      sku: 'APPLE-RED-MED',
      price: 2.50,
      stockQuantity: 100,
      reorderLevel: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  productBarcodes: [
    {
      id: randomUUID(),
      variantId: 'variant-001',
      code: '6001234567890',
      type: 'EAN_13',
      isPrimary: true,
      label: 'Red Apples - Medium'
    },
    {
      id: randomUUID(),
      variantId: 'variant-001',
      code: 'APPLE001',
      type: 'CODE39',
      isPrimary: false,
      label: 'SKU Barcode'
    }
  ],

  productAttributes: [
    {
      id: 'attr-001',
      productId: 'product-001',
      key: 'color',
      value: 'red',
      createdAt: new Date()
    }
  ],

  productImages: [
    {
      id: 'img-001',
      productId: 'product-001',
      businessType: 'grocery',
      imageUrl: '/images/apple-red.jpg',
      altText: 'Red apple',
      isPrimary: true,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Inventory movements
  businessStockMovements: [
    {
      id: 'stock-mov-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      productVariantId: 'variant-001',
      movementType: 'PURCHASE_RECEIVED',
      quantity: 50,
      reason: 'Initial stock',
      reference: 'INIT-001',
      unitCost: 1.50,
      employeeId: 'employee-001',
      createdAt: new Date()
    }
  ],

  // Orders and transactions
  businessOrders: [
    {
      id: 'order-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      customerId: 'customer-001',
      orderNumber: 'ORD001',
      status: 'COMPLETED',
      subtotal: 22.50,
      totalAmount: 25.00,
      taxAmount: 2.50,
      discountAmount: 0.00,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      notes: 'Test order',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  businessOrderItems: [
    {
      id: 'order-item-001',
      orderId: 'order-001',
      productVariantId: 'variant-001',
      quantity: 10,
      unitPrice: 2.50,
      totalPrice: 25.00,
      discountAmount: 0.00,
      createdAt: new Date()
    }
  ],

  businessTransactions: [
    {
      id: 'trans-001',
      businessId: 'biz-test-grocery-seed',
      type: 'sale',
      amount: 25.00,
      description: 'Test sale transaction',
      balanceAfter: 25.00,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  // Expense accounts
  expenseAccounts: [
    {
      id: 'expense-account-001',
      accountNumber: 'EXP-001',
      accountName: 'Office Supplies Account',
      balance: 1000.00,
      description: 'Account for office supplies expenses',
      isActive: true,
      lowBalanceThreshold: 100.00,
      createdBy: 'user-test-seed-001'
    }
  ],

  expenseAccountDeposits: [
    {
      id: 'deposit-001',
      expenseAccountId: 'expense-account-001',
      sourceType: 'manual',
      amount: 1000.00,
      depositDate: new Date('2024-01-01'),
      manualNote: 'Initial deposit',
      createdBy: 'user-test-seed-001'
    }
  ],

  expenseAccountPayments: [
    {
      id: 'payment-001',
      expenseAccountId: 'expense-account-001',
      payeeType: 'supplier',
      categoryId: 'exp-cat-001',
      amount: 150.00,
      paymentDate: new Date('2024-01-15'),
      notes: 'Office supplies purchase',
      createdBy: 'user-test-seed-001'
    }
  ],

  // Payroll
  payrollPeriods: [
    {
      id: 'payroll-period-001',
      businessId: 'biz-test-grocery-seed',
      year: 2024,
      month: 1,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-15'),
      status: 'completed',
      totalGrossPay: 1200.00,
      totalDeductions: 85.00,
      totalNetPay: 1115.00,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  payrollEntries: [
    {
      id: 'payroll-entry-001',
      payrollPeriodId: 'payroll-period-001',
      employeeId: 'employee-001',
      grossPay: 600.00,
      totalDeductions: 42.50,
      netPay: 557.50,
      overtimeHours: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  payrollEntryBenefits: [
    {
      id: 'pay-entry-benefit-001',
      payrollEntryId: 'payroll-entry-001',
      benefitTypeId: 'benefit-type-test-002',
      benefitName: 'Health Insurance',
      amount: 10.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  payrollAdjustments: [
    {
      id: 'payroll-adj-001',
      payrollEntryId: 'payroll-entry-001',
      adjustmentType: 'bonus',
      amount: 100.00,
      reason: 'Performance bonus',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  payrollAccounts: [
    {
      id: 'payroll-account-001',
      businessId: 'biz-test-grocery-seed',
      accountNumber: 'PAY-001',
      balance: 0.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  payrollExports: [
    {
      id: 'payroll-export-001',
      businessId: 'biz-test-grocery-seed',
      payrollPeriodId: 'payroll-period-001',
      year: 2024,
      month: 1,
      fileName: 'payroll-jan-2024.xlsx',
      fileUrl: '/exports/payroll-jan-2024.xlsx',
      fileSize: 15000,
      format: 'excel',
      includesMonths: [1],
      employeeCount: 1,
      totalGrossPay: 1200.00,
      totalNetPay: 1115.00,
      generationType: 'manual',
      exportedAt: new Date(),
      exportedBy: 'user-test-seed-001'
    }
  ],

  // Vehicles and transportation
  vehicles: [
    {
      id: 'vehicle-001',
      businessId: 'biz-test-grocery-seed',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      licensePlate: 'ABC123',
      vin: '1HGBH41JXMN109186',
      currentMileage: 50000,
      driveType: 'LEFT_HAND',
      ownershipType: 'BUSINESS',
      purchaseDate: new Date('2020-01-01'),
      purchasePrice: 25000.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleDrivers: [
    {
      id: 'vehicle-driver-001',
      fullName: 'John Driver',
      licenseNumber: 'DL123456',
      licenseCountryOfIssuance: 'RW',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleLicenses: [
    {
      id: 'vehicle-license-001',
      vehicleId: 'vehicle-001',
      licenseType: 'REGISTRATION',
      licenseNumber: 'REG123456',
      issueDate: new Date('2020-01-01'),
      expiryDate: new Date('2025-01-01'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleMaintenanceRecords: [
    {
      id: 'maintenance-001',
      vehicleId: 'vehicle-001',
      serviceType: 'OIL_CHANGE',
      serviceName: 'Regular Oil Change',
      serviceDate: new Date('2024-01-15'),
      mileageAtService: 50100,
      serviceCost: 75.00,
      notes: 'Regular oil change',
      nextServiceDue: new Date('2024-04-15'),
      nextServiceMileage: 55100,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  vehicleMaintenanceServices: [
    {
      id: 'maint-service-001',
      maintenanceRecordId: 'maintenance-001',
      serviceName: 'Oil Change',
      serviceType: 'Maintenance',
      cost: 75.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleMaintenanceServiceExpenses: [
    {
      id: 'maint-exp-001',
      serviceId: 'maint-service-001',
      expenseType: 'parts',
      amount: 45.00,
      description: 'Oil filter',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleTrips: [
    {
      id: 'trip-001',
      vehicleId: 'vehicle-001',
      driverId: 'vehicle-driver-001',
      tripType: 'BUSINESS',
      startTime: new Date('2024-01-10T08:00:00'),
      endTime: new Date('2024-01-10T17:00:00'),
      startMileage: 50000,
      endMileage: 50080,
      tripMileage: 80,
      tripPurpose: 'Delivery run',
      endLocation: 'Customer locations',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleExpenses: [
    {
      id: 'vehicle-exp-001',
      vehicleId: 'vehicle-001',
      expenseType: 'FUEL',
      amount: 50.00,
      expenseDate: new Date('2024-01-10'),
      description: 'Fuel for delivery run',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  vehicleReimbursements: [
    {
      id: 'vehicle-reimb-001',
      userId: 'user-test-seed-001',
      vehicleId: 'vehicle-001',
      businessId: 'biz-test-grocery-seed',
      reimbursementPeriod: '2024-01',
      totalMileage: 100,
      businessMileage: 80,
      personalMileage: 20,
      statutoryRate: 0.50,
      totalAmount: 40.00,
      submissionDate: new Date('2024-01-15'),
      approvedBy: 'user-test-seed-001',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Driver authorizations
  driverAuthorizations: [
    {
      id: 'driver-auth-001',
      driverId: 'vehicle-driver-001',
      vehicleId: 'vehicle-001',
      authorizedBy: 'user-test-seed-001',
      authorizedDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Projects and construction
  projects: [
    {
      id: 'project-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      name: 'Store Renovation',
      description: 'Complete store renovation project',
      projectTypeId: 'project-type-001',
      status: 'in_progress',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-01'),
      budget: 50000.00,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001',
      updatedAt: new Date()
    }
  ],

  projectStages: [
    {
      id: 'stage-001',
      projectId: 'project-001',
      name: 'Planning Phase',
      description: 'Initial planning and design',
      orderIndex: 1,
      status: 'completed',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      estimatedAmount: 5000.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  projectContractors: [
    {
      id: 'contractor-001',
      projectId: 'project-001',
      personId: 'person-001',
      role: 'General Contractor',
      status: 'active',
      totalContractAmount: 25000.00,
      hourlyRate: 75.00,
      isPrimary: true,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-01'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  stageContractorAssignments: [
    {
      id: 'stage-assign-001',
      stageId: 'stage-001',
      projectContractorId: 'contractor-001',
      predeterminedAmount: 5000.00,
      depositAmount: 1000.00,
      depositPercentage: 20.00,
      isDepositPaid: true,
      depositPaidDate: new Date('2024-01-05'),
      isFinalPaymentMade: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  projectTransactions: [
    {
      id: 'proj-trans-001',
      projectId: 'project-001',
      personalExpenseId: 'personal-exp-001',
      transactionType: 'PAYMENT',
      amount: 5000.00,
      description: 'Payment to contractor',
      status: 'completed',
      paymentMethod: 'BANK_TRANSFER',
      paidAt: new Date('2024-01-15'),
      approvedBy: 'user-test-seed-001',
      approvedAt: new Date('2024-01-15'),
      recipientPersonId: 'person-001',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  constructionExpenses: [
    {
      id: 'const-exp-001',
      projectId: 'const-proj-001',
      category: 'materials',
      description: 'Building materials',
      amount: 2000.00,
      vendor: 'ABC Building Supplies',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  constructionProjects: [
    {
      id: 'const-proj-001',
      name: 'Office Building Renovation',
      description: 'Complete renovation of office building',
      status: 'active',
      budget: 100000.00,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      businessType: 'construction',
      projectTypeId: 'project-type-001',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001',
      updatedAt: new Date()
    }
  ],

  // Menu items (for restaurants)
  menuItems: [
    {
      id: 'menu-item-001',
      name: 'Cheeseburger',
      description: 'Classic cheeseburger with fries',
      price: 12.99,
      category: 'main',
      barcode: '123456789012',
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  menuCombos: [
    {
      id: 'menu-combo-001',
      businessId: 'biz-test-restaurant-seed',
      name: 'Burger Combo',
      description: 'Burger with drink and fries',
      totalPrice: 15.99,
      originalTotalPrice: 18.99,
      discountPercent: 15.00,
      isActive: true,
      isAvailable: true,
      preparationTime: 20,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  menuComboItems: [
    {
      id: 'combo-item-001',
      comboId: 'menu-combo-001',
      productId: 'product-001',
      variantId: 'variant-001',
      quantity: 1,
      isRequired: true,
      sortOrder: 1,
      createdAt: new Date()
    }
  ],

  menuPromotions: [
    {
      id: 'promotion-001',
      businessId: 'biz-test-restaurant-seed',
      name: 'Lunch Special',
      description: '20% off lunch items',
      type: 'PERCENTAGE',
      value: 20.00,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      applicableCategories: ['main'],
      applicableProducts: [],
      isActive: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Orders (general)
  orders: [
    {
      id: 'gen-order-001',
      orderNumber: 'ORD-2024-001',
      total: 15.99,
      status: 'completed',
      tableNumber: 'T5',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  orderItems: [
    {
      id: 'gen-order-item-001',
      orderId: 'gen-order-001',
      menuItemId: 'menu-item-001',
      quantity: 1,
      price: 12.99,
      notes: 'No onions'
    }
  ],

  // Customer layby
  customerLayby: [
    {
      id: 'layby-001',
      laybyNumber: 'LBY-2024-001',
      businessId: 'biz-test-grocery-seed',
      customerId: 'customer-001',
      status: 'ACTIVE',
      totalAmount: 100.00,
      depositAmount: 20.00,
      depositPercent: 20.00,
      balanceRemaining: 80.00,
      totalPaid: 20.00,
      items: { item1: 'Product 1' },
      itemsReleased: false,
      paymentDueDate: new Date('2024-02-01'),
      createdBy: 'user-test-seed-001',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  customerLaybyPayment: [
    {
      id: 'layby-pay-001',
      laybyId: 'layby-001',
      receiptNumber: 'RCP-LBY-001',
      amount: 50.00,
      paymentMethod: 'CASH',
      paymentDate: new Date('2024-01-15'),
      processedBy: 'user-test-seed-001',
      isRefund: false
    }
  ],

  // Personal budgets and expenses
  personalBudgets: [
    {
      id: 'personal-budget-001',
      userId: 'user-test-seed-001',
      amount: 500.00,
      description: 'Monthly food budget',
      type: 'deposit',
      createdAt: new Date()
    }
  ],

  personalExpenses: [
    {
      id: 'personal-exp-001',
      userId: 'user-test-seed-001',
      category: 'food',
      description: 'Lunch at restaurant',
      amount: 25.00,
      date: new Date('2024-01-10'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Fund sources and inter-business loans
  fundSources: [
    {
      id: 'fund-source-001',
      name: 'Cash',
      emoji: '💵',
      userId: 'user-test-seed-001',
      isDefault: true,
      usageCount: 0,
      createdAt: new Date()
    }
  ],

  interBusinessLoans: [
    {
      id: 'inter-loan-001',
      loanNumber: 'LOAN-2024-001',
      principalAmount: 5000.00,
      interestRate: 4.00,
      totalAmount: 5200.00,
      remainingBalance: 5200.00,
      lenderType: 'business',
      lenderBusinessId: 'biz-test-grocery-seed',
      borrowerType: 'business',
      borrowerBusinessId: 'biz-test-restaurant-seed',
      loanDate: new Date('2024-01-01'),
      dueDate: new Date('2025-01-01'),
      status: 'active',
      terms: '12 months, 4% interest',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  loanTransactions: [
    {
      id: 'loan-trans-001',
      loanId: 'inter-loan-001',
      transactionType: 'payment',
      amount: 420.00,
      description: 'Monthly loan payment',
      transactionDate: new Date('2024-02-01'),
      balanceAfter: 4780.00,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  // Conflict resolution
  conflictResolutions: [
    {
      id: 'conflict-res-001',
      conflictType: 'UPDATE_UPDATE',
      resolutionStrategy: 'SOURCE_WINS',
      sourceEventId: 'event-001',
      targetEventId: 'event-002',
      resolvedData: { tableName: 'business_products', recordId: 'product-001' },
      resolvedBy: 'user-test-seed-001',
      resolvedAt: new Date(),
      createdAt: new Date()
    }
  ],

  // Disciplinary actions
  disciplinaryActions: [
    {
      id: 'disc-action-001',
      employeeId: 'employee-001',
      actionType: 'warning',
      violationType: 'tardiness',
      title: 'Late Arrival Warning',
      description: 'Late arrival - First warning for tardiness',
      incidentDate: new Date('2024-01-04'),
      actionDate: new Date('2024-01-05'),
      severity: 'low',
      createdBy: 'employee-001'
    }
  ],

  // Employee attendance and time tracking
  employeeAttendance: [
    {
      id: 'attendance-001',
      employeeId: 'employee-001',
      date: new Date('2024-01-10'),
      checkIn: new Date('2024-01-10T08:00:00'),
      checkOut: new Date('2024-01-10T17:00:00'),
      hoursWorked: 8.00,
      status: 'present'
    }
  ],

  employeeTimeTracking: [
    {
      id: 'time-track-001',
      employeeId: 'employee-001',
      year: 2024,
      month: 1,
      workDays: 20,
      totalHours: 160.00,
      overtimeHours: 0.00,
      updatedAt: new Date()
    }
  ],

  // Data snapshots
  dataSnapshots: [
    {
      id: 'data-snap-001',
      nodeId: 'node-001',
      tableName: 'employees',
      recordId: 'employee-001',
      snapshotData: { employeeId: 'employee-001', salary: 50000, status: 'active' },
      advanceDeductions: 0.00,
      loanDeductions: 0.00,
      totalDeductions: 0.00
    }
  ],

  // Seed data templates
  seedDataTemplates: [
    {
      id: 'seed-template-001',
      name: 'Basic Grocery Setup',
      description: 'Basic setup for grocery businesses',
      businessType: 'grocery',
      version: '1.0.0',
      templateData: { categories: ['Fruits', 'Vegetables'] },
      isActive: true,
      createdBy: 'user-test-seed-001'
    }
  ],

  // Additional tables that need data
  persons: [
    {
      id: 'person-001',
      fullName: 'John Doe',
      email: 'john.doe@test.com',
      phone: '555-1000',
      address: '789 Employee St',
      nationalId: 'NAT001'
    },
    {
      id: 'person-002',
      fullName: 'Jane Customer',
      email: 'jane.customer@test.com',
      phone: '555-2000',
      address: '321 Customer Ave',
      nationalId: 'NAT002'
    }
  ],

  employeeBusinessAssignments: [
    {
      id: 'emp-assign-001',
      employeeId: 'employee-001',
      businessId: 'biz-test-grocery-seed',
      isPrimary: true,
      isActive: true,
      startDate: new Date(),
      assignedBy: 'user-test-seed-001'
    }
  ],

  employeeContracts: [
    {
      id: 'contract-001',
      employeeId: 'employee-001',
      contractNumber: 'CONTRACT-001',
      jobTitleId: 'job-title-002',
      compensationTypeId: 'comp-type-001',
      primaryBusinessId: 'biz-test-grocery-seed',
      baseSalary: 31200.00,
      additionalBusinesses: [],
      startDate: new Date('2024-01-01'),
      endDate: null,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  contractBenefits: [
    {
      id: 'contract-benefit-001',
      contractId: 'contract-001',
      benefitTypeId: 'benefit-type-test-001',
      amount: 200.00,
      createdAt: new Date()
    }
  ],

  contractRenewals: [
    {
      id: 'renewal-001',
      employeeId: 'employee-001',
      originalContractId: 'contract-001',
      renewalDueDate: new Date('2025-01-01'),
      notes: 'Annual salary increase',
      createdAt: new Date()
    }
  ],

  employeeBenefits: [
    {
      id: 'emp-benefit-001',
      employeeId: 'employee-001',
      benefitTypeId: 'benefit-type-test-002',
      amount: 10.00,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
      createdAt: new Date()
    }
  ],

  employeeAllowances: [
    {
      id: 'allowance-001',
      employeeId: 'employee-001',
      type: 'meal',
      amount: 50.00,
      payrollMonth: 1,
      payrollYear: 2024,
      createdAt: new Date()
    }
  ],

  employeeBonuses: [
    {
      id: 'bonus-001',
      employeeId: 'employee-001',
      type: 'performance',
      amount: 500.00,
      reason: 'Performance bonus',
      createdAt: new Date()
    }
  ],

  employeeSalaryIncreases: [
    {
      id: 'salary-inc-001',
      employeeId: 'employee-001',
      previousSalary: 31200.00,
      increaseAmount: 1300.00,
      increasePercent: 4.17,
      newSalary: 32500.00,
      effectiveDate: new Date('2024-07-01'),
      reason: 'Annual review',
      createdAt: new Date()
    }
  ],

  employeeLeaveBalance: [
    {
      id: 'leave-bal-001',
      employeeId: 'employee-001',
      year: 2024,
      annualLeaveDays: 20,
      sickLeaveDays: 10,
      usedAnnualDays: 5,
      usedSickDays: 2,
      remainingAnnual: 15,
      remainingSick: 8,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  employeeLeaveRequests: [
    {
      id: 'leave-req-001',
      employeeId: 'employee-001',
      leaveType: 'vacation',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-08-05'),
      daysRequested: 5,
      reason: 'Family vacation',
      status: 'approved',
      approvedBy: 'employee-001',
      approvedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  employeeLoans: [
    {
      id: 'loan-001',
      employeeId: 'employee-001',
      loanAmount: 1000.00,
      monthlyDeduction: 85.00,
      totalMonths: 12,
      remainingBalance: 1000.00,
      remainingMonths: 12,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  employeeLoanPayments: [
    {
      id: 'loan-pay-001',
      loanId: 'loan-001',
      amount: 85.00,
      paymentDate: new Date('2024-02-01'),
      createdAt: new Date()
    }
  ],

  employeeDeductions: [
    {
      id: 'deduction-001',
      employeeId: 'employee-001',
      type: 'loan_payment',
      amount: 85.00,
      reason: 'Monthly loan repayment',
      createdAt: new Date()
    }
  ],

  employeeDeductionPayments: [
    {
      id: 'ded-pay-001',
      deductionId: 'deduction-001',
      amount: 85.00,
      paymentDate: new Date('2024-02-01'),
      createdAt: new Date()
    }
  ],

  supplierProducts: [
    {
      id: 'sup-prod-001',
      supplierId: 'supplier-001',
      productId: 'product-001',
      supplierSku: 'FF-APPLE-001',
      supplierPrice: 1.00,
      minimumOrder: 10,
      leadTimeDays: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  productBarcodes: [
    {
      id: randomUUID(),
      variantId: 'variant-001',
      code: '6001234567890',
      type: 'EAN_13',
      isPrimary: true,
      label: 'Red Apples - Medium'
    },
    {
      id: randomUUID(),
      variantId: 'variant-001',
      code: 'APPLE001',
      type: 'CODE39',
      isPrimary: false,
      label: 'SKU Barcode'
    }
  ],

  productImages: [
    {
      id: 'img-001',
      productId: 'product-001',
      businessType: 'grocery',
      imageUrl: '/images/apple-red.jpg',
      altText: 'Red apple',
      isPrimary: true,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  businessTransactions: [
    {
      id: 'trans-001',
      businessId: 'biz-test-grocery-seed',
      type: 'sale',
      amount: 25.00,
      description: 'Test sale transaction',
      balanceAfter: 25.00,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  payrollPeriods: [
    {
      id: 'payroll-period-001',
      businessId: 'biz-test-grocery-seed',
      year: 2024,
      month: 1,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-15'),
      status: 'completed',
      totalGrossPay: 1200.00,
      totalDeductions: 85.00,
      totalNetPay: 1115.00,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  payrollEntries: [
    {
      id: 'payroll-entry-001',
      payrollPeriodId: 'payroll-period-001',
      employeeId: 'employee-001',
      grossPay: 600.00,
      totalDeductions: 42.50,
      netPay: 557.50,
      overtimeHours: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  payrollEntryBenefits: [
    {
      id: 'pay-entry-benefit-001',
      payrollEntryId: 'payroll-entry-001',
      benefitTypeId: 'benefit-type-test-002',
      benefitName: 'Health Insurance',
      amount: 10.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  payrollAdjustments: [
    {
      id: 'payroll-adj-001',
      payrollEntryId: 'payroll-entry-001',
      adjustmentType: 'bonus',
      amount: 100.00,
      reason: 'Performance bonus',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  payrollAccounts: [
    {
      id: 'payroll-account-001',
      businessId: 'biz-test-grocery-seed',
      accountNumber: 'PAY-001',
      balance: 0.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  payrollExports: [
    {
      id: 'payroll-export-001',
      businessId: 'biz-test-grocery-seed',
      payrollPeriodId: 'payroll-period-001',
      year: 2024,
      month: 1,
      fileName: 'payroll-jan-2024.xlsx',
      fileUrl: '/exports/payroll-jan-2024.xlsx',
      fileSize: 15000,
      format: 'excel',
      includesMonths: [1],
      employeeCount: 1,
      totalGrossPay: 1200.00,
      totalNetPay: 1115.00,
      generationType: 'manual',
      exportedAt: new Date(),
      exportedBy: 'user-test-seed-001'
    }
  ],

  vehicles: [
    {
      id: 'vehicle-001',
      businessId: 'biz-test-grocery-seed',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      licensePlate: 'ABC123',
      vin: '1HGBH41JXMN109186',
      currentMileage: 50000,
      driveType: 'LEFT_HAND',
      ownershipType: 'BUSINESS',
      purchaseDate: new Date('2020-01-01'),
      purchasePrice: 25000.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleDrivers: [
    {
      id: 'vehicle-driver-001',
      fullName: 'John Driver',
      licenseNumber: 'DL123456',
      licenseCountryOfIssuance: 'RW',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleLicenses: [
    {
      id: 'vehicle-license-001',
      vehicleId: 'vehicle-001',
      licenseType: 'REGISTRATION',
      licenseNumber: 'REG123456',
      issueDate: new Date('2020-01-01'),
      expiryDate: new Date('2025-01-01'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleMaintenanceRecords: [
    {
      id: 'maintenance-001',
      vehicleId: 'vehicle-001',
      serviceType: 'OIL_CHANGE',
      serviceName: 'Regular Oil Change',
      serviceDate: new Date('2024-01-15'),
      mileageAtService: 50100,
      serviceCost: 75.00,
      notes: 'Regular oil change',
      nextServiceDue: new Date('2024-04-15'),
      nextServiceMileage: 55100,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  vehicleMaintenanceServices: [
    {
      id: 'maint-service-001',
      maintenanceRecordId: 'maintenance-001',
      serviceName: 'Oil Change',
      serviceType: 'Maintenance',
      cost: 75.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleMaintenanceServiceExpenses: [
    {
      id: 'maint-exp-001',
      serviceId: 'maint-service-001',
      expenseType: 'parts',
      amount: 45.00,
      description: 'Oil filter',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleTrips: [
    {
      id: 'trip-001',
      vehicleId: 'vehicle-001',
      driverId: 'vehicle-driver-001',
      tripType: 'BUSINESS',
      startTime: new Date('2024-01-10T08:00:00'),
      endTime: new Date('2024-01-10T17:00:00'),
      startMileage: 50000,
      endMileage: 50080,
      tripMileage: 80,
      tripPurpose: 'Delivery run',
      endLocation: 'Customer locations',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  vehicleExpenses: [
    {
      id: 'vehicle-exp-001',
      vehicleId: 'vehicle-001',
      expenseType: 'FUEL',
      amount: 50.00,
      expenseDate: new Date('2024-01-10'),
      description: 'Fuel for delivery run',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  vehicleReimbursements: [
    {
      id: 'vehicle-reimb-001',
      userId: 'user-test-seed-001',
      vehicleId: 'vehicle-001',
      businessId: 'biz-test-grocery-seed',
      reimbursementPeriod: '2024-01',
      totalMileage: 100,
      businessMileage: 80,
      personalMileage: 20,
      statutoryRate: 0.50,
      totalAmount: 40.00,
      submissionDate: new Date('2024-01-15'),
      approvedBy: 'user-test-seed-001',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  driverAuthorizations: [
    {
      id: 'driver-auth-001',
      driverId: 'vehicle-driver-001',
      vehicleId: 'vehicle-001',
      authorizedBy: 'user-test-seed-001',
      authorizedDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  projects: [
    {
      id: 'project-001',
      businessId: 'biz-test-grocery-seed',
      businessType: 'grocery',
      name: 'Store Renovation',
      description: 'Complete store renovation project',
      projectTypeId: 'project-type-001',
      status: 'in_progress',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-01'),
      budget: 50000.00,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001',
      updatedAt: new Date()
    }
  ],

  projectStages: [
    {
      id: 'stage-001',
      projectId: 'project-001',
      name: 'Planning Phase',
      description: 'Initial planning and design',
      orderIndex: 1,
      status: 'completed',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      estimatedAmount: 5000.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  projectContractors: [
    {
      id: 'contractor-001',
      projectId: 'project-001',
      personId: 'person-001',
      role: 'General Contractor',
      status: 'active',
      totalContractAmount: 25000.00,
      hourlyRate: 75.00,
      isPrimary: true,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-01'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  stageContractorAssignments: [
    {
      id: 'stage-assign-001',
      stageId: 'stage-001',
      projectContractorId: 'contractor-001',
      predeterminedAmount: 5000.00,
      depositAmount: 1000.00,
      depositPercentage: 20.00,
      isDepositPaid: true,
      depositPaidDate: new Date('2024-01-05'),
      isFinalPaymentMade: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  projectTransactions: [
    {
      id: 'proj-trans-001',
      projectId: 'project-001',
      personalExpenseId: 'personal-exp-001',
      transactionType: 'PAYMENT',
      amount: 5000.00,
      description: 'Payment to contractor',
      status: 'completed',
      paymentMethod: 'BANK_TRANSFER',
      paidAt: new Date('2024-01-15'),
      approvedBy: 'user-test-seed-001',
      approvedAt: new Date('2024-01-15'),
      recipientPersonId: 'person-001',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  constructionExpenses: [
    {
      id: 'const-exp-001',
      projectId: 'const-proj-001',
      category: 'materials',
      description: 'Building materials',
      amount: 2000.00,
      vendor: 'ABC Building Supplies',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  constructionProjects: [
    {
      id: 'const-proj-001',
      name: 'Office Building Renovation',
      description: 'Complete renovation of office building',
      status: 'active',
      budget: 100000.00,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      businessType: 'construction',
      projectTypeId: 'project-type-001',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001',
      updatedAt: new Date()
    }
  ],

  menuItems: [
    {
      id: 'menu-item-001',
      name: 'Cheeseburger',
      description: 'Classic cheeseburger with fries',
      price: 12.99,
      category: 'main',
      barcode: '123456789012',
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  menuCombos: [
    {
      id: 'menu-combo-001',
      businessId: 'biz-test-restaurant-seed',
      name: 'Burger Combo',
      description: 'Burger with drink and fries',
      totalPrice: 15.99,
      originalTotalPrice: 18.99,
      discountPercent: 15.00,
      isActive: true,
      isAvailable: true,
      preparationTime: 20,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  menuComboItems: [
    {
      id: 'combo-item-001',
      comboId: 'menu-combo-001',
      productId: 'product-001',
      variantId: 'variant-001',
      quantity: 1,
      isRequired: true,
      sortOrder: 1,
      createdAt: new Date()
    }
  ],

  menuPromotions: [
    {
      id: 'promotion-001',
      businessId: 'biz-test-restaurant-seed',
      name: 'Lunch Special',
      description: '20% off lunch items',
      type: 'PERCENTAGE',
      value: 20.00,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      applicableCategories: ['main'],
      applicableProducts: [],
      isActive: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  orders: [
    {
      id: 'gen-order-001',
      orderNumber: 'ORD-2024-001',
      total: 15.99,
      status: 'completed',
      tableNumber: 'T5',
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  orderItems: [
    {
      id: 'gen-order-item-001',
      orderId: 'gen-order-001',
      menuItemId: 'menu-item-001',
      quantity: 1,
      price: 12.99,
      notes: 'No onions'
    }
  ],

  customerLayby: [
    {
      id: 'layby-001',
      laybyNumber: 'LBY-2024-001',
      businessId: 'biz-test-grocery-seed',
      customerId: 'customer-001',
      status: 'ACTIVE',
      totalAmount: 100.00,
      depositAmount: 20.00,
      depositPercent: 20.00,
      balanceRemaining: 80.00,
      totalPaid: 20.00,
      items: { item1: 'Product 1' },
      itemsReleased: false,
      paymentDueDate: new Date('2024-02-01'),
      createdBy: 'user-test-seed-001',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  customerLaybyPayment: [
    {
      id: 'layby-pay-001',
      laybyId: 'layby-001',
      receiptNumber: 'RCP-LBY-001',
      amount: 50.00,
      paymentMethod: 'CASH',
      paymentDate: new Date('2024-01-15'),
      processedBy: 'user-test-seed-001',
      isRefund: false
    }
  ],

  personalBudgets: [
    {
      id: 'personal-budget-001',
      userId: 'user-test-seed-001',
      amount: 500.00,
      description: 'Monthly food budget',
      type: 'deposit',
      createdAt: new Date()
    }
  ],

  personalExpenses: [
    {
      id: 'personal-exp-001',
      userId: 'user-test-seed-001',
      category: 'food',
      description: 'Lunch at restaurant',
      amount: 25.00,
      date: new Date('2024-01-10'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  fundSources: [
    {
      id: 'fund-source-001',
      name: 'Cash',
      emoji: '💵',
      userId: 'user-test-seed-001',
      isDefault: true,
      usageCount: 0,
      createdAt: new Date()
    }
  ],

  interBusinessLoans: [
    {
      id: 'inter-loan-001',
      loanNumber: 'LOAN-2024-001',
      principalAmount: 5000.00,
      interestRate: 4.00,
      totalAmount: 5200.00,
      remainingBalance: 5200.00,
      lenderType: 'business',
      lenderBusinessId: 'biz-test-grocery-seed',
      borrowerType: 'business',
      borrowerBusinessId: 'biz-test-restaurant-seed',
      loanDate: new Date('2024-01-01'),
      dueDate: new Date('2025-01-01'),
      status: 'active',
      terms: '12 months, 4% interest',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  loanTransactions: [
    {
      id: 'loan-trans-001',
      loanId: 'inter-loan-001',
      transactionType: 'payment',
      amount: 420.00,
      description: 'Monthly loan payment',
      transactionDate: new Date('2024-02-01'),
      balanceAfter: 4780.00,
      createdAt: new Date(),
      createdBy: 'user-test-seed-001'
    }
  ],

  conflictResolutions: [
    {
      id: 'conflict-res-001',
      conflictType: 'UPDATE_UPDATE',
      resolutionStrategy: 'SOURCE_WINS',
      sourceEventId: 'event-001',
      targetEventId: 'event-002',
      resolvedData: { tableName: 'business_products', recordId: 'product-001' },
      resolvedBy: 'user-test-seed-001',
      resolvedAt: new Date(),
      createdAt: new Date()
    }
  ],

  disciplinaryActions: [
    {
      id: 'disc-action-001',
      employeeId: 'employee-001',
      actionType: 'warning',
      violationType: 'tardiness',
      title: 'Late Arrival Warning',
      description: 'Late arrival - First warning for tardiness',
      incidentDate: new Date('2024-01-04'),
      actionDate: new Date('2024-01-05'),
      severity: 'low',
      createdBy: 'employee-001'
    }
  ],

  employeeAttendance: [
    {
      id: 'attendance-001',
      employeeId: 'employee-001',
      date: new Date('2024-01-10'),
      checkIn: new Date('2024-01-10T08:00:00'),
      checkOut: new Date('2024-01-10T17:00:00'),
      hoursWorked: 8.00,
      status: 'present'
    }
  ],

  employeeTimeTracking: [
    {
      id: 'time-track-001',
      employeeId: 'employee-001',
      year: 2024,
      month: 1,
      workDays: 20,
      totalHours: 160.00,
      overtimeHours: 0.00,
      updatedAt: new Date()
    }
  ],

  dataSnapshots: [
    {
      id: 'data-snap-001',
      nodeId: 'node-001',
      tableName: 'employees',
      recordId: 'employee-001',
      snapshotData: { employeeId: 'employee-001', salary: 50000, status: 'active' },
      advanceDeductions: 0.00,
      loanDeductions: 0.00,
      totalDeductions: 0.00
    }
  ]

}

async function createComprehensiveTestData() {
  try {
    console.log('🌱 Starting comprehensive test data seeding for ALL tables...')

    // Create data in dependency order
    const creationOrder = [
      'systemSettings',
      'emojiLookup',
      'jobTitles',
      'compensationTypes',
      'benefitTypes',
      'idFormatTemplates',
      'driverLicenseTemplates',
      'projectTypes',
      'inventoryDomains',
      'inventorySubcategories',
      'expenseDomains',
      'expenseCategories',
      'expenseSubcategories',
      'users',
      'accounts',
      'permissionTemplates',
      'sessions',
      'businesses',
      'businessMemberships',
      'businessAccounts',
      'businessLocations',
      'businessBrands',
      'persons',
      'employees',
      'employeeBusinessAssignments',
      'employeeContracts',
      'contractBenefits',
      'contractRenewals',
      'employeeBenefits',
      'employeeAllowances',
      'employeeBonuses',
      'employeeSalaryIncreases',
      'employeeLeaveBalance',
      'employeeLeaveRequests',
      'employeeLoans',
      'employeeLoanPayments',
      'employeeDeductions',
      'employeeDeductionPayments',
      'businessCustomers',
      'businessSuppliers',
      'businessCategories',
      'businessProducts',
      'productVariants',
      'productBarcodes',
      'productAttributes',
      'productImages',
      'supplierProducts',
      'businessStockMovements',
      'businessOrders',
      'businessOrderItems',
      'businessTransactions',
      'expenseAccounts',
      'expenseAccountDeposits',
      'expenseAccountPayments',
      'payrollPeriods',
      'payrollEntries',
      'payrollEntryBenefits',
      'payrollAdjustments',
      'payrollAccounts',
      'payrollExports',
      'vehicles',
      'vehicleDrivers',
      'vehicleLicenses',
      'vehicleMaintenanceRecords',
      'vehicleMaintenanceServices',
      'vehicleMaintenanceServiceExpenses',
      'driverAuthorizations',
      'vehicleTrips',
      'vehicleExpenses',
      'vehicleReimbursements',
      'projects',
      'projectStages',
      'projectContractors',
      'stageContractorAssignments',
      'constructionProjects',
      'constructionExpenses',
      'menuItems',
      'menuCombos',
      'menuComboItems',
      'menuPromotions',
      'orders',
      'orderItems',
      'customerLayby',
      'customerLaybyPayment',
      'personalBudgets',
      'personalExpenses',
      'projectTransactions',
      'fundSources',
      'interBusinessLoans',
      'loanTransactions',
      'conflictResolutions',
      'disciplinaryActions',
      'employeeAttendance',
      'employeeTimeTracking',
      'dataSnapshots',
      'seedDataTemplates'
    ]

    for (const tableName of creationOrder) {
      const data = seedData[tableName]
      if (!data || data.length === 0) continue

      console.log(`📝 Creating ${data.length} records for ${tableName}...`)

      try {
        if (tableName === 'productBarcodes') {
          // Special handling for productBarcodes with random UUIDs
          for (const barcode of data) {
            await prisma.productBarcodes.create({ data: barcode })
          }
        } else if (tableName === 'systemSettings') {
          // Special handling for systemSettings - update existing or create if not exists
          for (const settings of data) {
            await prisma.systemSettings.upsert({
              where: { id: settings.id },
              update: settings,
              create: settings
            })
          }
        } else if (tableName === 'emojiLookup') {
          // Special handling for emojiLookup - update existing or create if not exists
          for (const emoji of data) {
            await prisma.emojiLookup.upsert({
              where: { id: emoji.id },
              update: emoji,
              create: emoji
            })
          }
        } else if (tableName === 'jobTitles') {
          // Special handling for jobTitles - update existing or create if not exists
          for (const jobTitle of data) {
            await prisma.jobTitles.upsert({
              where: { id: jobTitle.id },
              update: jobTitle,
              create: jobTitle
            })
          }
        } else if (tableName === 'compensationTypes') {
          // Special handling for compensationTypes - update existing or create if not exists
          for (const compType of data) {
            await prisma.compensationTypes.upsert({
              where: { id: compType.id },
              update: compType,
              create: compType
            })
          }
        } else if (tableName === 'benefitTypes') {
          // Special handling for benefitTypes - update existing or create if not exists
          for (const benefitType of data) {
            await prisma.benefitTypes.upsert({
              where: { id: benefitType.id },
              update: benefitType,
              create: benefitType
            })
          }
        } else if (tableName === 'permissionTemplates') {
          // Special handling for permissionTemplates - update existing or create if not exists
          for (const permTemplate of data) {
            await prisma.permissionTemplates.upsert({
              where: { id: permTemplate.id },
              update: permTemplate,
              create: permTemplate
            })
          }
        } else if (tableName === 'expenseAccounts') {
          // Special handling for expenseAccounts - update existing or create if not exists
          for (const account of data) {
            await prisma.expenseAccounts.upsert({
              where: { accountNumber: account.accountNumber },
              update: account,
              create: account
            })
          }
        } else {
          // Bulk create for other tables
          await prisma[tableName].createMany({
            data,
            skipDuplicates: true
          })
        }
      } catch (error) {
        console.log(`   ❌ Error creating ${tableName}: ${error.message}`)
        throw error
      }
    }

    console.log('✅ Comprehensive test data seeding completed!')
    console.log('📊 Summary:')
    let totalRecords = 0
    for (const [tableName, data] of Object.entries(seedData)) {
      if (Array.isArray(data)) {
        console.log(`   - ${tableName}: ${data.length} records`)
        totalRecords += data.length
      }
    }
    console.log(`   - Total: ${totalRecords} records across all tables`)

  } catch (error) {
    console.error('❌ Error seeding comprehensive test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createComprehensiveTestData()