# Initial Load - Complete Data Transfer Plan

## Current Problem
Only transferring 5 businesses + product images = ~5 records
Missing: Products, Categories, Inventory, Suppliers, Customers, Orders, Transactions, etc.

## Tables to Transfer (in order of dependencies)

### 1. Core Business Data
- ✅ Businesses (already done)

### 2. Categories & Brands
- BusinessCategories
- BusinessBrands

### 3. Suppliers & Customers
- BusinessSuppliers
- BusinessCustomers

### 4. Products & Inventory
- BusinessProducts
- ProductImages (already done)
- BusinessStockMovements (inventory)

### 5. Orders & Sales
- BusinessOrders
- BusinessOrderItems
- CustomerLayby
- CustomerLaybyPayment

### 6. Financial
- BusinessTransactions
- BusinessAccounts

### 7. Locations
- BusinessLocations

## Filtering Rules
- Exclude any data where businessId contains "demo"
- Exclude demo businesses (ID patterns: *-demo-business, demo-*, *-demo)

## Transfer Order (respecting foreign keys)
1. Businesses
2. BusinessCategories
3. BusinessBrands
4. BusinessSuppliers
5. BusinessCustomers
6. BusinessProducts
7. ProductImages
8. BusinessStockMovements
9. BusinessOrders
10. BusinessOrderItems
11. CustomerLayby
12. CustomerLaybyPayment
13. BusinessTransactions
14. BusinessAccounts
15. BusinessLocations
