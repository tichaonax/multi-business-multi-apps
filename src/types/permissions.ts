// User-Level Permissions (Business-Agnostic - tied to user, not business membership)
export interface UserLevelPermissions {
  // Personal Finance Module (User-level - not business-specific)
  canAccessPersonalFinance: boolean;
  canAddPersonalExpenses: boolean;
  canEditPersonalExpenses: boolean;
  canDeletePersonalExpenses: boolean;
  canAddMoney: boolean;
  canManagePersonalCategories: boolean;
  canManagePersonalContractors: boolean;
  canManagePersonalProjects: boolean;
  canViewPersonalReports: boolean;
  canExportPersonalData: boolean;

  // Project Management (Cross-business capability)
  canViewProjects: boolean;
  canCreatePersonalProjects: boolean; // Personal projects that are not tied to any business
  canCreateBusinessProjects: boolean; // Business-level projects that require additional permissions
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectTypes: boolean;
  canViewProjectReports: boolean;
  canAccessCrossBusinessProjects: boolean; // Allows access to projects from other businesses for payments

  // Vehicle Management (User-level - cross-business capability)
  canAccessVehicles: boolean;
  canViewVehicles: boolean;
  canManageVehicles: boolean;
  canManageDrivers: boolean;
  canManageTrips: boolean;
  canLogDriverTrips: boolean; // Limited permission for drivers to log basic trip information
  canLogDriverMaintenance: boolean; // Limited permission for drivers to log basic maintenance services
  canManageVehicleMaintenance: boolean;
  canViewVehicleReports: boolean;
  canExportVehicleData: boolean;

  // System Administration (User-level - global capabilities)
  canManageSystemSettings: boolean;
  canViewSystemLogs: boolean;
  canManageAllBusinesses: boolean;

  // Business-Agnostic Manager Payroll Actions (cross-business capabilities)
  // These permissions allow managers to work with umbrella payroll periods
  // and override business-level restrictions. Only assignable to Managers.
  canAccessUmbrellaPayroll: boolean;  // Can view/manage umbrella payroll periods
  canExportPayrollAcrossBusinesses: boolean;  // Business-agnostic export permission
  canResetPayrollAcrossBusinesses: boolean;  // Business-agnostic reset permission
  canDeletePayrollAcrossBusinesses: boolean;  // Business-agnostic delete permission

  // Inventory Categories (User-level - cross-business capability)
  canCreateInventoryCategories: boolean;
  canEditInventoryCategories: boolean;
  canDeleteInventoryCategories: boolean;
  canCreateInventorySubcategories: boolean;
  canEditInventorySubcategories: boolean;
  canDeleteInventorySubcategories: boolean;

  // Universal Printing Module (User-level - cross-business capability)
  canManageNetworkPrinters: boolean;  // Admin only - register, configure, delete printers
  canSelectPrinters: boolean;         // Select from existing printers for printing
  canUseLabelPrinters: boolean;       // Print labels from inventory
  canPrintReceipts: boolean;          // Print sales receipts
  canPrintInventoryLabels: boolean;   // Print SKU labels for inventory items
  canViewPrintQueue: boolean;         // Admin only - view print job queue and history

  // Global Barcode Scanning (User-level - cross-business capability)
  canAccessGlobalBarcodeScanning: boolean;        // Access global barcode scanning within accessible businesses
  canViewGlobalInventoryAcrossBusinesses: boolean; // View inventory from businesses user doesn't have access to (informational only)
  canStockInventoryFromModal: boolean;            // Add inventory to businesses via global barcode modal

  // Seed Data Template Management (Admin only - cross-business capability)
  canManageSeedTemplates: boolean;    // View, activate, delete seed templates
  canExportSeedTemplates: boolean;    // Create and export templates from businesses
  canApplySeedTemplates: boolean;     // Import and apply templates to businesses

  // Payee Management (User-level - cross-business capability)
  canViewPayees: boolean;             // View all payees (individuals, employees, users, businesses)
  canCreatePayees: boolean;           // Create new individual payees (persons)
  canEditPayees: boolean;             // Edit individual payees and toggle active status
}

// Customer Management Permissions (Cross-business capability)
export interface CustomerManagementPermissions {
  canAccessCustomers: boolean;
  canViewCustomers: boolean;
  canManageCustomers: boolean;
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canManageDivisionAccounts: boolean;
  canManageLaybys: boolean;
  canManageCredit: boolean;
  canViewCustomerReports: boolean;
  canExportCustomerData: boolean;
  canLinkCustomerAccounts: boolean;
}

// Core Business Permissions (Business-Specific - tied to business membership)
export interface CoreBusinessPermissions {
  // Business Management
  canViewBusiness: boolean;
  canEditBusiness: boolean;
  canDeleteBusiness: boolean;
  canManageBusinessUsers: boolean;
  canManageBusinessSettings: boolean;
  canChangeDefaultPage: boolean;

  // User Management (within business)
  canViewUsers: boolean;
  canInviteUsers: boolean;
  canEditUserPermissions: boolean;
  canRemoveUsers: boolean;
  canViewAuditLogs: boolean;

  // Data Management
  canExportBusinessData: boolean;
  canImportBusinessData: boolean;
  canBackupBusiness: boolean;
  canRestoreBusiness: boolean;

  // Financial Management (common fields used across role presets)
  canAccessFinancialData: boolean;
  canManageProjectBudgets: boolean;
  canManageProjectPayments: boolean;
  canViewCostReports: boolean;
  canApproveBudgetChanges: boolean;
  canViewProfitabilityReports: boolean;

  // Employee Management
  canViewEmployees: boolean;
  canCreateEmployees: boolean;
  canEditEmployees: boolean;
  canDeleteEmployees: boolean;
  canManageEmployees: boolean;
  canViewEmployeeContracts: boolean;
  canCreateEmployeeContracts: boolean;
  canEditEmployeeContracts: boolean;
  canApproveEmployeeContracts: boolean;
  canDeleteEmployeeContracts: boolean;
  canManageJobTitles: boolean;
  canManageBenefitTypes: boolean;
  canManageCompensationTypes: boolean;
  canManageDisciplinaryActions: boolean;
  canViewEmployeeReports: boolean;
  canExportEmployeeData: boolean;
  canApproveSalaryIncreases: boolean;
  canProcessSalaryIncreases: boolean;

  // Customer Management (Business-level)
  canAccessCustomers: boolean;
  canViewCustomers: boolean;
  canManageCustomers: boolean;
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canManageDivisionAccounts: boolean;
  canManageLaybys: boolean;
  canManageCredit: boolean;
  canViewCustomerReports: boolean;
  canExportCustomerData: boolean;
  canLinkCustomerAccounts: boolean;

  // Payroll Management
  canAccessPayroll: boolean;
  canManagePayroll: boolean;
  canCreatePayrollPeriod: boolean;
  canEditPayrollEntry: boolean;
  canApprovePayroll: boolean;
  canExportPayroll: boolean;
  // Allow resetting an exported payroll period back to preview/review within a limited window
  canResetExportedPayrollToPreview: boolean;
  canDeletePayroll: boolean; // Delete payroll periods (Manager-only permission, must be explicitly granted)
  canPrintPayrollEntryDetails: boolean; // Print payroll entry details as PDF (Admin-only by default, can be granted to managers)
  canEnterPaySlips: boolean;
  canReconcilePayroll: boolean;
  canViewPayrollReports: boolean;
  canManageAdvances: boolean;

  // Payroll Account Management
  canAccessPayrollAccount: boolean;
  canViewPayrollAccountBalance: boolean;
  canMakePayrollDeposits: boolean;
  canMakePayrollPayments: boolean;
  canAdjustPaymentAmounts: boolean;
  canIssuePaymentVouchers: boolean;
  canCompletePayments: boolean;
  canViewPayrollHistory: boolean;
  canExportPayrollPayments: boolean;

  // Expense Account Management
  canAccessExpenseAccount: boolean;
  canCreateExpenseAccount: boolean;
  canMakeExpenseDeposits: boolean;
  canMakeExpensePayments: boolean;
  canViewExpenseReports: boolean;
  canCreateIndividualPayees: boolean;
  canDeleteExpenseAccounts: boolean;
  canAdjustExpensePayments: boolean;
  canEditExpenseTransactions: boolean; // Edit deposits/payments within 5-day window (admin can always edit)
  // Sibling Account Permissions
  canCreateSiblingAccounts: boolean;
  canEnterHistoricalData: boolean;
  canMergeSiblingAccounts: boolean;

  // Supplier Management
  canViewSuppliers: boolean;
  canCreateSuppliers: boolean;
  canEditSuppliers: boolean;
  canDeleteSuppliers: boolean;
  canManageSupplierCatalog: boolean;

  // Location Management
  canViewLocations: boolean;
  canCreateLocations: boolean;
  canEditLocations: boolean;
  canDeleteLocations: boolean;

  // WiFi Portal Integration (Restaurant & Grocery businesses only)
  canSetupPortalIntegration: boolean;      // Setup and configure ESP32 portal integration
  canConfigureWifiTokens: boolean;         // Create and manage global token configurations
  canSellWifiTokens: boolean;              // Sell tokens directly from WiFi portal module
  canViewWifiReports: boolean;             // View WiFi sales and usage reports
  canManageBusinessWifiMenu: boolean;      // Manage business-specific WiFi token menu with custom pricing

  // Manual Transaction Entry & Book Closing
  canEnterManualOrders: boolean;           // Enter backdated manual transactions from book records
  canCloseBooks: boolean;                  // Close books for a day (manager+ only, blocks further manual entries)
}

// Business-Type-Specific Permission Modules
export interface ClothingPermissions {
  // Project Management
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectTypes: boolean;
  canViewProjectReports: boolean;

  // Inventory Management
  canViewInventory: boolean;
  canManageInventory: boolean;
  canManageSizeVariants: boolean;
  canManageColorVariants: boolean;
  canViewStockLevels: boolean;
  canReceiveStock: boolean;
  canTransferStock: boolean;

  // Sales & Retail
  canProcessSales: boolean;
  canProcessReturns: boolean;
  canManageDiscounts: boolean;
  canViewSalesReports: boolean;
  canViewCustomerAnalytics: boolean;

  // Product Management
  canManageProducts: boolean;
  canManageBrands: boolean;
  canManageSeasons: boolean;
  canViewSeasonalReports: boolean;
  canManagePriceLists: boolean;

  // Supplier & Purchasing
  canManageSuppliers: boolean;
  canCreatePurchaseOrders: boolean;
  canApprovePurchaseOrders: boolean;
  canViewSupplierReports: boolean;
}

export interface RestaurantPermissions {
  // Project Management
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectTypes: boolean;
  canViewProjectReports: boolean;

  // Menu Management
  canViewMenu: boolean;
  canManageMenu: boolean;
  canManageMenuCategories: boolean;
  canManageRecipes: boolean;
  canManageIngredients: boolean;
  canViewMenuAnalytics: boolean;

