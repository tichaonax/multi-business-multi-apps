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
  canEnterPaySlips: boolean;
  canReconcilePayroll: boolean;
  canViewPayrollReports: boolean;
  canManageAdvances: boolean;
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
export type BusinessType = 'clothing' | 'restaurant' | 'construction' | 'grocery' | 'consulting' | 'retail' | 'services' | 'other';

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
    { key: 'canDeleteEmployeeContracts', label: 'Delete Contracts' },
    { key: 'canManageJobTitles', label: 'Manage Job Titles' },
    { key: 'canManageBenefitTypes', label: 'Manage Benefit Types' },
    { key: 'canManageCompensationTypes', label: 'Manage Compensation Types' },
    { key: 'canManageDisciplinaryActions', label: 'Manage Disciplinary Actions' },
    { key: 'canViewEmployeeReports', label: 'View Employee Reports' },
    { key: 'canExportEmployeeData', label: 'Export Employee Data' },
    { key: 'canApproveSalaryIncreases', label: 'Approve Salary Increases' },
    { key: 'canProcessSalaryIncreases', label: 'Process Salary Increases' },
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
  canEnterPaySlips: true,
  canReconcilePayroll: true,
  canViewPayrollReports: true,
  canManageAdvances: true,
};

export const BUSINESS_MANAGER_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - Limited
  canViewBusiness: true,
  canEditBusiness: true,
  canDeleteBusiness: false,
  canManageBusinessUsers: true,
  canManageBusinessSettings: true,

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

  // Payroll Management - Manager access (all except approval)
  canAccessPayroll: true,
  canManagePayroll: true,
  canCreatePayrollPeriod: true,
  canEditPayrollEntry: true,
  canApprovePayroll: false,  // Only owners can approve
  canExportPayroll: true,
  canEnterPaySlips: true,
  canReconcilePayroll: true,
  canViewPayrollReports: true,
  canManageAdvances: true,
};

export const BUSINESS_EMPLOYEE_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - View only
  canViewBusiness: true,
  canEditBusiness: false,
  canDeleteBusiness: false,
  canManageBusinessUsers: false,
  canManageBusinessSettings: false,

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
  canAccessPayroll: false,
  canManagePayroll: false,
  canCreatePayrollPeriod: false,
  canEditPayrollEntry: false,
  canApprovePayroll: false,
  canExportPayroll: false,
  canEnterPaySlips: false,
  canReconcilePayroll: false,
  canViewPayrollReports: false,
  canManageAdvances: false,
};

export const BUSINESS_READ_ONLY_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - View only
  canViewBusiness: true,
  canEditBusiness: false,
  canDeleteBusiness: false,
  canManageBusinessUsers: false,
  canManageBusinessSettings: false,

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
  canEnterPaySlips: false,
  canReconcilePayroll: false,
  canViewPayrollReports: true,
  canManageAdvances: false,
};

// System admin permissions (cross-business)
export const SYSTEM_ADMIN_PERMISSIONS: CoreBusinessPermissions = {
  // Business Management - Full system access
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
  canEnterPaySlips: true,
  canReconcilePayroll: true,
  canViewPayrollReports: true,
  canManageAdvances: true,
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
};

// Permission presets for easy management
export const BUSINESS_PERMISSION_PRESETS = {
  'business-owner': BUSINESS_OWNER_PERMISSIONS,
  'business-manager': BUSINESS_MANAGER_PERMISSIONS,
  'employee': BUSINESS_EMPLOYEE_PERMISSIONS,
  'read-only': BUSINESS_READ_ONLY_PERMISSIONS,
  'system-admin': SYSTEM_ADMIN_PERMISSIONS,
} as const;

export type BusinessPermissionPreset = keyof typeof BUSINESS_PERMISSION_PRESETS;

// Business membership interface
export interface BusinessMembership {
  businessId: string;
  businessName: string;
  businessType: string; // Add business type field
  role: BusinessPermissionPreset;
  permissions: BusinessPermissions;
  isActive: boolean;
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