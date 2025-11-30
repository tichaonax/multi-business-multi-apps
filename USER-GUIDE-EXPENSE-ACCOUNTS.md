# Expense Account Management - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Sibling Accounts for Historical Data](#sibling-accounts-for-historical-data)
3. [Getting Started](#getting-started)
4. [Creating an Expense Account](#creating-an-expense-account)
5. [Adding Funds to an Account](#adding-funds-to-an-account)
6. [Making Payments](#making-payments)
7. [Batch Payments](#batch-payments)
8. [Managing Payees](#managing-payees)
9. [Viewing Transaction History](#viewing-transaction-history)
10. [Understanding Reports & Analytics](#understanding-reports--analytics)
11. [Low Balance Alerts](#low-balance-alerts)
12. [Viewing Payee Payment History](#viewing-payee-payment-history)
13. [Common Workflows](#common-workflows)
14. [Permissions & Access Control](#permissions--access-control)
15. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Introduction

### What are Expense Accounts?

Expense Accounts are dedicated financial accounts used to manage and track project-specific or department-specific expenses. They allow you to:

- Separate expenses by project, department, or purpose
- Track who receives payments (employees, contractors, vendors)
- Generate detailed reports on spending patterns
- Maintain budget control with low balance alerts
- Audit payment history with complete transparency

### Key Features

- **Multiple Funding Sources**: Add funds manually (cash/external) or transfer from business accounts
- **Flexible Payment Types**: Pay employees, contractors, persons, or businesses
- **Batch Processing**: Create and submit multiple payments at once
- **Rich Analytics**: View spending by category, payee type, and time period
- **Bidirectional Tracking**: View payments from both account and payee perspectives
- **Permission-Based Access**: Control who can create accounts, add funds, make payments, and view reports
- **Sibling Accounts**: Create temporary accounts for historical data entry and merge them back seamlessly

---

## Sibling Accounts for Historical Data

### What are Sibling Accounts?

Sibling Accounts are temporary expense accounts that allow you to enter historical expense data without affecting your current account balances. They're perfect for:

- **Historical Data Entry**: Recording expenses from past periods (last month, quarter, or year)
- **Data Migration**: Importing expense data from other systems
- **Audit Corrections**: Adding missing expense records
- **Budget Reconciliation**: Matching historical spending against budgets

### How Sibling Accounts Work

1. **Create a Sibling**: From any expense account, create a sibling account for historical data
2. **Enter Historical Payments**: Add payments with past dates (system allows any date)
3. **Build Historical Balance**: Sibling accumulates historical expense data
4. **Merge Back**: Seamlessly merge the sibling back into the parent account
5. **Clean Integration**: All historical data becomes part of the parent account's history

### Key Benefits

- **No Balance Impact**: Historical entries don't affect current account balances
- **Date Flexibility**: Enter payments with any date in the past
- **Audit Trail**: Complete transaction history maintained
- **Safe Merging**: Zero-balance validation prevents accidental data loss
- **Visual Indicators**: Clear distinction between current and historical data

### Creating a Sibling Account

**Required Permission:** Create Expense Accounts

1. Navigate to any **Expense Account** detail page
2. Look for the **"Create Sibling"** button (usually in account actions)
3. Click **"Create Sibling Account"**
4. Fill in the details:

   **Name** (Required)
   - Descriptive name for the historical period
   - Example: "Q4 2024 Expenses", "January 2025 Corrections", "Legacy System Import"

   **Description** (Optional)
   - Purpose and context for the sibling account
   - Example: "Entering missing expense reports from Q4"

5. Click **"Create Sibling"**

### What Happens When You Create a Sibling

- System generates a numbered account (e.g., EXP-001-01, EXP-001-02)
- Sibling appears with a distinct visual indicator (badge/color)
- Initial balance is $0.00
- You can immediately start adding historical payments

### Adding Historical Payments to Siblings

1. Click on the **Sibling Account** from the account list
2. Click **"Add Payment"** (same as regular accounts)
3. Fill in payment details:

   **Amount**: The historical expense amount
   **Description**: What the expense was for
   **Payee**: Who received the payment
   **Payment Date**: **Select any date in the past**

4. Submit the payment

**Important Notes:**
- Sibling accounts accept **any payment date** (past or future)
- Payments don't affect the parent account's current balance
- All payments are tracked separately until merging

### Merging Sibling Accounts

**Required Permission:** Merge Sibling Accounts (admin permission required for non-zero balance siblings)

#### Safe Merge (Zero Balance Siblings)

1. Navigate to the **Sibling Account**
2. Click **"Merge into Parent"** button
3. Review the confirmation dialog
4. Click **"Confirm Merge"**

**Result:** Sibling transactions are transferred to parent account history, sibling is deleted.

#### Admin Merge (Non-Zero Balance Siblings)

**⚠️ Warning:** Only administrators can merge siblings with balances. This transfers the balance to the parent account.

1. Navigate to the **Sibling Account**
2. Click **"Merge into Parent"** (button shows admin requirement)
3. Administrator reviews and approves the merge
4. System transfers balance and transactions to parent
5. Sibling account is permanently deleted

### Visual Indicators

- **Sibling Badge**: Blue "Sibling" badge on account cards
- **Account Numbers**: Format like EXP-001-01, EXP-001-02
- **Merge Button**: Only visible on sibling accounts
- **Date Flexibility**: Calendar shows no date restrictions

### Best Practices

1. **Use Descriptive Names**: Make sibling purposes clear (e.g., "Q3 2024 Audit Corrections")
2. **Enter Chronologically**: Add payments in date order for easier review
3. **Merge Promptly**: Don't leave siblings unmerged for long periods
4. **Zero Balance First**: Try to merge siblings with $0.00 balance when possible
5. **Document Purpose**: Use descriptions to explain why historical data was needed

### Common Use Cases

#### Quarterly Audit Preparation
```
1. Create sibling: "Q4 2024 Audit Adjustments"
2. Add missing expense reports from October-December
3. Merge back to parent account
4. Audit shows complete historical record
```

#### System Migration
```
1. Create sibling: "Legacy System Import"
2. Import historical expenses from old system
3. Verify data accuracy
4. Merge into live account
```

#### Budget Reconciliation
```
1. Create sibling: "January Overspend Corrections"
2. Add expenses missed in monthly reporting
3. Merge to show true January spending
4. Budget reports become accurate
```

---

## Getting Started

### Permissions You'll Need

To use the expense account system, your administrator must grant you one or more of these permissions:

| Permission | What You Can Do |
|------------|-----------------|
| **Access Expense Accounts** | View expense accounts and their details |
| **Create Expense Accounts** | Create new expense accounts and sibling accounts |
| **Make Deposits** | Add funds to accounts (manual or business transfers) |
| **Make Payments** | Create single or batch payments |
| **View Reports** | Access analytics, charts, and spending reports |
| **Merge Sibling Accounts** | Merge sibling accounts back into parent accounts (admin permission) |

**Note:** If you don't see "Expense Accounts" in your sidebar menu, you don't have any expense account permissions. Contact your system administrator.

### Accessing Expense Accounts

1. Log in to your account
2. Look for **"Expense Accounts"** in the left sidebar
3. Click to see your list of expense accounts

---

## Creating an Expense Account

**Required Permission:** Create Expense Accounts

### Steps to Create

1. Navigate to **Expense Accounts** in the sidebar
2. Click the **"Create Account"** button (top right)
3. Fill in the required information:

   **Account Name** (Required)
   - A descriptive name for the account
   - Example: "Q1 2024 Marketing Campaign", "IT Infrastructure Project", "Office Renovation Fund"

   **Description** (Optional)
   - Additional details about the account's purpose
   - Example: "Budget for social media ads and promotional materials"

   **Low Balance Threshold** (Required)
   - Dollar amount that triggers a low balance warning
   - Example: $500, $1000, $5000
   - You'll receive alerts when balance drops below this amount

4. Click **"Create Account"**

### What Happens Next

- System generates a unique account number (format: ACC-0001, ACC-0002, etc.)
- Initial balance is set to $0.00
- Account appears in your account list
- You're redirected to the account detail page

**Important:** Newly created accounts have zero balance. You must add funds before making payments.

---

## Adding Funds to an Account

**Required Permission:** Make Deposits

There are two ways to add funds to an expense account:

### Method 1: Manual Deposit (Cash or External Transfer)

Use this when funds come from outside the system (cash, bank transfer, check, etc.)

**Steps:**
1. Open the expense account
2. Click the **"Deposits"** tab
3. Select **"Manual Deposit (Cash/External)"**
4. Enter the amount (e.g., $5000.00)
5. Add an optional note (e.g., "Initial funding from Q1 budget")
6. Click **"Add Deposit"**

**Result:** Account balance increases immediately.

### Method 2: Transfer from Business Account

Use this to transfer funds from an existing business account in the system.

**Steps:**
1. Open the expense account
2. Click the **"Deposits"** tab
3. Select **"Transfer from Business"**
4. Choose the source business from the dropdown
   - Only businesses with positive balances appear
5. Enter the transfer amount
   - Cannot exceed the business account balance
6. Add an optional note (e.g., "Budget allocation for Project Alpha")
7. Click **"Transfer Funds"**

**Result:**
- Expense account balance increases
- Business account balance decreases
- Both transactions are recorded and linked

**Important:** Business transfers are permanent. Ensure you select the correct source business.

---

## Making Payments

**Required Permission:** Make Payments

### Single Payment Workflow

1. Open the expense account
2. Click the **"Payments"** tab
3. Fill in the payment form:

   **Step 1: Select Payee Type**
   - Employee (internal staff)
   - Contractor (external consultants)
   - Person (individuals not in the system)
   - Business (vendors, suppliers)

   **Step 2: Select or Create Payee**
   - For existing payees: Search and select from dropdown
   - For new payees: Click "Create New" (see [Managing Payees](#managing-payees))

   **Step 3: Enter Payment Details**
   - **Amount**: Dollar amount (e.g., 450.00)
   - **Category**: Select expense category (Salary, Office Supplies, Consulting, etc.)
   - **Payment Date**: Defaults to today, can change
   - **Receipt Number**: Optional reference (e.g., INV-2024-001)
   - **Notes**: Optional description (e.g., "Monthly consulting fee for January")

4. Click **"Submit Payment"**

### What Happens Next

- System checks if account has sufficient balance
- If successful:
  - Account balance decreases
  - Payment appears in transaction history
  - Payment is linked to the payee
  - Transaction is recorded with all details
- If insufficient funds:
  - Error message appears
  - Payment is NOT processed
  - You'll see an "Add Funds" button to deposit more money

**Important:** Payments cannot be edited or deleted after submission. Double-check all details before clicking Submit.

---

## Batch Payments

**Required Permission:** Make Payments

Batch payments allow you to create and submit multiple payments at once, saving time when paying multiple people.

### When to Use Batch Payments

- Monthly payroll for multiple employees
- Paying multiple contractors for a project
- Processing multiple vendor invoices
- Any scenario with 3+ payments at once

### Steps to Create a Batch

1. Open the expense account
2. Click the **"Payments"** tab
3. Scroll to the **"Batch Payments"** section
4. For each payment in the batch:
   - Click **"Add Payment"**
   - Select payee type and payee
   - Enter amount, category, and optional details
   - Repeat for all payments
5. Review the batch summary:
   - Total number of payments
   - Total amount to be paid
   - Current account balance
   - Remaining balance after batch

### Editing the Batch Before Submission

- **Edit a payment**: Click the edit icon next to any payment
- **Remove a payment**: Click the trash icon next to any payment
- **Reorder payments**: Drag and drop (if enabled)

### Submitting the Batch

1. Review all payments carefully
2. Check that total amount doesn't exceed account balance
3. Click **"Submit Batch"**
4. Confirm the action

**Result:** All payments process simultaneously. Each payment gets its own transaction record.

### Handling Insufficient Funds

If the batch total exceeds your account balance:

1. System shows error: "Insufficient funds for batch"
2. You see:
   - Current balance: $X,XXX
   - Required amount: $X,XXX
   - Shortfall: $XXX
3. Options:
   - Click **"Add Funds"** → Go to Deposits tab → Add deposit → Return to Payments tab (your batch is preserved)
   - Reduce the batch size by removing payments
   - Split into multiple smaller batches

**Important:** If you navigate away without submitting, your batch data may be lost. Add funds first, then create batches.

---

## Managing Payees

### Creating a New Employee Payee

Employees must already exist in the system. You cannot create employees from the expense account interface.

**To pay an employee:**
1. Select "Employee" as payee type
2. Search for the employee by name
3. Select from the list

**If employee doesn't appear:**
- They may not exist in the employee directory
- Contact HR or your administrator to add them first

### Creating a New Contractor/Person Payee

If paying someone not in the system (contractor, freelancer, vendor representative):

1. Select "Person" as payee type
2. Click **"Create New Person"**
3. Fill in the required information:
   - **Full Name**: Legal name (e.g., "John Smith")
   - **National ID**: Tax ID or SSN (for records)
   - **Phone**: Contact phone number
   - **Email**: Contact email
4. Click **"Create"**
5. The person is now available as a payee
6. Continue with your payment

**Important:** Person records are shared system-wide. Once created, anyone can pay this person from any expense account.

### Creating a New Business Payee

Businesses must already exist in the system. You cannot create businesses from the expense account interface.

**To pay a business:**
1. Select "Business" as payee type
2. Search for the business by name
3. Select from the list

**Note:** Paying a business adds funds to that business's account balance in the system.

---

## Viewing Transaction History

### Accessing Transaction History

1. Open an expense account
2. Click the **"Transaction History"** tab

### What You'll See

A combined list of all deposits and payments, showing:

- **Date**: When the transaction occurred
- **Type**: DEPOSIT or PAYMENT
- **Description**: What the transaction was for
- **Payee**: Who received the payment (for payments only)
- **Amount**: Dollar amount (green for deposits, red for payments)
- **Balance**: Running balance after this transaction
- **Category**: Expense category (for payments only)

### Filtering Transactions

**By Date Range:**
1. Set "Start Date" and "End Date" fields
2. Click "Apply Filter"
3. Only transactions in that range appear

**By Transaction Type:**
1. Select "Deposits Only" or "Payments Only"
2. Click "Apply Filter"

**Clear Filters:**
- Click "Clear All Filters" to see all transactions again

### Exporting Transactions

(If export feature is enabled)

1. Set your desired filters
2. Click "Export to CSV" or "Export to Excel"
3. File downloads to your computer
4. Open in Excel or Google Sheets for further analysis

---

## Understanding Reports & Analytics

**Required Permission:** View Reports

### Accessing Reports

1. Open an expense account
2. Click the **"View Reports"** button (top right of account page)

### Report Sections

#### 1. Summary Statistics

Four key metrics at a glance:

- **Total Spent**: Sum of all payments made
- **Total Payments**: Number of individual payments
- **Total Deposits**: Number of deposits made
- **Average Payment**: Mean payment amount

#### 2. Expenses by Category (Pie Chart)

**What it shows:** Breakdown of spending across expense categories

**How to read it:**
- Each slice represents a category (e.g., Salary, Office Supplies, Travel)
- Larger slices = more money spent in that category
- Hover over a slice to see exact amount and percentage
- Colors are consistent throughout the system

**Use case:** Identify your biggest spending categories. If "Office Supplies" is 40% of your budget, you might need to review purchasing policies.

#### 3. Expenses by Payee Type (Bar Chart)

**What it shows:** How much you've paid to each payee type

**How to read it:**
- Four bars: Employees, Contractors, Persons, Businesses
- Taller bars = more money paid to that type
- Hover to see exact amounts

**Use case:** Understand your workforce composition. If contractor costs are very high, you might consider hiring employees instead.

#### 4. Payment Trends (Line Chart)

**What it shows:** Spending patterns over time (monthly)

**How to read it:**
- X-axis: Months
- Y-axis: Total amount spent
- Line trends upward = increasing spending
- Line trends downward = decreasing spending
- Spikes indicate months with high expenses

**Use case:** Identify spending patterns. A spike in March might be normal (annual conference), or it might indicate budget overruns.

### Date Range Filtering

1. Above the charts, set:
   - **Start Date**: Beginning of analysis period
   - **End Date**: End of analysis period
2. Click **"Update Reports"**
3. All charts and statistics recalculate for that period

**Common ranges:**
- Last 30 days: Recent activity
- Last quarter: Q1, Q2, Q3, Q4
- Last year: Annual review
- Custom: Any date range you choose

### Printing or Sharing Reports

1. Set your desired date range
2. Use your browser's print function (Ctrl+P or Cmd+P)
3. Select "Save as PDF" to create a shareable document
4. Email or save for records

---

## Low Balance Alerts

### What are Low Balance Alerts?

When an expense account balance drops below its configured threshold, the system generates alerts to warn you.

### Where You'll See Alerts

1. **Dashboard**: Yellow or red warning cards appear
2. **Account List**: Low balance icon next to account name
3. **Account Detail Page**: Warning banner at the top

### Alert Levels

**Warning (Yellow):**
- Balance is below threshold but above 50% of threshold
- Example: Threshold is $1000, balance is $700
- Action: Consider adding funds soon

**Critical (Red):**
- Balance is below 50% of threshold
- Example: Threshold is $1000, balance is $400
- Action: Add funds immediately

### Responding to Alerts

1. Click the alert to go to the account detail page
2. Review upcoming payments or financial needs
3. Add funds if necessary:
   - Click "Deposits" tab
   - Add manual deposit or transfer from business
4. Alert disappears once balance exceeds threshold

### Adjusting Threshold

If alerts are too frequent or not frequent enough:

1. Go to account settings (if edit feature exists)
2. Change "Low Balance Threshold" value
3. Save changes

**Example scenarios:**
- If you get alerts too early, lower the threshold ($1000 → $500)
- If you run out of funds unexpectedly, raise the threshold ($500 → $1500)

---

## Viewing Payee Payment History

**Required Permission:** Access Expense Accounts (and View Reports for charts)

You can view all payments made to a specific payee across ALL expense accounts.

### Accessing Payee Payment History

#### From Employee Detail Page:

1. Navigate to **Employees** in sidebar
2. Click on an employee name
3. Click the **"Expense Payments"** tab

#### From Other Payee Detail Pages:

(If contractor, person, or business detail pages exist)
1. Navigate to the payee's detail page
2. Click the **"Expense Payments"** tab

### What You'll See

Three sections:

#### 1. Expense Summary Card

Quick overview:
- **Total Paid**: Sum of all payments to this payee
- **Payment Count**: Number of individual payments
- **Accounts**: Number of different expense accounts they've been paid from

**Account Breakdown:**
- Click "Show Breakdown" to expand
- See list of all accounts that have paid this payee
- Each account shows total amount paid
- Click account name to jump to that account's detail page

#### 2. Detailed Payments Table

**Organized by Account:**
- Payments are grouped under each expense account
- Click account name to expand/collapse payment list
- First account is expanded by default

**For each payment, you'll see:**
- Date
- Category
- Amount
- Receipt number (if provided)
- Notes (if provided)

**Filtering:**
- Set date range to see payments in a specific period
- Toggle sort order (newest first / oldest first)

#### 3. Expense Report & Analytics

*Only visible if you have "View Reports" permission*

**Summary Statistics:**
- Total paid
- Payment count
- Average payment amount
- Number of accounts

**Visual Charts:**

**Payments by Category (Pie Chart)**
- Shows how much this payee was paid for each category
- Example: Employee might have 80% Salary, 15% Bonus, 5% Reimbursement

**Payments by Account (Bar Chart)**
- Shows how much this payee was paid from each account
- Example: Contractor might have been paid from 3 different project accounts

**Monthly Payment Trends (Line Chart)**
- Shows payment amounts over time
- Identify patterns: steady monthly payments, one-time payments, increasing/decreasing trends

**Date Filtering:**
- Set start and end dates above the charts
- All charts update to show only that period

### Use Cases

**As an Employee:**
- View your payment history for tax purposes
- Verify that expected payments were received
- Generate reports for expense reimbursements

**As a Manager:**
- Audit how much a contractor has been paid across all projects
- Verify employee bonuses and reimbursements
- Analyze spending on a specific vendor

**As Finance/Accounting:**
- Generate payment summaries for 1099 forms (contractors)
- Audit payments to specific individuals
- Identify payment patterns for budget planning

---

## Common Workflows

### Workflow 1: Setting Up a New Project Budget

**Scenario:** You're starting a new project with a $50,000 budget

1. Create expense account: "Project Phoenix - Q2 2024"
2. Set low balance threshold: $5,000 (10% of budget)
3. Add initial funding:
   - Manual deposit: $50,000
   - Note: "Q2 budget allocation from Finance"
4. Make payments as project expenses occur
5. Monitor spending via reports
6. Receive low balance alert when balance drops below $5,000
7. Decide whether to add more funds or close project

### Workflow 2: Monthly Contractor Payments

**Scenario:** Pay 5 contractors their monthly fees

1. Navigate to expense account
2. Click "Payments" tab → "Batch Payments"
3. Add 5 payments:
   - Contractor A: $3,000 (Consulting Services)
   - Contractor B: $2,500 (Consulting Services)
   - Contractor C: $4,000 (Software Development)
   - Contractor D: $1,800 (Graphic Design)
   - Contractor E: $2,200 (Content Writing)
4. Verify total: $13,500
5. Check balance (must have at least $13,500)
6. Submit batch
7. All 5 contractors are paid simultaneously
8. Each payment appears in transaction history

### Workflow 3: Reimbursing an Employee

**Scenario:** Employee submitted $347.82 in travel expenses

1. Navigate to expense account (e.g., "Operations Expenses")
2. Click "Payments" tab → Single Payment
3. Select:
   - Payee Type: Employee
   - Payee: [Employee name]
   - Amount: $347.82
   - Category: Travel & Accommodation
   - Receipt Number: EXP-2024-089 (from expense report)
   - Notes: "Conference travel to NYC - 3 nights hotel, meals, transport"
4. Submit payment
5. Employee's expense payments history now shows this reimbursement
6. Transaction appears in account history

### Workflow 4: Paying a New Vendor (Not in System)

**Scenario:** One-time payment to a new supplier

1. Navigate to expense account
2. Click "Payments" tab → Single Payment
3. Select Payee Type: "Person"
4. Click "Create New Person"
5. Enter:
   - Full Name: "ABC Supply Company"
   - National ID: "123-45-6789" (their tax ID)
   - Phone: "+1-555-0123"
   - Email: "billing@abcsupply.com"
6. Click "Create"
7. Continue with payment:
   - Amount: $1,250.00
   - Category: Office Supplies
   - Receipt Number: INV-20240315
   - Notes: "Office furniture - 5 ergonomic chairs"
8. Submit payment
9. Future payments to ABC Supply can reuse this payee

### Workflow 5: Monthly Budget Review

**Scenario:** End-of-month financial review

1. Open each active expense account
2. Click "View Reports"
3. Set date range: First day of month → Last day of month
4. Review:
   - Total spent this month
   - Spending by category (any surprises?)
   - Spending by payee type (labor vs. materials)
   - Compare to previous months (trends)
5. Export transaction history for accounting
6. Note any categories over budget
7. Adjust next month's spending plan accordingly
8. Add funds if low balance alerts are present

### Workflow 6: Closing a Completed Project

**Scenario:** Project is complete, account has $1,237 remaining

**Option 1: Transfer to Another Account**
1. Create a deposit in another expense account
2. Select "Transfer from Business" (if your account is a business)
3. Or make manual withdrawal and deposit elsewhere

**Option 2: Keep Account for Records**
1. Navigate to account settings
2. Mark account as "Inactive" (if feature exists)
3. Account remains viewable but cannot make new payments
4. Preserve transaction history for audits

**Best Practice:** Always keep accounts with transaction history for at least your organization's record retention period (typically 7 years).

---

## Permissions & Access Control

### Permission Levels Explained

The system uses granular permissions. Your administrator can grant you any combination:

#### Full Access (Typical for Administrators)
- Create Expense Accounts ✓
- Access Expense Accounts ✓
- Make Deposits ✓
- Make Payments ✓
- View Reports ✓
- Merge Sibling Accounts ✓

**Can do:** Everything, including creating sibling accounts and merging them (even with balances)

#### Finance Manager (Typical for Finance Team)
- Create Expense Accounts ✗
- Access Expense Accounts ✓
- Make Deposits ✗
- Make Payments ✓
- View Reports ✓

**Can do:** View accounts, make payments, view reports
**Cannot do:** Create new accounts, add funds

**Use case:** Finance team member who processes payments but doesn't manage account setup or funding

#### Payments Officer (Typical for AP Clerk)
- Create Expense Accounts ✗
- Access Expense Accounts ✓
- Make Deposits ✗
- Make Payments ✓
- View Reports ✗

**Can do:** View accounts, make payments
**Cannot do:** Create accounts, add funds, view analytics

**Use case:** Accounts payable clerk who only needs to process payments

#### Auditor/Viewer (Typical for Internal Audit)
- Create Expense Accounts ✗
- Access Expense Accounts ✓
- Make Deposits ✗
- Make Payments ✗
- View Reports ✓

**Can do:** View everything, run reports
**Cannot do:** Make any changes

**Use case:** Auditor or executive who needs read-only access for oversight

#### No Access (Typical for Regular Employees)
- All permissions ✗

**Result:** "Expense Accounts" menu doesn't appear

**Use case:** Regular employees who don't manage finances

### Checking Your Permissions

**What you can see:**
- Menu items only appear if you have permission
- Tabs only appear if you have permission
- Buttons only appear if you have permission

**If you need different permissions:**
1. Contact your system administrator
2. Explain what you need to do
3. They'll update your user profile

**Security Note:** The system enforces permissions on the server. Even if you try to access a page directly via URL, you'll be blocked if you don't have permission.

---

## Troubleshooting & FAQ

### Deposits

**Q: I added a deposit but the balance didn't update**

A: Try these steps:
1. Refresh the page (F5)
2. Check the "Transaction History" tab - does the deposit appear?
3. If it appears but balance is wrong, contact support (might be a calculation error)
4. If it doesn't appear, the deposit might not have been submitted successfully

**Q: Can I reverse a deposit?**

A: No, deposits cannot be reversed through the UI. Contact your administrator or accounting team to make manual adjustments.

**Q: The business I want to transfer from isn't in the dropdown**

A: Possible reasons:
- Business has zero or negative balance (cannot transfer)
- You don't have access to that business
- Business is inactive

### Payments

**Q: I get "Insufficient funds" error but I have enough money**

A: Check:
1. Are you looking at the right account?
2. Is there a pending batch that hasn't been submitted? (Pending batches don't affect balance until submitted)
3. Refresh the page to see current balance
4. The balance shown is real-time; if you just made other payments, they've already been deducted

**Q: Can I edit a payment after submission?**

A: No, submitted payments are immutable. This is by design for audit trail integrity. If you made a mistake:
1. Create a correcting payment (e.g., if you overpaid by $50, create a $50 credit)
2. Add notes explaining the correction
3. Contact accounting if you need to void a payment

**Q: I created a batch but it disappeared**

A: Batch data is stored in your browser session. If you:
- Closed the browser
- Logged out
- Navigated away from the page
...the batch data may be lost. Always submit batches before leaving the page.

**Q: Can I schedule future payments?**

A: You can set a future payment date, but the payment is recorded and the balance is deducted immediately. The date is for record-keeping only.

**Q: Why can't I select a specific employee/contractor?**

A: Possible reasons:
- They don't exist in the system (need to be added first)
- They're marked as inactive
- You're searching with the wrong name spelling
- For employees: they must exist in the employee directory first

### Reports

**Q: Reports show $0 or "No data"**

A: Check:
1. Date range - are you filtering to a period with no transactions?
2. Account selection - are you looking at the right account?
3. Clear all filters and try again
4. If account truly has no transactions, reports will be empty

**Q: Charts aren't loading**

A: Try:
1. Refresh the page
2. Check your internet connection
3. Try a different browser
4. Clear your browser cache
5. Contact support if problem persists

**Q: Can I export charts as images?**

A: Use your browser's screenshot feature or print to PDF:
- Windows: Windows Key + Shift + S (screenshot)
- Mac: Cmd + Shift + 4 (screenshot)
- Any: Ctrl+P / Cmd+P → Save as PDF

### Permissions

**Q: I don't see "Expense Accounts" in my menu**

A: You don't have any expense account permissions. Contact your administrator to request access.

**Q: I can see accounts but not the Deposits tab**

A: You have "Access" permission but not "Make Deposits" permission. This is intentional based on your role.

**Q: I can see an account but get "Access Denied" when I click it**

A: This shouldn't happen. Log out and log back in. If problem persists, your permissions may have been changed. Contact your administrator.

### Performance

**Q: Pages are loading slowly**

A: Possible causes:
- Large number of transactions (1000+)
- Slow internet connection
- Server is busy

Try:
- Use date range filters to reduce data load
- Access during off-peak hours
- Contact support if consistent problem

**Q: Transaction history is taking forever to load**

A: If an account has many transactions (500+):
- Use date range filters to load smaller sets
- Export to CSV and view in Excel instead
- Contact administrator about archiving old transactions

### General

**Q: What happens if I accidentally close the browser during a payment?**

A: If you clicked "Submit" and saw a success message, the payment was processed. If you closed before clicking Submit, the payment was NOT processed. Check your transaction history to confirm.

**Q: Can I use this on my phone?**

A: The system is mobile-responsive. However, complex tasks like batch payments are easier on a desktop. Basic tasks (viewing accounts, making single payments) work well on mobile.

**Q: Where is my data stored?**

A: All data is stored securely on your organization's servers. Contact your IT department for details about backup and security policies.

**Q: Who can see my expense accounts?**

A: Anyone with "Access Expense Accounts" permission can see all expense accounts. Data is not private to the account creator.

**Q: Can I recover deleted accounts?**

A: Accounts are never truly deleted, only marked inactive. Contact your administrator to reactivate an account.

### Sibling Accounts

**Q: What happens to sibling account data after merging?**

A: When you merge a sibling account:
- All transactions are transferred to the parent account
- Transaction dates and amounts remain unchanged
- The sibling account is permanently deleted
- Parent account balance may increase if sibling had a balance

**Q: Can I unmerge a sibling account?**

A: No, merging is permanent and cannot be reversed. Always review sibling data carefully before merging.

**Q: Why can't I merge a sibling with a balance?**

A: Merging with a balance transfers money to the parent account, which could affect financial reporting. Only administrators can perform this operation to prevent accidental balance changes.

**Q: Can I create multiple siblings from one parent?**

A: Yes! Each sibling gets a sequential number (EXP-001-01, EXP-001-02, etc.). You can have as many siblings as needed for different historical periods.

**Q: Do sibling payments affect reports?**

A: Sibling payments only appear in reports after merging. Until then, they're kept separate to avoid affecting current period analytics.

**Q: What if I enter wrong historical data in a sibling?**

A: You can delete individual payments from the sibling account before merging. After merging, the data becomes part of the permanent record.

**Q: Can I transfer money between siblings?**

A: No, siblings are meant for historical data only. Money transfers should happen through regular expense accounts.

**Q: How long should I keep siblings unmerged?**

A: Merge as soon as historical data entry is complete. Don't leave siblings unmerged for extended periods as they can cause confusion.

---

## Getting Help

### Contact Support

If you encounter issues not covered in this guide:

1. **Check the documentation** - Review relevant sections above
2. **Ask your administrator** - They may have organization-specific guidance
3. **Contact IT support** - Submit a ticket with:
   - Your username
   - What you were trying to do
   - What happened instead
   - Screenshots if possible
   - Any error messages

### Training

For comprehensive training on the expense account system:
- Ask your manager about scheduled training sessions
- Request one-on-one training from your finance team
- Review the video tutorials (if available on your organization's intranet)

### Feedback

Have suggestions for improving the system?
- Submit feedback through your organization's feedback channel
- Talk to your system administrator
- Your input helps make the system better for everyone

---

## Quick Reference

### Common Tasks at a Glance

| I want to... | Go to... | Permission Needed |
|-------------|----------|-------------------|
| Create a new expense account | Expense Accounts → Create Account | Create Expense Accounts |
| Add funds with cash | Account → Deposits tab → Manual Deposit | Make Deposits |
| Transfer from business | Account → Deposits tab → Transfer from Business | Make Deposits |
| Pay an employee | Account → Payments tab → Single Payment | Make Payments |
| Pay multiple people | Account → Payments tab → Batch Payments | Make Payments |
| View transaction history | Account → Transaction History tab | Access Expense Accounts |
| See spending reports | Account → View Reports button | View Reports |
| Check low balance alerts | Dashboard | Access Expense Accounts |
| View who I've paid | Employee page → Expense Payments tab | Access Expense Accounts |
| Create sibling for historical data | Account → Create Sibling button | Create Expense Accounts |
| Enter historical payments | Sibling Account → Add Payment | Make Payments |
| Merge sibling back to parent | Sibling Account → Merge into Parent | Merge Sibling Accounts |

### Keyboard Shortcuts

(If keyboard shortcuts are implemented)

- **Ctrl + N** / **Cmd + N**: New payment (when on Payments tab)
- **Ctrl + F** / **Cmd + F**: Focus search field
- **Esc**: Close modal dialogs
- **Tab**: Navigate form fields

---

**Version:** 1.1
**Last Updated:** November 29, 2025
**For:** Multi-Business Management Platform - Expense Account Module with Sibling Accounts

---

**End of User Guide**
