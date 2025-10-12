# Prisma Model Name Reference

## Critical: Schema Model Names → Prisma Client Names

Based on `prisma/schema.prisma`, here are the correct mappings:

### Common Models (Frequently Used)
| Schema Model (PascalCase) | Prisma Client (camelCase) | ❌ WRONG (Singular) |
|---------------------------|---------------------------|---------------------|
| Users                     | users                     | user                |
| Businesses                | businesses                | business            |
| Employees                 | employees                 | employee            |
| Projects                  | projects                  | project             |
| Persons                   | persons                   | person              |
| Orders                    | orders                    | order               |
| Vehicles                  | vehicles                  | vehicle             |
| BusinessMemberships       | businessMemberships       | businessMembership  |
| BusinessOrders            | businessOrders            | businessOrder       |
| BusinessProducts          | businessProducts          | businessProduct     |
| BusinessCustomers         | businessCustomers         | businessCustomer    |

### Employee-Related Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| EmployeeContracts         | employeeContracts         | employeeContract    |
| EmployeeTimeTracking      | employeeTimeTracking      | (N/A - singular)    |
| EmployeeLeaveRequests     | employeeLeaveRequests     | employeeLeaveRequest|
| EmployeeLeaveBalance      | employeeLeaveBalance      | (N/A - singular)    |
| EmployeeSalaryIncreases   | employeeSalaryIncreases   | employeeSalaryIncrease|
| EmployeeAttendance        | employeeAttendance        | (N/A - singular)    |
| EmployeeBusinessAssignments| employeeBusinessAssignments| employeeBusinessAssignment|
| EmployeeLoans             | employeeLoans             | employeeLoan        |
| EmployeeDeductions        | employeeDeductions        | employeeDeduction   |
| EmployeeBenefits          | employeeBenefits          | employeeBenefit     |
| EmployeeBonuses           | employeeBonuses           | employeeBonus       |
| EmployeeAllowances        | employeeAllowances        | employeeAllowance   |

### Project/Construction Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| ProjectTransactions       | projectTransactions       | projectTransaction  |
| ProjectContractors        | projectContractors        | projectContractor   |
| ProjectStages             | projectStages             | projectStage        |
| ProjectTypes              | projectTypes              | projectType         |
| ConstructionProjects      | constructionProjects      | constructionProject |
| ConstructionExpenses      | constructionExpenses      | constructionExpense |
| StageContractorAssignments| stageContractorAssignments| stageContractorAssignment|

### Payroll Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| PayrollPeriods            | payrollPeriods            | payrollPeriod       |
| PayrollEntries            | payrollEntries            | payrollEntry        |
| PayrollExports            | payrollExports            | payrollExport       |
| PayrollAdjustments        | payrollAdjustments        | payrollAdjustment   |
| PayrollEntryBenefits      | payrollEntryBenefits      | payrollEntryBenefit |

### Vehicle Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| VehicleTrips              | vehicleTrips              | vehicleTrip         |
| VehicleExpenses           | vehicleExpenses           | vehicleExpense      |
| VehicleDrivers            | vehicleDrivers            | vehicleDriver       |
| VehicleLicenses           | vehicleLicenses           | vehicleLicense      |
| VehicleMaintenanceRecords | vehicleMaintenanceRecords | vehicleMaintenanceRecord|
| VehicleMaintenanceServices| vehicleMaintenanceServices| vehicleMaintenanceService|
| VehicleReimbursements     | vehicleReimbursements     | vehicleReimbursement|
| DriverAuthorizations      | driverAuthorizations      | driverAuthorization |

### Sync System Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| SyncConfiguration         | syncConfigurations        | syncConfiguration   |
| SyncEvent                 | syncEvents                | syncEvent           |
| SyncNode                  | syncNodes                 | syncNode            |
| SyncSession               | syncSessions              | syncSession         |
| SyncMetric                | syncMetrics               | syncMetric          |
| NetworkPartition          | networkPartitions         | networkPartition    |
| ConflictResolution        | conflictResolutions       | conflictResolution  |
| OfflineQueue              | offlineQueues             | offlineQueue        |

### Reference Data Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| JobTitles                 | jobTitles                 | jobTitle            |
| CompensationTypes         | compensationTypes         | compensationType    |
| BenefitTypes              | benefitTypes              | benefitType         |
| IdFormatTemplates         | idFormatTemplates         | idFormatTemplate    |
| DriverLicenseTemplates    | driverLicenseTemplates    | driverLicenseTemplate|
| PermissionTemplates       | permissionTemplates       | permissionTemplate  |
| FundSources               | fundSources               | fundSource          |
| ExpenseCategories         | expenseCategories         | expenseCategory     |

### Personal Finance Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| PersonalExpenses          | personalExpenses          | personalExpense     |
| PersonalBudgets           | personalBudgets           | personalBudget      |
| InterBusinessLoans        | interBusinessLoans        | interBusinessLoan   |
| LoanTransactions          | loanTransactions          | loanTransaction     |

### Restaurant Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| MenuItems                 | menuItems                 | menuItem            |
| MenuCombos                | menuCombos                | menuCombo           |
| MenuComboItems            | menuComboItems            | menuComboItem       |
| MenuPromotions            | menuPromotions            | menuPromotion       |

### Other Business Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| BusinessAccounts          | businessAccounts          | businessAccount     |
| BusinessBrands            | businessBrands            | businessBrand       |
| BusinessCategories        | businessCategories        | businessCategory    |
| BusinessSuppliers         | businessSuppliers         | businessSupplier    |
| BusinessTransactions      | businessTransactions      | businessTransaction |
| BusinessStockMovements    | businessStockMovements    | businessStockMovement|
| OrderItems                | orderItems                | orderItem           |
| ProductVariants           | productVariants           | productVariant      |
| ProductImages             | productImages             | productImage        |
| ProductAttributes         | productAttributes         | productAttribute    |
| SupplierProducts          | supplierProducts          | supplierProduct     |
| ContractBenefits          | contractBenefits          | contractBenefit     |
| ContractRenewals          | contractRenewals          | contractRenewal     |
| DisciplinaryActions       | disciplinaryActions       | disciplinaryAction  |

### System/Auth Models
| Schema Model              | Prisma Client             | ❌ WRONG            |
|---------------------------|---------------------------|---------------------|
| Accounts                  | accounts                  | account             |
| Sessions                  | sessions                  | session             |
| AuditLogs                 | auditLogs                 | auditLog            |
| ChatRooms                 | chatRooms                 | chatRoom            |
| ChatMessages              | chatMessages              | chatMessage         |
| ChatParticipants          | chatParticipants          | chatParticipant     |

## Critical Rules

1. **Schema models are PascalCase** (Users, Businesses, Employees)
2. **Prisma client properties are camelCase** (users, businesses, employees)
3. **Model names match client property names EXCEPT for case**
4. **NEVER use singular forms** (user, business, employee) - these don't exist in Prisma client

## Verification Command

```bash
node check-prisma-models.js
```

This will show all available Prisma client models (should be 95 models total).
