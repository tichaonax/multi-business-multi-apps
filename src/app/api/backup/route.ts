import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBackupTypes, parsePrismaSchemaForTypes } from '@/lib/backup-serialization';
import { restoreBackupData, findPrismaModelName } from '@/lib/restore-utils';
import { getProgress } from '@/lib/backup-progress';
import { createProgressId, updateProgress } from '@/lib/backup-progress';

import { randomBytes } from 'crypto';
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backupType = searchParams.get('type') || 'full';
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true';
    const includeDemoData = searchParams.get('includeDemoData') === 'true'; // Demo data excluded by default
    const includeBusinessData = searchParams.get('includeBusinessData') !== 'false'; // Business data included by default
    const businessId = searchParams.get('businessId'); // Optional: backup specific business only

    const backupData: any = {
      metadata: {
        backupType,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'multi-business-multi-apps',
        includeAuditLogs,
        includeDemoData,
        includeBusinessData,
        businessId: businessId || undefined,
        note: businessId 
          ? `Specific business backup (${businessId})`
          : includeDemoData 
            ? 'Demo data included' 
            : 'Demo data excluded (production backup)'
      }
    };

    switch (backupType) {
      case 'full':
        // Full backup with ALL application data (excluding demo by default and audit logs)
        const businessFilter = includeDemoData ? {} : { isDemo: false };

        // Core business and user data
        backupData.businesses = await prisma.businesses.findMany({
          where: businessFilter,
          include: {
            business_memberships: true,
            employees: true,
            other_businesses: true
          }
        });

        const businessIds = backupData.businesses.map((b: any) => b.id);
        const businessTypes = [...new Set(backupData.businesses.map((b: any) => b.type))];

        backupData.users = await prisma.users.findMany({
          where: includeDemoData ? {} : {
            business_memberships: {
              some: {
                businessId: { in: businessIds }
              }
            }
          },
          include: {
            business_memberships: {
              where: {
                businessId: { in: businessIds }
              },
              include: {
                businesses: true,
                permission_templates: true
              }
            },
            employees: true,
            accounts: true
          }
        });

        backupData.accounts = await prisma.accounts.findMany();

        // Employee and HR data
        backupData.employees = await prisma.employees.findMany({
          where: {
            primaryBusinessId: { in: businessIds }
          },
          include: {
            job_titles: true,
            compensation_types: true,
            businesses: true,
            employee_contracts_employee_contracts_employeeIdToemployees: true,
            employee_business_assignments: true
          }
        });

        backupData.employeeContracts = await prisma.employeeContracts.findMany({
          where: {
            primaryBusinessId: { in: businessIds }
          },
          include: {
            employees_employee_contracts_employeeIdToemployees: true,
            businesses_employee_contracts_primaryBusinessIdTobusinesses: true,
            job_titles: true,
            compensation_types: true,
            contract_benefits: true,
            contract_renewals_contract_renewals_originalContractIdToemployee_contracts: true
          }
        });

        backupData.employeeBusinessAssignments = await prisma.employeeBusinessAssignments.findMany({
          where: {
            businessId: { in: businessIds }
          }
        });

        backupData.employeeBenefits = await prisma.employeeBenefits.findMany({
          where: {
            employees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeAllowances = await prisma.employeeAllowances.findMany({
          where: {
            employees_employee_allowances_employeeIdToemployees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeBonuses = await prisma.employeeBonuses.findMany({
          where: {
            employees_employee_bonuses_employeeIdToemployees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeDeductions = await prisma.employeeDeductions.findMany({
          where: {
            employees_employee_deductions_employeeIdToemployees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeLoans = await prisma.employeeLoans.findMany({
          where: {
            employees_employee_loans_employeeIdToemployees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeSalaryIncreases = await prisma.employeeSalaryIncreases.findMany({
          where: {
            employees_employee_salary_increases_employeeIdToemployees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeLeaveRequests = await prisma.employeeLeaveRequests.findMany({
          where: {
            employees_employee_leave_requests_employeeIdToemployees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeLeaveBalance = await prisma.employeeLeaveBalance.findMany({
          where: {
            employees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeAttendance = await prisma.employeeAttendance.findMany({
          where: {
            employees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.employeeTimeTracking = await prisma.employeeTimeTracking.findMany({
          where: {
            employees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.disciplinaryActions = await prisma.disciplinaryActions.findMany({
          where: {
            employees_disciplinary_actions_employeeIdToemployees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        // Business memberships and permissions
        backupData.businessMemberships = await prisma.businessMemberships.findMany({
          where: {
            businessId: { in: businessIds }
          },
          include: {
            users: true,
            businesses: true,
            permission_templates: true
          }
        });

        // Business data - Products, Inventory, Categories, Suppliers, Customers
        if (includeBusinessData) {
          backupData.businessProducts = await prisma.businessProducts.findMany({
            where: { businessId: { in: businessIds } },
            include: {
              product_variants: true,
              product_images: true,
              product_attributes: true,
              business_brands: true,
              business_categories: true,
              business_suppliers: true
            }
          });

          backupData.productVariants = await prisma.productVariants.findMany({
            where: {
              business_products: {
                businessId: { in: businessIds }
              }
            },
            include: {
              product_barcodes: true
            }
          });

          backupData.productImages = await prisma.productImages.findMany({
            where: {
              business_products: {
                businessId: { in: businessIds }
              }
            }
          });

          backupData.productAttributes = await prisma.productAttributes.findMany({
            where: {
              business_products: {
                businessId: { in: businessIds }
              }
            }
          });

          backupData.productBarcodes = await prisma.productBarcodes.findMany({
            where: {
              product_variant: {
                business_products: {
                  businessId: { in: businessIds }
                }
              }
            }
          });

          backupData.businessStockMovements = await prisma.businessStockMovements.findMany({
            where: { businessId: { in: businessIds } }
          });

          backupData.businessCategories = await prisma.businessCategories.findMany({
            where: {
              OR: [
                { businessId: { in: businessIds } },
                { businessId: null, businessType: { in: businessTypes } }
              ]
            },
            include: {
              business_categories: true,
              other_business_categories: true,
              domain: true
            }
          });

          backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
            where: {
              OR: [
                { businessId: { in: businessIds } },
                { businessId: null, businessType: { in: businessTypes } }
              ]
            },
            include: {
              supplier_products: true
            }
          });

          backupData.businessCustomers = await prisma.businessCustomers.findMany({
            where: { businessId: { in: businessIds } },
            include: {
              business_orders: true,
              customer_laybys: true
            }
          });

          backupData.businessBrands = await prisma.businessBrands.findMany({
            where: { businessId: { in: businessIds } }
          });

          backupData.businessLocations = await prisma.businessLocations.findMany({
            where: { businessId: { in: businessIds } }
          });

          backupData.businessAccounts = await prisma.businessAccounts.findMany({
            where: { businessId: { in: businessIds } }
          });

          // Orders and transactions
          backupData.businessOrders = await prisma.businessOrders.findMany({
            where: { businessId: { in: businessIds } },
            include: {
              business_order_items: true,
              business_customers: true
            }
          });

          backupData.businessOrderItems = await prisma.businessOrderItems.findMany({
            where: {
              business_orders: {
                businessId: { in: businessIds }
              }
            }
          });

          backupData.businessTransactions = await prisma.businessTransactions.findMany({
            where: { businessId: { in: businessIds } }
          });

          // Laybys
          backupData.customerLaybys = await prisma.customerLayby.findMany({
            where: {
              customer: {
                businessId: { in: businessIds }
              }
            },
            include: {
              payments: true
            }
          });

          backupData.customerLaybyPayments = await prisma.customerLaybyPayment.findMany({
            where: {
              layby: {
                businessId: { in: businessIds }
              }
            }
          });
        }

        // Inventory domains and subcategories
        backupData.inventoryDomains = await prisma.inventoryDomains.findMany({
          include: {
            business_categories: {
              include: {
                inventory_subcategories: true
              }
            }
          }
        });

        backupData.inventorySubcategories = await prisma.inventorySubcategories.findMany({
          include: {
            business_products: true,
            category: true,
            users: true
          }
        });

        // Expense management
        backupData.expenseDomains = await prisma.expenseDomains.findMany({
          include: {
            expense_categories: true
          }
        });

        backupData.expenseCategories = await prisma.expenseCategories.findMany({
          include: {
            expense_subcategories: true,
            domain: true
          }
        });

        backupData.expenseSubcategories = await prisma.expenseSubcategories.findMany({
          include: {
            expense_account_payments: true,
            category: true,
            users: true,
            personal_expenses: true
          }
        });

        backupData.expenseAccounts = await prisma.expenseAccounts.findMany({
          where: {
            OR: [
              { deposits: { some: { sourceBusinessId: { in: businessIds } } } },
              { payments: { some: { payeeBusinessId: { in: businessIds } } } }
            ]
          },
          include: {
            deposits: true,
            payments: true
          }
        });

        backupData.expenseAccountDeposits = await prisma.expenseAccountDeposits.findMany({
          where: {
            sourceBusinessId: { in: businessIds }
          }
        });

        backupData.expenseAccountPayments = await prisma.expenseAccountPayments.findMany({
          where: {
            payeeBusinessId: { in: businessIds }
          }
        });

        // Payroll system
        backupData.payrollPeriods = await prisma.payrollPeriods.findMany({
          where: {
            businessId: { in: businessIds }
          },
          include: {
            payroll_entries: true,
            payroll_exports: true
          }
        });

        backupData.payrollEntries = await prisma.payrollEntries.findMany({
          where: {
            payroll_periods: {
              businessId: { in: businessIds }
            }
          },
          include: {
            payroll_entry_benefits: true,
            employees: true
          }
        });

        backupData.payrollEntryBenefits = await prisma.payrollEntryBenefits.findMany({
          where: {
            payroll_entries: {
              payroll_periods: {
                businessId: { in: businessIds }
              }
            }
          }
        });

        backupData.payrollExports = await prisma.payrollExports.findMany({
          where: {
            payroll_periods: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.payrollAdjustments = await prisma.payrollAdjustments.findMany({
          where: {
            payroll_entries: {
              payroll_periods: {
                businessId: { in: businessIds }
              }
            }
          }
        });

        backupData.payrollAccounts = await prisma.payrollAccounts.findMany({
          where: {
            businessId: { in: businessIds }
          }
        });

        // Personal finance
        backupData.personalBudgets = await prisma.personalBudgets.findMany({
          where: {
            userId: {
              in: backupData.users.map((u: any) => u.id)
            }
          }
        });

        backupData.personalExpenses = await prisma.personalExpenses.findMany({
          where: {
            userId: {
              in: backupData.users.map((u: any) => u.id)
            }
          }
        });

        backupData.fundSources = await prisma.fundSources.findMany({
          where: {
            userId: {
              in: backupData.users.map((u: any) => u.id)
            }
          }
        });

        // Projects and construction
        backupData.projects = await prisma.projects.findMany({
          where: {
            businessId: { in: businessIds }
          },
          include: {
            project_stages: true,
            project_contractors: true,
            project_transactions: true
          }
        });

        backupData.projectStages = await prisma.projectStages.findMany({
          where: {
            projects: {
              businessId: { in: businessIds }
            }
          },
          include: {
            stage_contractor_assignments: true
          }
        });

        backupData.projectContractors = await prisma.projectContractors.findMany({
          where: {
            projects: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.projectTransactions = await prisma.projectTransactions.findMany({
          where: {
            projects: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.constructionExpenses = await prisma.constructionExpenses.findMany();

        backupData.stageContractorAssignments = await prisma.stageContractorAssignments.findMany({
          where: {
            project_stages: {
              projects: {
                businessId: { in: businessIds }
              }
            }
          }
        });

        backupData.constructionProjects = await prisma.constructionProjects.findMany({
          // Construction projects are not scoped to a specific business via `businessId` in the schema
          // so return them all and include related construction-expenses, contractors, stages, transactions
          include: {
            construction_expenses: true,
            project_contractors: true,
            project_stages: true,
            project_transactions: true
          }
        });

        // Vehicles and transportation
        backupData.vehicles = await prisma.vehicles.findMany({
          where: {
            businessId: { in: businessIds }
          },
          include: {
            driver_authorizations: true,
            vehicle_expenses: true,
            vehicle_licenses: true,
            vehicle_maintenance_records: true,
            vehicle_trips: true
          }
        });

        backupData.vehicleDrivers = await prisma.vehicleDrivers.findMany({
          where: {
            driver_authorizations: {
              some: {
                vehicles: {
                  businessId: { in: businessIds }
                }
              }
            }
          }
        });

        backupData.vehicleExpenses = await prisma.vehicleExpenses.findMany({
          where: {
            vehicles: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.vehicleLicenses = await prisma.vehicleLicenses.findMany({
          where: {
            vehicles: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.vehicleMaintenanceRecords = await prisma.vehicleMaintenanceRecords.findMany({
          where: {
            vehicles: {
              businessId: { in: businessIds }
            }
          },
          include: {
            vehicle_maintenance_services: true
          }
        });

        backupData.vehicleMaintenanceServices = await prisma.vehicleMaintenanceServices.findMany({
          where: {
            vehicle_maintenance_records: {
              vehicles: {
                businessId: { in: businessIds }
              }
            }
          },
          include: {
            vehicle_maintenance_service_expenses: true
          }
        });

        backupData.vehicleMaintenanceServiceExpenses = await prisma.vehicleMaintenanceServiceExpenses.findMany({
          where: {
            vehicle_maintenance_services: {
              vehicle_maintenance_records: {
                vehicles: {
                  businessId: { in: businessIds }
                }
              }
            }
          }
        });

        backupData.vehicleTrips = await prisma.vehicleTrips.findMany({
          where: {
            vehicles: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.vehicleReimbursements = await prisma.vehicleReimbursements.findMany({
          where: {
            vehicles: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.driverAuthorizations = await prisma.driverAuthorizations.findMany({
          where: {
            vehicles: {
              businessId: { in: businessIds }
            }
          }
        });

        // Restaurant/Menu data
        backupData.menuItems = await prisma.menuItems.findMany({});

        backupData.menuCombos = await prisma.menuCombos.findMany({
          where: {
            businessId: { in: businessIds }
          },
          include: {
            menu_combo_items: true
          }
        });

        backupData.menuComboItems = await prisma.menuComboItems.findMany({
          where: {
            menu_combos: {
              businessId: { in: businessIds }
            }
          }
        });

        backupData.menuPromotions = await prisma.menuPromotions.findMany({
          where: {
            businessId: { in: businessIds }
          }
        });

        // Orders (universal)
        // Orders are not scoped directly to a business in the schema; include all orders
        backupData.orders = await prisma.orders.findMany({
          include: {
            order_items: true
          }
        });

        // Order items are also not scoped directly to a business; include all
        backupData.orderItems = await prisma.orderItems.findMany({});

        // Supplier products
        backupData.supplierProducts = await prisma.supplierProducts.findMany({
          where: {
            business_suppliers: {
              OR: [
                { businessId: { in: businessIds } },
                { businessId: null, businessType: { in: businessTypes } }
              ]
            }
          }
        });

        // Persons and contractors
        // Persons are not scoped directly to a business in the schema; include all
        backupData.persons = await prisma.persons.findMany({});

        // Project types
        backupData.projectTypes = await prisma.projectTypes.findMany();

        // Chat system
        // ChatRooms are not scoped directly to a business in the schema; include all
        backupData.chatRooms = await prisma.chatRooms.findMany({
          include: {
            chat_messages: true,
            chat_participants: true
          }
        });

        backupData.chatMessages = await prisma.chatMessages.findMany({});

        backupData.chatParticipants = await prisma.chatParticipants.findMany({});

        // Employee payments and deductions
        backupData.employeeDeductionPayments = await prisma.employeeDeductionPayments.findMany({
          where: {
            employee_deductions: {
              employees_employee_deductions_employeeIdToemployees: {
                primaryBusinessId: { in: businessIds }
              }
            }
          }
        });

        backupData.employeeLoanPayments = await prisma.employeeLoanPayments.findMany({
          where: {
            employee_loans: {
              employees_employee_loans_employeeIdToemployees: {
                primaryBusinessId: { in: businessIds }
              }
            }
          }
        });

        // Contract benefits and renewals
        backupData.contractBenefits = await prisma.contractBenefits.findMany({
          where: {
            employee_contracts: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        backupData.contractRenewals = await prisma.contractRenewals.findMany({
          where: {
            employees: {
              primaryBusinessId: { in: businessIds }
            }
          }
        });

        // Inter-business loans
        backupData.interBusinessLoans = await prisma.interBusinessLoans.findMany({
          where: {
            OR: [
              { borrowerBusinessId: { in: businessIds } },
              { lenderBusinessId: { in: businessIds } }
            ]
          }
        });

        // Loan transactions
        backupData.loanTransactions = await prisma.loanTransactions.findMany({
          where: {
            inter_business_loans: {
              OR: [
                { borrowerBusinessId: { in: businessIds } },
                { lenderBusinessId: { in: businessIds } }
              ]
            }
          }
        });

        // Sessions and authentication
        backupData.sessions = await prisma.sessions.findMany();

        // Data snapshots
        backupData.dataSnapshots = await prisma.dataSnapshots.findMany({});

        // Emoji lookup
        backupData.emojiLookup = await prisma.emojiLookup.findMany();

        // Reference data (global)
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefitTypes = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();

        // Sync system (excluding audit logs)
        backupData.syncConfigurations = await prisma.syncConfigurations.findMany({});

        backupData.syncNodes = await prisma.syncNodes.findMany();
        // SyncSessions are not tied to a specific business, include all sessions
        backupData.syncSessions = await prisma.syncSessions.findMany({});

        // SyncEvents are not scoped directly to a business; include all events
        backupData.syncEvents = await prisma.syncEvents.findMany({});

        backupData.syncMetrics = await prisma.syncMetrics.findMany({});

        // FullSyncSessions are not business-scoped in the schema; include all
        backupData.fullSyncSessions = await prisma.fullSyncSessions.findMany({});

        backupData.networkPartitions = await prisma.networkPartitions.findMany();
        backupData.nodeStates = await prisma.nodeStates.findMany();
        // Offline queue items are node-specific, not business-scoped; include all
        backupData.offlineQueue = await prisma.offlineQueue.findMany({});

        backupData.conflictResolutions = await prisma.conflictResolutions.findMany({});

        // Print system
        // Network printers are tied to nodes, not businesses; include all printers
        backupData.networkPrinters = await prisma.networkPrinters.findMany({});

        backupData.printJobs = await prisma.printJobs.findMany({
          where: {
            businessId: { in: businessIds }
          }
        });

        // Audit logs (only if explicitly requested)
        if (includeAuditLogs) {
          backupData.auditLogs = await prisma.auditLogs.findMany({
            orderBy: { timestamp: 'desc' },
            take: 10000,
            include: {
              users: {
                select: { id: true, name: true, email: true }
              }
            }
          });
        }
        break;

      case 'demo-only':
        // Demo businesses only backup - include ONLY demo businesses and their data
        const demoBusinessFilter: any = { isDemo: true, isActive: true };
        if (businessId) {
          demoBusinessFilter.id = businessId;
        }
        
        const demoBusinesses = await prisma.businesses.findMany({
          where: demoBusinessFilter,
          include: {
            business_memberships: true,
            employees: true,
            other_businesses: true
          }
        });
        
        if (demoBusinesses.length === 0) {
          return NextResponse.json({ 
            error: businessId ? 'Demo business not found' : 'No demo businesses found' 
          }, { status: 404 });
        }
        
        backupData.businesses = demoBusinesses;
        const demoBusinessIds = demoBusinesses.map((b: any) => b.id);

        // Get all users who are members of demo businesses
        backupData.users = await prisma.users.findMany({
          where: {
            business_memberships: {
              some: {
                businessId: { in: demoBusinessIds }
              }
            }
          },
          include: {
            business_memberships: {
              where: {
                businessId: { in: demoBusinessIds }
              },
              include: {
                businesses: true,
                permission_templates: true
              }
            },
            employees: true
          }
        });

        // Get employees for demo businesses
        backupData.employees = await prisma.employees.findMany({
          where: {
            primaryBusinessId: { in: demoBusinessIds }
          },
          include: {
            job_titles: true,
            compensation_types: true,
            businesses: true,
            employee_contracts_employee_contracts_employeeIdToemployees: true,
            employee_business_assignments: true
          }
        });

        // Get business memberships for demo businesses
        backupData.businessMemberships = await prisma.businessMemberships.findMany({
          where: {
            businessId: { in: demoBusinessIds }
          },
          include: {
            users: true,
            businesses: true,
            permission_templates: true
          }
        });

        // Get business-specific data for demo businesses
        backupData.businessCategories = await prisma.businessCategories.findMany({
          where: {
            OR: [
              { businessId: { in: demoBusinessIds } },
              { businessId: null, businessType: { in: demoBusinesses.map((b: any) => b.type) } }
            ]
          }
        });

        backupData.businessProducts = await prisma.businessProducts.findMany({
          where: { businessId: { in: demoBusinessIds } }
        });

        backupData.productVariants = await prisma.productVariants.findMany({
          where: {
            business_products: {
              businessId: { in: demoBusinessIds }
            }
          }
        });

        backupData.businessStockMovements = await prisma.businessStockMovements.findMany({
          where: { businessId: { in: demoBusinessIds } }
        });

        backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
          where: {
            OR: [
              { businessId: { in: demoBusinessIds } },
              { businessType: { in: demoBusinesses.map((b: any) => b.type) } }
            ]
          }
        });

        backupData.businessCustomers = await prisma.businessCustomers.findMany({
          where: { businessId: { in: demoBusinessIds } }
        });

        // Reference data
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefit_types = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      case 'users':
        // Users and permissions only
        const usersBusinessFilter = businessId ? { id: businessId } : (includeDemoData ? {} : { isDemo: false });
        
        if (businessId) {
          // If specific business, get only users who are members
          backupData.users = await prisma.users.findMany({
            where: {
              business_memberships: {
                some: {
                  businessId: businessId
                }
              }
            },
            include: {
              business_memberships: {
                where: { businessId: businessId },
                include: {
                  businesses: true,
                  permission_templates: true
                }
              }
            }
          });

          backupData.business_memberships = await prisma.businessMemberships.findMany({
            where: { businessId: businessId },
            include: {
              users: true,
              businesses: true,
              permission_templates: true
            }
          });
        } else {
          // All users and memberships
          backupData.users = await prisma.users.findMany({
            include: {
              business_memberships: {
                include: {
                  businesses: true,
                  permission_templates: true
                }
              }
            }
          });

          backupData.business_memberships = await prisma.businessMemberships.findMany({
            include: {
              users: true,
              businesses: true,
              permission_templates: true
            }
          });
        }

        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      case 'business-data':
        // Business information and settings (excluding demo by default)
        const businessDataFilter = businessId 
          ? { id: businessId }
          : (includeDemoData ? {} : { isDemo: false });
        
        backupData.businesses = await prisma.businesses.findMany({
          where: businessDataFilter,
          include: {
            business_memberships: true,
            other_businesses: true
          }
        });

        const businessDataIds = backupData.businesses.map((b: any) => b.id);

        backupData.business_memberships = await prisma.businessMemberships.findMany({
          where: {
            businessId: { in: businessDataIds }
          },
          include: {
            users: {
              select: { id: true, name: true, email: true }
            },
            businesses: true,
            permission_templates: true
          }
        });

        // Business products and categories (only for selected/non-demo businesses)
        backupData.businessCategories = await prisma.businessCategories.findMany({
          where: businessId 
            ? { businessId: businessId }
            : (includeDemoData ? {} : {
                OR: [
                  { businessId: { in: businessDataIds } },
                  { businessId: null }
                ]
              })
        });
        backupData.businessBrands = await prisma.businessBrands.findMany({
          where: {
            businessId: { in: businessDataIds }
          }
        });
        backupData.businessProducts = await prisma.businessProducts.findMany({
          where: businessId
            ? { businessId: businessId }
            : (includeDemoData ? {} : {
                OR: [
                  { businessId: { in: businessDataIds } },
                  { businessId: null }
                ]
              })
        });
        backupData.businessCustomers = await prisma.businessCustomers.findMany({
          where: {
            businessId: { in: businessDataIds }
          }
        });
        backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
          where: includeDemoData ? {} : {
            OR: [
              { businessId: { in: businessDataIds } },
              { businessId: null }
            ]
          }
        });
        break;

      case 'employees':
        // Employee data (with optional business filter)
        const employeeBusinessFilter = businessId 
          ? { primaryBusinessId: businessId }
          : (includeDemoData ? {} : {
              businesses: {
                isDemo: false
              }
            });
        
        backupData.employees = await prisma.employees.findMany({
          where: employeeBusinessFilter,
          include: {
            job_titles: true,
            compensation_types: true,
            businesses: true,
            employee_contracts_employee_contracts_employeeIdToemployees: true,
            employee_business_assignments: true,
            employee_benefits: true,
            employee_attendance: true
          }
        });

        const employeeIds = backupData.employees.map((e: any) => e.id);

        backupData.employeeContracts = await prisma.employeeContracts.findMany({
          where: businessId
            ? { primaryBusinessId: businessId }
            : (includeDemoData ? {} : {
                businesses_employee_contracts_primaryBusinessIdTobusinesses: {
                  isDemo: false
                }
              }),
          include: {
            employees_employee_contracts_employeeIdToemployees: true,
            businesses_employee_contracts_primaryBusinessIdTobusinesses: true,
            job_titles: true,
            compensation_types: true,
            contract_benefits: true
          }
        });

        backupData.employeeBusinessAssignments = await prisma.employeeBusinessAssignments.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        backupData.employeeBenefits = await prisma.employeeBenefits.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        backupData.employeeAttendance = await prisma.employeeAttendance.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        backupData.disciplinaryActions = await prisma.disciplinaryActions.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        break;

      case 'reference-data':
        // Reference data only
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefit_types = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      default:
        return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
    }

    // Generate filename with service name prefix and full timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Build descriptive filename
    let filenameParts = ['MultiBusinessSyncService-backup', backupType];
    
    // Add flags to filename for clarity
    if (backupType === 'full') {
      if (!includeBusinessData) {
        filenameParts.push('definitions-only');
      }
      if (includeDemoData) {
        filenameParts.push('with-demos');
      }
    }
    
    if (businessId) {
      filenameParts.push('single-business');
    }
    
    filenameParts.push(timestamp);
    const filename = `${filenameParts.join('_')}.json`;

    const replacer = (_: string, value: any) => typeof value === 'bigint' ? value.toString() : value;
    const response = new NextResponse(JSON.stringify(backupData, replacer, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

    return response;

  } catch (error) {
    console.error('Backup creation failed:', error);
    return NextResponse.json({
      error: 'Backup creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let backupData = await request.json();
    try {
      const schemaMap = parsePrismaSchemaForTypes();
      backupData = convertBackupTypes(backupData, schemaMap);
    } catch (err) {
      console.warn('Warning: failed to parse Prisma schema for type conversions:', err instanceof Error ? err.message : String(err));
    }

    if (!backupData.metadata) {
      return NextResponse.json({ error: 'Invalid backup file - missing metadata' }, { status: 400 });
    }

    const results = { restored: { users: 0, businesses: 0, employees: 0, businessMemberships: 0, auditLogs: 0, referenceData: 0 }, errors: [] as string[] };

    const progressId = createProgressId();
    console.log(`[api/backup] created progressId=${progressId}, pid=${process.pid}, user=${session.user?.id ?? 'unknown'}`)
    const processedCounts: Record<string, number> = {};

    const onProgress = (payload: { model: string; index: number; total: number; id?: string | number | null }) => {
      const m = payload.model || 'unknown';
      processedCounts[m] = (processedCounts[m] || 0) + 1;
      try {
        updateProgress(progressId, { model: m, recordId: payload.id ?? null, processed: processedCounts[m], total: payload.total });
      } catch (e) {
        console.warn('Failed to update progress:', e);
      }
    };

    const onError = (payload: { model: string; id?: string | number | null; error?: string }) => {
      try {
        const txt = `${payload.model}:${payload.id ?? 'n/a'} - ${payload.error ?? 'unknown error'}`
        results.errors.push(txt)
        try { updateProgress(progressId, { errors: [txt] }) } catch (e) { console.warn('Failed to add error to progress store', e) }
      } catch (e) {
        console.warn('Failed to record restore error:', e)
      }
    }

    const url = new URL(request.url);
    const waitFor = url.searchParams.get('wait') === 'true';
    const batchSize = Number(process.env.RESTORE_BATCH_SIZE ?? '200');
    const timeoutMs = Number(process.env.RESTORE_TX_TIMEOUT_MS ?? String(10 * 60 * 1000));

    // Build per-model totals so UI can show a meaningful total and avoid '0 / ...' display
    try {
      const counts: Record<string, { processed?: number; total?: number } > = {}
      for (const [k, v] of Object.entries(backupData)) {
        if (Array.isArray(v)) {
          // Map backup key to a Prisma model key so onProgress / updateProgress use the same key
          try {
            const resolved = findPrismaModelName(prisma, k)
            counts[resolved] = { processed: 0, total: v.length }
          } catch (e) {
            counts[k] = { processed: 0, total: v.length }
          }
        }
      }
      // Also compute totals using camel/snake case resolution for expected models
      updateProgress(progressId, { counts })
      console.log(`[api/backup] progress after init: ${JSON.stringify(getProgress(progressId))}`)
      const modelsWithTotals = Object.entries(counts).filter(([k, v]) => (v.total ?? 0) > 0)
      console.log(`[api/backup] initialized progress totals for ${Object.keys(counts).length} models (${modelsWithTotals.length} with total>0) (progressId=${progressId})`)
      if (modelsWithTotals.length > 0) {
        console.log(`[api/backup] models: ${JSON.stringify(modelsWithTotals.slice(0, 20))}`)
      } else {
        console.log(`[api/backup] no models found in backupData to restore (progressId=${progressId})`)
      }
    } catch (e) {
      console.warn('Failed to initialize model totals for progress', e)
    }

    const runRestore = async () => {
      try {
        console.log(`[api/backup] runRestore starting: progressId=${progressId}, pid=${process.pid}`)
        try { updateProgress(progressId, { model: 'starting', recordId: null }) } catch (e) {}
        await restoreBackupData(prisma, backupData, { batchSize, timeoutMs, onProgress, onError });
        updateProgress(progressId, { processed: Object.values(processedCounts).reduce((a, b) => a + b, 0), total: Object.values(processedCounts).reduce((a, b) => a + b, 0) });
        console.log(`[api/backup] runRestore completed: progressId=${progressId}, pid=${process.pid}`)
        try { updateProgress(progressId, { model: 'completed' }) } catch (e) {}
      } catch (err) {
        updateProgress(progressId, { model: 'error', updatedAt: new Date().toISOString() });
        console.error('Restore background job failed:', err instanceof Error ? err.message : String(err));
      }
    };

    if (waitFor) {
      await runRestore();
      const referenceModels = ['jobTitles','compensationTypes','benefitTypes','idFormatTemplates','driverLicenseTemplates','permissionTemplates','projectTypes','inventoryDomains','inventorySubcategories','expenseDomains','expenseCategories','expenseSubcategories','emojiLookup'];
      results.restored.referenceData = referenceModels.reduce((sum, k) => sum + (processedCounts[k] || 0), 0);
      results.restored.users = processedCounts['users'] ?? 0;
      results.restored.businesses = processedCounts['businesses'] ?? 0;
      results.restored.employees = processedCounts['employees'] ?? 0;
      results.restored.businessMemberships = processedCounts['businessMemberships'] ?? 0;
      results.restored.auditLogs = processedCounts['auditLogs'] ?? 0;
    } else {
      console.log(`[api/backup] scheduling runRestore background: progressId=${progressId}`)
      void runRestore();
      console.log(`[api/backup] scheduled runRestore background: progressId=${progressId}`)
      return NextResponse.json({ message: 'Restore started', progressId });
    }

        // Legacy single-transaction restore blocks have been removed - restore is handled by `restoreBackupData`.
        // All remaining per-model upsert blocks have been removed to prevent Prisma P2028 errors.
        // See `src/lib/restore-utils.ts` for the order and logic used to restore models.
          // Legacy single-transaction restore blocks removed - `restoreBackupData` performs the batched upserts

        // payrollEntries restored via restoreBackupData

        // payrollEntryBenefits restored via restoreBackupData

        // payrollExports restored via restoreBackupData

        // payrollAdjustments restored via restoreBackupData

        // payrollAccounts restored via restoreBackupData

        // Restore personal finance data
        // personalBudgets restored via restoreBackupData

        // personalExpenses restored via restoreBackupData

        // fundSources restored via restoreBackupData

        // Restore projects and construction data
        // projects restored via restoreBackupData

        // Restore vehicles
        // vehicles restored via restoreBackupData

        // Restore menu data
        // menuItems restored via restoreBackupData

        // Restore universal orders
        // orders restored via restoreBackupData

        // orderItems restored via restoreBackupData

        // Restore supplier products
        // supplierProducts restored via restoreBackupData

        // Restore persons
        // persons restored via restoreBackupData

        // Restore data snapshots
        // dataSnapshots restored via restoreBackupData

        // Restore sync system data
        // syncConfigurations restored via restoreBackupData

        // syncNodes restored via restoreBackupData

        // syncSessions restored via restoreBackupData

        // syncEvents restored via restoreBackupData

        // syncMetrics restored via restoreBackupData

        // fullSyncSessions restored via restoreBackupData

        // networkPartitions restored via restoreBackupData

        // nodeStates restored via restoreBackupData

        // offlineQueue restored via restoreBackupData

        // conflictResolutions restored via restoreBackupData

        // Restore print system data
        // networkPrinters restored via restoreBackupData

        // printJobs restored via restoreBackupData

        // Restore inter-business loans
        // interBusinessLoans restored via restoreBackupData

        // loanTransactions restored via restoreBackupData

        // auditLogs restored via restoreBackupData

    return NextResponse.json({ message: 'Restore completed successfully', results });

  } catch (error) {
    console.error('Restore failed:', error);
    return NextResponse.json({
      error: 'Restore failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}