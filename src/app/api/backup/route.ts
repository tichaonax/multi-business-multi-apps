import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const backupData = await request.json();

    if (!backupData.metadata) {
      return NextResponse.json({
        error: 'Invalid backup file - missing metadata'
      }, { status: 400 });
    }

    const results = {
      restored: {
        users: 0,
        businesses: 0,
        employees: 0,
        businessMemberships: 0,
        auditLogs: 0,
        referenceData: 0
      },
      errors: [] as string[]
    };

    // Use transaction for data integrity
    await prisma.$transaction(async (tx) => {
      try {
        // Restore reference data first (dependencies)
        if (backupData.jobTitles) {
          for (const jobTitle of backupData.jobTitles) {
            try {
              await tx.jobTitles.upsert({
                where: { id: jobTitle.id },
                update: {
                  title: jobTitle.title,
                  description: jobTitle.description,
                  responsibilities: jobTitle.responsibilities,
                  department: jobTitle.department,
                  level: jobTitle.level,
                  isActive: jobTitle.isActive
                },
                create: {
                  id: jobTitle.id,
                  title: jobTitle.title,
                  description: jobTitle.description,
                  responsibilities: jobTitle.responsibilities,
                  department: jobTitle.department,
                  level: jobTitle.level,
                  isActive: jobTitle.isActive,
                  createdAt: new Date(jobTitle.createdAt),
                  updatedAt: new Date(jobTitle.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Job Title ${jobTitle.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.compensationTypes) {
          for (const compensationType of backupData.compensationTypes) {
            try {
              await tx.compensationTypes.upsert({
                where: { id: compensationType.id },
                update: {
                  name: compensationType.name,
                  type: compensationType.type,
                  description: compensationType.description,
                  baseAmount: compensationType.baseAmount,
                  commissionPercentage: compensationType.commissionPercentage,
                  frequency: compensationType.frequency,
                  isActive: compensationType.isActive
                },
                create: {
                  id: compensationType.id,
                  name: compensationType.name,
                  type: compensationType.type,
                  description: compensationType.description,
                  baseAmount: compensationType.baseAmount,
                  commissionPercentage: compensationType.commissionPercentage,
                  frequency: compensationType.frequency,
                  isActive: compensationType.isActive,
                  createdAt: new Date(compensationType.createdAt),
                  updatedAt: new Date(compensationType.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Compensation Type ${compensationType.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.benefitTypes) {
          for (const benefitType of backupData.benefitTypes) {
            try {
              await tx.benefitTypes.upsert({
                where: { id: benefitType.id },
                update: {
                  name: benefitType.name,
                  description: benefitType.description,
                  type: benefitType.type,
                  defaultAmount: benefitType.defaultAmount,
                  isPercentage: benefitType.isPercentage,
                  isActive: benefitType.isActive
                },
                create: {
                  id: benefitType.id,
                  name: benefitType.name,
                  description: benefitType.description,
                  type: benefitType.type,
                  defaultAmount: benefitType.defaultAmount,
                  isPercentage: benefitType.isPercentage,
                  isActive: benefitType.isActive,
                  createdAt: new Date(benefitType.createdAt),
                  updatedAt: new Date(benefitType.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Benefit Type ${benefitType.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore additional reference data
        if (backupData.idFormatTemplates) {
          for (const template of backupData.idFormatTemplates) {
            try {
              await tx.idFormatTemplates.upsert({
                where: { id: template.id },
                update: {
                  name: template.name,
                  format: template.format,
                  description: template.description,
                  isActive: template.isActive
                },
                create: {
                  id: template.id,
                  name: template.name,
                  format: template.format,
                  description: template.description,
                  isActive: template.isActive,
                  createdAt: new Date(template.createdAt),
                  updatedAt: new Date(template.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`ID Format Template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.driverLicenseTemplates) {
          for (const template of backupData.driverLicenseTemplates) {
            try {
              await tx.driverLicenseTemplates.upsert({
                where: { id: template.id },
                update: {
                  name: template.name,
                  format: template.format,
                  description: template.description,
                  isActive: template.isActive
                },
                create: {
                  id: template.id,
                  name: template.name,
                  format: template.format,
                  description: template.description,
                  isActive: template.isActive,
                  createdAt: new Date(template.createdAt),
                  updatedAt: new Date(template.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Driver License Template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.permissionTemplates) {
          for (const template of backupData.permissionTemplates) {
            try {
              await tx.permissionTemplates.upsert({
                where: { id: template.id },
                update: {
                  name: template.name,
                  description: template.description,
                  permissions: template.permissions,
                  isActive: template.isActive
                },
                create: {
                  id: template.id,
                  name: template.name,
                  description: template.description,
                  permissions: template.permissions,
                  isActive: template.isActive,
                  createdAt: new Date(template.createdAt),
                  updatedAt: new Date(template.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Permission Template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.projectTypes) {
          for (const projectType of backupData.projectTypes) {
            try {
              await tx.projectTypes.upsert({
                where: { id: projectType.id },
                update: {
                  name: projectType.name,
                  description: projectType.description,
                  isActive: projectType.isActive
                },
                create: {
                  id: projectType.id,
                  name: projectType.name,
                  description: projectType.description,
                  isActive: projectType.isActive,
                  createdAt: new Date(projectType.createdAt),
                  updatedAt: new Date(projectType.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Project Type ${projectType.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore inventory domains and subcategories
        if (backupData.inventoryDomains) {
          for (const domain of backupData.inventoryDomains) {
            try {
              await tx.inventoryDomains.upsert({
                where: { id: domain.id },
                update: {
                  name: domain.name,
                  description: domain.description,
                  isActive: domain.isActive
                },
                create: {
                  id: domain.id,
                  name: domain.name,
                  description: domain.description,
                  isActive: domain.isActive,
                  createdAt: new Date(domain.createdAt),
                  updatedAt: new Date(domain.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Inventory Domain ${domain.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.inventorySubcategories) {
          for (const subcategory of backupData.inventorySubcategories) {
            try {
              await tx.inventorySubcategories.upsert({
                where: { id: subcategory.id },
                update: {
                  name: subcategory.name,
                  description: subcategory.description,
                  domainId: subcategory.domainId,
                  isActive: subcategory.isActive
                },
                create: {
                  id: subcategory.id,
                  name: subcategory.name,
                  description: subcategory.description,
                  domainId: subcategory.domainId,
                  isActive: subcategory.isActive,
                  createdAt: new Date(subcategory.createdAt),
                  updatedAt: new Date(subcategory.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Inventory Subcategory ${subcategory.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore expense domains and categories
        if (backupData.expenseDomains) {
          for (const domain of backupData.expenseDomains) {
            try {
              await tx.expenseDomains.upsert({
                where: { id: domain.id },
                update: {
                  name: domain.name,
                  description: domain.description,
                  isActive: domain.isActive
                },
                create: {
                  id: domain.id,
                  name: domain.name,
                  description: domain.description,
                  isActive: domain.isActive,
                  createdAt: new Date(domain.createdAt),
                  updatedAt: new Date(domain.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Expense Domain ${domain.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.expenseCategories) {
          for (const category of backupData.expenseCategories) {
            try {
              await tx.expenseCategories.upsert({
                where: { id: category.id },
                update: {
                  name: category.name,
                  description: category.description,
                  domainId: category.domainId,
                  isActive: category.isActive
                },
                create: {
                  id: category.id,
                  name: category.name,
                  description: category.description,
                  domainId: category.domainId,
                  isActive: category.isActive,
                  createdAt: new Date(category.createdAt),
                  updatedAt: new Date(category.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Expense Category ${category.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.expenseSubcategories) {
          for (const subcategory of backupData.expenseSubcategories) {
            try {
              await tx.expenseSubcategories.upsert({
                where: { id: subcategory.id },
                update: {
                  name: subcategory.name,
                  description: subcategory.description,
                  categoryId: subcategory.categoryId,
                  isActive: subcategory.isActive
                },
                create: {
                  id: subcategory.id,
                  name: subcategory.name,
                  description: subcategory.description,
                  categoryId: subcategory.categoryId,
                  isActive: subcategory.isActive,
                  createdAt: new Date(subcategory.createdAt),
                  updatedAt: new Date(subcategory.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Expense Subcategory ${subcategory.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore emoji lookup
        if (backupData.emojiLookup) {
          for (const emoji of backupData.emojiLookup) {
            try {
              await tx.emojiLookup.upsert({
                where: { id: emoji.id },
                update: {
                  emoji: emoji.emoji,
                  name: emoji.name,
                  category: emoji.category
                },
                create: {
                  id: emoji.id,
                  emoji: emoji.emoji,
                  name: emoji.name,
                  category: emoji.category,
                  createdAt: new Date(emoji.createdAt),
                  updatedAt: new Date(emoji.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Emoji ${emoji.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore businesses
        if (backupData.businesses) {
          for (const business of backupData.businesses) {
            try {
              await tx.businesses.upsert({
                where: { id: business.id },
                update: {
                  name: business.name,
                  type: business.type,
                  description: business.description,
                  isActive: business.isActive,
                  settings: business.settings,
                  umbrellaBusinessId: business.umbrellaBusinessId,
                  isUmbrellaBusiness: business.isUmbrellaBusiness
                },
                create: {
                  id: business.id,
                  name: business.name,
                  type: business.type,
                  description: business.description,
                  isActive: business.isActive,
                  settings: business.settings,
                  createdBy: business.createdBy,
                  umbrellaBusinessId: business.umbrellaBusinessId,
                  isUmbrellaBusiness: business.isUmbrellaBusiness,
                  createdAt: new Date(business.createdAt),
                  updatedAt: new Date(business.updatedAt)
                }
              });
              results.restored.businesses++;
            } catch (error) {
              results.errors.push(`Business ${business.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore users and accounts
        if (backupData.users) {
          for (const user of backupData.users) {
            try {
              await tx.users.upsert({
                where: { id: user.id },
                update: {
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  permissions: user.permissions,
                  isActive: user.isActive,
                  passwordResetRequired: user.passwordResetRequired
                },
                create: {
                  id: user.id,
                  email: user.email,
                  passwordHash: user.passwordHash,
                  name: user.name,
                  role: user.role,
                  permissions: user.permissions,
                  isActive: user.isActive,
                  passwordResetRequired: user.passwordResetRequired,
                  createdAt: new Date(user.createdAt),
                  updatedAt: new Date(user.updatedAt)
                }
              });
              results.restored.users++;
            } catch (error) {
              results.errors.push(`User ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.accounts) {
          for (const account of backupData.accounts) {
            try {
              await tx.accounts.upsert({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId
                  }
                },
                update: {
                  refreshToken: account.refreshToken,
                  accessToken: account.accessToken,
                  expiresAt: account.expiresAt,
                  tokenType: account.tokenType,
                  scope: account.scope,
                  idToken: account.idToken,
                  sessionState: account.sessionState
                },
                create: {
                  userId: account.userId,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refreshToken: account.refreshToken,
                  accessToken: account.accessToken,
                  expiresAt: account.expiresAt,
                  tokenType: account.tokenType,
                  scope: account.scope,
                  idToken: account.idToken,
                  sessionState: account.sessionState
                }
              });
            } catch (error) {
              results.errors.push(`Account ${account.providerAccountId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore sessions
        if (backupData.sessions) {
          for (const session of backupData.sessions) {
            try {
              await tx.sessions.upsert({
                where: { id: session.id },
                update: {
                  sessionToken: session.sessionToken,
                  expires: new Date(session.expires)
                },
                create: {
                  id: session.id,
                  sessionToken: session.sessionToken,
                  userId: session.userId,
                  expires: new Date(session.expires)
                }
              });
            } catch (error) {
              results.errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business memberships
        if (backupData.businessMemberships) {
          for (const membership of backupData.businessMemberships) {
            try {
              await tx.businessMemberships.upsert({
                where: {
                  userId_businessId: {
                    userId: membership.userId,
                    businessId: membership.businessId
                  }
                },
                update: {
                  role: membership.role,
                  permissions: membership.permissions,
                  isActive: membership.isActive,
                  templateId: membership.templateId
                },
                create: {
                  id: membership.id,
                  userId: membership.userId,
                  businessId: membership.businessId,
                  role: membership.role,
                  permissions: membership.permissions,
                  isActive: membership.isActive,
                  invitedBy: membership.invitedBy,
                  templateId: membership.templateId,
                  joinedAt: new Date(membership.joinedAt)
                }
              });
              results.restored.businessMemberships++;
            } catch (error) {
              results.errors.push(`Business Membership ${membership.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore employees and related data
        if (backupData.employees) {
          for (const employee of backupData.employees) {
            try {
              await tx.employees.upsert({
                where: { id: employee.id },
                update: {
                  employeeNumber: employee.employeeNumber,
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  fullName: employee.fullName,
                  email: employee.email,
                  phone: employee.phone,
                  nationalId: employee.nationalId,
                  isActive: employee.isActive,
                  employmentStatus: employee.employmentStatus
                },
                create: {
                  id: employee.id,
                  employeeNumber: employee.employeeNumber,
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  fullName: employee.fullName,
                  email: employee.email,
                  phone: employee.phone,
                  nationalId: employee.nationalId,
                  hireDate: new Date(employee.hireDate),
                  jobTitleId: employee.jobTitleId,
                  compensationTypeId: employee.compensationTypeId,
                  primaryBusinessId: employee.primaryBusinessId,
                  isActive: employee.isActive,
                  employmentStatus: employee.employmentStatus,
                  createdAt: new Date(employee.createdAt),
                  updatedAt: new Date(employee.updatedAt)
                }
              });
              results.restored.employees++;
            } catch (error) {
              results.errors.push(`Employee ${employee.fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore employee-related data
        if (backupData.employeeBusinessAssignments) {
          for (const assignment of backupData.employeeBusinessAssignments) {
            try {
              await tx.employeeBusinessAssignments.upsert({
                where: { id: assignment.id },
                update: {
                  employeeId: assignment.employeeId,
                  businessId: assignment.businessId,
                  role: assignment.role,
                  isActive: assignment.isActive
                },
                create: {
                  id: assignment.id,
                  employeeId: assignment.employeeId,
                  businessId: assignment.businessId,
                  role: assignment.role,
                  isActive: assignment.isActive,
                  assignedAt: new Date(assignment.assignedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Business Assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeBenefits) {
          for (const benefit of backupData.employeeBenefits) {
            try {
              await tx.employeeBenefits.upsert({
                where: { id: benefit.id },
                update: {
                  employeeId: benefit.employeeId,
                  benefitTypeId: benefit.benefitTypeId,
                  amount: benefit.amount,
                  isActive: benefit.isActive
                },
                create: {
                  id: benefit.id,
                  employeeId: benefit.employeeId,
                  benefitTypeId: benefit.benefitTypeId,
                  amount: benefit.amount,
                  isActive: benefit.isActive,
                  createdAt: new Date(benefit.createdAt),
                  updatedAt: new Date(benefit.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Benefit ${benefit.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeAllowances) {
          for (const allowance of backupData.employeeAllowances) {
            try {
              await tx.employeeAllowances.upsert({
                where: { id: allowance.id },
                update: {
                  employeeId: allowance.employeeId,
                  allowanceType: allowance.allowanceType,
                  amount: allowance.amount,
                  isActive: allowance.isActive
                },
                create: {
                  id: allowance.id,
                  employeeId: allowance.employeeId,
                  allowanceType: allowance.allowanceType,
                  amount: allowance.amount,
                  isActive: allowance.isActive,
                  createdAt: new Date(allowance.createdAt),
                  updatedAt: new Date(allowance.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Allowance ${allowance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeBonuses) {
          for (const bonus of backupData.employeeBonuses) {
            try {
              await tx.employeeBonuses.upsert({
                where: { id: bonus.id },
                update: {
                  employeeId: bonus.employeeId,
                  amount: bonus.amount,
                  reason: bonus.reason,
                  isActive: bonus.isActive
                },
                create: {
                  id: bonus.id,
                  employeeId: bonus.employeeId,
                  amount: bonus.amount,
                  reason: bonus.reason,
                  isActive: bonus.isActive,
                  createdAt: new Date(bonus.createdAt),
                  updatedAt: new Date(bonus.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Bonus ${bonus.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeDeductions) {
          for (const deduction of backupData.employeeDeductions) {
            try {
              await tx.employeeDeductions.upsert({
                where: { id: deduction.id },
                update: {
                  employeeId: deduction.employeeId,
                  deductionType: deduction.deductionType,
                  amount: deduction.amount,
                  isActive: deduction.isActive
                },
                create: {
                  id: deduction.id,
                  employeeId: deduction.employeeId,
                  deductionType: deduction.deductionType,
                  amount: deduction.amount,
                  isActive: deduction.isActive,
                  createdAt: new Date(deduction.createdAt),
                  updatedAt: new Date(deduction.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Deduction ${deduction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeLoans) {
          for (const loan of backupData.employeeLoans) {
            try {
              await tx.employeeLoans.upsert({
                where: { id: loan.id },
                update: {
                  employeeId: loan.employeeId,
                  amount: loan.amount,
                  interestRate: loan.interestRate,
                  termMonths: loan.termMonths,
                  isActive: loan.isActive
                },
                create: {
                  id: loan.id,
                  employeeId: loan.employeeId,
                  amount: loan.amount,
                  interestRate: loan.interestRate,
                  termMonths: loan.termMonths,
                  isActive: loan.isActive,
                  createdAt: new Date(loan.createdAt),
                  updatedAt: new Date(loan.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Loan ${loan.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeSalaryIncreases) {
          for (const increase of backupData.employeeSalaryIncreases) {
            try {
              await tx.employeeSalaryIncreases.upsert({
                where: { id: increase.id },
                update: {
                  employeeId: increase.employeeId,
                  amount: increase.amount,
                  percentage: increase.percentage,
                  reason: increase.reason,
                  isActive: increase.isActive
                },
                create: {
                  id: increase.id,
                  employeeId: increase.employeeId,
                  amount: increase.amount,
                  percentage: increase.percentage,
                  reason: increase.reason,
                  isActive: increase.isActive,
                  createdAt: new Date(increase.createdAt),
                  updatedAt: new Date(increase.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Salary Increase ${increase.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeLeaveRequests) {
          for (const request of backupData.employeeLeaveRequests) {
            try {
              await tx.employeeLeaveRequests.upsert({
                where: { id: request.id },
                update: {
                  employeeId: request.employeeId,
                  leaveType: request.leaveType,
                  startDate: new Date(request.startDate),
                  endDate: new Date(request.endDate),
                  status: request.status
                },
                create: {
                  id: request.id,
                  employeeId: request.employeeId,
                  leaveType: request.leaveType,
                  startDate: new Date(request.startDate),
                  endDate: new Date(request.endDate),
                  status: request.status,
                  createdAt: new Date(request.createdAt),
                  updatedAt: new Date(request.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Leave Request ${request.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeLeaveBalance) {
          for (const balance of backupData.employeeLeaveBalance) {
            try {
              await tx.employeeLeaveBalance.upsert({
                where: { id: balance.id },
                update: {
                  employeeId: balance.employeeId,
                  leaveType: balance.leaveType,
                  balance: balance.balance,
                  used: balance.used
                },
                create: {
                  id: balance.id,
                  employeeId: balance.employeeId,
                  leaveType: balance.leaveType,
                  balance: balance.balance,
                  used: balance.used,
                  createdAt: new Date(balance.createdAt),
                  updatedAt: new Date(balance.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Leave Balance ${balance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeAttendance) {
          for (const attendance of backupData.employeeAttendance) {
            try {
              await tx.employeeAttendance.upsert({
                where: { id: attendance.id },
                update: {
                  employeeId: attendance.employeeId,
                  date: new Date(attendance.date),
                  checkIn: attendance.checkIn ? new Date(attendance.checkIn) : null,
                  checkOut: attendance.checkOut ? new Date(attendance.checkOut) : null,
                  status: attendance.status
                },
                create: {
                  id: attendance.id,
                  employeeId: attendance.employeeId,
                  date: new Date(attendance.date),
                  checkIn: attendance.checkIn ? new Date(attendance.checkIn) : null,
                  checkOut: attendance.checkOut ? new Date(attendance.checkOut) : null,
                  status: attendance.status,
                  createdAt: new Date(attendance.createdAt),
                  updatedAt: new Date(attendance.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Attendance ${attendance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeTimeTracking) {
          for (const tracking of backupData.employeeTimeTracking) {
            try {
              await tx.employeeTimeTracking.upsert({
                where: { id: tracking.id },
                update: {
                  employeeId: tracking.employeeId,
                  date: new Date(tracking.date),
                  hoursWorked: tracking.hoursWorked,
                  projectId: tracking.projectId,
                  description: tracking.description
                },
                create: {
                  id: tracking.id,
                  employeeId: tracking.employeeId,
                  date: new Date(tracking.date),
                  hoursWorked: tracking.hoursWorked,
                  projectId: tracking.projectId,
                  description: tracking.description,
                  createdAt: new Date(tracking.createdAt),
                  updatedAt: new Date(tracking.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Time Tracking ${tracking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.disciplinaryActions) {
          for (const action of backupData.disciplinaryActions) {
            try {
              await tx.disciplinaryActions.upsert({
                where: { id: action.id },
                update: {
                  employeeId: action.employeeId,
                  actionType: action.actionType,
                  description: action.description,
                  date: new Date(action.date),
                  isActive: action.isActive
                },
                create: {
                  id: action.id,
                  employeeId: action.employeeId,
                  actionType: action.actionType,
                  description: action.description,
                  date: new Date(action.date),
                  isActive: action.isActive,
                  createdAt: new Date(action.createdAt),
                  updatedAt: new Date(action.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Disciplinary Action ${action.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore employee contracts
        if (backupData.employeeContracts) {
          for (const contract of backupData.employeeContracts) {
            try {
              await tx.employeeContracts.upsert({
                where: { id: contract.id },
                update: {
                  employeeId: contract.employeeId,
                  primaryBusinessId: contract.primaryBusinessId,
                  jobTitleId: contract.jobTitleId,
                  compensationTypeId: contract.compensationTypeId,
                  startDate: new Date(contract.startDate),
                  endDate: contract.endDate ? new Date(contract.endDate) : null,
                  status: contract.status
                },
                create: {
                  id: contract.id,
                  employeeId: contract.employeeId,
                  primaryBusinessId: contract.primaryBusinessId,
                  jobTitleId: contract.jobTitleId,
                  compensationTypeId: contract.compensationTypeId,
                  startDate: new Date(contract.startDate),
                  endDate: contract.endDate ? new Date(contract.endDate) : null,
                  status: contract.status,
                  createdAt: new Date(contract.createdAt),
                  updatedAt: new Date(contract.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Contract ${contract.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore contract benefits and renewals
        if (backupData.contractBenefits) {
          for (const benefit of backupData.contractBenefits) {
            try {
              await tx.contractBenefits.upsert({
                where: { id: benefit.id },
                update: {
                  contractId: benefit.contractId,
                  benefitTypeId: benefit.benefitTypeId,
                  amount: benefit.amount,
                  isActive: benefit.isActive
                },
                create: {
                  id: benefit.id,
                  contractId: benefit.contractId,
                  benefitTypeId: benefit.benefitTypeId,
                  amount: benefit.amount,
                  isActive: benefit.isActive,
                  createdAt: new Date(benefit.createdAt),
                  updatedAt: new Date(benefit.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Contract Benefit ${benefit.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.contractRenewals) {
          for (const renewal of backupData.contractRenewals) {
            try {
              await tx.contractRenewals.upsert({
                where: { id: renewal.id },
                update: {
                  contractId: renewal.contractId,
                  renewalDate: new Date(renewal.renewalDate),
                  newEndDate: renewal.newEndDate ? new Date(renewal.newEndDate) : null,
                  status: renewal.status
                },
                create: {
                  id: renewal.id,
                  contractId: renewal.contractId,
                  renewalDate: new Date(renewal.renewalDate),
                  newEndDate: renewal.newEndDate ? new Date(renewal.newEndDate) : null,
                  status: renewal.status,
                  createdAt: new Date(renewal.createdAt),
                  updatedAt: new Date(renewal.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Contract Renewal ${renewal.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore employee payments
        if (backupData.employeeDeductionPayments) {
          for (const payment of backupData.employeeDeductionPayments) {
            try {
              await tx.employeeDeductionPayments.upsert({
                where: { id: payment.id },
                update: {
                  deductionId: payment.deductionId,
                  amount: payment.amount,
                  paymentDate: new Date(payment.paymentDate),
                  status: payment.status
                },
                create: {
                  id: payment.id,
                  deductionId: payment.deductionId,
                  amount: payment.amount,
                  paymentDate: new Date(payment.paymentDate),
                  status: payment.status,
                  createdAt: new Date(payment.createdAt),
                  updatedAt: new Date(payment.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Deduction Payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.employeeLoanPayments) {
          for (const payment of backupData.employeeLoanPayments) {
            try {
              await tx.employeeLoanPayments.upsert({
                where: { id: payment.id },
                update: {
                  loanId: payment.loanId,
                  amount: payment.amount,
                  paymentDate: new Date(payment.paymentDate),
                  status: payment.status
                },
                create: {
                  id: payment.id,
                  loanId: payment.loanId,
                  amount: payment.amount,
                  paymentDate: new Date(payment.paymentDate),
                  status: payment.status,
                  createdAt: new Date(payment.createdAt),
                  updatedAt: new Date(payment.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Employee Loan Payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Continue with business data restoration...
        // Restore business categories
        if (backupData.businessCategories) {
          for (const category of backupData.businessCategories) {
            try {
              await tx.businessCategories.upsert({
                where: { id: category.id },
                update: {
                  businessId: category.businessId,
                  name: category.name,
                  description: category.description,
                  parentId: category.parentId,
                  displayOrder: category.displayOrder,
                  isActive: category.isActive,
                  businessType: category.businessType,
                  attributes: category.attributes,
                  color: category.color,
                  domainId: category.domainId,
                  emoji: category.emoji,
                  isUserCreated: category.isUserCreated
                },
                create: {
                  id: category.id,
                  businessId: category.businessId,
                  name: category.name,
                  description: category.description,
                  parentId: category.parentId,
                  displayOrder: category.displayOrder,
                  isActive: category.isActive,
                  businessType: category.businessType,
                  attributes: category.attributes,
                  createdBy: category.createdBy,
                  color: category.color,
                  domainId: category.domainId,
                  emoji: category.emoji,
                  isUserCreated: category.isUserCreated,
                  createdAt: new Date(category.createdAt),
                  updatedAt: new Date(category.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Category ${category.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business suppliers
        if (backupData.businessSuppliers) {
          for (const supplier of backupData.businessSuppliers) {
            try {
              await tx.businessSuppliers.upsert({
                where: { id: supplier.id },
                update: {
                  businessId: supplier.businessId,
                  name: supplier.name,
                  contactPerson: supplier.contactPerson,
                  email: supplier.email,
                  phone: supplier.phone,
                  address: supplier.address,
                  isActive: supplier.isActive,
                  businessType: supplier.businessType,
                  attributes: supplier.attributes
                },
                create: {
                  id: supplier.id,
                  businessId: supplier.businessId,
                  name: supplier.name,
                  contactPerson: supplier.contactPerson,
                  email: supplier.email,
                  phone: supplier.phone,
                  address: supplier.address,
                  isActive: supplier.isActive,
                  businessType: supplier.businessType,
                  attributes: supplier.attributes,
                  createdAt: new Date(supplier.createdAt),
                  updatedAt: new Date(supplier.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Supplier ${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business customers
        if (backupData.businessCustomers) {
          for (const customer of backupData.businessCustomers) {
            try {
              await tx.businessCustomers.upsert({
                where: { id: customer.id },
                update: {
                  businessId: customer.businessId,
                  customerNumber: customer.customerNumber,
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : null,
                  address: customer.address,
                  city: customer.city,
                  country: customer.country,
                  customerType: customer.customerType,
                  segment: customer.segment,
                  loyaltyPoints: customer.loyaltyPoints,
                  totalSpent: customer.totalSpent,
                  isActive: customer.isActive,
                  businessType: customer.businessType,
                  attributes: customer.attributes
                },
                create: {
                  id: customer.id,
                  businessId: customer.businessId,
                  customerNumber: customer.customerNumber,
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : null,
                  address: customer.address,
                  city: customer.city,
                  country: customer.country,
                  customerType: customer.customerType,
                  segment: customer.segment,
                  loyaltyPoints: customer.loyaltyPoints,
                  totalSpent: customer.totalSpent,
                  isActive: customer.isActive,
                  businessType: customer.businessType,
                  attributes: customer.attributes,
                  createdAt: new Date(customer.createdAt),
                  updatedAt: new Date(customer.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Customer ${customer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business brands
        if (backupData.businessBrands) {
          for (const brand of backupData.businessBrands) {
            try {
              await tx.businessBrands.upsert({
                where: { id: brand.id },
                update: {
                  businessId: brand.businessId,
                  name: brand.name,
                  description: brand.description,
                  logoUrl: brand.logoUrl,
                  website: brand.website,
                  isActive: brand.isActive,
                  businessType: brand.businessType,
                  attributes: brand.attributes
                },
                create: {
                  id: brand.id,
                  businessId: brand.businessId,
                  name: brand.name,
                  description: brand.description,
                  logoUrl: brand.logoUrl,
                  website: brand.website,
                  isActive: brand.isActive,
                  businessType: brand.businessType,
                  attributes: brand.attributes,
                  createdAt: new Date(brand.createdAt),
                  updatedAt: new Date(brand.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Brand ${brand.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business locations
        if (backupData.businessLocations) {
          for (const location of backupData.businessLocations) {
            try {
              await tx.businessLocations.upsert({
                where: { id: location.id },
                update: {
                  businessId: location.businessId,
                  name: location.name,
                  address: location.address,
                  city: location.city,
                  country: location.country,
                  isActive: location.isActive,
                  attributes: location.attributes
                },
                create: {
                  id: location.id,
                  businessId: location.businessId,
                  name: location.name,
                  address: location.address,
                  city: location.city,
                  country: location.country,
                  isActive: location.isActive,
                  attributes: location.attributes,
                  createdAt: new Date(location.createdAt),
                  updatedAt: new Date(location.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Location ${location.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business accounts
        if (backupData.businessAccounts) {
          for (const account of backupData.businessAccounts) {
            try {
              await tx.businessAccounts.upsert({
                where: { id: account.id },
                update: {
                  businessId: account.businessId,
                  balance: account.balance,
                  createdBy: account.createdBy
                },
                create: {
                  id: account.id,
                  businessId: account.businessId,
                  balance: account.balance,
                  createdBy: account.createdBy,
                  createdAt: new Date(account.createdAt),
                  updatedAt: new Date(account.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business products
        if (backupData.businessProducts) {
          for (const product of backupData.businessProducts) {
            try {
              await tx.businessProducts.upsert({
                where: { id: product.id },
                update: {
                  businessId: product.businessId,
                  name: product.name,
                  description: product.description,
                  sku: product.sku,
                  barcode: product.barcode,
                  categoryId: product.categoryId,
                  brandId: product.brandId,
                  supplierId: product.supplierId,
                  costPrice: product.costPrice,
                  sellingPrice: product.sellingPrice,
                  wholesalePrice: product.wholesalePrice,
                  stockQuantity: product.stockQuantity,
                  minStockLevel: product.minStockLevel,
                  maxStockLevel: product.maxStockLevel,
                  isActive: product.isActive,
                  attributes: product.attributes
                },
                create: {
                  id: product.id,
                  businessId: product.businessId,
                  name: product.name,
                  description: product.description,
                  sku: product.sku,
                  barcode: product.barcode,
                  categoryId: product.categoryId,
                  brandId: product.brandId,
                  supplierId: product.supplierId,
                  costPrice: product.costPrice,
                  sellingPrice: product.sellingPrice,
                  wholesalePrice: product.wholesalePrice,
                  stockQuantity: product.stockQuantity,
                  minStockLevel: product.minStockLevel,
                  maxStockLevel: product.maxStockLevel,
                  isActive: product.isActive,
                  attributes: product.attributes,
                  createdAt: new Date(product.createdAt),
                  updatedAt: new Date(product.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Product ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore product variants
        if (backupData.productVariants) {
          for (const variant of backupData.productVariants) {
            try {
              await tx.productVariants.upsert({
                where: { id: variant.id },
                update: {
                  productId: variant.productId,
                  name: variant.name,
                  sku: variant.sku,
                  barcode: variant.barcode,
                  costPrice: variant.costPrice,
                  sellingPrice: variant.sellingPrice,
                  stockQuantity: variant.stockQuantity,
                  attributes: variant.attributes,
                  isActive: variant.isActive
                },
                create: {
                  id: variant.id,
                  productId: variant.productId,
                  name: variant.name,
                  sku: variant.sku,
                  barcode: variant.barcode,
                  costPrice: variant.costPrice,
                  sellingPrice: variant.sellingPrice,
                  stockQuantity: variant.stockQuantity,
                  attributes: variant.attributes,
                  isActive: variant.isActive,
                  createdAt: new Date(variant.createdAt),
                  updatedAt: new Date(variant.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Product Variant ${variant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore product images
        if (backupData.productImages) {
          for (const image of backupData.productImages) {
            try {
              await tx.productImages.upsert({
                where: { id: image.id },
                update: {
                  productId: image.productId,
                  url: image.url,
                  altText: image.altText,
                  isPrimary: image.isPrimary,
                  displayOrder: image.displayOrder
                },
                create: {
                  id: image.id,
                  productId: image.productId,
                  url: image.url,
                  altText: image.altText,
                  isPrimary: image.isPrimary,
                  displayOrder: image.displayOrder,
                  createdAt: new Date(image.createdAt),
                  updatedAt: new Date(image.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Product Image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore product attributes
        if (backupData.productAttributes) {
          for (const attribute of backupData.productAttributes) {
            try {
              await tx.productAttributes.upsert({
                where: { id: attribute.id },
                update: {
                  productId: attribute.productId,
                  name: attribute.name,
                  value: attribute.value,
                  displayOrder: attribute.displayOrder
                },
                create: {
                  id: attribute.id,
                  productId: attribute.productId,
                  name: attribute.name,
                  value: attribute.value,
                  displayOrder: attribute.displayOrder,
                  createdAt: new Date(attribute.createdAt),
                  updatedAt: new Date(attribute.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Product Attribute ${attribute.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore product barcodes
        if (backupData.productBarcodes) {
          for (const barcode of backupData.productBarcodes) {
            try {
              await tx.productBarcodes.upsert({
                where: { id: barcode.id },
                update: {
                  variantId: barcode.variantId,
                  barcode: barcode.barcode,
                  format: barcode.format,
                  isActive: barcode.isActive
                },
                create: {
                  id: barcode.id,
                  variantId: barcode.variantId,
                  barcode: barcode.barcode,
                  format: barcode.format,
                  isActive: barcode.isActive,
                  createdAt: new Date(barcode.createdAt),
                  updatedAt: new Date(barcode.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Product Barcode ${barcode.barcode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business stock movements
        if (backupData.businessStockMovements) {
          for (const movement of backupData.businessStockMovements) {
            try {
              await tx.businessStockMovements.upsert({
                where: { id: movement.id },
                update: {
                  businessId: movement.businessId,
                  productId: movement.productId,
                  variantId: movement.variantId,
                  quantity: movement.quantity,
                  movementType: movement.movementType,
                  reason: movement.reason,
                  reference: movement.reference,
                  performedBy: movement.performedBy
                },
                create: {
                  id: movement.id,
                  businessId: movement.businessId,
                  productId: movement.productId,
                  variantId: movement.variantId,
                  quantity: movement.quantity,
                  movementType: movement.movementType,
                  reason: movement.reason,
                  reference: movement.reference,
                  performedBy: movement.performedBy,
                  createdAt: new Date(movement.createdAt),
                  updatedAt: new Date(movement.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Stock Movement ${movement.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore orders and order items
        if (backupData.businessOrders) {
          for (const order of backupData.businessOrders) {
            try {
              await tx.businessOrders.upsert({
                where: { id: order.id },
                update: {
                  businessId: order.businessId,
                  orderNumber: order.orderNumber,
                  customerId: order.customerId,
                  employeeId: order.employeeId,
                  orderType: order.orderType,
                  status: order.status,
                  subtotal: order.subtotal,
                  taxAmount: order.taxAmount,
                  discountAmount: order.discountAmount
                },
                create: {
                  id: order.id,
                  businessId: order.businessId,
                  orderNumber: order.orderNumber,
                  customerId: order.customerId,
                  employeeId: order.employeeId,
                  orderType: order.orderType,
                  status: order.status,
                  subtotal: order.subtotal,
                  taxAmount: order.taxAmount,
                  discountAmount: order.discountAmount,
                  createdAt: new Date(order.createdAt),
                  updatedAt: new Date(order.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Order ${order.orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.businessOrderItems) {
          for (const item of backupData.businessOrderItems) {
            try {
              await tx.businessOrderItems.upsert({
                where: { id: item.id },
                update: {
                  orderId: item.orderId,
                  productVariantId: item.productVariantId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discountAmount: item.discountAmount,
                  totalPrice: item.totalPrice,
                  attributes: item.attributes
                },
                create: {
                  id: item.id,
                  orderId: item.orderId,
                  productVariantId: item.productVariantId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discountAmount: item.discountAmount,
                  totalPrice: item.totalPrice,
                  attributes: item.attributes,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Order Item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business transactions
        if (backupData.businessTransactions) {
          for (const transaction of backupData.businessTransactions) {
            try {
              await tx.businessTransactions.upsert({
                where: { id: transaction.id },
                update: {
                  businessId: transaction.businessId,
                  type: transaction.type,
                  amount: transaction.amount,
                  description: transaction.description,
                  reference: transaction.reference,
                  performedBy: transaction.performedBy
                },
                create: {
                  id: transaction.id,
                  businessId: transaction.businessId,
                  type: transaction.type,
                  amount: transaction.amount,
                  description: transaction.description,
                  reference: transaction.reference,
                  performedBy: transaction.performedBy,
                  createdAt: new Date(transaction.createdAt),
                  updatedAt: new Date(transaction.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Business Transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore laybys and payments
        if (backupData.customerLaybys) {
          for (const layby of backupData.customerLaybys) {
            try {
              await tx.customerLayby.upsert({
                where: { id: layby.id },
                update: {
                  customerId: layby.customerId,
                  productId: layby.productId,
                  totalAmount: layby.totalAmount,
                  paidAmount: layby.paidAmount,
                  remainingAmount: layby.remainingAmount,
                  status: layby.status,
                  dueDate: layby.dueDate ? new Date(layby.dueDate) : null
                },
                create: {
                  id: layby.id,
                  customerId: layby.customerId,
                  productId: layby.productId,
                  totalAmount: layby.totalAmount,
                  paidAmount: layby.paidAmount,
                  remainingAmount: layby.remainingAmount,
                  status: layby.status,
                  dueDate: layby.dueDate ? new Date(layby.dueDate) : null,
                  createdAt: new Date(layby.createdAt),
                  updatedAt: new Date(layby.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Customer Layby ${layby.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.customerLaybyPayments) {
          for (const payment of backupData.customerLaybyPayments) {
            try {
              await tx.customerLaybyPayment.upsert({
                where: { id: payment.id },
                update: {
                  laybyId: payment.laybyId,
                  amount: payment.amount,
                  paymentDate: new Date(payment.paymentDate),
                  paymentMethod: payment.paymentMethod,
                  reference: payment.reference
                },
                create: {
                  id: payment.id,
                  laybyId: payment.laybyId,
                  amount: payment.amount,
                  paymentDate: new Date(payment.paymentDate),
                  paymentMethod: payment.paymentMethod,
                  reference: payment.reference,
                  createdAt: new Date(payment.createdAt),
                  updatedAt: new Date(payment.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Layby Payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Continue with expense accounts and other tables...
        // Restore expense accounts
        if (backupData.expenseAccounts) {
          for (const account of backupData.expenseAccounts) {
            try {
              await tx.expenseAccounts.upsert({
                where: { id: account.id },
                update: {
                  businessId: account.businessId,
                  name: account.name,
                  description: account.description,
                  accountType: account.accountType,
                  balance: account.balance,
                  isActive: account.isActive,
                  attributes: account.attributes
                },
                create: {
                  id: account.id,
                  businessId: account.businessId,
                  name: account.name,
                  description: account.description,
                  accountType: account.accountType,
                  balance: account.balance,
                  isActive: account.isActive,
                  attributes: account.attributes,
                  createdAt: new Date(account.createdAt),
                  updatedAt: new Date(account.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Expense Account ${account.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.expenseAccountDeposits) {
          for (const deposit of backupData.expenseAccountDeposits) {
            try {
              await tx.expenseAccountDeposits.upsert({
                where: { id: deposit.id },
                update: {
                  accountId: deposit.accountId,
                  amount: deposit.amount,
                  description: deposit.description,
                  depositDate: new Date(deposit.depositDate),
                  reference: deposit.reference,
                  performedBy: deposit.performedBy
                },
                create: {
                  id: deposit.id,
                  accountId: deposit.accountId,
                  amount: deposit.amount,
                  description: deposit.description,
                  depositDate: new Date(deposit.depositDate),
                  reference: deposit.reference,
                  performedBy: deposit.performedBy,
                  createdAt: new Date(deposit.createdAt),
                  updatedAt: new Date(deposit.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Expense Account Deposit ${deposit.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.expenseAccountPayments) {
          for (const payment of backupData.expenseAccountPayments) {
            try {
              await tx.expenseAccountPayments.upsert({
                where: { id: payment.id },
                update: {
                  accountId: payment.accountId,
                  amount: payment.amount,
                  description: payment.description,
                  paymentDate: new Date(payment.paymentDate),
                  categoryId: payment.categoryId,
                  reference: payment.reference,
                  performedBy: payment.performedBy
                },
                create: {
                  id: payment.id,
                  accountId: payment.accountId,
                  amount: payment.amount,
                  description: payment.description,
                  paymentDate: new Date(payment.paymentDate),
                  categoryId: payment.categoryId,
                  reference: payment.reference,
                  performedBy: payment.performedBy,
                  createdAt: new Date(payment.createdAt),
                  updatedAt: new Date(payment.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Expense Account Payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore payroll data
        if (backupData.payrollPeriods) {
          for (const period of backupData.payrollPeriods) {
            try {
              await tx.payrollPeriods.upsert({
                where: { id: period.id },
                update: {
                  businessId: period.businessId,
                  name: period.name,
                  startDate: new Date(period.startDate),
                  endDate: new Date(period.endDate),
                  status: period.status,
                  totalGrossPay: period.totalGrossPay,
                  totalDeductions: period.totalDeductions,
                  totalNetPay: period.totalNetPay
                },
                create: {
                  id: period.id,
                  businessId: period.businessId,
                  name: period.name,
                  startDate: new Date(period.startDate),
                  endDate: new Date(period.endDate),
                  status: period.status,
                  totalGrossPay: period.totalGrossPay,
                  totalDeductions: period.totalDeductions,
                  totalNetPay: period.totalNetPay,
                  createdAt: new Date(period.createdAt),
                  updatedAt: new Date(period.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Payroll Period ${period.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.payrollEntries) {
          for (const entry of backupData.payrollEntries) {
            try {
              await tx.payrollEntries.upsert({
                where: { id: entry.id },
                update: {
                  payrollPeriodId: entry.payrollPeriodId,
                  employeeId: entry.employeeId,
                  baseSalary: entry.baseSalary,
                  overtimeHours: entry.overtimeHours,
                  overtimeRate: entry.overtimeRate,
                  grossPay: entry.grossPay,
                  totalDeductions: entry.totalDeductions,
                  netPay: entry.netPay,
                  status: entry.status
                },
                create: {
                  id: entry.id,
                  payrollPeriodId: entry.payrollPeriodId,
                  employeeId: entry.employeeId,
                  baseSalary: entry.baseSalary,
                  overtimeHours: entry.overtimeHours,
                  overtimeRate: entry.overtimeRate,
                  grossPay: entry.grossPay,
                  totalDeductions: entry.totalDeductions,
                  netPay: entry.netPay,
                  status: entry.status,
                  createdAt: new Date(entry.createdAt),
                  updatedAt: new Date(entry.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Payroll Entry ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.payrollEntryBenefits) {
          for (const benefit of backupData.payrollEntryBenefits) {
            try {
              await tx.payrollEntryBenefits.upsert({
                where: { id: benefit.id },
                update: {
                  payrollEntryId: benefit.payrollEntryId,
                  benefitTypeId: benefit.benefitTypeId,
                  amount: benefit.amount,
                  isTaxable: benefit.isTaxable
                },
                create: {
                  id: benefit.id,
                  payrollEntryId: benefit.payrollEntryId,
                  benefitTypeId: benefit.benefitTypeId,
                  amount: benefit.amount,
                  isTaxable: benefit.isTaxable,
                  createdAt: new Date(benefit.createdAt),
                  updatedAt: new Date(benefit.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Payroll Entry Benefit ${benefit.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.payrollExports) {
          for (const export_ of backupData.payrollExports) {
            try {
              await tx.payrollExports.upsert({
                where: { id: export_.id },
                update: {
                  payrollPeriodId: export_.payrollPeriodId,
                  fileName: export_.fileName,
                  filePath: export_.filePath,
                  status: export_.status,
                  exportedBy: export_.exportedBy
                },
                create: {
                  id: export_.id,
                  payrollPeriodId: export_.payrollPeriodId,
                  fileName: export_.fileName,
                  filePath: export_.filePath,
                  status: export_.status,
                  exportedBy: export_.exportedBy,
                  createdAt: new Date(export_.createdAt),
                  updatedAt: new Date(export_.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Payroll Export ${export_.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.payrollAdjustments) {
          for (const adjustment of backupData.payrollAdjustments) {
            try {
              await tx.payrollAdjustments.upsert({
                where: { id: adjustment.id },
                update: {
                  payrollPeriodId: adjustment.payrollPeriodId,
                  employeeId: adjustment.employeeId,
                  adjustmentType: adjustment.adjustmentType,
                  amount: adjustment.amount,
                  reason: adjustment.reason,
                  appliedBy: adjustment.appliedBy
                },
                create: {
                  id: adjustment.id,
                  payrollPeriodId: adjustment.payrollPeriodId,
                  employeeId: adjustment.employeeId,
                  adjustmentType: adjustment.adjustmentType,
                  amount: adjustment.amount,
                  reason: adjustment.reason,
                  appliedBy: adjustment.appliedBy,
                  createdAt: new Date(adjustment.createdAt),
                  updatedAt: new Date(adjustment.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Payroll Adjustment ${adjustment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.payrollAccounts) {
          for (const account of backupData.payrollAccounts) {
            try {
              await tx.payrollAccounts.upsert({
                where: { id: account.id },
                update: {
                  businessId: account.businessId,
                  balance: account.balance,
                  lastReconciliationDate: account.lastReconciliationDate ? new Date(account.lastReconciliationDate) : null
                },
                create: {
                  id: account.id,
                  businessId: account.businessId,
                  balance: account.balance,
                  lastReconciliationDate: account.lastReconciliationDate ? new Date(account.lastReconciliationDate) : null,
                  createdAt: new Date(account.createdAt),
                  updatedAt: new Date(account.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Payroll Account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore personal finance data
        if (backupData.personalBudgets) {
          for (const budget of backupData.personalBudgets) {
            try {
              await tx.personalBudgets.upsert({
                where: { id: budget.id },
                update: {
                  userId: budget.userId,
                  category: budget.category,
                  amount: budget.amount,
                  period: budget.period,
                  isActive: budget.isActive
                },
                create: {
                  id: budget.id,
                  userId: budget.userId,
                  category: budget.category,
                  amount: budget.amount,
                  period: budget.period,
                  isActive: budget.isActive,
                  createdAt: new Date(budget.createdAt),
                  updatedAt: new Date(budget.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Personal Budget ${budget.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.personalExpenses) {
          for (const expense of backupData.personalExpenses) {
            try {
              await tx.personalExpenses.upsert({
                where: { id: expense.id },
                update: {
                  userId: expense.userId,
                  amount: expense.amount,
                  description: expense.description,
                  category: expense.category,
                  expenseDate: new Date(expense.expenseDate),
                  fundSourceId: expense.fundSourceId
                },
                create: {
                  id: expense.id,
                  userId: expense.userId,
                  amount: expense.amount,
                  description: expense.description,
                  category: expense.category,
                  expenseDate: new Date(expense.expenseDate),
                  fundSourceId: expense.fundSourceId,
                  createdAt: new Date(expense.createdAt),
                  updatedAt: new Date(expense.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Personal Expense ${expense.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.fundSources) {
          for (const source of backupData.fundSources) {
            try {
              await tx.fundSources.upsert({
                where: { id: source.id },
                update: {
                  userId: source.userId,
                  name: source.name,
                  type: source.type,
                  balance: source.balance,
                  isActive: source.isActive
                },
                create: {
                  id: source.id,
                  userId: source.userId,
                  name: source.name,
                  type: source.type,
                  balance: source.balance,
                  isActive: source.isActive,
                  createdAt: new Date(source.createdAt),
                  updatedAt: new Date(source.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Fund Source ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore projects and construction data
        if (backupData.projects) {
          for (const project of backupData.projects) {
            try {
              await tx.projects.upsert({
                where: { id: project.id },
                update: {
                  businessId: project.businessId,
                  name: project.name,
                  description: project.description,
                  projectTypeId: project.projectTypeId,
                  status: project.status,
                  startDate: project.startDate ? new Date(project.startDate) : null,
                  endDate: project.endDate ? new Date(project.endDate) : null,
                  budget: project.budget,
                  actualCost: project.actualCost
                },
                create: {
                  id: project.id,
                  businessId: project.businessId,
                  name: project.name,
                  description: project.description,
                  projectTypeId: project.projectTypeId,
                  status: project.status,
                  startDate: project.startDate ? new Date(project.startDate) : null,
                  endDate: project.endDate ? new Date(project.endDate) : null,
                  budget: project.budget,
                  actualCost: project.actualCost,
                  createdAt: new Date(project.createdAt),
                  updatedAt: new Date(project.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Project ${project.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore vehicles
        if (backupData.vehicles) {
          for (const vehicle of backupData.vehicles) {
            try {
              await tx.vehicles.upsert({
                where: { id: vehicle.id },
                update: {
                  businessId: vehicle.businessId,
                  make: vehicle.make,
                  model: vehicle.model,
                  year: vehicle.year,
                  licensePlate: vehicle.licensePlate,
                  vin: vehicle.vin,
                  status: vehicle.status,
                  mileage: vehicle.mileage
                },
                create: {
                  id: vehicle.id,
                  businessId: vehicle.businessId,
                  make: vehicle.make,
                  model: vehicle.model,
                  year: vehicle.year,
                  licensePlate: vehicle.licensePlate,
                  vin: vehicle.vin,
                  status: vehicle.status,
                  mileage: vehicle.mileage,
                  createdAt: new Date(vehicle.createdAt),
                  updatedAt: new Date(vehicle.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Vehicle ${vehicle.licensePlate}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore menu data
        if (backupData.menuItems) {
          for (const item of backupData.menuItems) {
            try {
              await tx.menuItems.upsert({
                where: { id: item.id },
                update: {
                  businessId: item.businessId,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  category: item.category,
                  isAvailable: item.isAvailable,
                  attributes: item.attributes
                },
                create: {
                  id: item.id,
                  businessId: item.businessId,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  category: item.category,
                  isAvailable: item.isAvailable,
                  attributes: item.attributes,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Menu Item ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore universal orders
        if (backupData.orders) {
          for (const order of backupData.orders) {
            try {
              await tx.orders.upsert({
                where: { id: order.id },
                update: {
                  businessId: order.businessId,
                  orderNumber: order.orderNumber,
                  customerId: order.customerId,
                  totalAmount: order.totalAmount,
                  status: order.status,
                  orderType: order.orderType
                },
                create: {
                  id: order.id,
                  businessId: order.businessId,
                  orderNumber: order.orderNumber,
                  customerId: order.customerId,
                  totalAmount: order.totalAmount,
                  status: order.status,
                  orderType: order.orderType,
                  createdAt: new Date(order.createdAt),
                  updatedAt: new Date(order.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Order ${order.orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.orderItems) {
          for (const item of backupData.orderItems) {
            try {
              await tx.orderItems.upsert({
                where: { id: item.id },
                update: {
                  orderId: item.orderId,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice
                },
                create: {
                  id: item.id,
                  orderId: item.orderId,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Order Item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore supplier products
        if (backupData.supplierProducts) {
          for (const product of backupData.supplierProducts) {
            try {
              await tx.supplierProducts.upsert({
                where: { id: product.id },
                update: {
                  supplierId: product.supplierId,
                  productName: product.productName,
                  sku: product.sku,
                  costPrice: product.costPrice,
                  isActive: product.isActive
                },
                create: {
                  id: product.id,
                  supplierId: product.supplierId,
                  productName: product.productName,
                  sku: product.sku,
                  costPrice: product.costPrice,
                  isActive: product.isActive,
                  createdAt: new Date(product.createdAt),
                  updatedAt: new Date(product.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Supplier Product ${product.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore persons
        if (backupData.persons) {
          for (const person of backupData.persons) {
            try {
              await tx.persons.upsert({
                where: { id: person.id },
                update: {
                  businessId: person.businessId,
                  firstName: person.firstName,
                  lastName: person.lastName,
                  fullName: person.fullName,
                  email: person.email,
                  phone: person.phone,
                  personType: person.personType,
                  isActive: person.isActive
                },
                create: {
                  id: person.id,
                  businessId: person.businessId,
                  firstName: person.firstName,
                  lastName: person.lastName,
                  fullName: person.fullName,
                  email: person.email,
                  phone: person.phone,
                  personType: person.personType,
                  isActive: person.isActive,
                  createdAt: new Date(person.createdAt),
                  updatedAt: new Date(person.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Person ${person.fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore data snapshots
        if (backupData.dataSnapshots) {
          for (const snapshot of backupData.dataSnapshots) {
            try {
              await tx.dataSnapshots.upsert({
                where: { id: snapshot.id },
                update: {
                  businessId: snapshot.businessId,
                  snapshotType: snapshot.snapshotType,
                  data: snapshot.data,
                  takenBy: snapshot.takenBy
                },
                create: {
                  id: snapshot.id,
                  businessId: snapshot.businessId,
                  snapshotType: snapshot.snapshotType,
                  data: snapshot.data,
                  takenBy: snapshot.takenBy,
                  createdAt: new Date(snapshot.createdAt),
                  updatedAt: new Date(snapshot.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Data Snapshot ${snapshot.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore sync system data
        if (backupData.syncConfigurations) {
          for (const config of backupData.syncConfigurations) {
            try {
              await tx.syncConfigurations.upsert({
                where: { id: config.id },
                update: {
                  businessId: config.businessId,
                  configType: config.configType,
                  configData: config.configData,
                  isActive: config.isActive
                },
                create: {
                  id: config.id,
                  businessId: config.businessId,
                  configType: config.configType,
                  configData: config.configData,
                  isActive: config.isActive,
                  createdAt: new Date(config.createdAt),
                  updatedAt: new Date(config.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Sync Configuration ${config.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.syncNodes) {
          for (const node of backupData.syncNodes) {
            try {
              await tx.syncNodes.upsert({
                where: { id: node.id },
                update: {
                  nodeId: node.nodeId,
                  nodeType: node.nodeType,
                  status: node.status,
                  lastSeen: node.lastSeen ? new Date(node.lastSeen) : null,
                  config: node.config
                },
                create: {
                  id: node.id,
                  nodeId: node.nodeId,
                  nodeType: node.nodeType,
                  status: node.status,
                  lastSeen: node.lastSeen ? new Date(node.lastSeen) : null,
                  config: node.config,
                  createdAt: new Date(node.createdAt),
                  updatedAt: new Date(node.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Sync Node ${node.nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.syncSessions) {
          for (const session of backupData.syncSessions) {
            try {
              await tx.syncSessions.upsert({
                where: { id: session.id },
                update: {
                  businessId: session.businessId,
                  sessionType: session.sessionType,
                  status: session.status,
                  startedAt: new Date(session.startedAt),
                  completedAt: session.completedAt ? new Date(session.completedAt) : null,
                  totalRecords: session.totalRecords,
                  processedRecords: session.processedRecords,
                  errors: session.errors
                },
                create: {
                  id: session.id,
                  businessId: session.businessId,
                  sessionType: session.sessionType,
                  status: session.status,
                  startedAt: new Date(session.startedAt),
                  completedAt: session.completedAt ? new Date(session.completedAt) : null,
                  totalRecords: session.totalRecords,
                  processedRecords: session.processedRecords,
                  errors: session.errors,
                  createdAt: new Date(session.createdAt),
                  updatedAt: new Date(session.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Sync Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.syncEvents) {
          for (const event of backupData.syncEvents) {
            try {
              await tx.syncEvents.upsert({
                where: { id: event.id },
                update: {
                  businessId: event.businessId,
                  eventType: event.eventType,
                  entityType: event.entityType,
                  entityId: event.entityId,
                  eventData: event.eventData,
                  processed: event.processed,
                  processedAt: event.processedAt ? new Date(event.processedAt) : null
                },
                create: {
                  id: event.id,
                  businessId: event.businessId,
                  eventType: event.eventType,
                  entityType: event.entityType,
                  entityId: event.entityId,
                  eventData: event.eventData,
                  processed: event.processed,
                  processedAt: event.processedAt ? new Date(event.processedAt) : null,
                  createdAt: new Date(event.createdAt),
                  updatedAt: new Date(event.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Sync Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.syncMetrics) {
          for (const metric of backupData.syncMetrics) {
            try {
              await tx.syncMetrics.upsert({
                where: { id: metric.id },
                update: {
                  businessId: metric.businessId,
                  metricType: metric.metricType,
                  metricValue: metric.metricValue,
                  recordedAt: new Date(metric.recordedAt),
                  metadata: metric.metadata
                },
                create: {
                  id: metric.id,
                  businessId: metric.businessId,
                  metricType: metric.metricType,
                  metricValue: metric.metricValue,
                  recordedAt: new Date(metric.recordedAt),
                  metadata: metric.metadata,
                  createdAt: new Date(metric.createdAt),
                  updatedAt: new Date(metric.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Sync Metric ${metric.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.fullSyncSessions) {
          for (const session of backupData.fullSyncSessions) {
            try {
              await tx.fullSyncSessions.upsert({
                where: { id: session.id },
                update: {
                  businessId: session.businessId,
                  status: session.status,
                  startedAt: new Date(session.startedAt),
                  completedAt: session.completedAt ? new Date(session.completedAt) : null,
                  totalTables: session.totalTables,
                  completedTables: session.completedTables,
                  errors: session.errors
                },
                create: {
                  id: session.id,
                  businessId: session.businessId,
                  status: session.status,
                  startedAt: new Date(session.startedAt),
                  completedAt: session.completedAt ? new Date(session.completedAt) : null,
                  totalTables: session.totalTables,
                  completedTables: session.completedTables,
                  errors: session.errors,
                  createdAt: new Date(session.createdAt),
                  updatedAt: new Date(session.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Full Sync Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.networkPartitions) {
          for (const partition of backupData.networkPartitions) {
            try {
              await tx.networkPartitions.upsert({
                where: { id: partition.id },
                update: {
                  partitionId: partition.partitionId,
                  affectedNodes: partition.affectedNodes,
                  status: partition.status,
                  detectedAt: new Date(partition.detectedAt),
                  resolvedAt: partition.resolvedAt ? new Date(partition.resolvedAt) : null
                },
                create: {
                  id: partition.id,
                  partitionId: partition.partitionId,
                  affectedNodes: partition.affectedNodes,
                  status: partition.status,
                  detectedAt: new Date(partition.detectedAt),
                  resolvedAt: partition.resolvedAt ? new Date(partition.resolvedAt) : null,
                  createdAt: new Date(partition.createdAt),
                  updatedAt: new Date(partition.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Network Partition ${partition.partitionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.nodeStates) {
          for (const state of backupData.nodeStates) {
            try {
              await tx.nodeStates.upsert({
                where: { id: state.id },
                update: {
                  nodeId: state.nodeId,
                  stateType: state.stateType,
                  stateData: state.stateData,
                  lastUpdated: new Date(state.lastUpdated)
                },
                create: {
                  id: state.id,
                  nodeId: state.nodeId,
                  stateType: state.stateType,
                  stateData: state.stateData,
                  lastUpdated: new Date(state.lastUpdated),
                  createdAt: new Date(state.createdAt),
                  updatedAt: new Date(state.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Node State ${state.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.offlineQueue) {
          for (const item of backupData.offlineQueue) {
            try {
              await tx.offlineQueue.upsert({
                where: { id: item.id },
                update: {
                  businessId: item.businessId,
                  operationType: item.operationType,
                  entityType: item.entityType,
                  entityId: item.entityId,
                  operationData: item.operationData,
                  status: item.status,
                  retryCount: item.retryCount,
                  lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : null,
                  errorMessage: item.errorMessage
                },
                create: {
                  id: item.id,
                  businessId: item.businessId,
                  operationType: item.operationType,
                  entityType: item.entityType,
                  entityId: item.entityId,
                  operationData: item.operationData,
                  status: item.status,
                  retryCount: item.retryCount,
                  lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : null,
                  errorMessage: item.errorMessage,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Offline Queue Item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.conflictResolutions) {
          for (const resolution of backupData.conflictResolutions) {
            try {
              await tx.conflictResolutions.upsert({
                where: { id: resolution.id },
                update: {
                  businessId: resolution.businessId,
                  conflictType: resolution.conflictType,
                  entityType: resolution.entityType,
                  entityId: resolution.entityId,
                  localVersion: resolution.localVersion,
                  remoteVersion: resolution.remoteVersion,
                  resolution: resolution.resolution,
                  resolvedBy: resolution.resolvedBy,
                  resolvedAt: new Date(resolution.resolvedAt)
                },
                create: {
                  id: resolution.id,
                  businessId: resolution.businessId,
                  conflictType: resolution.conflictType,
                  entityType: resolution.entityType,
                  entityId: resolution.entityId,
                  localVersion: resolution.localVersion,
                  remoteVersion: resolution.remoteVersion,
                  resolution: resolution.resolution,
                  resolvedBy: resolution.resolvedBy,
                  resolvedAt: new Date(resolution.resolvedAt),
                  createdAt: new Date(resolution.createdAt),
                  updatedAt: new Date(resolution.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Conflict Resolution ${resolution.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore print system data
        if (backupData.networkPrinters) {
          for (const printer of backupData.networkPrinters) {
            try {
              await tx.networkPrinters.upsert({
                where: { id: printer.id },
                update: {
                  businessId: printer.businessId,
                  name: printer.name,
                  ipAddress: printer.ipAddress,
                  port: printer.port,
                  model: printer.model,
                  status: printer.status,
                  isActive: printer.isActive,
                  config: printer.config
                },
                create: {
                  id: printer.id,
                  businessId: printer.businessId,
                  name: printer.name,
                  ipAddress: printer.ipAddress,
                  port: printer.port,
                  model: printer.model,
                  status: printer.status,
                  isActive: printer.isActive,
                  config: printer.config,
                  createdAt: new Date(printer.createdAt),
                  updatedAt: new Date(printer.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Network Printer ${printer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.printJobs) {
          for (const job of backupData.printJobs) {
            try {
              await tx.printJobs.upsert({
                where: { id: job.id },
                update: {
                  businessId: job.businessId,
                  printerId: job.printerId,
                  jobType: job.jobType,
                  status: job.status,
                  data: job.data,
                  priority: job.priority,
                  submittedBy: job.submittedBy,
                  submittedAt: new Date(job.submittedAt),
                  completedAt: job.completedAt ? new Date(job.completedAt) : null,
                  errorMessage: job.errorMessage
                },
                create: {
                  id: job.id,
                  businessId: job.businessId,
                  printerId: job.printerId,
                  jobType: job.jobType,
                  status: job.status,
                  data: job.data,
                  priority: job.priority,
                  submittedBy: job.submittedBy,
                  submittedAt: new Date(job.submittedAt),
                  completedAt: job.completedAt ? new Date(job.completedAt) : null,
                  errorMessage: job.errorMessage,
                  createdAt: new Date(job.createdAt),
                  updatedAt: new Date(job.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Print Job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore inter-business loans
        if (backupData.interBusinessLoans) {
          for (const loan of backupData.interBusinessLoans) {
            try {
              await tx.interBusinessLoans.upsert({
                where: { id: loan.id },
                update: {
                  fromBusinessId: loan.fromBusinessId,
                  toBusinessId: loan.toBusinessId,
                  amount: loan.amount,
                  interestRate: loan.interestRate,
                  termMonths: loan.termMonths,
                  status: loan.status,
                  loanDate: new Date(loan.loanDate),
                  dueDate: loan.dueDate ? new Date(loan.dueDate) : null
                },
                create: {
                  id: loan.id,
                  fromBusinessId: loan.fromBusinessId,
                  toBusinessId: loan.toBusinessId,
                  amount: loan.amount,
                  interestRate: loan.interestRate,
                  termMonths: loan.termMonths,
                  status: loan.status,
                  loanDate: new Date(loan.loanDate),
                  dueDate: loan.dueDate ? new Date(loan.dueDate) : null,
                  createdAt: new Date(loan.createdAt),
                  updatedAt: new Date(loan.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Inter-Business Loan ${loan.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.loanTransactions) {
          for (const transaction of backupData.loanTransactions) {
            try {
              await tx.loanTransactions.upsert({
                where: { id: transaction.id },
                update: {
                  loanId: transaction.loanId,
                  amount: transaction.amount,
                  transactionType: transaction.transactionType,
                  transactionDate: new Date(transaction.transactionDate),
                  description: transaction.description,
                  performedBy: transaction.performedBy
                },
                create: {
                  id: transaction.id,
                  loanId: transaction.loanId,
                  amount: transaction.amount,
                  transactionType: transaction.transactionType,
                  transactionDate: new Date(transaction.transactionDate),
                  description: transaction.description,
                  performedBy: transaction.performedBy,
                  createdAt: new Date(transaction.createdAt),
                  updatedAt: new Date(transaction.updatedAt)
                }
              });
            } catch (error) {
              results.errors.push(`Loan Transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore audit logs if included
        if (backupData.auditLogs) {
          for (const auditLog of backupData.auditLogs) {
            try {
              await tx.auditLogs.create({
                data: {
                  id: auditLog.id,
                  userId: auditLog.userId,
                  action: auditLog.action,
                  entityType: auditLog.entityType,
                  entityId: auditLog.entityId,
                  timestamp: new Date(auditLog.timestamp),
                  oldValues: auditLog.oldValues,
                  newValues: auditLog.newValues,
                  metadata: auditLog.metadata,
                  tableName: auditLog.tableName,
                  recordId: auditLog.recordId,
                  changes: auditLog.changes,
                  details: auditLog.details
                }
              });
              results.restored.auditLogs++;
            } catch (error) {
              results.errors.push(`Audit Log ${auditLog.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

      } catch (error) {
        throw error;
      }
    });

    return NextResponse.json({
      message: 'Restore completed successfully',
      results
    });

  } catch (error) {
    console.error('Restore failed:', error);
    return NextResponse.json({
      error: 'Restore failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}