  // Kitchen Operations
  canViewKitchenOrders: boolean;
  canManageKitchenOrders: boolean;
  canManageKitchenStaff: boolean;
  canViewKitchenReports: boolean;
  canManageKitchenInventory: boolean;

  // Front of House
  canManageReservations: boolean;
  canManageTables: boolean;
  canProcessOrders: boolean;
  canManageCustomers: boolean;
  canViewTableTurnover: boolean;

  // Food Safety & Compliance
  canManageFoodSafety: boolean;
  canViewHealthReports: boolean;
  canManageAllergenInfo: boolean;
  canViewComplianceReports: boolean;
}

export interface ConstructionPermissions {
  // Project Management
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectTypes: boolean;
  canManageProjectTimelines: boolean;
  canViewProjectReports: boolean;
  
  // Resource Management
  canManageContractors: boolean;
  canManageSubcontractors: boolean;
  canManageMaterials: boolean;
  canManageEquipment: boolean;
  canViewResourceReports: boolean;
  
  // Financial Management
  // Added financial permissions used by role presets
  canAccessFinancialData: boolean;
  canManageProjectBudgets: boolean;
  canManageProjectPayments: boolean;
  canViewCostReports: boolean;
  canApproveBudgetChanges: boolean;
  canViewProfitabilityReports: boolean;
  
  // Documentation & Compliance
  canManageBlueprints: boolean;
  canManagePermits: boolean;
  canManageInspections: boolean;
  canViewComplianceStatus: boolean;
  canManageProjectDocuments: boolean;
}

export interface GroceryPermissions {
  // Project Management
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectTypes: boolean;
  canViewProjectReports: boolean;

  // Inventory Management
  canViewInventory: boolean;
  canManageInventory: boolean;
  canManagePerishableItems: boolean;
  canManageExpirationDates: boolean;
  canViewStockAlerts: boolean;
  canManageStockRotation: boolean;

  // Sales Operations
  canProcessSales: boolean;
  canManageCheckout: boolean;
  canManagePromos: boolean;
  canViewSalesReports: boolean;
  canManageCustomerLoyalty: boolean;

  // Supplier Management
  canManageSuppliers: boolean;
  canManageOrders: boolean;
  canManageDeliveries: boolean;
  canViewSupplierReports: boolean;
  canManagePricing: boolean;

  // Department Management
  canManageDepartments: boolean;
  canViewDepartmentReports: boolean;
  canManageSeasonalItems: boolean;
}

export interface ConsultingPermissions {
  // Client Management
  canViewClients: boolean;
  canManageClients: boolean;
  canManageClientContracts: boolean;
  canViewClientReports: boolean;
  canManageClientCommunications: boolean;
  
  // Project & Time Management
  canManageConsultingProjects: boolean;
  canTrackTimeEntries: boolean;
  canManageTimesheets: boolean;
  canViewTimeReports: boolean;
  canApproveTiemEntries: boolean;
  
  // Billing & Invoicing
  canCreateInvoices: boolean;
  canManageBilling: boolean;
  canViewBillingReports: boolean;
  canManageRates: boolean;
  canViewProfitabilityAnalysis: boolean;
  
  // Knowledge Management
  canManageDocuments: boolean;
  canManageKnowledgeBase: boolean;
  canViewProjectTemplates: boolean;
  canManageMethodologies: boolean;
}

// Restaurant Permission Presets (for business-type-specific permissions)
export const RESTAURANT_ASSOCIATE_PERMISSIONS: RestaurantPermissions = {
  // Project Management - No access
  canViewProjects: false,
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canManageProjectTypes: false,
  canViewProjectReports: false,

  // Menu Management - View only (needed for taking orders)
  canViewMenu: true,
  canManageMenu: false,
  canManageMenuCategories: false,
  canManageRecipes: false,
  canManageIngredients: false,
  canViewMenuAnalytics: false,  // ❌ NO REPORTS

  // Kitchen Operations - Order viewing and management (food prep)
  canViewKitchenOrders: true,  // ✅ View orders for food prep
  canManageKitchenOrders: true,  // ✅ Update order status
  canManageKitchenStaff: false,
  canViewKitchenReports: false,  // ❌ NO REPORTS
  canManageKitchenInventory: false,

  // Front of House - Order processing (POS)
  canManageReservations: false,
  canManageTables: false,
  canProcessOrders: true,  // ✅ Core POS function
  canManageCustomers: false,
  canViewTableTurnover: false,  // ❌ NO REPORTS

  // Food Safety & Compliance - No access
  canManageFoodSafety: false,
  canViewHealthReports: false,  // ❌ NO REPORTS
  canManageAllergenInfo: false,
  canViewComplianceReports: false,  // ❌ NO REPORTS
};

export const RESTAURANT_EMPLOYEE_PERMISSIONS: RestaurantPermissions = {
  // Project Management - View only
  canViewProjects: true,
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canManageProjectTypes: false,
  canViewProjectReports: true,

  // Menu Management - View only
  canViewMenu: true,
  canManageMenu: false,
  canManageMenuCategories: false,
  canManageRecipes: false,
  canManageIngredients: false,
  canViewMenuAnalytics: false,

  // Kitchen Operations - View only
  canViewKitchenOrders: true,
  canManageKitchenOrders: false,
  canManageKitchenStaff: false,
  canViewKitchenReports: false,
  canManageKitchenInventory: false,

  // Front of House - View only
  canManageReservations: false,
  canManageTables: false,
  canProcessOrders: false,
  canManageCustomers: false,
  canViewTableTurnover: false,

  // Food Safety & Compliance - No access
  canManageFoodSafety: false,
  canViewHealthReports: false,
  canManageAllergenInfo: false,
  canViewComplianceReports: false,
};

export const RESTAURANT_MANAGER_PERMISSIONS: RestaurantPermissions = {
  // Project Management - Full access except delete
  canViewProjects: true,
  canCreateProjects: true,
  canEditProjects: true,
  canDeleteProjects: false,
  canManageProjectTypes: true,
  canViewProjectReports: true,

  // Menu Management - Full access
  canViewMenu: true,
  canManageMenu: true,
  canManageMenuCategories: true,
  canManageRecipes: true,
  canManageIngredients: true,
  canViewMenuAnalytics: true,

  // Kitchen Operations - Full access
  canViewKitchenOrders: true,
  canManageKitchenOrders: true,
  canManageKitchenStaff: true,
  canViewKitchenReports: true,
  canManageKitchenInventory: true,

  // Front of House - Full access
  canManageReservations: true,
  canManageTables: true,
  canProcessOrders: true,
  canManageCustomers: true,
  canViewTableTurnover: true,

  // Food Safety & Compliance - Full access
  canManageFoodSafety: true,
  canViewHealthReports: true,
  canManageAllergenInfo: true,
  canViewComplianceReports: true,
};

export const RESTAURANT_OWNER_PERMISSIONS: RestaurantPermissions = {
  // Project Management - Full access
  canViewProjects: true,
  canCreateProjects: true,
  canEditProjects: true,
  canDeleteProjects: true,
  canManageProjectTypes: true,
  canViewProjectReports: true,

  // Menu Management - Full access
  canViewMenu: true,
  canManageMenu: true,
  canManageMenuCategories: true,
  canManageRecipes: true,
  canManageIngredients: true,
  canViewMenuAnalytics: true,

  // Kitchen Operations - Full access
  canViewKitchenOrders: true,
  canManageKitchenOrders: true,
  canManageKitchenStaff: true,
  canViewKitchenReports: true,
  canManageKitchenInventory: true,

  // Front of House - Full access
  canManageReservations: true,
  canManageTables: true,
  canProcessOrders: true,
  canManageCustomers: true,
  canViewTableTurnover: true,

  // Food Safety & Compliance - Full access
  canManageFoodSafety: true,
  canViewHealthReports: true,
  canManageAllergenInfo: true,
  canViewComplianceReports: true,
};

// Restaurant permission presets mapping
export const RESTAURANT_PERMISSION_PRESETS = {
  'business-owner': RESTAURANT_OWNER_PERMISSIONS,
  'business-manager': RESTAURANT_MANAGER_PERMISSIONS,
  'employee': RESTAURANT_EMPLOYEE_PERMISSIONS,
  'restaurant-associate': RESTAURANT_ASSOCIATE_PERMISSIONS,
  'salesperson': RESTAURANT_EMPLOYEE_PERMISSIONS,  // Same as employee
  'read-only': RESTAURANT_EMPLOYEE_PERMISSIONS,    // Same as employee (view only)
  'system-admin': RESTAURANT_OWNER_PERMISSIONS,    // Same as owner
} as const;

// Grocery Associate permissions - Sales floor and checkout operations
// Can: view/process sales, manage checkout, view inventory, sell WiFi tokens
// Cannot: view ANY reports, manage employees, configure systems
export const GROCERY_ASSOCIATE_PERMISSIONS: GroceryPermissions = {
  // Project Management - No access
  canViewProjects: false,
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canManageProjectTypes: false,
  canViewProjectReports: false,

  // Inventory Management - View only (check stock for customers)
  canViewInventory: true,
  canManageInventory: false,
  canManagePerishableItems: false,
  canManageExpirationDates: false,
  canViewStockAlerts: false,
  canManageStockRotation: false,

  // Sales Operations - Core POS functions
  canProcessSales: true,
  canManageCheckout: true,
  canManagePromos: false,
  canViewSalesReports: false,  // NO REPORTS
  canManageCustomerLoyalty: false,

  // Supplier Management - No access
  canManageSuppliers: false,
  canManageOrders: false,
  canManageDeliveries: false,
  canViewSupplierReports: false,  // NO REPORTS
  canManagePricing: false,

  // Department Management - No access
  canManageDepartments: false,
  canViewDepartmentReports: false,  // NO REPORTS
  canManageSeasonalItems: false,
};

// Grocery permission presets mapping
export const GROCERY_PERMISSION_PRESETS = {
  'business-owner': GROCERY_ASSOCIATE_PERMISSIONS,  // Placeholder - use same until owner presets created
  'business-manager': GROCERY_ASSOCIATE_PERMISSIONS,
  'employee': GROCERY_ASSOCIATE_PERMISSIONS,
  'grocery-associate': GROCERY_ASSOCIATE_PERMISSIONS,
  'restaurant-associate': GROCERY_ASSOCIATE_PERMISSIONS,
  'salesperson': GROCERY_ASSOCIATE_PERMISSIONS,
  'read-only': GROCERY_ASSOCIATE_PERMISSIONS,
  'system-admin': GROCERY_ASSOCIATE_PERMISSIONS,
} as const;

