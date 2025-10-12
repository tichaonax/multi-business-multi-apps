#!/bin/bash
# Comprehensive Prisma Model Name Fix Script
# Converts ALL singular model references to correct plural camelCase

echo "==================================================================="
echo "PRISMA MODEL NAME FIX - Converting singular to plural camelCase"
echo "==================================================================="

# Common models
echo "Fixing common models (users, businesses, employees, projects, persons)..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.user\./prisma.users./g' \
  -e 's/prisma\.business\./prisma.businesses./g' \
  -e 's/prisma\.employee\./prisma.employees./g' \
  -e 's/prisma\.project\./prisma.projects./g' \
  -e 's/prisma\.person\./prisma.persons./g' \
  -e 's/prisma\.order\./prisma.orders./g' \
  -e 's/prisma\.vehicle\./prisma.vehicles./g' \
  {} +

# Business-related models
echo "Fixing business-related models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.businessMembership\./prisma.businessMemberships./g' \
  -e 's/prisma\.businessOrder\./prisma.businessOrders./g' \
  -e 's/prisma\.businessProduct\./prisma.businessProducts./g' \
  -e 's/prisma\.businessCustomer\./prisma.businessCustomers./g' \
  -e 's/prisma\.businessAccount\./prisma.businessAccounts./g' \
  -e 's/prisma\.businessBrand\./prisma.businessBrands./g' \
  -e 's/prisma\.businessCategory\./prisma.businessCategories./g' \
  -e 's/prisma\.businessSupplier\./prisma.businessSuppliers./g' \
  -e 's/prisma\.businessTransaction\./prisma.businessTransactions./g' \
  -e 's/prisma\.businessStockMovement\./prisma.businessStockMovements./g' \
  {} +

# Employee models
echo "Fixing employee models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.employeeContract\./prisma.employeeContracts./g' \
  -e 's/prisma\.employeeLeaveRequest\./prisma.employeeLeaveRequests./g' \
  -e 's/prisma\.employeeSalaryIncrease\./prisma.employeeSalaryIncreases./g' \
  -e 's/prisma\.employeeBusinessAssignment\./prisma.employeeBusinessAssignments./g' \
  -e 's/prisma\.employeeLoan\./prisma.employeeLoans./g' \
  -e 's/prisma\.employeeDeduction\./prisma.employeeDeductions./g' \
  -e 's/prisma\.employeeBenefit\./prisma.employeeBenefits./g' \
  -e 's/prisma\.employeeBonus\./prisma.employeeBonuses./g' \
  -e 's/prisma\.employeeAllowance\./prisma.employeeAllowances./g' \
  {} +

# Project/Construction models
echo "Fixing project/construction models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.projectTransaction\./prisma.projectTransactions./g' \
  -e 's/prisma\.projectContractor\./prisma.projectContractors./g' \
  -e 's/prisma\.projectStage\./prisma.projectStages./g' \
  -e 's/prisma\.projectType\./prisma.projectTypes./g' \
  -e 's/prisma\.constructionProject\./prisma.constructionProjects./g' \
  -e 's/prisma\.constructionExpense\./prisma.constructionExpenses./g' \
  -e 's/prisma\.stageContractorAssignment\./prisma.stageContractorAssignments./g' \
  {} +

# Payroll models
echo "Fixing payroll models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.payrollPeriod\./prisma.payrollPeriods./g' \
  -e 's/prisma\.payrollEntry\./prisma.payrollEntries./g' \
  -e 's/prisma\.payrollExport\./prisma.payrollExports./g' \
  -e 's/prisma\.payrollAdjustment\./prisma.payrollAdjustments./g' \
  -e 's/prisma\.payrollEntryBenefit\./prisma.payrollEntryBenefits./g' \
  {} +