// Clothing Associate permissions - Sales floor and retail operations
// Can: view/process sales, view inventory, process returns, sell WiFi tokens
// Cannot: view ANY reports, manage employees, configure systems
export const CLOTHING_ASSOCIATE_PERMISSIONS: ClothingPermissions = {
  // Project Management - No access
  canViewProjects: false,
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canManageProjectTypes: false,
  canViewProjectReports: false,

  // Inventory Management - View stock levels only
  canViewInventory: true,
  canManageInventory: false,
  canManageSizeVariants: false,
  canManageColorVariants: false,
  canViewStockLevels: true,
  canReceiveStock: false,
  canTransferStock: false,

  // Sales & Retail - Core POS functions
  canProcessSales: true,
  canProcessReturns: true,
  canManageDiscounts: false,
  canViewSalesReports: false,  // NO REPORTS
  canViewCustomerAnalytics: false,  // NO REPORTS

  // Product Management - No access
  canManageProducts: false,
  canManageBrands: false,
  canManageSeasons: false,
  canViewSeasonalReports: false,  // NO REPORTS
  canManagePriceLists: false,

  // Supplier & Purchasing - No access
  canManageSuppliers: false,
  canCreatePurchaseOrders: false,
  canApprovePurchaseOrders: false,
  canViewSupplierReports: false,  // NO REPORTS
};

// Clothing permission presets mapping
export const CLOTHING_PERMISSION_PRESETS = {
  'business-owner': CLOTHING_ASSOCIATE_PERMISSIONS,  // Placeholder - use same until owner presets created
  'business-manager': CLOTHING_ASSOCIATE_PERMISSIONS,
  'employee': CLOTHING_ASSOCIATE_PERMISSIONS,
  'clothing-associate': CLOTHING_ASSOCIATE_PERMISSIONS,
  'restaurant-associate': CLOTHING_ASSOCIATE_PERMISSIONS,
  'salesperson': CLOTHING_ASSOCIATE_PERMISSIONS,
  'read-only': CLOTHING_ASSOCIATE_PERMISSIONS,
  'system-admin': CLOTHING_ASSOCIATE_PERMISSIONS,
} as const;

// Combined permission structure (includes both user-level and business-level permissions)
export interface BusinessPermissions extends UserLevelPermissions, CoreBusinessPermissions {
  // Business-type specific modules (optional based on business type)
  clothing?: ClothingPermissions;
  restaurant?: RestaurantPermissions;
  construction?: ConstructionPermissions;
  grocery?: GroceryPermissions;
  consulting?: ConsultingPermissions;
}

// Business type definitions
export type BusinessType = 'clothing' | 'restaurant' | 'construction' | 'grocery' | 'hardware' | 'consulting' | 'retail' | 'services' | 'other';

// Module definitions for easy management
export interface PermissionModule {
  title: string;
  permissions: Array<{
    key: string;
    label: string;
  }>;
}

export const BUSINESS_TYPE_MODULES: Record<BusinessType, PermissionModule[]> = {
  clothing: [
    {
      title: 'Project Management',
      permissions: [
        { key: 'canViewProjects', label: 'View Projects' },
        { key: 'canCreateProjects', label: 'Create Projects' },
        { key: 'canEditProjects', label: 'Edit Projects' },
        { key: 'canDeleteProjects', label: 'Delete Projects' },
        { key: 'canManageProjectTypes', label: 'Manage Project Types' },
        { key: 'canViewProjectReports', label: 'View Project Reports' },
      ]
    },
    {
      title: 'Inventory Management',
      permissions: [
        { key: 'canViewInventory', label: 'View Inventory' },
        { key: 'canManageInventory', label: 'Manage Inventory' },
        { key: 'canManageSizeVariants', label: 'Manage Size Variants' },
        { key: 'canManageColorVariants', label: 'Manage Color Variants' },
        { key: 'canViewStockLevels', label: 'View Stock Levels' },
        { key: 'canReceiveStock', label: 'Receive Stock' },
        { key: 'canTransferStock', label: 'Transfer Stock' },
      ]
    },
    {
      title: 'Sales & Retail',
      permissions: [
        { key: 'canProcessSales', label: 'Process Sales' },
        { key: 'canProcessReturns', label: 'Process Returns' },
        { key: 'canManageDiscounts', label: 'Manage Discounts' },
        { key: 'canViewSalesReports', label: 'View Sales Reports' },
        { key: 'canViewCustomerAnalytics', label: 'View Customer Analytics' },
      ]
    },
    {
      title: 'Product Management',
      permissions: [
        { key: 'canManageProducts', label: 'Manage Products' },
        { key: 'canManageBrands', label: 'Manage Brands' },
        { key: 'canManageSeasons', label: 'Manage Seasons' },
        { key: 'canViewSeasonalReports', label: 'View Seasonal Reports' },
        { key: 'canManagePriceLists', label: 'Manage Price Lists' },
      ]
    }
  ],
  restaurant: [
    {
      title: 'Project Management',
      permissions: [
        { key: 'canViewProjects', label: 'View Projects' },
        { key: 'canCreateProjects', label: 'Create Projects' },
        { key: 'canEditProjects', label: 'Edit Projects' },
        { key: 'canDeleteProjects', label: 'Delete Projects' },
        { key: 'canManageProjectTypes', label: 'Manage Project Types' },
        { key: 'canViewProjectReports', label: 'View Project Reports' },
      ]
    },
    {
      title: 'Menu Management',
      permissions: [
        { key: 'canViewMenu', label: 'View Menu' },
        { key: 'canManageMenu', label: 'Manage Menu' },
        { key: 'canManageMenuCategories', label: 'Manage Categories' },
        { key: 'canManageRecipes', label: 'Manage Recipes' },
        { key: 'canManageIngredients', label: 'Manage Ingredients' },
        { key: 'canViewMenuAnalytics', label: 'View Menu Analytics' },
      ]
    },
    {
      title: 'Kitchen Operations',
      permissions: [
        { key: 'canViewKitchenOrders', label: 'View Kitchen Orders' },
        { key: 'canManageKitchenOrders', label: 'Manage Kitchen Orders' },
        { key: 'canManageKitchenStaff', label: 'Manage Kitchen Staff' },
        { key: 'canViewKitchenReports', label: 'View Kitchen Reports' },
        { key: 'canManageKitchenInventory', label: 'Manage Kitchen Inventory' },
      ]
    },
    {
      title: 'Front of House',
      permissions: [
        { key: 'canManageReservations', label: 'Manage Reservations' },
        { key: 'canManageTables', label: 'Manage Tables' },
        { key: 'canProcessOrders', label: 'Process Orders' },
        { key: 'canManageCustomers', label: 'Manage Customers' },
        { key: 'canViewTableTurnover', label: 'View Table Turnover' },
      ]
    }
  ],
  construction: [
    {
      title: 'Project Management',
      permissions: [
        { key: 'canViewProjects', label: 'View Projects' },
        { key: 'canCreateProjects', label: 'Create Projects' },
        { key: 'canEditProjects', label: 'Edit Projects' },
        { key: 'canDeleteProjects', label: 'Delete Projects' },
        { key: 'canManageProjectTypes', label: 'Manage Project Types' },
        { key: 'canManageProjectTimelines', label: 'Manage Timelines' },
        { key: 'canViewProjectReports', label: 'View Reports' },
      ]
    },
    {
      title: 'Resource Management',
      permissions: [
        { key: 'canManageContractors', label: 'Manage Contractors' },
        { key: 'canManageSubcontractors', label: 'Manage Subcontractors' },
        { key: 'canManageMaterials', label: 'Manage Materials' },
        { key: 'canManageEquipment', label: 'Manage Equipment' },
        { key: 'canViewResourceReports', label: 'View Resource Reports' },
      ]
    },
    {
      title: 'Documentation & Compliance',
      permissions: [
        { key: 'canManageBlueprints', label: 'Manage Blueprints' },
        { key: 'canManagePermits', label: 'Manage Permits' },
        { key: 'canManageInspections', label: 'Manage Inspections' },
        { key: 'canViewComplianceStatus', label: 'View Compliance' },
        { key: 'canManageProjectDocuments', label: 'Manage Documents' },
      ]
    }
  ],
  grocery: [
    {
      title: 'Project Management',
      permissions: [
        { key: 'canViewProjects', label: 'View Projects' },
        { key: 'canCreateProjects', label: 'Create Projects' },
        { key: 'canEditProjects', label: 'Edit Projects' },
        { key: 'canDeleteProjects', label: 'Delete Projects' },
        { key: 'canManageProjectTypes', label: 'Manage Project Types' },
        { key: 'canViewProjectReports', label: 'View Project Reports' },
      ]
    },
    {
      title: 'Inventory Management',
      permissions: [
        { key: 'canViewInventory', label: 'View Inventory' },
        { key: 'canManageInventory', label: 'Manage Inventory' },
        { key: 'canManagePerishableItems', label: 'Manage Perishables' },
        { key: 'canManageExpirationDates', label: 'Manage Expiration Dates' },
        { key: 'canViewStockAlerts', label: 'View Stock Alerts' },
        { key: 'canManageStockRotation', label: 'Manage Stock Rotation' },
      ]
    },
    {
      title: 'Sales Operations',
      permissions: [
        { key: 'canProcessSales', label: 'Process Sales' },
        { key: 'canManageCheckout', label: 'Manage Checkout' },
        { key: 'canManagePromos', label: 'Manage Promotions' },
        { key: 'canViewSalesReports', label: 'View Sales Reports' },
        { key: 'canManageCustomerLoyalty', label: 'Manage Loyalty Programs' },
      ]
    }
  ],
  hardware: [
    {
      title: 'Inventory Management',
      permissions: [
        { key: 'canViewInventory', label: 'View Inventory' },
        { key: 'canManageInventory', label: 'Manage Inventory' },
        { key: 'canViewStockLevels', label: 'View Stock Levels' },
        { key: 'canReceiveStock', label: 'Receive Stock' },
        { key: 'canTransferStock', label: 'Transfer Stock' },
      ]
    },
    {
      title: 'Sales & Retail',
      permissions: [
        { key: 'canProcessSales', label: 'Process Sales' },
        { key: 'canProcessReturns', label: 'Process Returns' },
        { key: 'canManageDiscounts', label: 'Manage Discounts' },
        { key: 'canViewSalesReports', label: 'View Sales Reports' },
      ]
    },
    {
      title: 'Product Management',
      permissions: [
        { key: 'canManageProducts', label: 'Manage Products' },
        { key: 'canManageSuppliers', label: 'Manage Suppliers' },
        { key: 'canManagePriceLists', label: 'Manage Price Lists' },
      ]
    }
  ],
  consulting: [
    {
      title: 'Client Management',
      permissions: [
        { key: 'canViewClients', label: 'View Clients' },
        { key: 'canManageClients', label: 'Manage Clients' },
        { key: 'canManageClientContracts', label: 'Manage Contracts' },
        { key: 'canViewClientReports', label: 'View Client Reports' },
        { key: 'canManageClientCommunications', label: 'Manage Communications' },
      ]
    },
    {
      title: 'Time & Billing',
      permissions: [
        { key: 'canTrackTimeEntries', label: 'Track Time' },
        { key: 'canCreateInvoices', label: 'Create Invoices' },
        { key: 'canManageBilling', label: 'Manage Billing' },
        { key: 'canViewBillingReports', label: 'View Billing Reports' },
        { key: 'canViewProfitabilityAnalysis', label: 'View Profitability' },
      ]
    }
  ],
  retail: [], // Similar to clothing but more generic
  services: [], // Similar to consulting but more generic
  other: [] // No specific modules, only core permissions
};

// User-Level Permission Groups (Business-Agnostic)
export const USER_LEVEL_PERMISSIONS = {
  personalFinance: {
    title: 'Personal Finance',
    description: 'Manage personal expenses, money tracking, and financial reports',
    permissions: [
      { key: 'canAccessPersonalFinance', label: 'Access Module' },
      { key: 'canAddPersonalExpenses', label: 'Add Expenses' },
      { key: 'canEditPersonalExpenses', label: 'Edit Expenses' },
      { key: 'canDeletePersonalExpenses', label: 'Delete Expenses' },
      { key: 'canAddMoney', label: 'Add Money' },
      { key: 'canManagePersonalCategories', label: 'Manage Categories' },
      { key: 'canManagePersonalContractors', label: 'Manage Contractors' },
      { key: 'canManagePersonalProjects', label: 'Manage Projects' },
      { key: 'canViewPersonalReports', label: 'View Reports' },
      { key: 'canExportPersonalData', label: 'Export Data' },
    ]
  },
  businessExpenseCategories: {
    title: 'Business Expense Categories',
    description: 'Manage business-wide expense categories and subcategories',
    permissions: [
      { key: 'canCreateBusinessCategories', label: 'Create Categories' },
      { key: 'canEditBusinessCategories', label: 'Edit Categories' },
      { key: 'canDeleteBusinessCategories', label: 'Delete Categories' },
      { key: 'canCreateBusinessSubcategories', label: 'Create Subcategories' },
      { key: 'canEditBusinessSubcategories', label: 'Edit Subcategories' },
      { key: 'canDeleteBusinessSubcategories', label: 'Delete Subcategories' },
    ]
  },
  inventoryCategories: {
    title: 'Inventory Categories',
    description: 'Manage business inventory categories and subcategories with emoji support',
    permissions: [
      { key: 'canCreateInventoryCategories', label: 'Create Inventory Categories' },
      { key: 'canEditInventoryCategories', label: 'Edit Inventory Categories' },
      { key: 'canDeleteInventoryCategories', label: 'Delete Inventory Categories' },
      { key: 'canCreateInventorySubcategories', label: 'Create Inventory Subcategories' },
      { key: 'canEditInventorySubcategories', label: 'Edit Inventory Subcategories' },
      { key: 'canDeleteInventorySubcategories', label: 'Delete Inventory Subcategories' },
    ]
  },
  universalPrinting: {
    title: 'Universal Printing Module',
    description: 'Manage network printers and print receipts/labels across all businesses',
    permissions: [
      { key: 'canManageNetworkPrinters', label: 'Manage Network Printers' },
      { key: 'canUseLabelPrinters', label: 'Use Label Printers' },
      { key: 'canPrintReceipts', label: 'Print Receipts' },
      { key: 'canPrintInventoryLabels', label: 'Print Inventory Labels' },
      { key: 'canViewPrintQueue', label: 'View Print Queue' },
    ]
  },
  globalBarcodeScanning: {
    title: 'Global Barcode Scanning',
    description: 'Access global barcode scanning functionality across accessible businesses',
    permissions: [
      { key: 'canAccessGlobalBarcodeScanning', label: 'Access Global Barcode Scanning' },
      { key: 'canViewGlobalInventoryAcrossBusinesses', label: 'View Inventory Across All Businesses (Informational)' },
      { key: 'canStockInventoryFromModal', label: 'Add Inventory from Barcode Modal' },
    ]
  },
  projectManagement: {
    title: 'Project Management',
    description: 'Manage projects across all business types and personal projects',
    permissions: [
      { key: 'canViewProjects', label: 'View Projects' },
      { key: 'canCreatePersonalProjects', label: 'Create Personal Projects' },
      { key: 'canCreateBusinessProjects', label: 'Create Business Projects' },
      { key: 'canEditProjects', label: 'Edit Projects' },
      { key: 'canDeleteProjects', label: 'Delete Projects' },
      { key: 'canManageProjectTypes', label: 'Manage Project Types' },
      { key: 'canViewProjectReports', label: 'View Project Reports' },
    ]
  },
  vehicleManagement: {
    title: 'Vehicle Management',
    description: 'Manage vehicles, drivers, trips, and maintenance across all businesses',
    permissions: [
      { key: 'canAccessVehicles', label: 'Access Vehicle Module' },
      { key: 'canViewVehicles', label: 'View Vehicles' },
      { key: 'canManageVehicles', label: 'Manage Vehicles' },
      { key: 'canManageDrivers', label: 'Manage Drivers' },
      { key: 'canManageTrips', label: 'Manage Trips' },
      { key: 'canLogDriverTrips', label: 'Log Driver Trips' },
      { key: 'canLogDriverMaintenance', label: 'Log Driver Maintenance' },
      { key: 'canManageVehicleMaintenance', label: 'Manage Maintenance' },
      { key: 'canViewVehicleReports', label: 'View Reports' },
      { key: 'canExportVehicleData', label: 'Export Data' },
    ]
  },
  systemAdministration: {
    title: 'System Administration',
    description: 'System-wide administrative capabilities and global settings management',
    permissions: [
      { key: 'canManageSystemSettings', label: 'System Settings' },
      { key: 'canViewSystemLogs', label: 'System Logs' },
      { key: 'canManageAllBusinesses', label: 'All Businesses' },
    ]
  },
  // Business-Agnostic Manager Payroll Actions
  // ⚠️ CRITICAL: Only visible to System Admins when editing Managers
  // Grants cross-business payroll capabilities including umbrella period access
  managerPayrollActions: {
    title: 'Manager Payroll Actions (Business-Agnostic)',
    description: 'Cross-business payroll management permissions. Required to view/manage umbrella payroll periods and override business-level restrictions. Only assignable to Managers.',
    permissions: [
      { key: 'canAccessUmbrellaPayroll', label: 'Access Umbrella Payroll' },
      { key: 'canExportPayrollAcrossBusinesses', label: 'Export Payroll (Global)' },
      { key: 'canResetPayrollAcrossBusinesses', label: 'Reset Exported Payroll (Global)' },
      { key: 'canDeletePayrollAcrossBusinesses', label: 'Delete Payroll (Global)' },
    ]
  },
  // Expense Account Management
  // Business-agnostic permissions for managing expense accounts across the platform
  expenseAccountManagement: {
    title: 'Expense Account Management',
    description: 'Manage expense accounts, deposits, payments, and payees across all businesses',
    permissions: [
      { key: 'canAccessExpenseAccount', label: 'Access Expense Accounts' },
      { key: 'canCreateExpenseAccount', label: 'Create Expense Accounts' },
      { key: 'canMakeExpenseDeposits', label: 'Make Deposits' },
      { key: 'canMakeExpensePayments', label: 'Make Payments' },
      { key: 'canViewExpenseReports', label: 'View Reports' },
      { key: 'canCreateIndividualPayees', label: 'Create Individual Payees' },
      { key: 'canDeleteExpenseAccounts', label: 'Delete Expense Accounts' },
      { key: 'canAdjustExpensePayments', label: 'Adjust Payments' },
      { key: 'canEditExpenseTransactions', label: 'Edit Transactions (5-day window)' },
      // Sibling Account Permissions
      { key: 'canCreateSiblingAccounts', label: 'Create Sibling Accounts' },
      { key: 'canEnterHistoricalData', label: 'Enter Historical Data' },
      { key: 'canMergeSiblingAccounts', label: 'Merge Sibling Accounts' },
    ]
  },
  // Payee Management
  // Business-agnostic permissions for managing payees (individuals, employees, users, businesses)
  payeeManagement: {
    title: 'Payee Management',
    description: 'View, create, and manage payees across all businesses',
    permissions: [
      { key: 'canViewPayees', label: 'View Payees' },
      { key: 'canCreatePayees', label: 'Create Payees' },
      { key: 'canEditPayees', label: 'Edit Payees' },
    ]
  }
};