# Vehicle models
echo "Fixing vehicle models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.vehicleTrip\./prisma.vehicleTrips./g' \
  -e 's/prisma\.vehicleExpense\./prisma.vehicleExpenses./g' \
  -e 's/prisma\.vehicleDriver\./prisma.vehicleDrivers./g' \
  -e 's/prisma\.vehicleLicense\./prisma.vehicleLicenses./g' \
  -e 's/prisma\.vehicleMaintenanceRecord\./prisma.vehicleMaintenanceRecords./g' \
  -e 's/prisma\.vehicleMaintenanceService\./prisma.vehicleMaintenanceServices./g' \
  -e 's/prisma\.vehicleReimbursement\./prisma.vehicleReimbursements./g' \
  -e 's/prisma\.driverAuthorization\./prisma.driverAuthorizations./g' \
  {} +

# Reference data models
echo "Fixing reference data models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.jobTitle\./prisma.jobTitles./g' \
  -e 's/prisma\.compensationType\./prisma.compensationTypes./g' \
  -e 's/prisma\.benefitType\./prisma.benefitTypes./g' \
  -e 's/prisma\.idFormatTemplate\./prisma.idFormatTemplates./g' \
  -e 's/prisma\.driverLicenseTemplate\./prisma.driverLicenseTemplates./g' \
  -e 's/prisma\.permissionTemplate\./prisma.permissionTemplates./g' \
  -e 's/prisma\.fundSource\./prisma.fundSources./g' \
  -e 's/prisma\.expenseCategory\./prisma.expenseCategories./g' \
  {} +

# Personal finance models
echo "Fixing personal finance models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.personalExpense\./prisma.personalExpenses./g' \
  -e 's/prisma\.personalBudget\./prisma.personalBudgets./g' \
  -e 's/prisma\.interBusinessLoan\./prisma.interBusinessLoans./g' \
  -e 's/prisma\.loanTransaction\./prisma.loanTransactions./g' \
  {} +

# Restaurant models
echo "Fixing restaurant models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.menuItem\./prisma.menuItems./g' \
  -e 's/prisma\.menuCombo\./prisma.menuCombos./g' \
  -e 's/prisma\.menuComboItem\./prisma.menuComboItems./g' \
  -e 's/prisma\.menuPromotion\./prisma.menuPromotions./g' \
  {} +

# Other models
echo "Fixing other models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.orderItem\./prisma.orderItems./g' \
  -e 's/prisma\.productVariant\./prisma.productVariants./g' \
  -e 's/prisma\.productImage\./prisma.productImages./g' \
  -e 's/prisma\.productAttribute\./prisma.productAttributes./g' \
  -e 's/prisma\.supplierProduct\./prisma.supplierProducts./g' \
  -e 's/prisma\.contractBenefit\./prisma.contractBenefits./g' \
  -e 's/prisma\.contractRenewal\./prisma.contractRenewals./g' \
  -e 's/prisma\.disciplinaryAction\./prisma.disciplinaryActions./g' \
  {} +

# System/Auth models
echo "Fixing system/auth models..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i \
  -e 's/prisma\.account\./prisma.accounts./g' \
  -e 's/prisma\.session\./prisma.sessions./g' \
  -e 's/prisma\.auditLog\./prisma.auditLogs./g' \
  -e 's/prisma\.chatRoom\./prisma.chatRooms./g' \
  -e 's/prisma\.chatMessage\./prisma.chatMessages./g' \
  -e 's/prisma\.chatParticipant\./prisma.chatParticipants./g' \
  {} +

# Fix scripts directory
echo "Fixing scripts directory..."
find scripts -type f -name "*.js" -exec sed -i \
  -e 's/prisma\.user\./prisma.users./g' \
  -e 's/prisma\.business\./prisma.businesses./g' \
  -e 's/prisma\.employee\./prisma.employees./g' \
  -e 's/prisma\.employeeContract\./prisma.employeeContracts./g' \
  {} +

echo "==================================================================="
echo "COMPLETE! All Prisma model references updated to plural camelCase"
echo "==================================================================="