// Core permission templates (backward compatibility)
export const CORE_PERMISSIONS = {
  coreBusinessManagement: [
    { key: 'canViewBusiness', label: 'View Business' },
    { key: 'canEditBusiness', label: 'Edit Business' },
    { key: 'canDeleteBusiness', label: 'Delete Business' },
    { key: 'canManageBusinessUsers', label: 'Manage Users' },
    { key: 'canManageBusinessSettings', label: 'Manage Settings' },
    { key: 'canChangeDefaultPage', label: 'Change Default Page' },
  ],
  userManagement: [
    { key: 'canViewUsers', label: 'View Users' },
    { key: 'canInviteUsers', label: 'Invite Users' },
    { key: 'canEditUserPermissions', label: 'Edit Permissions' },
    { key: 'canRemoveUsers', label: 'Remove Users' },
    { key: 'canViewAuditLogs', label: 'View Audit Logs' },
  ],
  dataManagement: [
    { key: 'canExportBusinessData', label: 'Export Data' },
    { key: 'canImportBusinessData', label: 'Import Data' },
    { key: 'canBackupBusiness', label: 'Backup Business' },
    { key: 'canRestoreBusiness', label: 'Restore Business' },
  ],
  employeeManagement: [
    { key: 'canViewEmployees', label: 'View Employees' },
    { key: 'canCreateEmployees', label: 'Create Employees' },
    { key: 'canEditEmployees', label: 'Edit Employees' },
    { key: 'canDeleteEmployees', label: 'Delete Employees' },
    { key: 'canManageEmployees', label: 'Manage Employees' },
    { key: 'canViewEmployeeContracts', label: 'View Contracts' },
    { key: 'canCreateEmployeeContracts', label: 'Create Contracts' },
    { key: 'canEditEmployeeContracts', label: 'Edit Contracts' },
    { key: 'canApproveEmployeeContracts', label: 'Approve Contracts' },
    { key: 'canDeleteEmployeeContracts', label: 'Delete Contracts' },
    { key: 'canManageJobTitles', label: 'Manage Job Titles' },
    { key: 'canManageBenefitTypes', label: 'Manage Benefit Types' },
    { key: 'canManageCompensationTypes', label: 'Manage Compensation Types' },
    { key: 'canManageDisciplinaryActions', label: 'Manage Disciplinary Actions' },
    { key: 'canViewEmployeeReports', label: 'View Employee Reports' },
    { key: 'canExportEmployeeData', label: 'Export Employee Data' },
    { key: 'canApproveSalaryIncreases', label: 'Approve Salary Increases' },
    { key: 'canProcessSalaryIncreases', label: 'Process Salary Increases' },
  ],
  customerManagement: [
    { key: 'canAccessCustomers', label: 'Access Customers' },
    { key: 'canViewCustomers', label: 'View Customers' },
    { key: 'canManageCustomers', label: 'Manage Customers' },
    { key: 'canCreateCustomers', label: 'Create Customers' },
    { key: 'canEditCustomers', label: 'Edit Customers' },
    { key: 'canDeleteCustomers', label: 'Delete Customers' },
    { key: 'canManageDivisionAccounts', label: 'Manage Division Accounts' },
    { key: 'canManageLaybys', label: 'Manage Laybys' },
    { key: 'canManageCredit', label: 'Manage Credit' },
    { key: 'canViewCustomerReports', label: 'View Customer Reports' },
    { key: 'canExportCustomerData', label: 'Export Customer Data' },
    { key: 'canLinkCustomerAccounts', label: 'Link Customer Accounts' },
  ],
  businessExpenseCategories: [
    { key: 'canCreateBusinessCategories', label: 'Create Categories' },
    { key: 'canEditBusinessCategories', label: 'Edit Categories' },
    { key: 'canDeleteBusinessCategories', label: 'Delete Categories' },
    { key: 'canCreateBusinessSubcategories', label: 'Create Subcategories' },
    { key: 'canEditBusinessSubcategories', label: 'Edit Subcategories' },
    { key: 'canDeleteBusinessSubcategories', label: 'Delete Subcategories' },
  ],
  inventoryCategories: [
    { key: 'canCreateInventoryCategories', label: 'Create Inventory Categories' },
    { key: 'canEditInventoryCategories', label: 'Edit Inventory Categories' },
    { key: 'canDeleteInventoryCategories', label: 'Delete Inventory Categories' },
    { key: 'canCreateInventorySubcategories', label: 'Create Inventory Subcategories' },
    { key: 'canEditInventorySubcategories', label: 'Edit Inventory Subcategories' },
    { key: 'canDeleteInventorySubcategories', label: 'Delete Inventory Subcategories' },
  ],
  supplierManagement: [
    { key: 'canViewSuppliers', label: 'View Suppliers' },
    { key: 'canCreateSuppliers', label: 'Create Suppliers' },
    { key: 'canEditSuppliers', label: 'Edit Suppliers' },
    { key: 'canDeleteSuppliers', label: 'Delete Suppliers' },
    { key: 'canManageSupplierCatalog', label: 'Manage Supplier Catalog' },
  ],
  locationManagement: [
    { key: 'canViewLocations', label: 'View Locations' },
    { key: 'canCreateLocations', label: 'Create Locations' },
    { key: 'canEditLocations', label: 'Edit Locations' },
    { key: 'canDeleteLocations', label: 'Delete Locations' },
  ],
  wifiPortalIntegration: [
    { key: 'canSetupPortalIntegration', label: 'Setup Portal Integration' },
    { key: 'canConfigureWifiTokens', label: 'Configure Token Packages' },
    { key: 'canSellWifiTokens', label: 'Sell WiFi Tokens' },
    { key: 'canViewWifiReports', label: 'View WiFi Reports' },
    { key: 'canManageBusinessWifiMenu', label: 'Manage Business WiFi Menu' },
  ],
  payrollManagement: [
    { key: 'canAccessPayroll', label: 'Access Payroll' },
    { key: 'canManagePayroll', label: 'Manage Payroll' },
    { key: 'canCreatePayrollPeriod', label: 'Create Payroll Period' },
    { key: 'canEditPayrollEntry', label: 'Edit Payroll Entry' },
    { key: 'canApprovePayroll', label: 'Approve Payroll' },
    { key: 'canPrintPayrollEntryDetails', label: 'Print Entry Details PDF' },
    { key: 'canEnterPaySlips', label: 'Enter Pay Slips' },
    { key: 'canReconcilePayroll', label: 'Reconcile Payroll' },
    { key: 'canViewPayrollReports', label: 'View Payroll Reports' },
    { key: 'canManageAdvances', label: 'Manage Advances' },
  ],
  // Manager Payroll Actions (ONLY shown to business-owner and business-manager roles)
  // ⚠️ CRITICAL: These must be explicitly assigned - NOT default for managers
  // Employees will NEVER see these options even with custom permissions
  managerPayrollActions: [
    { key: 'canExportPayroll', label: 'Export Payroll' },
    { key: 'canResetExportedPayrollToPreview', label: 'Reset Exported → Preview (7 days)' },
    { key: 'canDeletePayroll', label: 'Delete Payroll' },
  ]
}

// Business-level role presets (Core permissions only)
export const BUSINESS_OWNER_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - Full access
  canViewBusiness: true,
  canEditBusiness: true,
  canDeleteBusiness: true,
  canManageBusinessUsers: true,
  canManageBusinessSettings: true,
  canChangeDefaultPage: true,

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
  canExportPayroll: true,  // Business owners have export by default
  canResetExportedPayrollToPreview: true,  // Business owners have reset by default
  canDeletePayroll: true,  // Business owners have delete by default
  canPrintPayrollEntryDetails: true,  // Business owners can print entry details
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
  canEditExpenseTransactions: true, // ✅ Admin/Manager can always edit (bypasses 5-day window)
  canCreateSiblingAccounts: true,
  canEnterHistoricalData: true,
  canMergeSiblingAccounts: true,

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

  // WiFi Portal Integration - Full access
  canSetupPortalIntegration: true,
  canConfigureWifiTokens: true,
  canSellWifiTokens: true,
  canViewWifiReports: true,
  canManageBusinessWifiMenu: true,
  canEnterManualOrders: true,
  canCloseBooks: true,
};

export const BUSINESS_MANAGER_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - Limited
  canViewBusiness: true,
  canEditBusiness: true,
  canDeleteBusiness: false,
  canManageBusinessUsers: true,
  canManageBusinessSettings: true,
  canChangeDefaultPage: true,

  // User Management - Limited
  canViewUsers: true,
  canInviteUsers: true,
  canEditUserPermissions: false,
  canRemoveUsers: false,
  canViewAuditLogs: true,

  // Data Management - Limited
  canExportBusinessData: true,
  canImportBusinessData: false,
  canBackupBusiness: false,
  canRestoreBusiness: false,

  // Employee Management - Management access
  canViewEmployees: true,
  canCreateEmployees: true,
  canEditEmployees: true,
  canDeleteEmployees: false,
  canManageEmployees: true,
  canViewEmployeeContracts: true,
  canCreateEmployeeContracts: true,
  canEditEmployeeContracts: true,
  canApproveEmployeeContracts: true,
  canDeleteEmployeeContracts: false,
  canManageJobTitles: true,
  canManageBenefitTypes: true,
  canManageCompensationTypes: true,
  canManageDisciplinaryActions: true,
  canViewEmployeeReports: true,
  canExportEmployeeData: true,
  canApproveSalaryIncreases: true,
  canProcessSalaryIncreases: false,

  // Financial Management - Manager access
  canAccessFinancialData: true,
  canManageProjectBudgets: true,
  canManageProjectPayments: true,
  canViewCostReports: true,
  canApproveBudgetChanges: false,
  canViewProfitabilityReports: true,

  // Customer Management - Manager access
  canAccessCustomers: true,
  canViewCustomers: true,
  canManageCustomers: true,
  canCreateCustomers: true,
  canEditCustomers: true,
  canDeleteCustomers: false,
  canManageDivisionAccounts: true,
  canManageLaybys: true,
  canManageCredit: true,
  canViewCustomerReports: true,
  canExportCustomerData: true,
  canLinkCustomerAccounts: true,

  // Payroll Management - Manager access
  // ⚠️ CRITICAL: Export, Reset, Delete, and Print are FALSE by default
  // These must be explicitly granted via custom permissions
  canAccessPayroll: true,
  canManagePayroll: true,
  canCreatePayrollPeriod: true,
  canEditPayrollEntry: true,
  canApprovePayroll: false,  // Only owners can approve
  canExportPayroll: false,  // ❌ FALSE by default - must be explicitly granted
  canResetExportedPayrollToPreview: false,  // ❌ FALSE by default - must be explicitly granted
  canDeletePayroll: false,  // ❌ FALSE by default - must be explicitly granted
  canPrintPayrollEntryDetails: false,  // ❌ FALSE by default - must be explicitly granted
  canEnterPaySlips: true,
  canReconcilePayroll: true,
  canViewPayrollReports: true,
  canManageAdvances: true,

  // Payroll Account Management - Manager access (must have permission in business)
  canAccessPayrollAccount: true,
  canViewPayrollAccountBalance: true,
  canMakePayrollDeposits: true,
  canMakePayrollPayments: true,
  canAdjustPaymentAmounts: true,
  canIssuePaymentVouchers: true,
  canCompletePayments: true,
  canViewPayrollHistory: true,
  canExportPayrollPayments: false,  // ❌ FALSE by default - must be explicitly granted

  // Expense Account Management - Manager access (view, payments, reports only)
  canAccessExpenseAccount: true,
  canCreateExpenseAccount: false,  // ❌ Admin only
  canMakeExpenseDeposits: false,  // ❌ Admin + special permission only
  canMakeExpensePayments: true,
  canViewExpenseReports: true,
  canCreateIndividualPayees: true,
  canDeleteExpenseAccounts: false,  // ❌ Admin only
  canAdjustExpensePayments: false,  // ❌ Special permission only
  canEditExpenseTransactions: false,  // ❌ Special permission only (5-day window applies)
  canCreateSiblingAccounts: false,  // ❌ Admin only
  canEnterHistoricalData: false,    // ❌ Admin only
  canMergeSiblingAccounts: false,   // ❌ Admin only

  // Supplier Management - Manager access
  canViewSuppliers: true,
  canCreateSuppliers: true,
  canEditSuppliers: true,
  canDeleteSuppliers: false,
  canManageSupplierCatalog: true,

  // Location Management - Manager access
  canViewLocations: true,
  canCreateLocations: true,
  canEditLocations: true,
  canDeleteLocations: false,

  // WiFi Portal Integration - Manager access
  canSetupPortalIntegration: true,
  canConfigureWifiTokens: true,
  canSellWifiTokens: true,
  canViewWifiReports: true,
  canManageBusinessWifiMenu: true,
  canEnterManualOrders: true,
  canCloseBooks: true,
};

export const BUSINESS_EMPLOYEE_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - View only
  canViewBusiness: true,
  canEditBusiness: false,
  canDeleteBusiness: false,
  canManageBusinessUsers: false,
  canManageBusinessSettings: false,
  canChangeDefaultPage: false,

  // User Management - View only
  canViewUsers: true,
  canInviteUsers: false,
  canEditUserPermissions: false,
  canRemoveUsers: false,
  canViewAuditLogs: false,

  // Data Management - No access
  canExportBusinessData: false,
  canImportBusinessData: false,
  canBackupBusiness: false,
  canRestoreBusiness: false,

  // Employee Management - View only
  canViewEmployees: true,
  canCreateEmployees: false,
  canEditEmployees: false,
  canDeleteEmployees: false,
  canManageEmployees: false,
  canViewEmployeeContracts: true,
  canCreateEmployeeContracts: false,
  canEditEmployeeContracts: false,
  canApproveEmployeeContracts: false,
  canDeleteEmployeeContracts: false,
  canManageJobTitles: false,
  canManageBenefitTypes: false,
  canManageCompensationTypes: false,
  canManageDisciplinaryActions: false,
  canViewEmployeeReports: true,
  canExportEmployeeData: false,
  canApproveSalaryIncreases: false,
  canProcessSalaryIncreases: false,

  // Financial Management - No access
  canAccessFinancialData: false,
  canManageProjectBudgets: false,
  canManageProjectPayments: false,
  canViewCostReports: false,
  canApproveBudgetChanges: false,
  canViewProfitabilityReports: false,

  // Customer Management - View only
  canAccessCustomers: true,
  canViewCustomers: true,
  canManageCustomers: false,
  canCreateCustomers: false,
  canEditCustomers: false,
  canDeleteCustomers: false,
  canManageDivisionAccounts: false,
  canManageLaybys: false,
  canManageCredit: false,
  canViewCustomerReports: true,
  canExportCustomerData: false,
  canLinkCustomerAccounts: false,

  // Payroll Management - No access
  // ⚠️ Employees can be granted custom payroll permissions for specific tasks
  // but will NEVER see Export/Reset/Delete/Print options in UI
  canAccessPayroll: false,
  canManagePayroll: false,
  canCreatePayrollPeriod: false,
  canEditPayrollEntry: false,
  canApprovePayroll: false,
  canExportPayroll: false,  // ❌ NEVER accessible to employees
  canResetExportedPayrollToPreview: false,  // ❌ NEVER accessible to employees
  canDeletePayroll: false,  // ❌ NEVER accessible to employees
  canPrintPayrollEntryDetails: false,  // ❌ NEVER accessible to employees
  canEnterPaySlips: false,
  canReconcilePayroll: false,
  canViewPayrollReports: false,
  canManageAdvances: false,

  // Payroll Account Management - No access
  canAccessPayrollAccount: false,
  canViewPayrollAccountBalance: false,
  canMakePayrollDeposits: false,
  canMakePayrollPayments: false,
  canAdjustPaymentAmounts: false,
  canIssuePaymentVouchers: false,
  canCompletePayments: false,
  canViewPayrollHistory: false,
  canExportPayrollPayments: false,

  // Expense Account Management - No access
  canAccessExpenseAccount: false,
  canCreateExpenseAccount: false,
  canMakeExpenseDeposits: false,
  canMakeExpensePayments: false,
  canViewExpenseReports: false,
  canCreateIndividualPayees: false,
  canDeleteExpenseAccounts: false,
  canAdjustExpensePayments: false,
  canEditExpenseTransactions: false,
  canCreateSiblingAccounts: false,
  canEnterHistoricalData: false,
  canMergeSiblingAccounts: false,

  // Supplier Management - View only
  canViewSuppliers: true,
  canCreateSuppliers: false,
  canEditSuppliers: false,
  canDeleteSuppliers: false,
  canManageSupplierCatalog: false,

  // Location Management - View only
  canViewLocations: true,
  canCreateLocations: false,
  canEditLocations: false,
  canDeleteLocations: false,

  // WiFi Portal Integration - Limited access (sales only)
  canSetupPortalIntegration: false,
  canConfigureWifiTokens: false,
  canSellWifiTokens: true,
  canViewWifiReports: false,
  canManageBusinessWifiMenu: false,
  canEnterManualOrders: true,
  canCloseBooks: false,
};

export const BUSINESS_READ_ONLY_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - View only
  canViewBusiness: true,
  canEditBusiness: false,
  canDeleteBusiness: false,
  canManageBusinessUsers: false,
  canManageBusinessSettings: false,
  canChangeDefaultPage: false,

  // User Management - View only
  canViewUsers: true,
  canInviteUsers: false,
  canEditUserPermissions: false,
  canRemoveUsers: false,
  canViewAuditLogs: false,

  // Data Management - No access
  canExportBusinessData: false,
  canImportBusinessData: false,
  canBackupBusiness: false,
  canRestoreBusiness: false,

  // Employee Management - View only
  canViewEmployees: true,
  canCreateEmployees: false,
  canEditEmployees: false,
  canDeleteEmployees: false,
  canManageEmployees: false,
  canViewEmployeeContracts: true,
  canCreateEmployeeContracts: false,
  canEditEmployeeContracts: false,
  canApproveEmployeeContracts: false,
  canDeleteEmployeeContracts: false,
  canManageJobTitles: false,
  canManageBenefitTypes: false,
  canManageCompensationTypes: false,
  canManageDisciplinaryActions: false,
  canViewEmployeeReports: true,
  canExportEmployeeData: false,
  canApproveSalaryIncreases: false,
  canProcessSalaryIncreases: false,

  // Financial Management - View only
  canAccessFinancialData: false,
  canManageProjectBudgets: false,
  canManageProjectPayments: false,
  canViewCostReports: true,
  canApproveBudgetChanges: false,
  canViewProfitabilityReports: true,

  // Customer Management - View only
  canAccessCustomers: true,
  canViewCustomers: true,
  canManageCustomers: false,
  canCreateCustomers: false,
  canEditCustomers: false,
  canDeleteCustomers: false,
  canManageDivisionAccounts: false,
  canManageLaybys: false,
  canManageCredit: false,
  canViewCustomerReports: true,
  canExportCustomerData: false,
  canLinkCustomerAccounts: false,

  // Payroll Management - View-only access
  canAccessPayroll: true,
  canManagePayroll: false,
  canCreatePayrollPeriod: false,
  canEditPayrollEntry: false,
  canApprovePayroll: false,
  canExportPayroll: false,
  canResetExportedPayrollToPreview: false,
  canDeletePayroll: false,  // Read-only users cannot delete
  canPrintPayrollEntryDetails: false,  // Read-only users cannot print
  canEnterPaySlips: false,
  canReconcilePayroll: false,
  canViewPayrollReports: true,
  canManageAdvances: false,

  // Payroll Account Management - View only
  canAccessPayrollAccount: true,
  canViewPayrollAccountBalance: true,
  canMakePayrollDeposits: false,
  canMakePayrollPayments: false,
  canAdjustPaymentAmounts: false,
  canIssuePaymentVouchers: false,
  canCompletePayments: false,
  canViewPayrollHistory: true,
  canExportPayrollPayments: false,

  // Expense Account Management - View only
  canAccessExpenseAccount: true,
  canCreateExpenseAccount: false,
  canMakeExpenseDeposits: false,
  canMakeExpensePayments: false,
  canViewExpenseReports: true,
  canCreateIndividualPayees: false,
  canDeleteExpenseAccounts: false,
  canAdjustExpensePayments: false,
  canEditExpenseTransactions: false,
  canCreateSiblingAccounts: false,
  canEnterHistoricalData: false,
  canMergeSiblingAccounts: false,

  // Supplier Management - View only
  canViewSuppliers: true,
  canCreateSuppliers: false,
  canEditSuppliers: false,
  canDeleteSuppliers: false,
  canManageSupplierCatalog: false,

  // Location Management - View only
  canViewLocations: true,
  canCreateLocations: false,
  canEditLocations: false,
  canDeleteLocations: false,

  // WiFi Portal Integration - No access
  canSetupPortalIntegration: false,
  canConfigureWifiTokens: false,
  canSellWifiTokens: false,
  canViewWifiReports: false,
  canManageBusinessWifiMenu: false,
  canEnterManualOrders: false,
  canCloseBooks: false,
};

// Restaurant Associate permissions - Food prep and POS operations
// Can: view/process orders, food prep, sell tokens, print receipts
// Cannot: view ANY reports, manage employees, configure systems
export const BUSINESS_RESTAURANT_ASSOCIATE_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - View only
  canViewBusiness: true,
  canEditBusiness: false,
  canDeleteBusiness: false,
  canManageBusinessUsers: false,
  canManageBusinessSettings: false,
  canChangeDefaultPage: false,

  // User Management - No access
  canViewUsers: false,
  canInviteUsers: false,
  canEditUserPermissions: false,
  canRemoveUsers: false,
  canViewAuditLogs: false,

  // Data Management - No access
  canExportBusinessData: false,
  canImportBusinessData: false,
  canBackupBusiness: false,
  canRestoreBusiness: false,

  // Employee Management - No access
  canViewEmployees: false,
  canCreateEmployees: false,
  canEditEmployees: false,
  canDeleteEmployees: false,
  canManageEmployees: false,
  canViewEmployeeContracts: false,
  canCreateEmployeeContracts: false,
  canEditEmployeeContracts: false,
  canApproveEmployeeContracts: false,
  canDeleteEmployeeContracts: false,
  canManageJobTitles: false,
  canManageBenefitTypes: false,
  canManageCompensationTypes: false,
  canManageDisciplinaryActions: false,
  canViewEmployeeReports: false,
  canExportEmployeeData: false,
  canApproveSalaryIncreases: false,
  canProcessSalaryIncreases: false,

  // Financial Management - No access
  canAccessFinancialData: false,
  canManageProjectBudgets: false,
  canManageProjectPayments: false,
  canViewCostReports: false,
  canApproveBudgetChanges: false,
  canViewProfitabilityReports: false,

  // Customer Management - Sales-level access (view/create for POS)
  canAccessCustomers: true,
  canViewCustomers: true,
  canManageCustomers: false,
  canCreateCustomers: true,  // Can register new walk-in customers
  canEditCustomers: false,
  canDeleteCustomers: false,
  canManageDivisionAccounts: false,
  canManageLaybys: false,
  canManageCredit: false,
  canViewCustomerReports: false,  // ❌ NO REPORTS
  canExportCustomerData: false,
  canLinkCustomerAccounts: false,

  // Payroll Management - No access
  canAccessPayroll: false,
  canManagePayroll: false,
  canCreatePayrollPeriod: false,
  canEditPayrollEntry: false,
  canApprovePayroll: false,
  canExportPayroll: false,
  canResetExportedPayrollToPreview: false,
  canDeletePayroll: false,
  canPrintPayrollEntryDetails: false,
  canEnterPaySlips: false,
  canReconcilePayroll: false,
  canViewPayrollReports: false,
  canManageAdvances: false,

  // Payroll Account Management - No access
  canAccessPayrollAccount: false,
  canViewPayrollAccountBalance: false,
  canMakePayrollDeposits: false,
  canMakePayrollPayments: false,
  canAdjustPaymentAmounts: false,
  canIssuePaymentVouchers: false,
  canCompletePayments: false,
  canViewPayrollHistory: false,
  canExportPayrollPayments: false,

  // Expense Account Management - No access
  canAccessExpenseAccount: false,
  canCreateExpenseAccount: false,
  canMakeExpenseDeposits: false,
  canMakeExpensePayments: false,
  canViewExpenseReports: false,
  canCreateIndividualPayees: false,
  canDeleteExpenseAccounts: false,
  canAdjustExpensePayments: false,
  canEditExpenseTransactions: false,
  canCreateSiblingAccounts: false,
  canEnterHistoricalData: false,
  canMergeSiblingAccounts: false,

  // Supplier Management - View only (for ingredient info)
  canViewSuppliers: true,
  canCreateSuppliers: false,
  canEditSuppliers: false,
  canDeleteSuppliers: false,
  canManageSupplierCatalog: false,

  // Location Management - View only
  canViewLocations: true,
  canCreateLocations: false,
  canEditLocations: false,
  canDeleteLocations: false,

  // WiFi Portal Integration - Sales only (no config, no reports)
  canSetupPortalIntegration: false,
  canConfigureWifiTokens: false,
  canSellWifiTokens: true,  // ✅ Can sell tokens
  canViewWifiReports: false,  // ❌ NO REPORTS
  canManageBusinessWifiMenu: false,
  canEnterManualOrders: true,  // ✅ Can enter backdated manual orders
  canCloseBooks: false,
};

// Salesperson permissions - Minimal access for sales staff only
// Can: process sales, sell tokens, view basic customer info
// Cannot: view reports, manage employees, configure systems
export const BUSINESS_SALESPERSON_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - Minimal
  canViewBusiness: true,
  canEditBusiness: false,
  canDeleteBusiness: false,
  canManageBusinessUsers: false,
  canManageBusinessSettings: false,
  canChangeDefaultPage: false,

  // User Management - No access
  canViewUsers: false,
  canInviteUsers: false,
  canEditUserPermissions: false,
  canRemoveUsers: false,
  canViewAuditLogs: false,

  // Data Management - No access
  canExportBusinessData: false,
  canImportBusinessData: false,
  canBackupBusiness: false,
  canRestoreBusiness: false,

  // Employee Management - No access
  canViewEmployees: false,
  canCreateEmployees: false,
  canEditEmployees: false,
  canDeleteEmployees: false,
  canManageEmployees: false,
  canViewEmployeeContracts: false,
  canCreateEmployeeContracts: false,
  canEditEmployeeContracts: false,
  canApproveEmployeeContracts: false,
  canDeleteEmployeeContracts: false,
  canManageJobTitles: false,
  canManageBenefitTypes: false,
  canManageCompensationTypes: false,
  canManageDisciplinaryActions: false,
  canViewEmployeeReports: false,
  canExportEmployeeData: false,
  canApproveSalaryIncreases: false,
  canProcessSalaryIncreases: false,

  // Financial Management - No access
  canAccessFinancialData: false,
  canManageProjectBudgets: false,
  canManageProjectPayments: false,
  canViewCostReports: false,
  canApproveBudgetChanges: false,
  canViewProfitabilityReports: false,

  // Customer Management - Sales-level access (view/create for sales)
  canAccessCustomers: true,
  canViewCustomers: true,
  canManageCustomers: false,
  canCreateCustomers: true,  // Salesperson can register new customers
  canEditCustomers: false,
  canDeleteCustomers: false,
  canManageDivisionAccounts: false,
  canManageLaybys: false,
  canManageCredit: false,
  canViewCustomerReports: false,  // No reports access
  canExportCustomerData: false,
  canLinkCustomerAccounts: false,

  // Payroll Management - No access
  canAccessPayroll: false,
  canManagePayroll: false,
  canCreatePayrollPeriod: false,
  canEditPayrollEntry: false,
  canApprovePayroll: false,
  canExportPayroll: false,
  canResetExportedPayrollToPreview: false,
  canDeletePayroll: false,
  canPrintPayrollEntryDetails: false,
  canEnterPaySlips: false,
  canReconcilePayroll: false,
  canViewPayrollReports: false,
  canManageAdvances: false,

  // Payroll Account Management - No access
  canAccessPayrollAccount: false,
  canViewPayrollAccountBalance: false,
  canMakePayrollDeposits: false,
  canMakePayrollPayments: false,
  canAdjustPaymentAmounts: false,
  canIssuePaymentVouchers: false,
  canCompletePayments: false,
  canViewPayrollHistory: false,
  canExportPayrollPayments: false,

  // Expense Account Management - No access
  canAccessExpenseAccount: false,
  canCreateExpenseAccount: false,
  canMakeExpenseDeposits: false,
  canMakeExpensePayments: false,
  canViewExpenseReports: false,
  canCreateIndividualPayees: false,
  canDeleteExpenseAccounts: false,
  canAdjustExpensePayments: false,
  canEditExpenseTransactions: false,
  canCreateSiblingAccounts: false,
  canEnterHistoricalData: false,
  canMergeSiblingAccounts: false,

  // Supplier Management - No access
  canViewSuppliers: false,
  canCreateSuppliers: false,
  canEditSuppliers: false,
  canDeleteSuppliers: false,
  canManageSupplierCatalog: false,

  // Location Management - No access
  canViewLocations: false,
  canCreateLocations: false,
  canEditLocations: false,
  canDeleteLocations: false,

  // WiFi Portal Integration - Sales only (no config, no reports)
  canSetupPortalIntegration: false,
  canConfigureWifiTokens: false,
  canSellWifiTokens: true,  // ✅ Can sell tokens
  canViewWifiReports: false,
  canManageBusinessWifiMenu: false,
  canEnterManualOrders: true,
  canCloseBooks: false,
};

// System admin permissions (cross-business)
export const SYSTEM_ADMIN_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - Full system access
  canViewBusiness: true,
  canEditBusiness: true,
  canDeleteBusiness: true,
  canManageBusinessUsers: true,
  canManageBusinessSettings: true,
  canChangeDefaultPage: true,

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
  // Financial Management - Full access for system admins
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
  canDeletePayroll: true,  // System admins can delete payroll
  canPrintPayrollEntryDetails: true,  // System admins can print entry details
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
  canEditExpenseTransactions: true, // ✅ Admin/Manager can always edit (bypasses 5-day window)
  canCreateSiblingAccounts: true,
  canEnterHistoricalData: true,
  canMergeSiblingAccounts: true,

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

  // WiFi Portal Integration - Full access
  canSetupPortalIntegration: true,
  canConfigureWifiTokens: true,
  canSellWifiTokens: true,
  canViewWifiReports: true,
  canManageBusinessWifiMenu: true,
  canEnterManualOrders: true,
  canCloseBooks: true,
};

// User-Level Permission Presets
export const DEFAULT_USER_PERMISSIONS: UserLevelPermissions = {
  // Personal Finance - Basic access
  canAccessPersonalFinance: true,
  canAddPersonalExpenses: true,
  canEditPersonalExpenses: true,
  canDeletePersonalExpenses: false,
  canAddMoney: true,
  canManagePersonalCategories: false,
  canManagePersonalContractors: false,
  canManagePersonalProjects: false,
  canViewPersonalReports: true,
  canExportPersonalData: true,

  // Project Management - Basic access for personal projects
  canViewProjects: true,
  canCreatePersonalProjects: true, // Everyone can create personal projects
  canCreateBusinessProjects: false, // Requires explicit grant for business projects
  canEditProjects: true,
  canDeleteProjects: false,
  canManageProjectTypes: false,
  canViewProjectReports: true,
  canAccessCrossBusinessProjects: false, // Disabled by default for security

  // Vehicle Management - No access by default
  canAccessVehicles: false,
  canViewVehicles: false,
  canManageVehicles: false,
  canManageDrivers: false,
  canManageTrips: false,
  canLogDriverTrips: false,
  canLogDriverMaintenance: false,
  canManageVehicleMaintenance: false,
  canViewVehicleReports: false,
  canExportVehicleData: false,

  // System Administration - No access by default
  canManageSystemSettings: false,
  canViewSystemLogs: false,
  canManageAllBusinesses: false,

  // Business-Agnostic Manager Payroll Actions - No access by default
  canAccessUmbrellaPayroll: false,
  canExportPayrollAcrossBusinesses: false,
  canResetPayrollAcrossBusinesses: false,
  canDeletePayrollAcrossBusinesses: false,

  // Inventory Categories - No access by default
  canCreateInventoryCategories: false,
  canEditInventoryCategories: false,
  canDeleteInventoryCategories: false,
  canCreateInventorySubcategories: false,
  canEditInventorySubcategories: false,
  canDeleteInventorySubcategories: false,

  // Universal Printing Module - Limited access by default
  canManageNetworkPrinters: false,      // Admin only
  canSelectPrinters: false,             // Must be granted
  canUseLabelPrinters: false,           // Must be granted
  canPrintReceipts: false,              // Must be granted
  canPrintInventoryLabels: false,       // Must be granted
  canViewPrintQueue: false,             // Admin only

  // Global Barcode Scanning - Disabled by default for security
  canAccessGlobalBarcodeScanning: false,        // Must be explicitly granted
  canViewGlobalInventoryAcrossBusinesses: false, // Must be explicitly granted
  canStockInventoryFromModal: false,            // Must be explicitly granted

  // Seed Data Template Management - Admin only
  canManageSeedTemplates: false,    // Admin only
  canExportSeedTemplates: false,    // Admin only
  canApplySeedTemplates: false,     // Admin only

  // Payee Management - No access by default
  canViewPayees: false,
  canCreatePayees: false,
  canEditPayees: false,
};

export const ADMIN_USER_PERMISSIONS: UserLevelPermissions = {
  // Personal Finance - Full access
  canAccessPersonalFinance: true,
  canAddPersonalExpenses: true,
  canEditPersonalExpenses: true,
  canDeletePersonalExpenses: true,
  canAddMoney: true,
  canManagePersonalCategories: true,
  canManagePersonalContractors: true,
  canManagePersonalProjects: true,
  canViewPersonalReports: true,
  canExportPersonalData: true,

  // Project Management - Full access
  canViewProjects: true,
  canCreatePersonalProjects: true, // Admins can create personal projects
  canCreateBusinessProjects: true, // Admins can create business projects
  canEditProjects: true,
  canDeleteProjects: true,
  canManageProjectTypes: true,
  canViewProjectReports: true,
  canAccessCrossBusinessProjects: true, // Admins have full access

  // Vehicle Management - Full access
  canAccessVehicles: true,
  canViewVehicles: true,
  canManageVehicles: true,
  canManageDrivers: true,
  canManageTrips: true,
  canLogDriverTrips: true,
  canLogDriverMaintenance: true,
  canManageVehicleMaintenance: true,
  canViewVehicleReports: true,
  canExportVehicleData: true,

  // System Administration - Full access
  canManageSystemSettings: true,
  canViewSystemLogs: true,
  canManageAllBusinesses: true,

  // Business-Agnostic Manager Payroll Actions - Full access for admins
  canAccessUmbrellaPayroll: true,
  canExportPayrollAcrossBusinesses: true,
  canResetPayrollAcrossBusinesses: true,
  canDeletePayrollAcrossBusinesses: true,

  // Inventory Categories - Full access
  canCreateInventoryCategories: true,
  canEditInventoryCategories: true,
  canDeleteInventoryCategories: true,
  canCreateInventorySubcategories: true,
  canEditInventorySubcategories: true,
  canDeleteInventorySubcategories: true,

  // Universal Printing Module - Full access
  canManageNetworkPrinters: true,       // Admins can manage printers
  canSelectPrinters: true,             // Admins can select printers
  canUseLabelPrinters: true,           // Admins can use label printers
  canPrintReceipts: true,              // Admins can print receipts
  canPrintInventoryLabels: true,       // Admins can print inventory labels
  canViewPrintQueue: true,             // Admins can view print queue

  // Global Barcode Scanning - Full access for admins
  canAccessGlobalBarcodeScanning: true,        // Admins can access global barcode scanning
  canViewGlobalInventoryAcrossBusinesses: true, // Admins can view inventory across all businesses
  canStockInventoryFromModal: true,            // Admins can add inventory from modal

  // Seed Data Template Management - Full access for admins
  canManageSeedTemplates: true,     // Admins can manage templates
  canExportSeedTemplates: true,     // Admins can export templates
  canApplySeedTemplates: true,      // Admins can import/apply templates

  // Payee Management - Full access for admins
  canViewPayees: true,
  canCreatePayees: true,
  canEditPayees: true,
};

// Driver Permission Preset - Minimal permissions for drivers to log trips and maintenance only
export const DRIVER_PERMISSIONS: UserLevelPermissions = {
  // Personal Finance - No access
  canAccessPersonalFinance: false,
  canAddPersonalExpenses: false,
  canEditPersonalExpenses: false,
  canDeletePersonalExpenses: false,
  canAddMoney: false,
  canManagePersonalCategories: false,
  canManagePersonalContractors: false,
  canManagePersonalProjects: false,
  canViewPersonalReports: false,
  canExportPersonalData: false,

  // Project Management - No access
  canViewProjects: false,
  canCreatePersonalProjects: false,
  canCreateBusinessProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canManageProjectTypes: false,
  canViewProjectReports: false,
  canAccessCrossBusinessProjects: false,

  // Vehicle Management - ONLY trip logging
  canAccessVehicles: false,
  canViewVehicles: false,
  canManageVehicles: false,
  canManageDrivers: false,
  canManageTrips: false,
  canLogDriverTrips: true,  // Driver trip logging permission
  canLogDriverMaintenance: true,  // Driver maintenance logging permission
  canManageVehicleMaintenance: false,
  canViewVehicleReports: false,
  canExportVehicleData: false,

  // System Administration - No access
  canManageSystemSettings: false,
  canViewSystemLogs: false,
  canManageAllBusinesses: false,

  // Business-Agnostic Manager Payroll Actions - No access
  canAccessUmbrellaPayroll: false,
  canExportPayrollAcrossBusinesses: false,
  canResetPayrollAcrossBusinesses: false,
  canDeletePayrollAcrossBusinesses: false,

  // Inventory Categories - No access
  canCreateInventoryCategories: false,
  canEditInventoryCategories: false,
  canDeleteInventoryCategories: false,
  canCreateInventorySubcategories: false,
  canEditInventorySubcategories: false,
  canDeleteInventorySubcategories: false,

  // Universal Printing Module - No access
  canManageNetworkPrinters: false,
  canUseLabelPrinters: false,
  canPrintReceipts: false,
  canPrintInventoryLabels: false,
  canViewPrintQueue: false,

  // Global Barcode Scanning - No access for drivers
  canAccessGlobalBarcodeScanning: false,
  canViewGlobalInventoryAcrossBusinesses: false,
  canStockInventoryFromModal: false,

  // Seed Data Template Management - No access for drivers
  canManageSeedTemplates: false,
  canExportSeedTemplates: false,
  canApplySeedTemplates: false,

  // Payee Management - No access for drivers
  canViewPayees: false,
  canCreatePayees: false,
  canEditPayees: false,
};

// Restaurant Associate Permission Preset - Minimal permissions with receipt printing for POS operations
export const RESTAURANT_ASSOCIATE_USER_PERMISSIONS: UserLevelPermissions = {
  // Personal Finance - No access
  canAccessPersonalFinance: false,
  canAddPersonalExpenses: false,
  canEditPersonalExpenses: false,
  canDeletePersonalExpenses: false,
  canAddMoney: false,
  canManagePersonalCategories: false,
  canManagePersonalContractors: false,
  canManagePersonalProjects: false,
  canViewPersonalReports: false,
  canExportPersonalData: false,

  // Project Management - No access
  canViewProjects: false,
  canCreatePersonalProjects: false,
  canCreateBusinessProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canManageProjectTypes: false,
  canViewProjectReports: false,
  canAccessCrossBusinessProjects: false,

  // Vehicle Management - No access
  canAccessVehicles: false,
  canViewVehicles: false,
  canManageVehicles: false,
  canManageDrivers: false,
  canManageTrips: false,
  canLogDriverTrips: false,
  canLogDriverMaintenance: false,
  canManageVehicleMaintenance: false,
  canViewVehicleReports: false,
  canExportVehicleData: false,

  // System Administration - No access
  canManageSystemSettings: false,
  canViewSystemLogs: false,
  canManageAllBusinesses: false,

  // Business-Agnostic Manager Payroll Actions - No access
  canAccessUmbrellaPayroll: false,
  canExportPayrollAcrossBusinesses: false,
  canResetPayrollAcrossBusinesses: false,
  canDeletePayrollAcrossBusinesses: false,

  // Inventory Categories - No access
  canCreateInventoryCategories: false,
  canEditInventoryCategories: false,
  canDeleteInventoryCategories: false,
  canCreateInventorySubcategories: false,
  canEditInventorySubcategories: false,
  canDeleteInventorySubcategories: false,

  // Universal Printing Module - Receipt printing only
  canManageNetworkPrinters: false,
  canSelectPrinters: true,  // ✅ Can select from existing printers for receipt printing
  canUseLabelPrinters: false,
  canPrintReceipts: true,  // ✅ Can print customer receipts at POS
  canPrintInventoryLabels: false,
  canViewPrintQueue: false,

  // Global Barcode Scanning - No access
  canAccessGlobalBarcodeScanning: false,
  canViewGlobalInventoryAcrossBusinesses: false,
  canStockInventoryFromModal: false,

  // Seed Data Template Management - No access
  canManageSeedTemplates: false,
  canExportSeedTemplates: false,
  canApplySeedTemplates: false,

  // Payee Management - No access
  canViewPayees: false,
  canCreatePayees: false,
  canEditPayees: false,
};

// Permission presets for easy management
export const BUSINESS_PERMISSION_PRESETS = {
  'business-owner': BUSINESS_OWNER_PERMISSIONS,
  'business-manager': BUSINESS_MANAGER_PERMISSIONS,
  'employee': BUSINESS_EMPLOYEE_PERMISSIONS,
  'restaurant-associate': BUSINESS_RESTAURANT_ASSOCIATE_PERMISSIONS,
  'grocery-associate': BUSINESS_RESTAURANT_ASSOCIATE_PERMISSIONS,  // Same core business perms as restaurant
  'clothing-associate': BUSINESS_RESTAURANT_ASSOCIATE_PERMISSIONS, // Same core business perms as restaurant
  'salesperson': BUSINESS_SALESPERSON_PERMISSIONS,
  'read-only': BUSINESS_READ_ONLY_PERMISSIONS,
  'system-admin': SYSTEM_ADMIN_PERMISSIONS,
} as const;

export type BusinessPermissionPreset = keyof typeof BUSINESS_PERMISSION_PRESETS;

// User-level permission presets mapping (for role-based user permission defaults)
export const USER_LEVEL_PERMISSION_PRESETS = {
  'business-owner': ADMIN_USER_PERMISSIONS,
  'business-manager': DEFAULT_USER_PERMISSIONS,
  'employee': DEFAULT_USER_PERMISSIONS,
  'restaurant-associate': RESTAURANT_ASSOCIATE_USER_PERMISSIONS,
  'grocery-associate': RESTAURANT_ASSOCIATE_USER_PERMISSIONS,   // Same user perms (print receipts)
  'clothing-associate': RESTAURANT_ASSOCIATE_USER_PERMISSIONS,  // Same user perms (print receipts)
  'salesperson': DEFAULT_USER_PERMISSIONS,
  'read-only': DEFAULT_USER_PERMISSIONS,
  'system-admin': ADMIN_USER_PERMISSIONS,
} as const;

// Business membership interface
export interface BusinessMembership {
  businessId: string;
  businessName: string;
  businessType: string; // Add business type field
  role: BusinessPermissionPreset;
  permissions: BusinessPermissions;
  isActive: boolean;
  isDemo?: boolean; // Flag to indicate demo business
  address?: string; // Business address for receipts
  phone?: string; // Business phone for receipts
  defaultPage?: string | null; // Default landing page for business
  joinedAt: Date;
  lastAccessedAt: Date | null;
}

// Helper function to merge permissions with defaults
export function mergeWithBusinessPermissions(
  userPermissions?: Partial<CoreBusinessPermissions>
): CoreBusinessPermissions {
  return {
    ...BUSINESS_EMPLOYEE_PERMISSIONS, // Default to employee permissions
    ...userPermissions,
  };
}

// Helper function to check if user has specific permission for a business
export function hasBusinessPermission(
  businessMembership: BusinessMembership | null | undefined,
  permission: keyof BusinessPermissions
): boolean {
  if (!businessMembership || !businessMembership.isActive) return false;
  return businessMembership.permissions[permission] === true;
}

// Helper function to get user's role in a specific business
export function getUserBusinessRole(
  businessMemberships: BusinessMembership[],
  businessId: string
): BusinessPermissionPreset | null {
  const membership = businessMemberships.find(m => m.businessId === businessId && m.isActive);
  return membership?.role || null;
}

// Helper function to check if user has access to any business
export function hasAnyBusinessAccess(businessMemberships: BusinessMembership[]): boolean {
  return businessMemberships.some(m => m.isActive);
}

// Helper function to get user's active businesses
export function getActiveBusinesses(businessMemberships: BusinessMembership[]): BusinessMembership[] {
  return businessMemberships.filter(m => m.isActive);
}

// Permission validation helper
export function validateBusinessPermissions(permissions: Partial<BusinessPermissions>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate that system admin permissions are only granted to appropriate users
  if (permissions.canManageAllBusinesses && !permissions.canManageSystemSettings) {
    errors.push('Managing all businesses requires system settings permission');
  }
  
  // Validate business deletion requires business management
  if (permissions.canDeleteBusiness && !permissions.canEditBusiness) {
    errors.push('Deleting business requires edit business permission');
  }
  
  // Validate user permission management requires user viewing
  if (permissions.canEditUserPermissions && !permissions.canViewUsers) {
    errors.push('Editing user permissions requires view users permission');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}