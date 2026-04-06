# System User Guide

> **Who this guide is for:** Everyone who uses this system day-to-day — cashiers, sales staff, managers, HR, drivers, and business owners. Each section is written for a specific role. Jump straight to your section.

---

## Table of Contents

1. [Getting Started — All Users](#1-getting-started--all-users)
2. [POS Cashier — Making Sales](#2-pos-cashier--making-sales)
3. [Cash Office — Cash Handling & End of Day](#3-cash-office--cash-handling--end-of-day)
4. [Manager — Approvals, Payroll & Reports](#4-manager--approvals-payroll--reports)
5. [HR & Employee Management](#5-hr--employee-management)
6. [Employees — Clock-In, Leave & Per Diem](#6-employees--clock-in-leave--per-diem)
7. [Expense Accounts & Petty Cash](#7-expense-accounts--petty-cash)
8. [Business Loans](#8-business-loans)
9. [Customers & Laybys](#9-customers--laybys)
10. [Chicken Run Management](#10-chicken-run-management)
11. [Construction & Projects](#11-construction--projects)
12. [Driver & Vehicle Log](#12-driver--vehicle-log)
13. [WiFi Token Sales — ESP32 and R710](#13-wifi-token-sales--esp32-and-r710)
14. [Inventory & Barcode Labels](#14-inventory--barcode-labels)
    - [Predefined Domains & Category Taxonomy](#predefined-domains-categories--sub-categories--all-business-types)
    - [Custom Bulk Products](#custom-bulk-products--complete-guide)
    - [Bulk Stocking Panel & Stock Take](#bulk-stocking-panel--receiving-and-counting-stock)
    - [Used Clothing Bales](#used-clothing-bales--complete-guide)
    - [Barcode Templates](#barcode-templates--creating-and-using-label-designs)
    - [Adding Inventory Items Directly to Cart](#adding-inventory-items-directly-to-cart)
    - [Admin — Blocking Stock Take Drafts](#admin--blocking-stock-take-drafts)
15. [Restaurant Menu Management](#15-restaurant-menu-management)
15a. [Services as Products](#15a-services-as-products--selling-services-via-barcode)
16. [Quick Reference Cards](#16-quick-reference-cards)
17. [Suppliers & Payees](#17-suppliers--payees)
18. [Batch EOD Catch-Up — Manager and Cashier Roles](#18-batch-eod-catch-up--manager-and-cashier-roles)
19. [Employee Termination Checklist](#employee-termination--full-checklist)
20. [Team Chat](#20-team-chat)
21. [Grocery POS — Desk Mode](#21-grocery-pos--desk-mode)
22. [Expense Account — Quick Payment & My Payment Queue](#22-expense-account--quick-payment--my-payment-queue)
    - [Cashier-Assisted Payment Requests (Personal Accounts)](#cashier-assisted-payment-requests-personal-accounts)
23. [Quick Deposit — Income Categorisation](#23-quick-deposit--income-categorisation)
24. [Payment Vouchers — Creating, Viewing & Locking](#24-payment-vouchers--creating-viewing--locking)
25. [Eco-Cash to Cash Conversions](#25-eco-cash-to-cash-conversions)

---

## 1. Getting Started — All Users

### Signing In

1. Open the system in your web browser.
2. Enter your email address and password.
3. Click **Sign In**.
4. If you belong to more than one business, you will be taken to your main dashboard. Use the **business switcher** (top of the screen) to switch between businesses.

### The Screen Layout

```
┌──────────────────────────────────────────────────────┐
│  [Business Name ▼]   Menu Links    🔔  👤 Your Name  │  ← Top bar
├──────────────────────────────────────────────────────┤
│                                                      │
│                   Main Content                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- **Top bar (left):** Click the business name to switch to a different business.
- **Top bar (centre):** Main navigation links for your role.
- **🔔 Bell icon:** Shows pending tasks waiting for your attention. A red number means action is needed.
- **👤 Your name:** Open your profile or sign out.

### The Dashboard

When you sign in, you land on the **Dashboard**. It shows:

- **Today's activity** — sales, deposits, and transactions for the day.
- **Pending tasks** — things waiting for you to approve or complete.
- **Recent activity** — a log of what has been happening across the business.
- **Alerts** — warnings about low balances, overdue laybys, or stock levels.

### Switching Between Businesses

If your account covers more than one business:
1. Click the business name in the top-left corner.
2. A dropdown will show all your businesses.
3. Click the one you want to work in.
4. The screen will reload showing that business's data.

> **Note:** "All" in the business switcher means the umbrella view — it shows combined data for all businesses together.

### Your Notifications

Click the **🔔 bell** to open your notifications panel.
- Unread notifications appear in **bold**.
- Click a notification to go directly to the item it relates to.
- Click **Mark all as read** to clear the list.

---

## 2. POS Cashier — Making Sales

> **Who reads this:** Anyone serving customers at the till — cashiers, sales assistants, restaurant servers.

### Opening the POS

From the top menu, go to your business section and click **POS**, or use **Universal POS** if your location uses the shared till.

The POS screen has three areas:

```
┌─────────────────────────────┬──────────────────────┐
│                             │  CART                │
│   PRODUCTS / MENU           │  ─────────────────── │
│                             │  Item 1   x1  $5.00  │
│   [Search or scan here]     │  Item 2   x2  $10.00 │
│                             │  ─────────────────── │
│                             │  TOTAL:   $15.00     │
│                             │                      │
│                             │  [CHARGE / PAY]      │
└─────────────────────────────┴──────────────────────┘
```

### Step 1 — Finding a Product

**Option A — Search by name:**
Type the product name in the search box. Results appear as you type. Click the item to add it to the cart.

**Option B — Scan a barcode:**
Point your barcode scanner at the product. It will be added to the cart automatically.

**Option C — Browse by category:**
Click a category button (e.g., "Beverages", "Groceries", "Clothing") to see only items in that group.

**Option D — Manual entry:**
If an item is not in the system, click **Manual Entry**, type a description and a price, and add it.

### Step 2 — The Cart

Once items are in the cart:

- **Change quantity:** Click the **+** or **−** buttons next to an item, or type a number directly.
- **Remove an item:** Click the **🗑 bin icon** next to the item.
- **Apply a discount to one item:** Click the item price and choose a percentage or fixed-amount discount.
- **Apply a coupon code:** Click **Add Coupon** and type the code. The discount will be deducted from the total.

### Step 3 — Selecting a Customer (Optional but Recommended)

Linking a customer to an order enables purchase history tracking, loyalty reward qualification, layby accounts, and targeted campaigns. It takes only a few seconds at checkout.

#### Searching for an Existing Customer

1. Click **Select Customer** (above the cart).
2. A search box appears. Type at least 2 characters — the system searches by:
   - Customer name
   - Phone number
   - Customer number (e.g., `RES-CUST-000012`)
   - Email address
3. Matching results appear as a dropdown. Click the customer's name to select them.

Their name appears at the top of the cart. The order will be recorded against their account.

#### Scanning the Customer's Loyalty Card

The fastest method — no typing required:

1. Point the barcode scanner at the customer's loyalty card.
2. The system recognises the customer number barcode (format `RES-CUST-000012`) and **instantly pre-selects the customer** in the POS.
3. If the cashier is on a different business's POS than where the customer was registered, a prompt appears asking whether to switch to the correct POS.

> Scanning a loyalty card works at any time — even if someone else is using the screen. A customer scan never interrupts an in-progress sale.

#### Creating a New Customer at the POS (Inline)

If the customer is not yet in the system, you can register them without leaving the POS:

1. Click **Select Customer** → type their name → click **+ Add New Customer**.
2. Fill in:
   - **Full name** *(required)*
   - **Phone number** *(required — minimum 9 digits)*
   - Email, address, and other details are optional and can be added later
3. Click **Save**.
4. The system generates a customer number and immediately selects them for the current order.
5. A **Print Loyalty Card** button appears — print the card and hand it to the customer before they leave.

#### Why Associate a Customer with an Order?

| Benefit | How it works |
|---------|-------------|
| **Purchase history** | Every sale is recorded — manager can see what they bought and when |
| **Loyalty rewards** | Spending tracked against campaigns; eligible customers earn rewards automatically |
| **Layby accounts** | Customer can pay off items over time (requires a customer account) |
| **Targeted campaigns** | Customers who reach a spend threshold earn discount credits, free items, or WiFi passes |
| **Customer activity report** | Manager can identify top spenders, at-risk customers, and lapsed customers |

#### Continuing Without a Customer (Walk-In)

If the customer does not want to share their details or you are too busy:
- Simply leave the customer field blank and proceed.
- The sale is recorded as a **Walk-In** order — it is complete and correct, but no purchase history is attached to an individual.

### Step 4 — Processing Payment

Click **Charge** or **Pay Now** to open the payment screen.

**Choose a payment method:**

| Method | When to use |
|--------|-------------|
| **Cash** | Customer pays with notes/coins. Enter the amount received — the system calculates change. |
| **Card** | Customer pays by debit or credit card. Select Card and confirm. |
| **Check** | Customer pays by cheque. Enter cheque number. |
| **Split Payment** | Customer pays part cash and part card. Click each method and enter the amount for each. |

After selecting the method and entering amounts, click **Complete Sale**.

### Step 5 — The Receipt

After payment is processed:

1. A **receipt preview** appears.
2. Choose your printer from the dropdown.
3. Click **Print Receipt**.
4. If the sale includes a WiFi token, the token details (username and password) are printed on the receipt automatically.

> **Tip:** If the customer does not need a printed receipt, click **Skip**.

### Handling a $0 Sale (Free Items or Fully Discounted Orders)

If a discount brings the total to $0.00:
- The system will allow you to complete the sale without choosing a payment method.
- Click **Complete Sale** and a receipt can still be printed.

### Voiding / Cancelling a Sale

If you need to cancel before payment is complete:
- Click **Clear Cart** to remove all items and start over.
- If you need to cancel a completed sale, contact your manager — completed sales need to be voided by a manager.

### Customer Display Screen

If your till has a second screen facing the customer, it will automatically show:
- Items currently in the cart.
- The running total.
- Promotions and advertisements when the till is idle.
- The **salesperson's name and photo** — if a salesperson has been selected using the Salesperson Selector at the top of the POS, the display shows that person's name, not the logged-in user's name. This lets you correctly identify which staff member is serving the customer even if multiple people share the same login session.

> **Note:** The customer display updates automatically when a salesperson is selected or changed. The display always reflects the salesperson currently active on the POS, not the account used to sign in.

---

## 3. Cash Office — Cash Handling & End of Day

> **Who reads this:** Cashiers responsible for counting cash, funding the cash box, and closing the day's books.

### The Cash Bucket (Physical Cash Tracking)

The **Cash Bucket** is the system's record of physical cash at each business location. Every time cash comes in from sales or goes out for expenses, it should be recorded here.

#### Viewing Cash Box Status

Go to **Cash Bucket** in the menu. You will see:
- The current cash balance for each business location.
- Recent transactions (INFLOW = cash in, OUTFLOW = cash out).

#### Cash Comes In Automatically

Sales processed through the POS are recorded as cash inflows automatically when the cashier processes a cash payment. You do not need to enter these manually.

#### Recording a Cash Withdrawal

When cash is taken out of the cash box (for an expense, a payment run, or a transfer):
1. Go to **Cash Bucket**.
2. Click **New Entry** or **Record Withdrawal**.
3. Enter the amount, the reason, and your name.
4. Click **Save**.

Keep the printed voucher as a physical record.

### Payment Batch Workflow (Paying Approved Expenses from the Cash Box)

When approved expenses need to be paid out:

1. A manager will have approved a **Payment Batch** in the Expense Accounts module.
2. You will receive a **Withdrawal Voucher** (printed or emailed) listing how much to pull from each cash box.
3. Pull the specified cash amount from each cash box listed on the voucher.
4. Give the cash to the person being paid and ask them to sign the voucher.
5. Record the withdrawal in the Cash Bucket (if not already recorded by the system).

### End-of-Day Close — Full Walkthrough

The EOD process finalises the day's trading, transfers money into savings accounts, reconciles cash, and locks the records so they cannot be changed.

---

#### Step 1 — Open the EOD Report Page

Go to **[Your Business] → Reports → End of Day** (e.g. Restaurant → Reports → End of Day).

The page loads today's trading summary:
- Total sales and order count
- Breakdown by payment method (Cash, Card, etc.)
- Sales per employee
- Sales by category

Review these figures before proceeding. If numbers look wrong, investigate before closing.

---

#### Step 2 — Rent Transfer (if configured)

If your business has a **Rent Account** configured with "Auto-transfer on EOD" turned on, a rent transfer section appears.

**What it does:** Records the configured daily rent amount (e.g. $16.00) against the Rent Expense Account balance. This builds up the rent balance so that when rent is due the full amount is confirmed as set aside.

- Click **Include Rent Transfer** (or it may run automatically).
- The system checks whether a transfer was already done today (it will not double-transfer).
- The rent account balance increases by the daily amount.
- A transaction record is created with type `EOD_RENT_TRANSFER`.

**Important — where the money physically lives:**
The daily rent amount is tracked as part of the cash bucket (all physical cash is kept in the cash bucket). The rent account is a **bookkeeping record** that shows how much of the cash bucket is earmarked for rent. When rent is eventually paid out, the full rent amount is drawn from the cash bucket.

> If rent transfer fails (e.g. insufficient business account balance), the EOD does not stop — a warning is shown and you can proceed.

---

#### Step 3 — Auto-Deposits (if configured)

If auto-deposit rules are set up (e.g. "move $10/day into the Staff Welfare account"), a preview table appears listing every active auto-deposit:

| Account | Daily Amount | Status |
|---------|-------------|--------|
| Staff Welfare Fund | $10.00 | ✅ Will process |
| Building Maintenance | $5.00 | ⏭ Skipped (cap reached) |

**What each status means:**
- **Will process** — the deposit will run and money moves from the business account to that expense account.
- **Cap reached** — the account has already accumulated its configured maximum; no deposit today.
- **Insufficient funds** — the business account does not have enough for this deposit.
- **Frozen / Inactive** — the expense account is not accepting deposits right now.
- **Before start / After end date** — the auto-deposit schedule is outside its active window.

Click **Process Auto-Deposits** to execute. The system processes each eligible deposit and shows a results summary.

> Auto-deposits are idempotent — running EOD twice for the same date will not deposit twice.

---

#### Step 4 — Enter Manager Name and Cash Count

Two fields appear at the bottom of the EOD page:

1. **Manager Name** — type the name of the manager authorising the close. This is your electronic signature on the day's records.
2. **Cash Counted** (optional) — count the physical notes and coins in the till and enter the total here.

**What the system does with the cash count:**
- Calculates **Expected Cash** = total cash sales from the POS for the day.
- Calculates **Variance** = Cash Counted − Expected Cash.
- A positive variance means more cash than expected (overage).
- A negative variance means less cash than expected (shortage).

The variance is saved in the report. Managers review it — small variances are normal (rounding, change errors); large variances need investigation.

---

#### Step 5 — Save and Lock the EOD Report

Click **Save EOD Report** (or **Close Day**).

**What happens:**
- The report is saved as a **locked snapshot** — the figures cannot be changed after this point.
- Status changes to **Locked**.
- The cash allocation report (for the cashier's physical handover) is generated automatically.
- A notification is sent to the approver.

> Once locked, an EOD report can only be reviewed, not edited. Contact your system administrator if a correction is genuinely needed.

---

#### Step 6 — Cash Allocation Review (Cashier Follow-up)

After the EOD is saved, a **Cash Allocation Report** is created automatically. This is the cashier's checklist for handing over the day's cash to the designated accounts.

Go to **[Business] → Reports → Cash Allocation** to open it.

The report lists every money movement from the EOD:
- Rent transfer (with amount)
- Each auto-deposit (with account name and amount)

For each line item the cashier must:
1. Count the physical cash matching that line item.
2. Check the checkbox ✅ and confirm the amount.

Once all items are checked and amounts match:
- Click **Lock Allocation**.
- The system records a **Cash Bucket OUTFLOW** for each line item (cash leaving the till).
- The report status changes to **LOCKED** — the day's cash reconciliation is complete.

> **If you do not have enough cash in the till** to cover all allocation items, the system will flag it but will not block you. It records the outflows it can and marks skipped items — the manager resolves the shortfall separately.

---

#### Catching Up Missed Days (Grouped EOD)

If EOD was not run for one or more past days, use **Grouped EOD Catch-Up**:

1. Go to **[Business] → Reports → EOD Catch-Up** (or the manager will open it from Cash Allocation).
2. **Step 1 — Select days**: A list of unclosed dates appears (up to 60 days back). Tick the ones to close.
3. **Step 2 — Preview**: See the sales totals and order counts for each selected day before committing.
4. **Step 3 — Manager sign-off**: Enter the manager name and a single **total cash received** figure covering all selected days combined.
5. **Step 4 — Run**: The system closes each day in order (oldest first), running rent transfers and auto-deposits for each. A single grouped cash allocation report is created covering all selected dates.

The catch-up run is also idempotent — if it fails partway through and you run it again, already-processed days are skipped.

### Funding Payroll from the Cash Box

When the manager runs payroll, they may ask you to pull cash for salary payments:

1. The manager will generate a **Payroll Cash Box Withdrawal Voucher** (a PDF document).
2. The voucher lists each business location and how much to pull from each cash box.
3. Count out the amounts listed on the voucher.
4. Hand the cash to the payroll officer.
5. Both you and the payroll officer sign the voucher.
6. The system automatically records the withdrawal — you do not need to enter it manually.

---

### Eco-Cash to Cash Conversions

A **Cash Bucket** cashier can convert eco-cash (mobile money) into physical cash for customers or staff. The system tracks the transaction through a multi-step approval workflow so that both the eco-cash wallet balance and the physical cash balance stay accurate.

#### Who Is Involved

| Role | What they do |
|------|--------------|
| **Requester** | Submits a request for a specific dollar amount to be converted from eco-cash to cash |
| **Cashier / Approver** | Reviews the request, verifies the eco-cash balance is sufficient, and confirms the tendered amount |
| **Cashier / Completer** | Physically sends the eco-cash transfer, receives the cash, and records the final amounts |

Approver and Completer can be the same person.

---

#### Step 1 — Submitting a Conversion Request (Requester)

1. Go to **Cash Bucket** in the menu.
2. Click **New Eco-Cash Conversion** (or the equivalent button on the page).
3. Select the **business** whose eco-cash wallet will be used.
4. Enter the **amount** you want converted (in USD).
5. Add any **notes** — e.g. the reason or the recipient's name.
6. Click **Submit Request**.

The request is created with status **PENDING** and a notification is sent to cashiers with approval access.

---

#### Step 2 — Approving the Request (Cashier)

1. Open the 🔔 **bell** menu or go to **Pending Actions**. Pending eco-cash conversions appear under *Eco-Cash Conversions*.
2. Click **Review** to open the **Cash Bucket** page.
3. Find the PENDING conversion in the list.
4. Click **Approve**.
5. In the dialog, confirm the **Tendered Amount** — this is the exact eco-cash amount that will be sent to the requester. It may differ slightly from the requested amount (e.g. the requested amount is $66.00 but eco-cash fees round it to $66.35).
6. Click **Approve**.

The system checks that the eco-cash wallet has sufficient balance before approving. If the balance is too low, the approval is blocked.

The status changes to **APPROVED**.

---

#### Step 3 — Completing the Conversion (Cashier)

After approval:

1. Open the eco-cash app or use the USSD interface to send the approved amount to the requester's eco-cash number. The requester **must have the cash ready** to hand over.
2. Note the **transaction code** from the eco-cash confirmation SMS or app (e.g. `66567DE`).
3. Back in the system, find the APPROVED conversion and click **Complete**.
4. Fill in the three fields:

| Field | What to enter | Required? |
|-------|---------------|-----------|
| **Eco-Cash Transaction Code** | The reference code from the eco-cash confirmation message | Optional but strongly recommended |
| **Eco-Cash Total Sent** | The exact decimal amount debited from the eco-cash wallet (e.g. `66.35`) — may include fees | Required |
| **Cash Tendered** | The whole dollar amount of physical cash you received from the requester (e.g. `67`) | Required |

5. Click **Confirm & Complete**.

The system:
- Records an **OUTFLOW** from the eco-cash wallet for the exact eco-cash amount sent.
- Records an **INFLOW** into the cash bucket for the cash received.
- Marks the conversion as **COMPLETED** and stores the transaction code.

---

#### Step 4 — Rejecting a Request (if needed)

If a request cannot be processed (insufficient balance, incorrect amount, or suspicious request):

1. Find the PENDING conversion and click **Reject**.
2. Enter a **rejection reason** — this is saved and visible to the requester.
3. Click **Reject**.

The status changes to **REJECTED** and the requester can see the reason.

---

#### Status Overview

| Status | Meaning |
|--------|---------|
| **PENDING** | Request submitted, awaiting cashier approval |
| **APPROVED** | Cashier confirmed the tendered amount; ready to complete |
| **COMPLETED** | Eco-cash sent, cash received, ledger entries created |
| **REJECTED** | Request declined; no ledger entries created |

---

#### Important Tips

- Always record the **transaction code**. If the eco-cash payment is disputed later, the code is your proof.
- The **Eco-Cash Total Sent** (decimal) and **Cash Tendered** (integer) may differ — fees, rounding, or change. Enter both exactly as they occurred. The system uses each figure for the correct ledger side.
- The eco-cash balance check happens at **Approve** time. If another transaction reduces the balance between approval and completion, the system will still allow completion — always verify the balance yourself before sending.
- Completed conversions appear in the list with a summary: *EcoCash: $66.35 → Cash: $67* and the transaction code for quick reference.

---

## 4. Manager — Approvals, Payroll & Reports

> **Who reads this:** Business managers and business owners responsible for approving staff requests, running payroll, and reviewing financial performance.

### Your Pending Actions Queue

The 🔔 **bell icon** at the top of the screen shows you how many things are waiting for your attention.

Click the bell or go to **Pending Actions** to see everything in one place. Items include:
- Expense payment requests from staff
- Salary increase requests
- Petty cash requests
- Payroll periods ready for approval
- Eco-Cash to Cash conversion requests (cashiers only)

Click any item to review and approve or decline it.

---

### Payroll — Complete Workflow

Payroll involves several roles and a defined sequence of steps. No step can be skipped — the system enforces the order.

---

#### Who Does What

| Role | Responsibilities |
|------|----------------|
| **Manager** | Creates the period, edits entries, syncs data, submits for approval, funds the account |
| **Business Owner** | The only person who can **approve** payroll — no export is possible without owner approval |
| **Cashier** | Pulls physical cash from the cash box when the manager prints a withdrawal voucher; distributes salary to employees and collects signatures |

---

#### Payroll Period Statuses

A payroll period moves through these stages in order:

```
draft → in_progress → review → approved → exported → closed
```

| Status | Meaning |
|--------|---------|
| **Draft** | Period created, entries being built |
| **In Progress** | Manager is actively editing entries |
| **Review** | Manager has submitted — waiting for owner approval |
| **Approved** | Owner has approved — ready to export |
| **Exported** | Excel file generated and downloaded — period is locked |
| **Closed** | All payments disbursed and reconciled |

---

#### Step 1 — Manager Creates the Period

1. Go to **Payroll** in the top menu.
2. Click **New Payroll Period**.
3. Choose the business (or "All" for all businesses).
4. Set the month and year (e.g. March 2026).
5. Click **Create Period**.

The system automatically pulls in all active employees with their current salary, benefits, and allowances from their contracts. Status → **Draft**.

---

#### Step 2 — Manager Syncs Attendance and Absences

Before reviewing figures, run the sync buttons to pull in live data:

**⟳ Sync All** (blue button)
1. On the payroll period page, click **⟳ Sync All**.
2. The system processes every employee simultaneously:
   - **Absence sync** — counts recorded absence days from the HR module and applies them as deductions.
   - **Clock-in sync** — reviews all clock-in/clock-out records for the period and calculates:
     - **Tardiness deductions** — if an employee clocked in late or left early, the shortfall is converted to a deduction at their hourly rate.
     - **Overtime credits** — if they worked up to 30 minutes extra, a small credit is added.
     - **Overtime pay** — if they worked more than 30 minutes beyond the shift, a 1.5× rate overtime amount is created as a pending adjustment.

3. A summary appears: "Synced 12 entries — absences: 4, clock-in adjustments: 7".

> Run Sync All at least once before reviewing entries. You can run it multiple times — it recalculates without duplicating.

**📋 Sync Stock Shortfall** (orange button)

If your business runs stock takes, click this button to pull in any stock shortfall deductions for the period:

1. Click **📋 Sync Stock Shortfall**.
2. The system finds all fully signed-off stock take reports where the final sign-off date falls within this payroll period.
3. For each responsible employee on those reports, it calculates their share of the shortfall (total shortfall value ÷ number of responsible employees) and adds it as a deduction.
4. The deduction appears as **"Stock Shortfall Deductions (N report/s)"** in each affected employee's entry.

> If no signed-off stock take reports fall in this period, clicking the button has no effect and no deduction is applied.

**Per Diem column**

The payroll table includes a **Per Diem** column showing the total **approved** per diem for each employee in the period. Only entries with status **Approved** are counted — pending or rejected entries are excluded. This figure is fetched live from the Per Diem module and is read-only in the payroll table — to add or correct per diem entries, go to **Employees → Per Diem**.

---

#### Step 3 — Manager Reviews and Edits Individual Entries

Click any employee row to open their **Entry Detail**. Here the manager can:

**Edit basic figures:**
- Work days for the month
- Sick days and leave days taken
- Commission amount (if applicable)

**Review and approve adjustments:**
- Pending overtime credits appear with an **Approve** button — the manager sets the exact amount and approves each one.
- Pending tardiness deductions appear — the manager can override the calculated amount if circumstances warrant.

**Edit deductions:**
- Salary advance deductions for this period
- Loan repayments (auto-calculated from active loans but can be overridden)
- Miscellaneous deductions

**Review benefits:**
- All active benefits (housing allowance, medical aid, transport) are listed.
- Toggle benefits on or off for this period if needed.

**Per diem:**
- The total per diem entered separately (via Employees → Per Diem) is shown here as a read-only figure. It cannot be edited from this modal — edit it in the Per Diem module.

The entry shows a running breakdown:
```
Basic Salary:                  $500.00
Commission:                    $  0.00
Overtime:                      $ 12.50
Benefits:                      $ 30.00
──────────────────────────────────────
Gross Pay (excl. Per Diem):    $542.50
Per Diem (approved):           $ 45.00
──────────────────────────────────────
Gross Pay (incl. Per Diem):    $587.50
Advances/Loans:              - $ 50.00
Stock Shortfall Deductions:  - $  8.25
──────────────────────────────────────
Net Pay:                       $529.25
```

> **Per diem is included in gross and net pay.** The totals shown on the period page, the spreadsheet export, and the payslip capture all include approved per diem. Only **approved** per diem entries count — pending and rejected entries are excluded.

> **Stock Shortfall Deductions** appear only if the employee was listed as a responsible party on one or more signed-off stock take reports in this period. The amount is calculated automatically when the manager clicks **Sync Stock Shortfall**.

---

#### Step 4 — Manager Checks the Payroll Total and Funds the Account

At the top of the period page the **total net pay** for all employees is shown. Compare this against the **Payroll Account Balance**.

If the account is short:

> ⚠ **Payroll requires $4,250.00 — account balance is $3,100.00 (short by $1,150.00). Please fund the account before approving.**

**To fund:**
1. Click **💵 Fund Payroll**.
2. The system calculates how much to pull from each business's cash box.
3. Print the **Withdrawal Voucher** and hand it to the cashier.
4. The cashier counts the cash, signs the voucher, and confirms.
5. The payroll account balance updates automatically.

Repeat until the balance covers the total net pay.

> **Cash box earmarks:** When you fund payroll, the amount is recorded against this payroll period in each business's cash box as a **Payroll Funding** earmark. These earmarks remain visible in the cash bucket view until the payroll period is **Approved** — at which point they are automatically cleared. This keeps the cash bucket display accurate during the funding window.

---

#### Step 5 — Manager Submits for Owner Approval

Once all entries look correct and the account is funded:

1. Click **Submit for Review**.
2. Status → **Review**.
3. The business owner receives a notification that payroll is ready to approve.

> **Only the business owner can approve.** Managers cannot approve their own payroll submission.

---

#### Step 5b — Sending Back to In Progress (if corrections are needed)

If the owner or manager notices an issue after the period has been submitted for review, any user with payroll access can send it back:

1. Open the payroll period (status: **Review**).
2. Click **↩ Back to In Progress**.
3. Status → **In Progress**.
4. Make the necessary corrections and repeat Steps 3–5.

---

#### Step 6 — Owner Reviews and Approves

The owner opens the payroll period (from the notification or from **Payroll** in the menu):

1. Review the period summary — total employees, gross pay, deductions, net pay.
2. Confirm the payroll account balance is sufficient (shown on screen).
3. Click **Approve Payroll**.
4. Status → **Approved**.

**What happens automatically on approval:**
- Approval timestamp and owner name are recorded.
- Any **Payroll Funding** earmarks in each business's cash box are automatically cleared — the cash is now fully transferred and the earmark display resolves.
- Any loan deductions in the payroll entries are automatically reconciled — the loan balances decrease and repayment records are created.

---

#### Step 7 — Export the Payroll Spreadsheet

With the period approved, the manager exports the payroll spreadsheet:

1. Click **Export to Excel** (for the current month) or **Export YTD** (all months January to current).
2. The system generates a `.xlsx` file.
3. Status → **Exported**. The period is now **locked** — no further changes can be made.

**Columns in the exported spreadsheet:**

| Column | Source |
|--------|--------|
| ID Number | Employee national ID |
| Date of Birth | Employee profile |
| First Name | Employee profile |
| Last Name | Employee profile |
| Work Days | Entry (from sync or manual) |
| Basic Salary | Employment contract |
| Commission | Contract / manual override |
| Living Allowance | Contract allowances |
| Vehicle Reimbursement | Contract allowances |
| Travel Allowance | Contract allowances |
| Overtime | Approved overtime adjustments |
| **Per Diem** | Approved per diem entries for the month (from Per Diem module — pending and rejected entries excluded) |
| Benefits | Total of all active benefits |
| Advances | Salary advances deducted |
| Loans | Loan repayments deducted |
| Gross Pay | Sum of all earnings |
| Deductions | Advances + loans |
| Net Gross | Gross Pay − Deductions |

> **Per Diem in the export:** Only **approved** per diem entries are included in the exported spreadsheet. Pending or rejected entries are excluded. Per diem is included in both the **single-month export** and the **Year-to-Date multi-tab export**, and in the Gross Pay total. Use the **Regenerate Export** button to re-download an already-exported period — the per diem values are included in regenerated files too.

The exported spreadsheet contains all gross pay, OT, per diem, and benefit figures. It can be handed to an external payroll bureau or accountant if required, or used to verify figures before filing.

---

#### Step 8 — Post-Export: Payslips, ZIMRA, and Statutory Returns

**Payslips are auto-populated on export.** When you export (or regenerate) the payroll spreadsheet, the system automatically calculates PAYE, AIDS Levy, and NSSA Employee contributions for every employee and creates a payslip record for each one with status `CAPTURED`. You do not need to enter these figures manually.

**Reviewing and adjusting captured payslips:**
1. Return to the exported period in **Payroll**.
2. Click **📋 Capture Payslips**.
3. The table shows all employees with their auto-populated values:
   - **Total Earnings**, **PAYE Tax**, **AIDS Levy**, **NSSA Emp**, and **Nett Pay** are read-only — calculated by the system.
   - **NEC Emp**, **Net Round**, **WCIF**, **NEC Co.**, **Loan Recovery**, **Advance**, **Other Ded.**, **Leave Days**, and **Pay Point** are editable — fill these in as needed.
4. Click **Save All** to save any edits.
5. Click **Mark Distributed** once physical payslips have been handed to employees (status → `DISTRIBUTED`).

> Statutory deductions displayed in the capture modal are calculated using the Zimbabwe tax brackets, NSSA rate, and AIDS Levy rate configured in **Settings → Tax Constants**. Verify these are up to date before each payroll run.

**ZIMRA P2 Remittance Voucher:**
- Click **Print ZIMRA Voucher** on the period page to generate a two-page PDF:
  - **Page 1 — NSSA Voucher:** lists total NSSA employee and employer contributions.
  - **Page 2 — PAYE Voucher:** lists total gross PAYE and AIDS Levy due.
- The voucher shows your company name, address, registration number, and the pay period.
- Use the blank fields at the bottom of each page to record the **Payment Reference**, **Bank / Branch**, and payment date when you make the transfer.

**ZIMRA Year-to-Date (P14 / ITC):**
- Use the **Export YTD** button to download all months January to December in a single multi-tab file.
- This is used by your accountant or tax agent to prepare annual employee tax certificates (ITF16 / P14).

> **Tax calculations:** PAYE is computed using the configured monthly tax brackets on the employee's taxable gross (excluding non-taxable per diem). AIDS Levy is a percentage of PAYE. NSSA Employee is a percentage of the employee's contractual basic salary (capped at the NSSA ceiling). All rates are set in **Settings → Tax Constants**.

---

#### Step 9 — Disbursing Payments to Employees

After export, the manager can use the **Payroll Account Payments** page to record individual payments directly from the payroll account balance:

**Opening the payments page:**
- Go to **Payroll → Payroll Account → Make Payments**, or
- Click **💸 Process Payments** on the period page.

**How it works:**

1. The page shows the current **Payroll Account Balance** at the top.
2. Under **Batch Settings**, choose:
   - **Default Amount** — a base amount to apply to multiple employees at once (starts at $0 — enter the correct amount or use per-employee amounts)
   - **Payment Type** — Regular Salary, Bonus, or Commission
   - **Payment Schedule** — Weekly, Bi-weekly, or Monthly
3. Under **Select Employees**, tick each employee to pay:
   - Enter the exact payment amount in their row (or use a quick-amount button: $500, $1000, $1500, $2000)
   - Click **📝 Note** to add an optional note for that payment (e.g. reason for a different amount)
4. Use **Select All** to tick every employee, then **Apply Default Amount to Selected** to fill in a uniform amount.
5. The green summary bar at the bottom shows the **Total Payment Amount** and the **Balance After Payment**.
6. Click **Process X Payments** to submit.

> **Process Payments is disabled if the total exceeds the payroll account balance.** Top up the account first if needed.

For employees paid by bank transfer, initiate the transfer externally and use this page to record the transaction against their name.

---

#### Step 10 — Closing the Period

After all payments are disbursed and payslips are captured:

1. Return to the payroll period.
2. Click **Close Period**.
3. Status → **Closed**.

The period is archived. It remains visible under **Payroll → History** and is included in all historical reports.

---

### Setting Daily Sales Performance Targets

The POS displays a live **performance bar** while cashiers are selling. It shows how close today's sales are to your target, using three colour bands. Managers set these thresholds per business.

**Where to configure:**
Go to **[Business] → Settings → POS Settings → Sales Performance Targets** (or **Universal → POS → Settings → Performance**).

**The three thresholds:**

| Field | What it means | Example |
|-------|--------------|---------|
| **Fair minimum ($)** | Sales below this amount show 🔴 Low — the day is off to a slow start | $100 |
| **Good minimum ($)** | Sales at or above this amount show 🟢 Good — on track | $150 |
| **Full bar amount ($)** | The progress bar fills to 100% at this amount — the target to hit | $200 |

**Rules:**
- Fair minimum must be at least $1.
- Good minimum must be higher than Fair minimum.
- Full bar amount must be at least as high as Good minimum.

**How to set them:**
1. Enter your three dollar amounts.
2. The live preview below the form shows sample badges — e.g. "$80 = 🔴 Low", "$130 = 🟡 Fair", "$180 = 🟢 Good".
3. Click **Save**. Changes take effect the next time the POS page loads.

> **Tip:** Set the Full bar amount to your realistic daily target, not a stretch goal. Cashiers should be able to reach 🟢 Good on a normal trading day. Reserve the Full bar as a "great day" milestone.

When sales exceed the Full bar amount, the badge shows ⭐ stars — one extra star for every 10% above the target, up to five stars.

---

### Payment Request Workflow — From Submission to Payment

This describes the full lifecycle of an expense payment request, including the notification bells at each stage.

#### Stage 1 — Employee Submits a Request

An employee goes to **Expense Accounts → [Account Name] → New Payment Request** and fills in:
- Amount
- What it is for (description)
- Reference number or receipt number (if available)

They click **Submit for Approval**.

**What happens:**
- A payment request record is created with status **SUBMITTED**.
- A 🔔 notification is sent to the manager(s) authorised to approve payments from that account.
- The bell icon on the manager's screen shows an increased count.

---

#### Stage 2 — Manager Reviews and Approves

The manager sees the bell 🔔 and clicks it (or goes to **Pending Actions**). The request appears with the submitter's name, amount, account, and description.

**Manager actions:**

| Action | What happens |
|--------|-------------|
| **Approve** | Request status → **APPROVED**. Employee receives a 🔔 notification that their request was approved. Request is queued for the next payment batch. |
| **Decline** | Manager enters a reason. Request status → **DECLINED**. Employee receives a 🔔 notification with the reason. |

> Approved requests are not paid immediately — they wait for a payment batch to be processed.

---

#### Stage 3 — Payment Batch (Grouping Approved Requests)

When enough approved requests have accumulated, the manager creates a batch:

1. Go to **Expense Accounts → Payment Batches → New Batch**.
2. The system groups all **APPROVED** requests into a single batch.
3. Review the batch — you see each payee, their amount, and the source account.
4. On the review screen, **Approve** or **Reject** each individual payment:
   - Approved items are paid out; rejected items are returned to the queue for the next cycle.
   - You may reject all items (e.g. to defer the entire batch) — the batch can still be processed.
5. Click **Process & Print Report** once every payment has a decision.
6. Print the **Batch Payment Voucher** as a physical record.

**What happens:**
- Approved requests move to status **APPROVED** and cash is disbursed from the cash bucket.
- Rejected requests return to **QUEUED** and will appear in the next EOD batch.
- The cashier receives a 🔔 notification that a payment batch needs physical cash disbursement.
- The batch appears in the Cash Office payment queue.

---

#### Stage 4 — Cash Disbursement (Cashier)

The cashier opens the batch from their queue:

1. Go to **Cash Office → Payment Batches** (or the notification link).
2. The batch lists each payee and amount.
3. For each payee: count out the cash, hand it to them, and mark the line item **Paid** (or the payee signs a slip).
4. Once all items are disbursed, click **Mark Batch Complete**.

**What happens:**
- Each request moves to status **PAID**.
- A Cash Bucket **OUTFLOW** entry is recorded for the total batch amount.
- Each submitter receives a 🔔 notification: "Your payment request of $XX has been paid."

---

#### Notification Bell Summary

| Event | Who gets notified |
|-------|------------------|
| Employee submits a request | Manager (🔔 +1 on bell) |
| Manager approves | Employee (🔔 "Your request was approved") |
| Manager declines | Employee (🔔 "Your request was declined: [reason]") |
| Batch created / ready to pay | Cashier (🔔 "Payment batch ready for disbursement") |
| Batch marked complete / paid | Each payee in the batch (🔔 "Your payment has been processed") |

---

### Approving Expense Payment Requests

When an employee submits an expense request, you will receive a notification.

1. Go to **Pending Actions** or **Expense Accounts → Payment Batches**.
2. Find the request and click to open it.
3. Review the amount, the description, and any supporting notes.
4. Click **Approve** (or **Decline** with a reason).

Approved payments are added to the next **payment batch** for processing.

#### Processing a Payment Batch

When several approved payments have built up:

1. Go to **Expense Accounts → Payment Batches**.
2. Click **New Batch** to group the pending approved payments together.
3. Review the batch — you will see each payee, the amount, and the source expense account.
4. Click **Review Batch** to open the final review screen.
5. For each payment, click **Approve** or **Reject**:
   - **Approve** — the payment will be processed and cash disbursed.
   - **Reject** — the payment is returned to the queue for the next EOD cycle (useful when funds are unavailable or timing is wrong). You can reject **all** payments in a batch — the batch can still be processed with zero approvals.
6. Once every payment has a decision, click **Process & Print Report**.
7. Print the **Batch Payment Voucher** as a record.

> **Rejecting a rent payment:** If the rent payment is not ready to go out (e.g., landlord gave an extension), reject it in the batch review — it will reappear in the queue for the following EOD and can be approved then.

---

### Reading Reports

Go to **Reports** in the top menu to access all available reports.

#### Sales Reports

| Report | What it shows |
|--------|---------------|
| **Sales Summary** | Total revenue by day, week, or month |
| **Top Products** | Best-selling items by quantity and value |
| **Sales by Employee** | Which staff member processed what sales |
| **Order History** | Full list of all transactions with details |

#### Payroll Reports

| Report | What it shows |
|--------|---------------|
| **By Employee** | Total paid to each employee over a date range |
| **By Payment Type** | Salary, bonus, advance breakdown |
| **Monthly Summary** | Month-by-month payroll costs |
| **ZIMRA Report** | Tax submission format |

#### Expense Reports

| Report | What it shows |
|--------|---------------|
| **Account Overview** | Balance and activity for each expense account |
| **By Category** | Where money is being spent |
| **Lending Analysis** | Loan repayment performance |

#### Customer Reports

| Report | What it shows |
|--------|---------------|
| **Customer Activity** | Purchase history for individual customers |
| **Top Customers** | Customers ranked by spend |
| **Loyalty Summary** | Points earned and redeemed |

**Saving a Report:**
After setting your filters (date range, business, category), click **Save Report**. You can find it again under **Reports → Saved Reports**.

**Exporting a Report:**
Click **Export CSV** or **Export PDF** to download the report for use in Excel or for printing.

---

### Salary Increases and Contract Updates

#### Requesting a Salary Increase

When an employee is due a raise, the manager submits a salary increase request. The business owner must approve it before the new salary takes effect.

1. Go to **Employees** and open the employee's profile.
2. Click **Request Salary Increase**.
3. Fill in:
   - **New salary amount** — the proposed new monthly or hourly rate.
   - **Effective date** — the date the new rate should start (can be future-dated).
   - **Reason** — e.g. "Annual review", "Promotion to Senior Cashier", "Cost of living adjustment".
4. Click **Submit**.

The business owner receives a 🔔 notification. They open the request, review the current vs proposed salary, and click **Approve** or **Decline with reason**.

Once approved:
- The employee's salary record updates to the new amount from the effective date.
- The next payroll period created after the effective date will use the new salary automatically.
- A salary history record is kept on the employee's profile showing the previous amount, the new amount, the date, and who approved it.

---

#### Creating a New Contract to Override the Current One

When an employee's role, salary, or terms change significantly — such as a promotion, a role change, or a new fixed-term — you create a **new contract** rather than editing the existing one. The old contract is retained as a historical record; the new one becomes active.

**When to create a new contract (rather than just updating a salary):**
- Employee is promoted to a different role or department
- Employment type changes (e.g. contract → permanent, or hourly → salaried)
- Notice period or working hours change
- A completely new set of duties applies
- A fixed-term contract is being renewed with new terms

**Steps:**
1. Open the employee's profile → **Contracts** tab.
2. The current active contract is shown. Do **not** edit it.
3. Click **New Contract**.
4. Fill in all the contract fields (see Employment Contracts section above for the full field list).
5. Set the **start date** — this is when the new contract takes effect. This date should be the day after the old contract ends, or the agreed commencement date.
6. If the previous contract was fixed-term and is being replaced, set its **end date** to the day before the new contract starts (if not already set).
7. Add the new duties for the new role.
8. Save as Draft → print → get signed → upload signed copy → Approve.

Once active, the **new contract's salary and benefits** are used in all subsequent payroll runs. The old contract remains on record under the Contracts tab but is marked as Inactive or Superseded.

---

#### Contract Renewal (Fixed-Term Contracts)

Fixed-term contracts have an end date. When the end date approaches, the system flags the contract as **Expiring Soon** on the HR dashboard.

**To renew:**
1. Open the employee's profile → **Contracts** tab.
2. Find the expiring contract.
3. Click **Renew** (or **New Contract** if the terms are changing).
   - **Renew** extends the same terms for a new period — update the end date and re-sign.
   - **New Contract** creates a fresh contract (use this if salary, duties, or type are changing).
4. Set the new start and end dates.
5. Print, sign, upload, and approve as normal.

> **If a contract expires without renewal:** The employee's record shows a warning on the HR dashboard. They remain active in the system but the contract is shown as Expired. Payroll continues to run using the last known salary — but address the renewal as soon as possible to keep records compliant.

---

## 5. HR & Employee Management

> **Who reads this:** HR staff and managers who add employees, manage contracts, and track attendance.

### Adding a New Employee

1. Go to **Employees** in the menu.
2. Click **Add Employee**.
3. Fill in the employee's details:
   - Full name
   - ID number
   - Contact details (phone, address)
   - Job title
   - Department
   - Employment type (full-time, part-time, contract)
4. Set their salary:
   - Choose salary type (Fixed Monthly, Hourly, Commission)
   - Enter the amount
5. Click **Save Employee**.

The employee will receive a welcome email with login instructions if they need system access.

### Employment Contracts — Full Workflow

An employment contract documents the terms of employment agreed between the business and the employee. The system stores contracts digitally and tracks their status from draft through to signed.

#### What Must Be Captured

A complete contract record should include:

| Field | Notes |
|-------|-------|
| **Employee name** | Auto-filled from their profile |
| **Job title** | Their official title |
| **Department** | Which department they belong to |
| **Employment type** | Full-time, Part-time, or Contract |
| **Start date** | When employment begins |
| **End date** | Required for fixed-term contracts; leave blank for permanent |
| **Probation period** | Duration in months (if applicable) |
| **Salary** | Monthly or hourly rate, as agreed |
| **Notice period** | How many days/weeks notice is required by either party |
| **Employee duties** | The specific responsibilities for this role (see below) |
| **Contract document** | Uploaded PDF of the signed contract |

#### Adding Employee Duties

Duties are the specific tasks and responsibilities for the employee's role. They appear on the printed contract.

1. Open the employee's profile.
2. Go to the **Contracts** tab.
3. Under the contract being created or edited, find the **Duties** section.
4. Click **Add Duty**.
5. Type the duty description (e.g., "Operate the cash register and process all sales transactions accurately").
6. Add as many duties as needed — one per line.
7. Duties can be reordered by dragging.

> **Tip:** Keep duties specific and measurable. They become part of the performance review framework.

#### Creating and Printing a Contract

**To create a new contract:**
1. Open the employee's profile.
2. Go to the **Contracts** tab.
3. Click **New Contract**.
4. Fill in all the required fields (see table above).
5. Add duties.
6. Click **Save as Draft**.

**To print the contract for signing:**
1. With the contract open, click **Print Contract** (or **Preview & Print**).
2. The system generates a formatted contract document with all the details and a signature block at the bottom.
3. Print two copies — one for the employee, one for the file.
4. Both the employee and the manager sign both copies.

#### Uploading a Signed Contract

After both parties have signed the printed copy:
1. Scan or photograph the signed document.
2. Open the employee's profile → **Contracts** tab.
3. Click **Upload Signed Contract** (or click into the draft contract and choose **Upload**).
4. Select the scanned PDF or image file.
5. Click **Save** — contract status changes from **Draft → Active**.

#### Approving a Contract

If your business requires a senior manager or owner to approve contracts before they are active:
1. After saving the contract as a draft, click **Submit for Approval**.
2. The designated approver receives a 🔔 notification.
3. They open the contract, review the terms and duties, and click **Approve**.
4. Contract status → **Active**.

---

### Converting an Employee to a System User

Employees who need to log into the system (e.g. a cashier who processes sales, or an HR officer who manages records) must be given a **user account** linked to their employee profile.

#### Step 1 — Check if a User Account Already Exists

1. Open the employee's profile.
2. Look for a **System Access** or **User Account** section.
3. If it shows "No system account", you can create one.

#### Step 2 — Create the User Account

1. Still on the employee's profile, click **Grant System Access** (or **Create User Account**).
2. Confirm or set their **login email** (usually their work email address).
3. A temporary password is generated — the employee will be prompted to change it on first login.
4. Click **Create Account**.

The employee is now both an employee record and a system user. Their clock-in card still works; they can also log in to the full system.

#### Step 3 — Assign Permissions

After creating the user account, assign the correct permissions for their role:

1. Go to **Users** (or **Settings → Users → [Employee Name]**).
2. Click **Manage Permissions**.
3. Permissions are grouped by area. Tick what applies to their role:

| Permission Group | Examples |
|-----------------|---------|
| **POS** | Process sales, apply discounts, void items |
| **Inventory** | Add products, adjust stock, print labels |
| **Expense Accounts** | Submit payment requests, view balances |
| **Cash Office** | Record cash entries, run EOD, lock allocations |
| **Payroll** | View payslips, submit per diem, manage payroll (manager) |
| **Employees** | View employees, add employees, manage contracts |
| **Reports** | View sales reports, export data |
| **Cash Allocation** | Approve and lock cash allocation reports |
| **Barcode** | Print labels, manage templates |

4. Click **Save Permissions**.

> Permissions take effect the next time the employee logs in. If they are already logged in, ask them to log out and back in.

#### Typical Permission Sets by Role

| Role | Suggested Permissions |
|------|-----------------------|
| Cashier | POS (process sales), view-only inventory |
| Stock Manager | Inventory (full), barcode (print labels) |
| Cash Office Clerk | Cash Office (EOD, bucket entries), expense accounts (view) |
| HR Officer | Employees (full), payroll (view) |
| Manager | All of the above + approvals, reports, payroll management |
| Owner | Full access to everything |

### Employee Benefits

To add benefits to an employee (e.g., housing allowance, medical aid, transport):

1. Open the employee's profile.
2. Go to the **Benefits** tab.
3. Click **Add Benefit**.
4. Choose the benefit type and enter the amount.
5. Set whether it is taxable or not.
6. Click **Save**.

Benefits are automatically included in the next payroll run.

### Tracking Absences

Absences affect payroll and attendance records. Managers can record absences directly, or employees can submit leave requests that managers then approve.

#### Absence Types

| Type | Meaning | Payroll Impact |
|------|---------|---------------|
| **Sick Leave** | Employee is unwell | Paid if sick leave balance allows; unpaid if exhausted |
| **Annual Leave** | Planned time off | Paid from leave balance |
| **Unpaid Leave** | Approved absence, no pay | Deducted from salary |
| **Absent Without Leave (AWOL)** | No notice, no approval | Deducted; may trigger disciplinary |
| **Public Holiday** | National holiday | Paid (no leave balance consumed) |
| **Maternity / Paternity** | Statutory leave | Follow statutory rules |

---

#### Recording an Absence (Manager)

1. Go to **Employees → Absences**.
2. Click **Record Absence**.
3. Select the employee from the dropdown.
4. Choose the **absence type** from the list above.
5. Enter the **start date** and **end date** (for a single day, both dates are the same).
6. Optionally add a **note** (e.g. "Doctor's certificate submitted").
7. Click **Save**.

The absence is immediately reflected in:
- The employee's attendance record
- The payroll period for those dates (deduction calculated at next payroll sync)
- The manager's absence report

> **Tip:** If an employee was absent but forgot to tell you, you can back-date the entry. The system allows absence dates in the past.

---

#### Employee Self-Reporting (Leave Request)

Employees can submit their own leave requests before the absence happens:

1. Employee goes to **My Profile → Leave Requests**.
2. Clicks **Request Leave**.
3. Selects leave type, dates, and adds an optional reason.
4. Submits — manager receives a **🔔 notification** in the bell.

Manager then:
1. Opens the notification or goes to **Employees → [Employee] → Time Off**.
2. Reviews the dates and the employee's remaining leave balance (shown on the same page).
3. Clicks **Approve** or **Decline**.
4. Employee is notified of the decision.

---

#### Viewing the Absence Report

Go to **Employees → Absence Report** (or **Reports → Absences**) to see:

- All absences across all employees for a selected period
- Filtered by employee, absence type, or date range
- Total days absent per employee
- Summary of paid vs unpaid days

Absence data is also visible inside each employee's individual profile under the **Attendance** tab.

---

#### How Absences Affect Payroll

When you run payroll:
- **Unpaid absence days** are automatically deducted from the gross salary (pro-rated by number of working days in the period).
- **Paid leave** is counted as a working day — no deduction.
- **AWOL days** are treated as unpaid.
- The payroll entry detail modal shows the breakdown — you can see the number of absent days that were deducted.

> If an absence is recorded *after* payroll has already been exported, you will need to manually adjust the next payroll period or handle it as a manual deduction.

---

#### Leave Balances

Each employee's leave balance is tracked under their profile:
- **Annual leave** accrues over time (configured per employment type).
- When leave is approved, the balance decreases automatically.
- Managers can manually adjust a balance (e.g. carry-over from previous year) in the **HR → Leave Balances** settings.

---

### Managing Time Off Requests

Employees can submit leave requests through the system. When they do:

1. You will receive a notification.
2. Go to **Pending Actions** or **Employees → [Employee Name] → Time Off**.
3. Review the dates and type of leave.
4. Check their leave balance (shown on the same page).
5. Click **Approve** or **Decline**.

The employee will be notified of your decision.

### Employee Scan Cards (ID / Clock-In Cards)

Every employee has a personal barcode card used to clock in and out quickly. The card contains the employee's name, photo, and a unique barcode.

**Issuing or reprinting a card:**
1. Open the employee's profile (**Employees → [Employee Name]**).
2. Go to the **ID Card** tab (or **Clock-In Card** tab).
3. Click **Print Card**.
4. The card opens as a printable page — **the front and back are laid out side by side on one sheet** so the card can be folded in half. Print the page, fold down the centre line (the two halves will face outward), trim to card size, laminate, and hand to the employee.

```
┌─────────────────┬─────────────────┐
│   FRONT (face)  │   BACK (barcode)│
│                 │                 │
│  [Photo]        │  |||||||||||    │
│  Employee Name  │  EMP-000012     │
│  Job Title      │                 │
└─────────────────┴─────────────────┘
         ↑ fold here ↑
```

> Print on plain A4, fold in half along the centre line, trim the edges, and laminate. A standard credit-card-sized laminating pouch works perfectly.

**Updating a card (e.g. name change or new photo):**
1. Update the employee's details or profile photo on their profile.
2. Return to the **ID Card** tab and reprint — the card automatically reflects the latest information.

> Cards use the employee's unique number (e.g. `RES-EMP-000012`) as the barcode value. If a card is lost, simply reprint from the same screen — the barcode does not change.

### How Barcode Scanning Works System-Wide — Full Priority Order

The system has a **global barcode scanner** that is always active on every screen. Every scan — no matter what page is open — is passed through a fixed priority chain. The chain stops at the first match. Understanding this order explains why the same physical scanner serves multiple purposes without conflict.

---

#### The Priority Chain (Highest to Lowest)

```
Barcode scanned
       │
       ▼  PRIORITY 1 ── Is this an employee card?
       │                Pattern: RES-EMP-000012 / GRO-EMP-000007 etc.
       │                YES → Clock-in / clock-out popup
       │                      Current user's screen is paused but preserved
       │                      Employee confirms in/out → popup closes
       │                      STOP — nothing else checked
       │                NO  ↓
       ▼  PRIORITY 2 ── Is this a customer loyalty card?
       │                Pattern: RES-CUST-000012 / GRO-CUST-000007 etc.
       │                YES → Customer pre-selected in POS
       │                      (or navigates to correct POS if not already there)
       │                      STOP — nothing else checked
       │                NO  ↓
       ▼  PRIORITY 3 ── Is this a product barcode / inventory item?
                        Runs the full multi-step inventory lookup:
                        3a. Check current business products
                        3b. Check clothing bales (by barcode or SKU)
                        3c. Check barcode templates
                        3d. Check other businesses (cross-business global lookup)
                        3e. Completely unknown → Quick Stock Add form
```

---

#### Priority 1 — Employee Clock-In Card (Highest Priority)

**Recognised by:** The barcode matches the format of an employee number (e.g., `RES-EMP-000012`).

**What happens:**
- A clock-in/clock-out popup immediately overlays whatever is on screen.
- The current user's work is **not lost** — it is paused underneath.
- The employee selects Clock In or Clock Out and the system captures their photo.
- The popup closes and the previous user's screen resumes exactly as it was.

**Why this has the highest priority:** An employee scan must always work — a cashier should never have to stop a sale, log out, let someone clock in, then log back in. The clock-in is a quick overlay that does not touch the active session.

> If an employee's card is scanned but they have no pending clock action (e.g. they already clocked in and it is not yet time to clock out), the system may show a brief confirmation rather than a full prompt.

---

#### Priority 2 — Customer Loyalty Card

**Recognised by:** The barcode matches the customer number pattern (e.g., `RES-CUST-000023`, `CLO-CUST-000007`).

**What happens — three scenarios:**

| Scenario | Result |
|----------|--------|
| Cashier is on the **correct business's POS** (e.g. scanning a restaurant customer card while on the restaurant POS) | Customer is instantly pre-selected in the POS cart. No navigation, no typing. |
| Cashier is **not on any POS** (e.g. on a reports page) | System navigates to the correct POS for that customer's business with the customer pre-loaded. |
| Cashier is on a **different business's POS** (e.g. on grocery POS, customer is from clothing store) | Confirmation prompt: "Switch to [Clothing] POS for this customer?" — cashier can accept or cancel. |

**Why Priority 2 comes before inventory:** A customer card scan is always intentional — the cashier or customer is deliberately presenting the card to start a transaction. It should never be treated as a product lookup. The customer number format is distinct enough that false matches against product barcodes are not possible.

---

#### Priority 3 — Product / Inventory Barcode (Lowest Priority, Most Common)

**Recognised by:** Anything that did not match employee or customer patterns.

This triggers the full inventory lookup sequence described in the Inventory section:

| Sub-step | Checks | Result on match |
|----------|--------|----------------|
| **3a** | Current business's product list | Add to cart / show in inventory |
| **3b** | Clothing bales (barcode or SKU) | Add bale to cart at unit price |
| **3c** | Barcode templates | Show template card → create product |
| **3d** | All other businesses (global) | Show cross-business match → option to stock here |
| **3e** | No match anywhere | Quick Stock Add form opens |

See the **Adding Inventory by Scanning a Barcode** section in Section 14 for the full detail on each sub-step.

---

#### Why This Order Makes Sense

| Priority | Reason it comes first |
|----------|----------------------|
| Employee clock-in | Must work at all times on any screen without any friction. An employee scan should never accidentally add a product to a cart or select a customer. |
| Customer loyalty card | A card scan is always intentional and should immediately set up the POS for that customer. Checking inventory first could cause a customer card to be misidentified as a product barcode. |
| Product / inventory | The most common scan type but also the most flexible — it has its own multi-step lookup and fallback logic, so it is safe to run only after the more specific checks have cleared. |

---

#### The 4-Character Minimum

The global scanner ignores input shorter than 4 characters. This prevents stray keystrokes (e.g. a fast typist in a text field) from accidentally triggering a scan. Scanners typically send 8–13 characters in under 80 milliseconds — the system detects this rapid input rate and treats it as a scan rather than keyboard typing.

---

#### When Two Cards Could Conflict

In practice, formats are designed to be distinct:

| Card type | Format | Example |
|-----------|--------|---------|
| Employee card | `XXX-EMP-000000` | `RES-EMP-000012` |
| Customer card | `XXX-CUST-000000` | `RES-CUST-000023` |
| Product barcode | Any other format | `5000112637922`, `BALE-HXI-042`, custom codes |

The `-EMP-` and `-CUST-` segments in the middle make employee and customer cards unambiguous regardless of what the business prefix or number is. A product barcode will never contain `-EMP-` or `-CUST-` unless someone deliberately assigned those strings, which the system will flag as a conflict at the time of barcode assignment.

### Clock-In Reports

To see attendance records:

1. Go to **Employees → Clock-In → Reports**.
2. Choose the date range and (optionally) filter by employee.
3. The report shows each day with clock-in time, clock-out time, and total hours.
4. Click **Export** to download as CSV or PDF.

---

### Manually Managing Clock-In Records

Managers can view, add, edit, and correct any clock-in record. This covers situations where an employee forgot to scan, clocked in but forgot to clock out, was clocked in by a colleague, or where the system missed a scan.

#### Viewing an Employee's Attendance History

1. Go to **Employees → [Employee Name] → Clock-In** (or **Employees → Clock-In → Records**).
2. Select the date range.
3. Each row shows: Date, Clock-In Time, Clock-Out Time, Total Hours, and whether a photo was captured.
4. Rows with missing data (e.g. no clock-out) are highlighted so they are easy to spot.

#### Adding a Missing Clock-In Entry

If an employee was present but has no record for a day:

1. Go to **Employees → Clock-In → Records**.
2. Click **Add Entry** (or **New Manual Entry**).
3. Select the employee.
4. Enter the date.
5. Enter the **clock-in time** (the time they arrived — use the actual time or your best estimate based on paper records or CCTV).
6. Enter the **clock-out time** (the time they left) — or leave blank if they are still clocked in.
7. Add a **note** explaining the manual entry (e.g., "Scanner offline — entry added from paper register").
8. Click **Save**.

The entry is saved with a flag indicating it was manually created by a manager.

#### Editing an Existing Record

To correct a wrong time or fill in a missing clock-out:

1. Find the record in the attendance list.
2. Click the row (or click **Edit** on the row).
3. Update the clock-in time, clock-out time, or both.
4. Add or update the note.
5. Click **Save**.

> The original scan time (if any) is preserved in the audit log. The edited values are what appear in reports and payroll calculations. The edit history shows who changed the record and when.

#### Correcting a Missing Clock-Out

The most common issue is an employee who clocked in but never clocked out (e.g. they left without scanning, or the shift ended past midnight).

1. Find the open record — it will show a clock-in time but no clock-out.
2. Click **Edit** → enter the correct clock-out time.
3. Save with a note (e.g., "Clock-out added — employee left at shift end per manager records").

If you do not know the exact time, enter the standard shift end time and note that it is an estimate.

#### What "Missing Data" Looks Like in Reports

Clock-in records that are incomplete or manually entered are flagged in the report view:

| Indicator | Meaning |
|-----------|---------|
| ⚠ No clock-out | Employee clocked in but has no clock-out time — hours cannot be calculated |
| ✏ Manual entry | Record was created or edited manually by a manager |
| 📷 No photo | Clock-in happened without a camera capture (manual entry or scanner-only mode) |

Hours for payroll are only calculated when both clock-in and clock-out are present. Records marked ⚠ must be resolved before the payroll period closes.

---

### Printing Clock-In Sheets

If your business uses paper sign-in sheets as a backup:

1. Go to **Employees → Clock-In → Bulk Print**.
2. Select the employees and the period.
3. Click **Print Sheets**.

---

### Employee Termination — Full Checklist

When an employee leaves the business (resignation, dismissal, end of contract, or redundancy), a series of steps must be completed in the system to close out their records correctly and prevent continued system access.

---

#### Step 1 — Run Final Payroll

Before terminating the employee record, ensure their final payroll is processed:

1. Check whether they have outstanding clock-in records that need correction (see Manually Managing Clock-In Records).
2. Ensure any remaining leave days owed are recorded — unpaid leave entitlements may need to be paid out as a terminal benefit.
3. Include them in the current payroll period (or create a supplementary entry if payroll has already been exported).
4. Note any final adjustments: notice pay owed, leave payout, or deductions for property not returned.
5. Process and export payroll as normal. Mark them as paid once disbursed.

---

#### Step 2 — Issue Final Payslip and P45 / Certificate of Service

After final payroll is exported:
1. Generate their final payslip from the payroll period.
2. Prepare a **Certificate of Service** (also called a reference letter or service letter) stating their employment dates, job title, and reason for leaving. This is a legal requirement in most jurisdictions and a common expectation.
3. Export the **ZIMRA YTD** file (Export YTD button) to get the employee's year-to-date tax figures for their ZIMRA P45 / ITC, which the employee needs to file with ZIMRA and provide to their next employer.

---

#### Step 3 — Revoke System Access (If the Employee Was a User)

If the employee had a system login:

1. Go to **Settings → Users** (or **Employees → [Employee Name] → System Access**).
2. Click **Deactivate Account** (or **Revoke Access**).
3. Confirm — the account is immediately disabled. Any active sessions are terminated.

> Do this **on the last working day** or immediately on dismissal. A departing employee should not retain access to sales, cash, inventory, or any other business data after they leave.

**Also check:**
- Remove them from any shared logins or admin roles.
- If they had a POS session open, ensure it is closed before deactivating.

---

#### Step 4 — Mark Employee as Terminated in the System

1. Open the employee's profile.
2. Click **Terminate Employee** (or **End Employment**).
3. Fill in:
   - **Termination date** — their last working day.
   - **Reason** — Resignation, End of Contract, Dismissal, Redundancy, or Other.
   - **Notice period served** — whether they worked out their notice or were paid in lieu.
   - **Notes** — any relevant details for the record.
4. Click **Confirm Termination**.

**What happens:**
- The employee's status changes to **Terminated / Inactive**.
- They are removed from all active payroll period pulls (future payroll runs will not include them automatically).
- Their clock-in card barcode is deactivated — scanning it will no longer trigger a clock-in prompt.
- They disappear from active employee lists but their full history (payroll, attendance, contracts, per diem) remains permanently in the system for audit and reporting purposes.

---

#### Step 5 — Close Out Their Expense and Petty Cash Items

Before finalising:
1. Check for any open petty cash requests in their name — settle or cancel them.
2. Check for any outstanding expense payment requests they submitted — ensure these are approved and paid out, or cancelled if no longer valid.
3. Check for any loans in their name — record any final repayment from their terminal pay, or write off the balance per company policy.

---

#### Step 6 — Collect Business Property

Ensure the following are returned and recorded:
- [ ] Employee scan card / clock-in card (deactivate immediately)
- [ ] Keys, access cards, uniforms
- [ ] Company phone or equipment
- [ ] Any cash float or petty cash they held

Note the return of each item in the employee's profile under **Notes** or **Offboarding Checklist** if available.

---

#### Contract Expiry vs Termination

| Situation | What to do |
|-----------|-----------|
| **Fixed-term contract ends, employee not continuing** | Set contract end date if not already set → Terminate employee record → follow checklist above |
| **Fixed-term contract ends, employee continuing** | Create a new contract (see Contract Renewal above) — do NOT terminate the employee record |
| **Permanent employee resigns** | Record resignation date as termination date → follow checklist above |
| **Dismissal** | Terminate immediately → revoke system access first |

> An expired contract without renewal does not automatically terminate the employee in the system. You must explicitly go through the termination process to deactivate their record and access.

---

## 6. Employees — Clock-In, Leave & Per Diem

> **Who reads this:** General employees who need to clock in, apply for leave, or request per diem.

### Clocking In and Out

#### Using Your Scan Card (Recommended)

Your manager will give you a personal barcode card with your name and photo. To clock in or out:

1. **Scan your card** at any terminal using the barcode scanner — you can do this at any time, even if someone else is using the screen. A clock-in prompt will pop up over whatever is on screen.
2. The system will turn on the camera to **take your photo** automatically. Look at the camera briefly.
3. Confirm whether you are **clocking in** or **clocking out** on the popup.
4. The popup closes and the other user's screen continues uninterrupted.

> **You do not need to log in to use your scan card.** Just scan and go.

#### Without a Scan Card

1. Go to **Employees → Clock-In** (or ask your manager for the link).
2. Find your name in the list.
3. The camera will take your photo.
4. Click **Clock In** or **Clock Out**.

> **If you forgot to clock in or out:** Tell your manager as soon as possible. They can open your attendance record and manually add or correct the time. Provide them with your actual arrival or departure time so the record is accurate.

### Applying for Leave

1. Go to **Employees → [Your Name] → Time Off**.
2. Click **Request Time Off**.
3. Choose the leave type (Annual Leave, Sick Leave, etc.).
4. Pick the start and end dates.
5. Add a note if needed (e.g., "Doctor's appointment").
6. Click **Submit Request**.

Your manager will receive a notification and approve or decline your request. You will be notified of the outcome.

### Per Diem — Complete Process

Per diem is a daily allowance paid to an employee for travel or work away from their normal location. It covers expenses like accommodation, meals, and incidentals that the employee incurs on behalf of the business.

---

#### Step 1 — Employee Requests a Per Diem Form (Paper)

Before travel begins, the employee obtains a **Per Diem Request Form**. This is a printed document the employee fills in by hand to declare their travel details, which is then submitted to the manager or HR officer for authorisation.

**To print a blank request form:**
1. Go to **Employees → Per Diem → Request Form**.
2. Select the employee's name (optional — leave blank for a generic form).
3. Select the month and year the travel falls in.
4. Click **Print Form** or **Download PDF**.

The form contains:
- Employee name and employee number
- Job title and business
- Month / year
- A table with rows for each travel day: Date | Purpose | Amount | Notes
- Signature lines for the Employee, the person entering the data, and the Approver

The employee fills in the form by hand during or after the trip, noting each day they were away and what category the expense falls under.

---

#### Step 2 — Employee Submits the Completed Form

The employee hands the completed, signed form to their manager or HR officer. The manager reviews and signs the **Approver** line to authorise the amounts.

> The physical signed form is the authorisation record. Keep it on file. The system entry (Step 3) is based on what the manager has signed off.

---

#### Step 3 — Entering Per Diem into the System

Once the form is signed and approved, the HR officer or authorised cashier enters the data into the system.

1. Go to **Employees → Per Diem → New Entry**.
2. Select the **employee** from the dropdown (all active employees are listed).
3. Select the **month** and **year** the travel occurred in. This links the entries to the correct payroll period.
4. The entry table appears. For each day on the form, click **Add Row** and fill in:

| Field | What to enter |
|-------|--------------|
| **Date** | The exact date of that travel day (must fall within the selected month) |
| **Amount** | The approved allowance amount for that day (as signed on the form) |
| **Purpose** | Choose the category that best matches: **Lodging**, **Meals**, **Incidentals**, **Travel**, or **Other** |
| **Notes** | Optional — add a brief description (e.g., "Harare overnight", "Fuel reimbursement") |

5. Add as many rows as needed — one row per travel day (or per expense category per day if they differ).
6. The **running total** at the bottom of the form updates as you add rows.
7. When all days are entered, click **Save X Entries**.

All rows are saved together in a single transaction. If any row has an error, none are saved — fix the error and try again.

---

#### Step 4 — Verify the Entry

After saving, the entries appear in the per diem list grouped by employee:

1. Go to **Employees → Per Diem**.
2. Select the same month and year.
3. Find the employee — their entries are listed with each date, purpose, and amount.
4. Confirm the total matches what was on the signed form.

To print the **Claim Form** (a filled-in summary for the file):
1. Find the employee in the list.
2. Click **Print Claim Form**.
3. The system generates a PDF showing all entries for that period, with the total, and signature lines.
4. Attach this to the original paper form and file it.

---

#### Step 5 — Manager Approves or Rejects Per Diem Entries

Per diem entries start in **Pending** status. A manager must approve them before they count towards payroll.

1. Go to **Employees → Per Diem**.
2. Select the month and year.
3. Click **Process Per Diem** (or the approval icon next to the employee).
4. The approval modal shows all pending entries for the period.
5. For each entry, click **Approve** or **Reject**:
   - **Approved** entries are included in the payroll gross/net pay totals for that month.
   - **Rejected** entries are excluded from payroll totals entirely.
6. Click **Process** to finalise your decisions.

> **You can click Process even if all entries are rejected** — this closes the review and records the rejections. Rejected entries do not count as pending for subsequent payroll runs.

> **Tip:** Approve per diem entries before submitting payroll for review. Only approved entries are included in the payroll spreadsheet and totals.

---

#### Step 6 — Per Diem Flows into Payroll Automatically

Per diem entries do not need to be transferred or manually added to payroll. When the payroll export runs for the same month and year:

- The system aggregates all per diem entries for each employee.
- The total is added to a **"Per Diem"** column in the payroll spreadsheet.
- It is included in the employee's **gross pay** for that period.
- The payroll processor handles any applicable tax treatment on the per diem amount.

> Only **approved** per diem entries are included in payroll — pending or rejected entries are excluded. Approve all entries in the Per Diem module before submitting payroll for review to ensure the correct totals are captured.

---

#### Correcting or Deleting an Entry

If a mistake was made in the entered amount or date:
- Entries can only be deleted (not edited in place). Delete the incorrect row and re-enter it correctly.
- **Delete requires admin access.** Contact your system administrator or a manager with admin rights to remove an incorrect entry.

---

#### Purposes Explained

| Purpose | Use when |
|---------|---------|
| **Lodging** | Employee paid for overnight accommodation |
| **Meals** | Daily meal allowance while away |
| **Incidentals** | Miscellaneous small expenses (tips, internet, laundry) |
| **Travel** | Fuel, bus fare, taxi, flight — transport costs |
| **Other** | Anything that does not fit the above categories |

Multiple purposes can be claimed for the same day by adding separate rows — e.g., one row for Lodging and one for Meals on the same date.

---

## 7. Expense Accounts & Petty Cash

> **Who reads this:** Staff who manage or use expense accounts, and anyone who handles petty cash.

### Types of Expense Accounts

The system has two distinct types of expense accounts. They look similar in the interface but serve different purposes.

---

#### Business Expense Accounts

A **business expense account** is a pot of money set aside for a specific operational purpose — for example, "Office Supplies", "Vehicle Maintenance", "Staff Welfare Fund", or "Building Maintenance". Money is deposited in from the business account (manually or automatically at EOD), and payments are made from it by submitting payment requests.

**Key characteristics:**
- Belongs to a specific business (or can span all businesses).
- Funded from the business's sales income — typically via EOD auto-deposits.
- All payments require manager approval before the cash is released.
- Payments go through a batch payment workflow (see Section 4 — Payment Request Workflow).
- Balance and transaction history are visible in reports.

**Common business expense accounts:**
| Account | Purpose |
|---------|---------|
| Office Supplies | Stationery, printer ink, cleaning materials |
| Vehicle Maintenance | Fuel, servicing, tyres |
| Staff Welfare | Staff meals, medical emergencies, welfare events |
| Building Maintenance | Repairs, plumbing, electrical |
| Rent Account | Saves daily towards monthly rent (see Rent Account section) |
| Payroll Account | Funded specifically to pay employee salaries |

---

#### Personal / Employee Expense Accounts

A **personal expense account** is linked to a specific employee rather than a business. It is used to advance money to an individual or track what they owe back.

**Key characteristics:**
- Linked to an employee's record.
- Funded by a deposit from the business (e.g., an advance or a loan to the employee).
- The employee submits repayments or the amount is deducted from payroll.
- Used for salary advances, staff loans, and individual reimbursement tracking.

**When a personal account is used:**
- An employee needs a salary advance before payday — money is deposited into their personal account and counted as a future payroll deduction.
- An employee takes a loan from the business — recorded as a deposit to their account and tracked separately in the Loans module.

---

### Making an Expense Payment Request (Business Account)

1. Go to **Expense Accounts**.
2. Click the account you are spending from.
3. Click **New Payment Request**.
4. Enter:
   - The **amount**
   - **What it is for** (description — be specific, e.g. "Replacement printer cartridge HP 63XL")
   - **Payee / supplier** — who is being paid (select from the supplier list or type a name)
   - **Reference number** — invoice number, receipt number, or quote number if available
5. Click **Submit for Approval**.

Your manager will review it. You will receive a notification when it is approved or declined. Once approved, the payment is grouped into the next payment batch and the cashier disburses the cash.

---

### Checking Your Account Balance

1. Go to **Expense Accounts**.
2. The balance for each account is shown on the main list.
3. Click into an account to see the full history of deposits and payments, including who requested each payment and when it was approved.

### Personal Expense Accounts — Private Expense Tracking

A personal expense account lets an individual user track their own spending privately. Unlike business expense accounts (which are visible to managers and used for company spending), a personal account is **private to the account holder** — only the account holder and system administrators can see its contents.

#### What a Personal Account Is Used For

- **Tracking personal business expenses** that you will later claim back — e.g. you paid for a business dinner out of your own pocket and want to record it before submitting a claim.
- **Monitoring a salary advance** — if the business advanced you money, your personal account shows the balance you owe back and what has been deducted from payroll so far.
- **Recording reimbursable costs** — fuel, accommodation, or supplies paid personally while travelling for work.

#### How It Works

1. **Viewing your personal account:**
   Go to **Expense Accounts → My Account** (or **Profile → My Expense Account**). Your personal account balance and transaction history are shown.

2. **Recording an expense you paid:**
   - Click **New Entry** or **Add Expense**.
   - Enter the amount, date, description, and category.
   - Attach a receipt photo if available.
   - Save — the entry is logged against your account.

3. **Submitting a claim for reimbursement:**
   - When you are ready to claim back money you spent, click **Submit for Reimbursement**.
   - The request goes to your manager for approval (same workflow as a regular expense payment request, but drawn from your personal account).
   - Once approved and paid out, the entry is marked as **Reimbursed**.

4. **Tracking an advance or loan:**
   - If the business deposited an advance into your account, it shows as a positive balance (you have been given money).
   - As payroll runs, the advance amount is deducted — the balance reduces toward zero.
   - When the balance reaches zero the advance is fully repaid.

#### Privacy

- Your personal expense account balance and entries are **not visible to other employees or managers** through normal screens.
- Only the account holder and system administrators (owners/admins) can view the account contents.
- Payment requests you submit from your personal account do go to a manager for approval — but the manager only sees the amount and description you provide, not your full account history.

> Use your personal account as a running expense diary for any costs you incur on behalf of the business. Record expenses as they happen (not in a batch at month end) so you do not lose receipts and your records stay accurate.

---

### Petty Cash — Full Workflow

Petty cash is for small, immediate purchases (e.g., stationery, a taxi fare, emergency supplies). Unlike a formal expense payment request (which goes through a batch payment), petty cash is for situations where you need cash in hand right now.

#### Stage 1 — Employee Submits a Request

1. Go to **Petty Cash → New Request**.
2. Fill in:
   - **Amount** — how much you need
   - **Reason** — what you are buying (e.g., "Printer cartridges", "Taxi to town")
   - **Category** — choose the most relevant category
3. Click **Submit**.

Status → **Pending Approval**. The manager receives a 🔔 notification.

---

#### Stage 2 — Manager Approves or Declines

The manager sees the request in **Pending Actions** or under **Petty Cash → Requests**.

- **Approve** — clicks Approve. Status → **Approved**. The employee receives a 🔔 notification: "Your petty cash request of $XX was approved."
- **Decline** — clicks Decline and enters a reason. Status → **Declined**. Employee is notified with the reason.

---

#### Stage 3 — Employee Collects the Cash

Once approved, the employee goes to the cashier (or cash box) to collect the money.

The cashier:
1. Sees the approved request in the petty cash queue.
2. Counts out the approved amount.
3. Marks the request as **Disbursed** (or the system does this when cash is handed over).
4. A Cash Bucket **OUTFLOW** entry is recorded automatically.

The employee takes the cash and goes to make the purchase.

---

#### Stage 4 — Employee Settles (Accounts for the Money Spent)

After spending the money, the employee must settle the request:

1. Go to **Petty Cash** and find your approved request.
2. Click **Settle**.
3. Enter the **actual amount spent** (may be less than the approved amount).
4. Attach proof — upload a photo of the receipt(s) or enter the receipt number.
5. Click **Submit Settlement**.

Status → **Settled**.

> **If you spent less than approved:** Enter the actual amount. The system records the difference as an **unspent balance**. Return the unspent cash to the cashier — they will record a **Cash Bucket INFLOW** (returned funds) to balance the books.

> **If you spent more than approved:** Enter the actual amount. The overage will appear as a variance for the manager to review. The manager may approve the additional amount separately or note it as out of policy.

---

#### Stage 5 — Manager Reviews Settlements

The manager periodically reviews settled petty cash requests:

1. Go to **Petty Cash → Settled Requests**.
2. Review each settlement — check that the receipt matches the amount and reason.
3. Mark as **Reviewed** if everything is correct.

---

#### Petty Cash Status Summary

| Status | Meaning |
|--------|---------|
| **Pending** | Submitted, waiting for manager approval |
| **Approved** | Approved, cash not yet collected |
| **Disbursed** | Cash collected by employee, purchase in progress |
| **Settled** | Employee submitted receipts and accounted for the money |
| **Returned** | Unspent funds returned to the cash box |
| **Declined** | Manager declined the request |

---

### Rent Account — Setup and Operation

The Rent Account is a dedicated savings account within the system that accumulates money over the month so that rent can be paid in full when it is due. Instead of scrambling for a lump sum at the end of the month, a small amount is set aside every day the business trades.

#### How It Works

1. The manager sets a **monthly rent amount** and the number of **operating days** per month.
2. The system calculates a **daily transfer amount** = Monthly Rent ÷ Operating Days (rounded up).
3. Every day at EOD close, the daily amount is recorded as a deposit into the Rent Expense Account. The physical cash remains in the cash bucket — the rent account is a bookkeeping record showing how much of the bucket is earmarked for rent.
4. By rent due day, the full monthly amount (or close to it) has accumulated in the rent account balance.
5. On payment day, the manager requests the rent payment from the Rent Account. The cash is drawn from the cash bucket.

**Example:** Monthly rent = $400, operating days = 25 → daily transfer = $16. After 25 trading days the account balance shows $400 — all of which is physically held in the cash bucket.

#### Rent Account Accounting Principle

The rent account is **bookkeeping only**. All physical cash is stored in the cash bucket:

| Source | Rent Account | Cash Bucket |
|--------|-------------|-------------|
| Daily EOD transfer | +$16 balance | Cash already there (earmarked) |
| Direct deposit (e.g. loan top-up) | +$50 balance | +$50 INFLOW recorded, immediately earmarked |
| Rent payment to landlord | −$375 balance | −$375 OUTFLOW recorded |

> The balance in the Rent Account is what determines whether rent can be paid — if the balance is less than the monthly rent, the payment will be blocked until more deposits accumulate.

---

#### Setting Up a Rent Account

A manager or owner sets this up once:

1. Go to **[Business] → Settings → Rent Account** (or **Expense Accounts → Rent Account → Configure**).
2. Click **Set Up Rent Account**.
3. Fill in:
   - **Monthly Rent Amount** — what you pay each month
   - **Operating Days per Month** — how many days a month the business trades (used to calculate daily transfer; typically 25–26 for Mon–Sat)
   - **Rent Due Day** — which day of the month rent is due (e.g., 1 = 1st of each month); must be between 1 and 28
   - **Landlord** — search for the landlord by name, or use **+ Add Landlord** to create a new one (name, phone, email are required for a new landlord)
   - **Auto-transfer on EOD** — toggle ON to have the daily amount move automatically at each EOD close
4. The system displays the calculated **Daily Transfer Amount** (read-only — it is computed from your inputs).
5. Click **Save**.

A dedicated rent expense account is created automatically with an account number in the format `RENT-XXXXX`.

---

#### The Rent Account Dashboard

Go to **Expense Accounts** and click the Rent Account (or via **Settings → Rent Account → Manage**) to see:

- **Current Balance** — how much has accumulated so far this month
- **Monthly Rent Target** — the full amount needed
- **Funding % bar** — visual indicator:
  - 🔴 Red (< 75%) — still building up, rent day may be tight
  - 🟠 Orange (75–99%) — good progress
  - 🟢 Green (100%+) — fully funded, ready to pay
- **Transactions tab** — full history of every daily deposit and any payments made

---

#### When Rent is Due — Paying the Landlord

When rent is due, the money has been accumulating in the Rent Account. To request payment:

1. Go to **Expense Accounts** and open the Rent Account.
2. Click **🏠 Request Rent** — the button shows the configured monthly rent amount (e.g. "🏠 Request Rent $375.00").
3. The system checks that the **Rent Account balance ≥ monthly rent amount**. If the balance is short, the request is blocked — you need to wait for more EOD transfers or add a direct deposit.
4. If the balance is sufficient, a payment request is created and queued for the next EOD payment batch.
5. A manager reviews and approves the batch. At that point the cash is drawn from the cash bucket and the rent account balance decreases.

> If you need to cancel a submitted rent payment request — for example if the landlord gave an extension — open the EOD Payment Batch review, **Reject** the rent line item, and click **Process & Print Report**. The payment is returned to the queue for the next EOD cycle.

#### Adding a Direct Deposit to the Rent Account

If the regular EOD transfers are not enough to cover rent on time (e.g. a missed day, or a one-off top-up from a loan or cash injection):

1. Go to the Rent Account.
2. Click **Add Deposit**.
3. Select the source type — e.g. **Manual**, **Loan**, or **Other** (not EOD).
4. Enter the amount and a note.
5. Click **Save**.

**What happens:**
- The rent account balance increases immediately.
- A **Cash INFLOW** entry is recorded in the cash bucket (the physical cash is now accounted for).
- An **earmark** (CASH_ALLOCATION) is recorded automatically so the deposited amount is not available for other expense requests.

---

#### Adjusting the Rent Configuration

If the rent amount changes or you need to update the landlord:

1. Go to **Settings → Rent Account → Manage**.
2. Update the Monthly Rent, Operating Days, Due Day, or Landlord as needed.
3. The new daily transfer amount is calculated immediately and applies from the next EOD onwards.

To deactivate the rent account (e.g., if you move premises):
- Go to **Manage → Deactivate Rent Account**.
- Existing balance is preserved. Auto-transfers stop.

---

### Cash Allocation Report — Detailed Workflow

The Cash Allocation Report is the cashier's formal record of how the day's physical cash was distributed. It is generated automatically after the EOD report is saved and must be completed before the till shift is considered closed.

#### Why It Exists

When the EOD close runs auto-deposits and a rent transfer, money moves between accounts in the system — but physical cash still needs to be physically counted, separated, and placed in the right envelopes or handed to the right people. The Cash Allocation Report bridges the system records with the physical cash handling.

#### What It Contains

Each line item in the report represents one money movement from the EOD:

| Line Item | Source | What the cashier must do |
|-----------|--------|--------------------------|
| Rent Transfer | EOD_RENT_TRANSFER | Count out the daily rent amount, put in rent envelope |
| Staff Welfare Fund deposit | EOD_AUTO_DEPOSIT | Count out that amount, set aside for that account |
| Building Fund deposit | EOD_AUTO_DEPOSIT | Count out that amount, set aside for that account |
| … (one row per auto-deposit) | | |

#### Completing the Report

1. Go to **[Business] → Reports → Cash Allocation** (the report opens automatically after EOD save, or find it under Reports).
2. For each line item:
   - Count out the physical cash matching the **Reported Amount**.
   - Tick the checkbox ✅.
   - Confirm the amount (type it in if there is a discrepancy).
3. Once every line item is checked and amounts match, click **Lock Allocation**.

#### What Locking Does

- Status changes from **Draft → Locked** — the report cannot be changed.
- For each line item, a **Cash Bucket OUTFLOW** entry is recorded (the cash physically leaving the till).
- A single **Cash Bucket INFLOW** entry is recorded for the total cash counted in for the day.

> **If the cash box does not have enough to cover all allocations:** The system will flag the shortfall but will not block you from locking. It will process what it can and mark the rest as skipped. The manager resolves the shortfall separately (e.g., by noting it in the variance).

#### Grouped Cash Allocation (Catch-Up EOD)

When the Grouped EOD Catch-Up closes multiple missed days, a single combined Cash Allocation Report is created covering all selected dates. The workflow is the same — one report, one set of line items for all dates combined — making it easier to handle the physical cash for catch-up closes without generating many separate reports.

---

## 8. Business Loans

> **Who reads this:** Managers and business owners tracking loans taken by the business or issued to employees.

The system has **two separate loan systems** that serve different purposes:

| System | Direction | Example |
|--------|-----------|---------|
| **Business Loan** | External lender → Business | Bank loan, investor advance, supplier credit |
| **Outgoing Employee Loan** | Business → Employee/Person | Staff salary advance, personal loan |

---

### Part A — Business Loans (The Business Borrows)

This tracks money the business has borrowed from an external source — a bank, investor, or supplier.

#### Business Loan Statuses

| Status | Meaning |
|--------|---------|
| **Recording** | Loan details are being entered; figures can still change |
| **Lock Requested** | Manager has finished entering details and asked for it to be locked |
| **Locked** | Loan is confirmed and active; repayments are now tracked against it |
| **Settled** | Loan is fully paid off |

> The status flow is strictly one-way: Recording → Lock Requested → Locked → Settled. You cannot go backwards.

---

#### Creating a Business Loan Record

1. Go to **Finance → Business Loans** (or **Loans** in the menu).
2. Click **New Loan**.
3. Fill in:
   - **Lender name** — who provided the money
   - **Loan number / reference** — the lender's reference (optional)
   - **Principal amount** — the total amount borrowed
   - **Interest rate** — percentage (enter 0 if none)
   - **Start date** and **due date**
   - **Notes** — purpose of the loan, collateral, conditions
4. Click **Save** — the loan is created in **Recording** status.

While in *Recording* status you can edit any field freely.

---

#### Requesting a Lock

When all details are confirmed and you want to start tracking repayments:
1. Open the loan.
2. Click **Request Lock**.
3. A manager or owner reviews and clicks **Confirm Lock**.
4. Status changes to **Locked** — the figures are now fixed.

---

#### Recording Loan Expenses (Pre-Lock)

While the loan is in *Recording* status, you can link **expenses** to it — for example, legal fees, bank charges, or disbursement costs that were paid before the loan was active:
1. Open the loan.
2. Click **Add Expense**.
3. Enter amount, date, and a description.
4. These are tracked separately from repayments.

---

#### Withdrawal Requests

For loans that are drawn down in tranches (e.g. a revolving credit facility), you raise a **Withdrawal Request** each time you need to draw funds:

- **One withdrawal request per month** per loan.
- Format: `WR-{LoanNumber}-{YYYYMM}` (e.g. `WR-LN-20260101-001-202601`).
- Statuses: **Pending → Approved → Paid**

**To create a withdrawal request:**
1. Open the locked loan.
2. Click **Request Withdrawal**.
3. Enter the amount needed and the purpose.
4. Click **Submit** — manager receives a notification.
5. Manager reviews and clicks **Approve**.
6. Once funds arrive, mark it as **Paid**.

---

#### Recording Loan Repayments

Each repayment reduces the outstanding balance:
1. Open the loan (must be in **Locked** status).
2. Click **Record Repayment**.
3. Enter:
   - **Amount paid**
   - **Date of payment**
   - **Reference** (bank transaction ID, cheque number)
4. Click **Save**.

The outstanding balance updates automatically. When the balance reaches zero, click **Mark as Settled**.

---

#### Interest Handling

The system does **not** calculate interest automatically. Interest is recorded manually:
- Add an interest payment as a **Repayment** with a note indicating it is interest.
- Or record it as a separate **Expense** line on the loan.

---

### Part B — Outgoing Employee Loans (The Business Lends)

This tracks money the business has advanced to an employee, contractor, or another person — salary advances, personal loans, emergency funds.

#### Employee Loan Statuses

| Status | Meaning |
|--------|---------|
| **Pending Approval** | Loan application submitted, awaiting manager sign-off |
| **Pending Contract** | Approved; waiting for signed loan agreement |
| **Active** | Loan is disbursed and repayments are being tracked |
| **Paid Off** | All repayments completed; loan is closed |
| **Written Off** | Debt forgiven or uncollectable; closed with no further deductions |

---

#### Creating an Employee Loan

1. Go to **Finance → Employee Loans** (or **Loans → Outgoing**).
2. Click **New Loan**.
3. Fill in:
   - **Recipient** — select the employee or person
   - **Loan amount**
   - **Purpose** — reason for the advance
   - **Repayment type** — see table below
   - **Repayment amount** — monthly instalment
   - **Start date**
4. Click **Save** — loan enters **Pending Approval**.

---

#### Repayment Types

| Type | How it works |
|------|-------------|
| **Payroll Deduction** | The repayment instalment is automatically deducted from the employee's salary each payroll period. No manual action needed — it appears as a line in the payroll entry. |
| **Manual** | The employee pays back cash or bank transfer. Manager records each repayment manually. |

> **Payroll Deduction** is the preferred method for employee loans — it prevents missed payments and keeps everything in one place.

---

#### Approving and Activating a Loan

1. Manager opens the loan and reviews the details.
2. Clicks **Approve** — status moves to **Pending Contract**.
3. Print or prepare a loan agreement document.
4. Once the signed agreement is received, click **Activate Loan** — status moves to **Active**.
5. Disburse the funds (cash or bank transfer) and note the disbursement date.

---

#### Payroll Deduction (Automatic)

If repayment type is **Payroll Deduction**:
- Each payroll period, the system automatically includes the instalment as a deduction on the employee's payroll entry.
- It appears in the entry detail modal as a line: *Loan Repayment — [Loan Ref]*.
- The outstanding loan balance decreases after each payroll export.
- When the balance reaches zero, the loan is automatically marked **Paid Off**.

No manual recording is needed for payroll-deduction loans.

---

#### Manual Repayments

If type is **Manual**:
1. Employee brings the repayment (cash / transfer).
2. Go to the loan record.
3. Click **Record Repayment**.
4. Enter amount, date, and payment reference.
5. Click **Save**.

Repeat each month until fully paid. Click **Mark Paid Off** when balance is zero.

---

#### Writing Off a Loan

If the loan is uncollectable (employee left, debt forgiven):
1. Open the loan.
2. Click **Write Off**.
3. Enter the reason.
4. Confirm — status changes to **Written Off**. No further deductions occur.

---

### Viewing All Loans

Go to **Finance → Loans** to see both business loans and employee loans in one list. Filter by:
- Loan type (Business / Outgoing)
- Status
- Employee name
- Date range

Each row shows: loan reference number, recipient/lender, principal, amount repaid, outstanding balance, and status.

---

## 9. Customers, Loyalty Cards & Campaigns

> **Who reads this:** POS cashiers, managers, and anyone who deals with customer accounts.

### Customer Numbers

Every customer gets a unique number generated automatically when they are registered. The format is:

```
{BUSINESS_TYPE}-CUST-{SEQUENCE}

Examples:
  Restaurant:  RES-CUST-000001
  Grocery:     GRO-CUST-000023
  Clothing:    CLO-CUST-000007
  Hardware:    HAR-CUST-000015
```

This number is the barcode value on the customer's loyalty card. It is permanent — it does not change even if the customer's name or phone number is updated.

---

### Adding a New Customer

**From the Customers module:**
1. Go to **Customers** in the menu.
2. Click **Add Customer**.
3. Fill in:
   - **Full name** *(required)*
   - **Phone number** *(required)*
   - Email, address, date of birth, national ID *(all optional)*
4. Click **Save**.

**From the POS (inline, without leaving the till):**
See Step 3 in the POS section — type a name, click **+ Add New Customer**, enter name and phone.

---

### Printing a Customer Loyalty Card

Every customer should be given a loyalty card so that future visits can be scanned in seconds rather than searching by name.

**How to print:**
1. Open the customer's profile (or the card prints automatically after inline POS registration).
2. Click **Print Loyalty Card**.
3. The print window opens — the card is laid out **twice side by side on one sheet** for a fold-in-half design.

**What is on the card:**

```
┌─────────────────────────────────────┐
│  LOYALTY CARD          YOUR BUSINESS│
│                                     │
│  [🛍️ Avatar]   Customer Full Name  │
│                RES-CUST-000012      │
│                +263 77 123 4567     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ||| CODE128 BARCODE |||     │    │
│  │ RES-CUST-000012             │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
         ↑ fold here ↑ (print 2 copies)
```

4. Print on plain paper, fold in half, trim, and laminate (optional).
5. Hand the card to the customer.

**When the customer scans their card at a future visit:**
- The cashier scans it with the barcode scanner at any point.
- The customer is instantly pre-selected in the POS — no typing needed.
- Their name appears on the cart. All items added from that point forward are linked to their account.

---

### Viewing a Customer's Purchase History

1. Open the customer's profile.
2. Click the **Purchases** or **History** tab.
3. Every completed sale is shown — date, order number, items, total, and payment method.

---

### Customer Activity Report

For a manager-level view of all customers across the business:

1. Go to **Customers → Activity Report** (or **Reports → Customer Activity**).
2. Choose a time period: Last 30 days, 90 days, 12 months, or All time.
3. Sort by: Total Spend, Order Count, Most Recent Visit, or Average Order Value.

Each customer row shows:
- Total spend in the period
- Number of visits
- Average order value
- Last visit date
- Status indicator:
  - 🟢 **Active** — visited within the last 30 days
  - 🟡 **At Risk** — last visit 30–90 days ago
  - 🔴 **Lapsed** — no visit in over 90 days

**Use the report to:**
- Identify your top-spending customers for VIP treatment
- Find at-risk customers who may need a promotion to return
- Measure the impact of campaigns on repeat visit rates

---

### Loyalty Campaigns — Setup and Workflow

Campaigns automatically reward customers who spend above a threshold within a month. No manual tracking is needed — the system calculates eligibility and generates reward codes.

#### Creating a Campaign

1. Go to **Universal → Promotions** (or **Campaigns & Promos**).
2. Click **New Campaign**.
3. Fill in:

| Field | What to enter |
|-------|--------------|
| **Campaign name** | e.g., "Monthly Loyal Customer Reward" |
| **Description** | Optional note about the campaign |
| **Spend threshold** | Minimum monthly spend to qualify (e.g., $100) |
| **Reward type** | Choose one or more: **Store Credit**, **Free Product**, **Free WiFi Token** |
| **Credit amount** | If credit: dollar value (e.g., $5 discount on next purchase) |
| **Free product** | If free item: select a product from the menu/inventory |
| **WiFi config** | If free WiFi: select which token package to award |
| **Reward valid days** | How many days the reward is valid after issuing (default: 30) |

4. Click **Save**. The campaign is now active.

> Multiple reward types can be combined — e.g., a customer who spends $150+ gets both a $5 credit AND a free WiFi token.

#### Generating Rewards (Monthly)

Rewards are not issued automatically in real time. At the end of each month, a manager runs the reward generation:

1. Go to **Universal → Promotions → Campaigns** tab.
2. Click **Generate Rewards** (runs for the current month).
3. The system:
   - Looks at every customer's completed purchases for the month
   - Compares their total spend against each active campaign's threshold
   - Issues a **reward coupon code** (format: `RWD-xxxxxx`) to every qualifying customer
   - Each reward has an expiry date (current date + reward valid days)
4. A summary shows how many rewards were issued per campaign.

> Rewards are **idempotent** — running the generator twice for the same month will not issue duplicate rewards.

#### How Customers Redeem a Reward

At the next POS visit:

1. Customer provides their loyalty card (scan or name search) — they are selected in the POS.
2. An **Available Rewards** panel appears on the POS showing any active reward codes:
   - Reward type (credit / free item / WiFi)
   - Amount or item name
   - Expiry date
3. Cashier clicks **Redeem** next to the reward.
4. The discount or free item is applied to the current order automatically.
5. Reward status changes to **Redeemed** — it cannot be used again.

#### Reward Statuses

| Status | Meaning |
|--------|---------|
| **Issued** | Generated, available for redemption |
| **Redeemed** | Used at checkout — linked to the order |
| **Expired** | Past expiry date without being used |
| **Deactivated** | Manually cancelled by a manager |

#### Tracking Rewards

Go to **Universal → Promotions → Rewards** tab to see every reward ever issued:
- Filter by status (Issued, Redeemed, Expired)
- See which customers earned rewards and which have been used
- Monitor campaign effectiveness — how many rewards issued vs redeemed

---

### Coupons (Manual Discount Codes)

Coupons are different from campaign rewards — they are **created manually** by the manager and given to specific customers or used in promotions (printed on flyers, handed out, etc.).

**Creating a coupon:**
1. Go to **[Business] → Coupons → New Coupon**.
2. Enter:
   - **Code** — a word or number (e.g., `SUMMER20`, `WELCOME5`)
   - **Discount amount** — fixed dollar amount off the order total
   - **Description** — internal note about what the coupon is for
   - **Requires approval** — if ticked, the cashier cannot apply it without manager override
3. Save. The coupon is now active.

**At the POS:**
1. Click **Add Coupon** in the cart.
2. Type or scan the coupon code.
3. The discount is applied to the order total immediately.

> Coupons can also have a barcode printed on them — the cashier scans the coupon like a product barcode and the discount is applied without any typing.

### Layby (Installment Purchases)

A layby allows a customer to reserve items and pay over time. The goods are held until fully paid.

#### Creating a Layby

1. Go to **Laybys → New Layby**.
2. Select the customer.
3. Add the items being laid by and the total price.
4. Set the deposit amount (minimum deposit may be required by policy).
5. Record the deposit payment.
6. Click **Save**.

Print the layby receipt and give the customer their copy.

#### Recording a Layby Payment

1. Go to **Laybys** and find the customer's layby.
2. Click **Record Payment**.
3. Enter the amount paid and the payment method.
4. Click **Save**.

The system calculates the remaining balance automatically.

#### Completing a Layby

When the balance reaches $0.00:
1. The layby status changes to **Ready for Collection**.
2. Confirm the customer collects their goods.
3. Click **Mark as Collected**.
4. Print a final receipt.

#### Refunding or Cancelling a Layby

If a customer wants to cancel:
1. Open the layby.
2. Click **Cancel Layby**.
3. The system will calculate the refund based on your business's refund policy.
4. Process the refund through the till.

---

## 10. Chicken Run Management

> **Who reads this:** Staff managing a poultry farming operation.

### Dashboard Overview

Go to **Chicken Run** in the menu. The dashboard shows:
- **Active batches** — currently growing
- **Batches in culling** — ready to harvest
- **Completed batches** — archived
- **Total birds** — current live inventory count
- **Alerts** — high mortality or low inventory warnings

### Starting a New Batch

1. Go to **Chicken Run → New Batch**.
2. Enter:
   - Batch number or name
   - Date the chicks arrived
   - Number of chicks placed
   - Breed (if applicable)
   - Supplier
3. Click **Start Batch**.

The batch is now in **GROWING** status.

### Daily Logs

Every day (or as required), record:

**Feed Log:**
1. Go to the batch → **Feed Log → Add Entry**.
2. Enter the quantity of feed given and the type.
3. Save.

**Mortality Log:**
1. Go to the batch → **Mortality Log → Add Entry**.
2. Enter the number of birds that died today.
3. Select the probable cause.
4. Save.

> **Alert:** If mortality rises above 5% of the batch (or the threshold set in Settings), a warning will appear on the dashboard. Inform management immediately.

**Weight Log:**
1. Go to the batch → **Weight Log → Add Entry**.
2. Enter a sample size (number of birds weighed).
3. Enter the total weight of the sample.
4. The system calculates average weight per bird.
5. Save.

**Vaccination Log:**
1. Go to the batch → **Vaccination Log → Add Entry**.
2. Select the vaccine given.
3. Enter the date and number of birds vaccinated.
4. Save.

### Moving to Culling

When the birds have reached target weight:
1. Open the batch.
2. Click **Move to Culling**.
3. Confirm the date.

The batch status changes to **CULLING**.

### Recording a Harvest (Weigh-In / Processing)

When birds are being processed:
1. Go to **Chicken Run → Inventory → [Select Batch]**.
2. Click **Record Harvest**.
3. Enter:
   - Number of birds processed
   - Total weight
   - Breakdown (whole birds, cuts, etc.) if applicable
4. Save.

Stock levels in the inventory are updated automatically.

### Completing a Batch

After all birds are processed:
1. Open the batch.
2. Click **Complete Batch**.
3. The system will show a final summary: starting count, mortality, total weight, feed used, and estimated profitability.
4. Review and confirm.

The batch is archived in **COMPLETED** status.

### Reports

Go to **Chicken Run → Reports** for:
- **Batch Comparison** — side-by-side performance of different batches
- **Mortality Analysis** — death rates by cause and by time period
- **Profitability** — revenue vs. cost per batch
- **Kitchen Usage** — how much processed stock was used internally vs. sold

### Vaccination Schedules

Maintain standard vaccination schedules:
1. Go to **Chicken Run → Vaccination Schedules**.
2. Click **New Schedule**.
3. Enter the vaccine name, recommended age (in days), and notes.
4. Save.

The system will remind you when upcoming vaccinations are due for active batches.

---

## 11. Construction & Projects

> **Who reads this:** Project managers, site supervisors, and contractors.

### Viewing Your Projects

Go to **Construction** (or **Projects** if you use the cross-business module). You will see all active projects listed with:
- Project name
- Client
- Budget
- Spent to date
- Remaining budget
- Status

### Creating a New Project

1. Click **New Project**.
2. Enter:
   - Project name
   - Client name
   - Start date and estimated end date
   - Total budget
3. Click **Create**.

### Recording Project Expenses

1. Open the project.
2. Go to the **Expenses** tab.
3. Click **Add Expense**.
4. Enter:
   - Description (e.g., "Cement — 50 bags")
   - Supplier name
   - Amount
   - Date purchased
   - Category (Materials, Labour, Equipment, etc.)
5. Attach a receipt photo if available.
6. Click **Save**.

The project's **Spent to Date** updates and the remaining budget recalculates.

### Managing Contractors

1. Open the project.
2. Go to the **Contractors** tab.
3. Click **Assign Contractor**.
4. Search for an existing contractor or add a new one.
5. Enter the agreed rate and scope of work.
6. Save.

To record a contractor payment:
1. Find the contractor in the project.
2. Click **Record Payment**.
3. Enter the amount and date.
4. Save.

### Supplier Management

Go to **Construction → Suppliers** to maintain a list of your material suppliers with their contact details and payment terms.

---

## 12. Driver & Vehicle Log

> **Who reads this:** Drivers responsible for logging their trips and vehicle maintenance.

### Logging a Trip

1. Go to **Driver → Trips**.
2. Click **New Trip**.
3. Enter:
   - Date
   - Starting location
   - Destination
   - Purpose of trip (e.g., "Delivery to client", "Pick up supplies")
   - Starting odometer reading
   - Ending odometer reading
4. Click **Save Trip**.

The mileage is calculated automatically from the odometer readings.

### Logging Vehicle Maintenance

1. Go to **Driver → Maintenance**.
2. Click **New Maintenance Record**.
3. Enter:
   - Date of service
   - Type of service (Oil change, Tyre rotation, Repair, etc.)
   - Description of work done
   - Workshop/garage name
   - Cost
   - Next service due (if known)
4. Click **Save**.

### Viewing Your Trip History

Go to **Driver → Trips** to see all logged trips. You can filter by date range or vehicle.

---

## 13. WiFi Token Sales — ESP32 and R710

> **Who reads this:** Staff selling WiFi access, managers configuring WiFi packages, and anyone setting up the integration.

---

### Two WiFi Systems — Understanding the Difference

The system supports two separate WiFi hardware integrations. They work differently and are not interchangeable.

| | ESP32 (Captive Portal) | R710 (Ruckus Access Point) |
|---|---|---|
| **Hardware** | ESP32 microcontroller with captive portal | Ruckus R710 or compatible access point |
| **How it works** | Customer connects to WiFi → browser redirects to captive portal → enters token code | Customer gets a username and password → enters credentials on the WiFi login page |
| **Token format** | Single **token code** (e.g., `AB12CD`) printed on receipt | **Username + Password** pair printed on receipt |
| **Tokens generated** | On-demand at sale time | Pre-generated as AVAILABLE → marked SOLD at checkout |
| **Duration control** | Token code controls time limit on the ESP32 device | Duration set by the token package (1hr, 24hr, weekly, etc.) |
| **Best for** | Simpler setups, guest WiFi with captive portal redirect | Business-grade Ruckus deployments |
| **Portal** | Configured via **ESP32 Integration settings** | Managed via **R710 Portal** |

> Most businesses will use **only one** of these systems, not both. Check with your system administrator which type your hardware is.

---

### R710 System — Full Guide

#### How R710 Tokens Are Created

Tokens are **pre-generated** before any sale happens. A pool of AVAILABLE tokens is maintained per package. When a sale occurs at the POS, the next AVAILABLE token is marked as SOLD and printed on the receipt.

This means:
- There is no delay at checkout — the token is assigned instantly.
- The pool must be topped up before it runs out.
- The POS product card shows the current available count.

#### Selling an R710 Token at the POS

1. Open the POS.
2. Search for the WiFi package by name (e.g., "1 Hour WiFi", "Daily Pass", "Weekly Pass").
3. The product card shows **"X available"** — confirming tokens are in stock.
4. Add it to the cart.
5. Process payment as normal.
6. After payment, the **receipt automatically includes the WiFi credentials**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━
       📶 WiFi Access
━━━━━━━━━━━━━━━━━━━━━━━━━
  Package:   Daily Pass
  Username:  guest_4829
  Password:  Kx7mP2qR
━━━━━━━━━━━━━━━━━━━━━━━━━
  Connect to: BusinessGuest
  Valid for:  24 hours
━━━━━━━━━━━━━━━━━━━━━━━━━
```

7. Hand the receipt to the customer. These are their login credentials — they connect to the WiFi network and enter the username and password when prompted.

> **Each token is single-use.** Once issued on a receipt, it cannot be reused or given to another customer.

#### Checking and Restocking Token Availability

On the POS product card, the available count is displayed. When availability drops below 5:
- A **"Request 5 More"** button appears on the product card.
- Click it — 5 new tokens are generated in seconds and the count updates.

To generate tokens in larger batches:
1. Go to **R710 Portal → Token Management**.
2. Select the package.
3. Click **Generate Tokens** and enter the quantity.

#### WiFi as Part of a Combo (Bundle Deal)

WiFi tokens can be included as part of a combo order — for example, a "Meal + WiFi" bundle where buying a meal includes a 1-hour WiFi token automatically.

When the cashier adds the combo to the cart:
- The food items appear as normal cart lines.
- The WiFi token line is added automatically (marked with a 📶 icon).
- At payment, the receipt shows both the food items AND the WiFi credentials in the same receipt.

**Example receipt with combo:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━
  Meal Deal + WiFi
  Chicken & Chips        $5.00
  Coke 500ml             $0.50
  1hr WiFi Token         $0.00  (included)
  ─────────────────────────────
  TOTAL                  $5.50
━━━━━━━━━━━━━━━━━━━━━━━━━
       📶 WiFi Access
━━━━━━━━━━━━━━━━━━━━━━━━━
  Username:  guest_4831
  Password:  Lm9nQ4wS
  Valid for: 1 hour
━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### WiFi as a Loyalty Campaign Reward

Customers who reach a spend threshold can earn a free WiFi token as their reward (see Campaigns section in Section 9). When the cashier redeems the reward at checkout:
- The WiFi token is added to the order at $0.00.
- The receipt includes the credentials exactly as a normal purchase would.
- The reward is marked as Redeemed.

#### Direct Token Sale (Without POS)

For situations where you need to issue a token without going through the full POS flow:

1. Go to **R710 Portal → Sales → New Direct Sale**.
2. Select the package.
3. Enter customer details (optional).
4. Process — the token is issued immediately.
5. Print or display the credentials.

#### Viewing Sales History

Go to **R710 Portal → Sales History** to see:
- All tokens sold (date, package, username/password)
- Whether each token has been used or is still unused
- Which tokens were sold via POS vs direct sale

---

### ESP32 System — Captive Portal Integration

#### How ESP32 Tokens Work

The ESP32 system uses a **captive portal** — when a customer connects to the WiFi network, their browser is automatically redirected to a login page hosted on the ESP32 device. The customer enters a **token code** to gain access.

Token codes are generated by the system and sold through the POS in the same way as R710 tokens. The difference is what the customer receives: a single code (not a username/password pair).

#### Selling an ESP32 Token

The POS flow is identical to R710:
1. Search for the WiFi package and add to cart.
2. Process payment.
3. The receipt prints the **token code**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━
       📶 WiFi Access
━━━━━━━━━━━━━━━━━━━━━━━━━
  Package:   1 Hour Pass
  Token:     AB12CD
━━━━━━━━━━━━━━━━━━━━━━━━━
  Connect to: GuestWiFi
  Go to any website to
  enter your token code.
━━━━━━━━━━━━━━━━━━━━━━━━━
```

4. The customer connects to the guest WiFi network, opens any browser, and the captive portal page appears.
5. They type in the token code and are granted access for the purchased duration.

#### ESP32 Integration Setup (Manager / Admin)

1. Go to **Settings → Integrations → ESP32 / Captive Portal**.
2. Enter the connection details for the ESP32 device (IP address, port, API key).
3. Test the connection.
4. Configure the token packages (duration and price) — these sync with the ESP32 device.
5. Save.

> The ESP32 integration must be set up before any tokens can be sold through this system. If no integration exists, the system returns an empty token list and the WiFi products will not appear in the POS.

---

### WiFi Receipt Structure

Regardless of which system is used, WiFi credentials always appear in a clearly separated block at the bottom of the receipt, after the payment summary. This keeps the financial details and the access details easy to read separately.

**Full receipt structure when WiFi is included:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  YOUR BUSINESS NAME
  123 Main Street
  Tel: +263 77 000 0000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Order #: ORD-000842
  Date:    15 Mar 2026  14:32
  Cashier: Tendai
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ITEMS
  Burger & Chips         $4.50
  Orange Juice           $0.80
  WiFi — Daily Pass      $2.00
  ──────────────────────────────
  TOTAL                  $7.30
  Cash received         $10.00
  Change                 $2.70
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       📶 WiFi Credentials
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Network:   BusinessGuest
  Username:  guest_5021
  Password:  Rp8vN3tK
  Valid for: 24 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Thank you for your visit!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If multiple WiFi tokens are purchased in the same order (e.g., two hourly passes), each token's credentials appear as a separate block on the receipt.

---

## 14. Inventory & Barcode Labels

> **Who reads this:** Stock managers, clothing store managers, and anyone responsible for labelling products or receiving stock.

---

### Understanding the Two Inventory Workflows

There are two distinct operations that both involve "adding inventory":

| Workflow | When to use it | What it does |
|----------|---------------|-------------|
| **Create a new product** | Product does not exist in the system at all | Creates a new product record + assigns barcode + sets initial stock quantity |
| **Receive stock (restock)** | Product already exists, you received more units | Adds quantity to an existing product — does not create a new record |

Confusing these two is the most common inventory mistake. Always check whether the product already exists before creating a new one.

---

### Workflow 1 — Creating a New Product (Product Does Not Exist Yet)

#### Step 1: Navigate to the Add Product screen

| Business type | Path |
|--------------|------|
| Grocery | **Grocery → Inventory → Add Item** |
| Clothing | **Clothing → Products → New Product** |
| Restaurant | **Restaurant → Menu → Add Item** |
| Universal / Hardware / Other | **[Business] → Products → New** |

---

#### Step 2: Fill in the product details

**Core fields (all business types):**

| Field | Required | Notes |
|-------|----------|-------|
| **Product Name** | Yes | What customers and staff will see |
| **SKU** | Yes | Short internal code (e.g. `GRO-001`, `CLO-TRK-42`). Can be auto-generated — click the ⚙️ icon next to the SKU field. |
| **Category** | Yes | Organise products into categories for reports and menus |
| **Selling Price** | Yes | The price charged to customers |
| **Cost Price** | No | What you paid for it — used for profit margin calculation |
| **Initial Stock** | No | How many units you are putting into stock right now |
| **Description** | No | Optional longer description |

**Grocery-specific fields:**

| Field | Notes |
|-------|-------|
| **Temperature Zone** | Room Temperature / Refrigerated / Frozen |
| **Shelf Life (days)** | Auto-calculates expiry date when stock is received |
| **PLU Code** | For produce items weighed at point of sale |
| **Batch Number** | Supplier's batch reference |
| **Organic Certified** | Tick if the product is certified organic |
| **Low Stock Threshold** | Alert is triggered when stock drops below this number (default: 10) |

**Clothing-specific fields:**

| Field | Notes |
|-------|-------|
| **Product Type** | New / Used / Refurbished |
| **Condition** | New / Like New / Good / Fair / Poor |
| **Brand** | Select from the brand list or leave blank |

---

#### Step 3: Assign a barcode

The barcode is the number a scanner reads. There are three ways to assign one:

**Option A — Type or scan it directly into the form**
- Look for the **Barcode / UPC** field on the product form.
- If you have the physical product with a barcode label on it, hold the scanner over it — the code is entered automatically into the field.
- If you typed it manually, double-check the number is correct.

**Option B — Assign it after saving**
- Save the product first without a barcode.
- Open the product in the product list.
- Click **Assign Barcode** (or the barcode icon).
- Scan or type the barcode in the modal that appears.
- Click **Save**.

**Option C — Auto-generate (bulk, clothing stores)**
- From the product list, select multiple products using the checkboxes.
- Click **Bulk Actions → Assign Barcodes**.
- Choose **Auto-generate sequential barcodes**.
- Enter a **Barcode Prefix** (e.g. `CLO` produces `CLO000001`, `CLO000002`, etc.).
- Click **Generate** — all selected products get sequential barcodes.

> **SKU vs Barcode:** The SKU is a human-readable internal code (e.g. `TRK-BLK-L`). The barcode is what the scanner reads (e.g. `5901234123457`). Both can be the same value, but they serve different purposes. A product can have an SKU without a barcode, but a barcode must be assigned before the item can be scanned at the POS.

---

#### Step 4: Print the barcode label

Once a barcode is assigned, print a label to stick on the product:

1. Go to **Universal → Barcode Management → Templates**.
2. Click **New Template**.
3. Choose **From Existing Product** — search for your product.
4. The template is pre-filled with the product name, price, SKU, and barcode.
5. Adjust label size, font size, and paper format if needed.
6. Go to **Universal → Barcode Management → Print Jobs → New Print Job**.
7. Select your template, enter the quantity of labels to print, and click **Print**.

> Labels print with: business name, product name, description, size, barcode, SKU, and price. Two fold lines are printed on the label for folding-tag style clothing labels.

---

### Workflow 2 — Receiving Stock for an Existing Product

Use this when a product already exists in the system and you have received more units.

#### Grocery — Receive Stock Page

1. Go to **Grocery → Inventory → Receive Stock**.
2. A grid shows all your existing products.
3. For each item you received:
   - Enter the **quantity received** in the "Receive Qty" column.
   - Optionally update the **Cost/Unit** (if the supplier price changed).
   - Optionally add a **Batch #** and **Expiration date**.
4. Click **Submit Receipt** — the system increases the stock levels and records a stock-received movement.

> You can update multiple products in a single session — fill in quantities for everything you received and submit once.

#### Clothing / Hardware / Universal — Single-Item Add Stock Form

For a new barcode inventory item (not yet in the system), use the **Add Stock** form:

1. Go to **Inventory → Add Stock** (or click the **+ Add Stock** button in the Bulk Stocking panel for individual entry).
2. Fill in the form:

| Field | Required | Notes |
|-------|----------|-------|
| **Barcode** | Auto-filled if from scan | Read-only if pre-filled from a scan |
| **Product Name** | Yes | What this item is called |
| **Domain** | No | Top-level classification (e.g. "🥦 Fresh Produce"). Available for all business types. |
| **Category** | Yes | Filtered by the selected domain. Create inline with **+ New category**. |
| **Supplier** | No | Searchable dropdown. Create inline with **+ New supplier**. |
| **Description** | No | Optional note (replaces the old "Notes" field) |
| **Sell Price** | Yes | Tick **Free Item** to set price to $0 and disable the input |
| **Cost Price** | No | What you paid — used for margin reporting |
| **Quantity** | Yes | Number of units you are adding |
| **SKU** | No | Leave blank to auto-generate (e.g. `GRO-INV-00042`) |

3. Click **Add to Stock & Print** to save and immediately print a barcode label, or **Save** to save without printing.

**Domain → Category cascade:** When you select a domain, the category dropdown is automatically filtered to show only categories within that domain. Selecting a new domain clears the category field.

> **For existing products (updating stock or price):** Open the product's detail page (from the product list, click on the product name), then click **Adjust Stock**. Enter the quantity and reason. The new units are added to the current stock count.

#### What a stock receipt records

Every time you receive stock, the system logs:
- Date and time received
- Quantity added
- Unit cost (if provided)
- Batch number and expiration date (if provided)
- Who recorded it

This history is visible under the product's **Stock History** tab and feeds into the inventory movement report.

---

### Workflow 3 — Scanning a Barcode to Add New Inventory

This is the fastest method when you are physically holding items and want to add them one at a time by scanning. See the full lookup sequence below.

---

### Adding Inventory by Scanning a Barcode

The fastest way to add a new product is to scan its barcode. Every scan triggers a **multi-step global lookup** — the system searches not just the current business but across all businesses you have access to, in a defined order.

---

#### The Full Lookup Sequence

```
Barcode scanned
       │
       ▼
Step 1 ── Does this business already have this barcode?
       │   YES → product found → add to cart / show in inventory
       │   NO  ↓
       ▼
Step 1.5 ── Is this a clothing bale (by barcode or SKU)?
       │   YES → bale found → add to cart with unit price
       │   NO  ↓
       ▼
Step 2 ── Does a barcode template exist for this code?
       │   YES → template found → open pre-filled product form
       │   NO  ↓
       ▼
Step 3 ── Global cross-business lookup
       │   FOUND in another business → show match details
       │                               offer "Stock to this business"
       │   NOT FOUND anywhere ↓
       ▼
Step 4 ── Barcode is completely unknown
           → Open Quick Stock Add form
           → User enters name, price, quantity
           → Product created + barcode registered here
```

---

#### Step 1 — Barcode Found in This Business

Scan the barcode at the POS or inventory screen. The product is found immediately and added to the cart (POS) or shown in the inventory list. Nothing else is needed.

---

#### Step 1.5 — Clothing Bale Match

If the barcode or SKU matches a bale record (e.g. `BALE-HXI-042`), the bale is found and can be added to the cart at the configured unit price. See the Clothing Bales section for full details.

---

#### Step 2 — Barcode Template Match

If a label template was previously created with this barcode value, a template card appears showing the product name, default price, size, and colour from the template.

1. Click **✨ Create Product from Template**.
2. A product form opens with all fields pre-filled.
3. Confirm or adjust and click **Save** — the product is created with the barcode attached.

> This is the standard workflow for pre-labelled wholesale stock: templates are set up once per product line, and any staff member can add stock by scanning thereafter.

---

#### Step 3 — Global Cross-Business Lookup

If the barcode is not found in the current business and no template matches, the system performs a **global search across all businesses** in the organisation that the current user has access to.

**What this means in practice:**

Suppose the grocery store scans a can of Coca-Cola with barcode `5000112637922`. That barcode is not in the grocery's product list yet. But the restaurant already stocks it as "Coke 500ml". The system finds the match in the restaurant and shows:

```
┌──────────────────────────────────────────────────┐
│  📦 Barcode found in another business            │
│                                                  │
│  Barcode:   5000112637922                        │
│  Product:   Coke 500ml                           │
│  Found in:  Restaurant                           │
│  Price:     $0.80                                │
│  Stock:     48 units available there             │
│                                                  │
│  [ ➕ Stock this item in Grocery ]  [ Cancel ]   │
└──────────────────────────────────────────────────┘
```

**Options:**

| Button | What happens |
|--------|-------------|
| **➕ Stock this item in [current business]** | Opens the Quick Stock Add form pre-filled with the product name and price from the other business. You set the quantity and any adjustments, then save — the product is created in the current business with this barcode attached. |
| **Cancel** | Dismisses without doing anything. |

> The system is offering information — it found the same barcode somewhere else in your organisation. You are **not forced** to copy the other business's details. You can change the name or price when you fill in the form.

---

#### The Same Barcode Can Mean a Different Product in a Different Business

This is an important concept: **a barcode is not globally unique across your businesses**. The same barcode number can be registered against completely different products in different stores, and this is perfectly normal and correct.

**Example:**

| Business | Barcode | Product registered against it |
|----------|---------|-------------------------------|
| Grocery | `4006381333931` | Nivea Cream 50ml |
| Clothing | `4006381333931` | White Buttons Pack (10pcs) |

Both are correct. The grocery received goods labelled with that barcode and it means Nivea Cream to them. The clothing store happened to receive different goods with the same printed barcode and registered it as button packs.

When a cashier in the grocery scans `4006381333931`, they see Nivea Cream. When a cashier in the clothing store scans the same code, they see Button Packs. Neither store sees the other's product — the lookup is always **scoped to the current business first**.

The global cross-business lookup (Step 3) only triggers when the barcode is **not found at all** in the current business. If the current business already has the barcode registered — even as something different from what another business has — the current business's product is used and the lookup stops there.

> **Summary rule:** Each business owns its own mapping of barcodes to products. The same barcode can safely exist in multiple businesses pointing to different products. There is no conflict.

---

#### Step 4 — Barcode Completely Unknown (Quick Stock Add)

If no match is found anywhere — not in the current business, no template, and no other business — the **Quick Stock Add** form opens automatically:

1. The scanned barcode is pre-filled — do not change it.
2. Enter:
   - **Product name** — what this item is called in your store
   - **Price** — the selling price
   - **Quantity received** — how many units you are stocking
   - **Size / Colour** *(optional, for clothing)*
3. Click **Save Product**.

The system creates the product in the current business, registers the barcode against it, and records a stock-received movement. You are taken to the full product edit page to add more details (category, cost price, image, etc.) if needed.

> **Tip for clothing stores:** Use Quick Stock Add for one-off items. For items received in bulk batches, use the Bales system instead.

---

#### Summary: What Happens at Each Scan Stage

| Situation | What the cashier / stock manager sees |
|-----------|--------------------------------------|
| Barcode in this business | Product found instantly — added to cart or shown in stock |
| Bale SKU/barcode | Bale found — added to cart at unit price |
| Barcode template exists | Template card shown — one click creates the product |
| Barcode in another business | Cross-business match shown — option to stock here |
| Barcode in multiple businesses | All matches shown — cashier chooses which to use |
| Completely unknown | Quick Stock Add form opens — user creates the product now |

---

### Predefined Domains, Categories & Sub-Categories — All Business Types

When stocking products in the Bulk Stocking Panel or the single-item Add Stock form, you can classify each item using a three-level hierarchy:

```
Domain (top level)  →  Category  →  Sub-Category
e.g. 🥦 Fresh Produce  →  Vegetables  →  Leafy Greens
e.g. 🔧 Power Tools    →  Drills      →  Hammer Drills
```

The system ships with a predefined taxonomy for every business type. You do not need to create these — they are already available in the dropdowns when you open the panel.

#### Grocery Store Domains

| Domain | Example Categories |
|--------|--------------------|
| 🥦 Fresh Produce | Vegetables, Fruits |
| 🥛 Dairy & Eggs | Milk & Cream, Cheese, Eggs & Butter, Yogurt |
| 🥩 Meat & Poultry | Beef, Chicken, Pork |
| 🐟 Fish & Seafood | Fresh Fish, Dried & Salted Fish |
| 🍞 Bakery & Bread | Bread, Pastries |
| 🥤 Beverages | Soft Drinks, Water, Alcohol, Hot Drinks |
| 🍫 Snacks & Confectionery | Crisps & Chips, Chocolates & Sweets, Nuts & Dried Fruit |
| 🍚 Pantry & Dry Goods | Grains & Cereals, Pasta, Cooking Oils, Sauces, Canned Goods, Sugar & Spices |
| 🧹 Household & Cleaning | Laundry, Dishwashing, Surface Cleaners, Air Fresheners |
| 🧴 Personal Care | Body Care, Hair Care, Oral Care, Feminine Care, Baby & Kids |
| 🖊️ Office & Stationery | Writing Instruments, Paper Products, Desk Accessories |
| 🐾 Pet Care | Pet Food, Pet Accessories |

#### Hardware Store Domains

| Domain | Example Categories |
|--------|--------------------|
| 🔧 Power Tools | Drills & Drivers, Saws, Sanders & Grinders |
| 🔩 Hand Tools | Striking Tools, Measuring & Marking, Wrenches & Spanners |
| 🧱 Building Materials | Cement & Aggregates, Bricks & Blocks, Roofing, Timber |
| 🚿 Plumbing | Pipes & Fittings, Taps & Valves, Water Tanks |
| ⚡ Electrical | Cables & Wiring, Switches & Sockets, Lighting, Distribution |
| 🎨 Paint & Finishes | Interior Paint, Exterior Paint, Primers |
| 🌿 Garden & Outdoor | Irrigation, Lawn & Garden, Outdoor Furniture |
| 🔒 Safety & Security | Personal Protective Equipment, Locks & Access |
| 🔩 Fasteners | Bolts & Nuts, Screws & Nails, Anchors & Adhesives |
| 🛁 Bathroom Fittings | Sanitaryware, Shower Systems |

#### Restaurant Domains

| Domain | Example Categories |
|--------|--------------------|
| 🍽️ Food Menu | Starters & Appetizers, Main Courses, Sides, Desserts, Breakfast |
| 🥤 Beverages | Soft Drinks, Hot Drinks, Alcohol, Mocktails & Smoothies |
| ⭐ Specials | Daily Specials, Combo Meals |
| 🍕 By Cuisine | Grills & BBQ, Seafood, Vegetarian & Vegan |

#### Retail Store Domains

| Domain | Example Categories |
|--------|--------------------|
| 📱 Electronics | Phones & Accessories, Audio & Visual, Computing |
| 🏠 Home & Living | Kitchenware, Bedding, Décor |
| 👟 Clothing & Footwear | Men's, Women's, Kids |
| 💄 Health & Beauty | Skincare, Makeup, Fragrances |
| 🎮 Toys & Games | Toys, Games |
| 🖊️ Office & Stationery | Writing Instruments, Paper & Books |

#### Services / Consulting Domains

| Domain | Example Categories |
|--------|--------------------|
| 🛠️ Professional Services | Consulting, Technical Services |
| 💼 Administrative | Office Services, Communications |
| 📋 Subscriptions | Software, Memberships |

> **Creating your own:** If the predefined taxonomy does not cover your product, use **+ New category** inline in the panel to create a custom category. Custom categories are saved permanently for your business.

> **Clothing stores** have always had their own taxonomy (Men's, Women's, Kids, Footwear, Accessories). It works the same way — just select the domain in the Department column when stocking.

---

### Used Clothing Bales — Complete Guide

A **bale** is a compressed bundle of second-hand clothing items purchased as a single lot. The bales system tracks each bale from purchase through to individual item sales, giving you stock levels, cost recovery, and BOGO (buy-one-get-one) promotions per bale.

#### How Bales Work

When you buy a bale you know:
- How many items are in it (e.g. 200 pieces)
- What you paid for the whole bale (cost price)
- The selling price per item

The system divides the cost across all items and tracks how many items remain unsold. When items from the bale are sold at the POS (by scanning the bale's barcode), the **remaining count decreases automatically**.

#### Creating a Bale

1. Go to **Clothing → Inventory → Bales → New Bale**.
2. Fill in:
   - **Batch number** — leave blank to auto-generate (format: `BALE-{SHOP}-{NUMBER}`)
   - **Category** — e.g. "Ladies Tops", "Kids Mixed", "Winter Jackets"
   - **Item count** — total number of pieces in the bale
   - **Selling price per item** (unit price)
   - **Cost price** — what you paid for the whole bale (used for cost-recovery reporting)
   - **Barcode** — scan or type a barcode to attach to this bale (optional but recommended)
   - **Employee** — the staff member receiving the bale
   - **Notes** — supplier name, delivery date, anything useful

3. Click **Save Bale**.

The system assigns a SKU automatically (e.g. `BALE-HXI-00042`). The bale now appears in the bale inventory list.

#### Printing Bale Labels

After creating the bale, print its barcode label so shelf staff can scan items to the POS:

1. From the bale record, click **Print Label**.
2. Choose the label template (see "Creating a Label Template" below).
3. The label will include:
   - Business name
   - Category / product name
   - Selling price (large)
   - Batch number and date
   - **Barcode** (scannable by the POS)
   - Size and colour if set
4. Click **Print** — the job is sent to the label printer.

Stick the label on the shelf edge or bin where the bale is displayed. Cashiers scan this label when ringing up items.

#### Selling from a Bale at the POS

Cashiers do not need to know which bale items came from. They simply:
1. Scan the bale's barcode label (or type the SKU).
2. The bale appears as a product in the cart with the unit price.
3. Adjust the quantity to the number of pieces being purchased.
4. Complete the sale normally.

The bale's **remaining count** decreases by the quantity sold.

#### BOGO Promotions on a Bale

To run a "buy 2 get 1 free" or similar offer:

1. Open the bale record.
2. Enable **BOGO Active**.
3. Set the **BOGO ratio** (e.g. 3 means "buy 2 pay, 1 free" → every 3rd item is free).
4. Save.

The POS will automatically apply the free item when the quantity meets the ratio. The bale report tracks how many free items have been given out.

#### Bale Inventory Report

Go to **Reports → Bale Inventory** to see:
- Remaining item count per bale
- Items sold vs total
- Cost recovery percentage (how much of the purchase cost has been recovered so far)
- Sales velocity (average items sold per day)
- BOGO free items given out
- Transfers between business locations

#### Transferring a Bale Between Locations

If items from one bale are moved to another shop:
1. Go to **Inventory → Transfers → New Transfer**.
2. Select the bale as the item being transferred.
3. Enter the quantity moving.
4. Select the destination business.
5. Confirm — both locations' remaining counts update.

---

### Custom Bulk Products — Complete Guide

A **Custom Bulk Product** is a container of identical items purchased in bulk and sold individually — for example, a box of 300 chocolates sold at $0.35 each, or a crate of 50 shampoo bottles sold at $1.20 each. The system tracks how many items remain in the container and automatically deactivates the product when stock runs out.

> **Custom Bulk vs Bales:** Bales are used for used clothing where the exact item count is estimated. Custom Bulk is for packaged goods where the item count is exact and the per-item price is fixed.

#### Accessing Custom Bulk Products

Navigate to **Inventory → Custom Bulk Products** from the left sidebar. This page shows all active bulk products for your business with their remaining stock, unit price, and container cost.

#### Registering a New Bulk Product

1. From the **Bulk Stocking panel** (Inventory → Bulk Stocking), click the **📦 Bulk Product** button in the header.
2. In the **Register New** tab, fill in:

| Field | Required | Notes |
|-------|----------|-------|
| **Product Name** | Yes | e.g. "Chockolates", "Hand Sanitiser 500ml" |
| **Barcode** | No | Scan an existing barcode on the container, or click **Generate** to auto-create one |
| **Item Count** | Yes | Total number of individual units in the container |
| **Container Cost** | No | What you paid for the whole container — used for profit margin |
| **Unit Price** | Yes | Auto-calculated as Container Cost ÷ Item Count when both are filled in. You can also set it manually. |
| **Category** | No | Select from the list. Click **+ New category** to create one on the spot. |
| **Supplier** | No | Select from the list. Click **+ New supplier** to add one inline. |
| **Notes** | No | Optional internal note |

3. Click **Register Bulk Product**.
4. The success screen shows:
   - The assigned **batch number** and **barcode**.
   - A **🖨 Print Barcode Label** button — click this to immediately print a scannable label for the container.

> **Auto-generated barcode:** If you leave the Barcode field empty, the system generates a unique 8-character hex code (e.g. `a3f2b7c9`). This becomes the barcode scanned at the POS.

#### Printing a Barcode Label

Labels for custom bulk products use the same print system as bales:

1. Click **🖨 Print Barcode Label** on the success screen after registering, **or**
2. Go to **Inventory → Custom Bulk Products**, find the product row, and click **🖨 Print** in the Actions column, **or**
3. In the Bulk Product modal, switch to the **📋 Manage Existing** tab, find the product, and click **🖨 Print**.

The print modal lets you:
- Select a **label template** (size, font, layout)
- Set the **quantity** of labels to print
- Send to a **receipt/label printer** or **save as PDF**

Stick the printed label on the container or shelf edge. Cashiers scan this label at the POS.

#### Selling a Custom Bulk Product at the POS

1. **Scan the barcode** on the container label at any POS terminal.
2. The product is added to the cart at the unit price (e.g. $0.35).
3. Adjust the quantity to however many units the customer is buying.
4. Complete the sale normally.

The product's **remaining count decreases** by the quantity sold. When the remaining count reaches zero, the product is automatically deactivated and will no longer appear in barcode lookups.

#### Managing Existing Bulk Products

Go to **Inventory → Custom Bulk Products** (sidebar link). The page shows:

| Column | What it means |
|--------|---------------|
| **Product** | Name and any notes |
| **Batch / Barcode** | Auto-generated batch number and barcode value |
| **Category** | Assigned category |
| **Items Left** | Remaining count with a colour-coded progress bar |
| **Unit Price** | Per-item selling price |
| **Container Cost** | Original purchase cost of the full container |
| **Added** | Date registered |
| **Actions** | Edit · 🖨 Print · Deactivate |

**Restock Candidates** are shown in an amber panel at the top — these are products with 5 or fewer items remaining or sold out.

#### Editing a Bulk Product

Click **Edit** on any row. You can update:
- Product name
- Unit price
- Container cost
- Notes

> Item count cannot be changed after registration. To correct an item count error, deactivate the old product and register a new one.

#### Deactivating a Bulk Product

Click **Deactivate** to mark the product as inactive. It will no longer appear at the POS or in barcode scans. Sales history is preserved. Use this when:
- The container is physically removed from sale before it is fully sold.
- You registered it with incorrect details.

#### Inline Category and Supplier Creation

When registering a new bulk product, if the category or supplier you need does not exist:
- Click **+ New category** under the Category dropdown — enter the name and save. The new category is immediately selected.
- Click **+ New supplier** under the Supplier dropdown — fill in the supplier form and save. The new supplier is immediately selected.

---

### Bulk Stocking Panel — Receiving and Counting Stock

The **Bulk Stocking Panel** is a full-screen workspace used by stock managers to receive incoming deliveries and run formal stock takes. It is accessed from:

- **Clothing → Inventory → 📦 Bulk Stock**
- **Restaurant → POS → 📦 Bulk Stock** (admin only)
- **Grocery → POS → 📦 Bulk Stock**

The panel supports scanning many items in a single session, saving work in progress as named drafts, and submitting a full report with employee sign-off.

---

#### Opening the Panel — Draft Selection

When you open the Bulk Stocking panel, the system first checks for existing saved drafts:

- **Spinner shown** — "Looking for drafts…" and the scan input is disabled until the check completes.
- **No drafts found** — a prompt asks you to enter a name for a new draft (required), then the panel opens ready to scan.
- **One or more drafts found** — a **Draft Selection screen** appears showing all your saved drafts for this business:
  - Draft name (e.g. "March Delivery" or "Full Store Count")
  - Number of items in the draft
  - Date and time last saved

From here:
- Click a draft to **Resume** it — all previously entered rows are restored.
- Click **+ Start New Draft** to enter a name and begin fresh (your previous drafts remain saved).

> You can have multiple named drafts open at the same time (e.g. one for each supplier delivery or one per section of the store). Use **Switch Draft** in the panel header to save the current draft and pick a different one.

---

#### The Panel Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back   Bulk Stocking — Mvimvi Groceries     [Draft: "March Stock"] │
│           💾 Saved 2 min ago  [Save Draft]  [Sync]  [Switch Draft]    │
│                                                                        │
│  Barcode: [____________________]  [📋 Stock Take]  [+ Add Row]        │
│  Counted: 14 / 120  (Stock Take Mode only)                            │
├────────────────────────────────────────────────────────────────────────┤
│  # │ Barcode │ Name    │ Domain     │ Category   │ Supplier │ Curr Stk │
│    │         │         │            │            │          │ Qty Add  │
│    │         │         │            │            │          │ Phys Cnt │
│    │         │         │            │            │          │ Variance │
│    │         │         │            │            │          │ Price    │
│    │         │         │            │            │          │ Cost     │
│    │         │         │            │            │          │ SKU │ ✕  │
└────────────────────────────────────────────────────────────────────────┘
         [Review & Submit ({n} items)]
```

---

#### Adding Items — Scanning or Manual Entry

**Scan a barcode:**
- Point your scanner at any product barcode or type the barcode value and press **Enter**.
- If the barcode **matches an existing product** in your inventory, a new row is added with the name, SKU, and current stock quantity pre-filled (read-only).
- If the barcode **is not found**, a blank row is added with the barcode pre-filled — fill in all details manually.

**Duplicate detection:**
- If the same barcode is already in the current batch, an alert appears: "Already in batch (row #N). Update that row or skip?" — click **Go to Row** to scroll to it, or **Skip** to dismiss.

**Manual row:** Click **+ Add Row** to add a blank row without scanning.

---

#### Table Columns

| Column | Editable | Notes |
|--------|----------|-------|
| **Barcode** | Read-only if from scan | Editable if manually added |
| **Product Name** | Read-only if existing match | Editable for new items |
| **Domain** | Yes | Top-level grouping (e.g. "🥦 Fresh Produce"). Optional. Available for all business types — see predefined taxonomy below. |
| **Category** | Yes | Sub-group within a domain (e.g. "Vegetables"). Required. Filtered by the selected domain. |
| **Supplier** | Yes | Searchable dropdown. Optional. |
| **Description** | Yes | Free text note. Optional. |
| **Current Stock** | Read-only | Only shown for existing products |
| **Qty to Add** | Yes | How many new units you are receiving |
| **Physical Count** | Yes | What you counted on the shelf (for Stock Take mode — see below) |
| **Variance** | Read-only | Physical Count − System Quantity. Red = shortfall, green = surplus. Only calculated when Physical Count is entered. |
| **Sell Price** | Yes | Selling price per unit. Tick **Free** for $0 items. |
| **Cost Price** | Yes | Optional purchase cost |
| **SKU** | Yes | Leave blank to auto-generate |
| **✕** | — | Remove the row from the batch |

**Auto-classify from name:** After typing a product name, a **💡** icon appears in the row number column. Click it to get domain/category/sub-category suggestions based on the product name. See [Bulk Stocking Panel — Auto-Classification](#bulk-stocking-panel--auto-classification-suggest-feature) for details.

**Inline creation:** If the domain, category, or supplier you need does not exist yet:
- Click **+ New category** below the Category dropdown — enter a name and save. It is immediately available in all rows and saved for future sessions.
- Click **+ New supplier** below the Supplier dropdown — same pattern.

---

#### Drafts — Saving and Managing

| Action | How |
|--------|-----|
| **Save now** | Click **Save Draft** in the header |
| **Auto-save** | The panel saves automatically every 60 seconds when rows are present |
| **Draft status** | Shown as a pill: "💾 Saved 3 min ago" or "● Unsaved changes" |
| **Rename draft** | Click the draft name in the header to edit it inline — saves on blur |
| **Switch drafts** | Click **Switch Draft** — saves current work then shows the draft selection screen |
| **Delete draft** | Use the delete option in the draft selection screen |

---

#### Submitting a Batch — Review & Submit

When all items are entered, click **Review & Submit**. This opens the **Stock Take Report Preview** — a full-screen summary before anything is committed:

**Existing items section:**
| Column | What it shows |
|--------|--------------|
| Barcode | Product barcode |
| Name | Product name |
| System Qty | Quantity recorded in the system at last sync |
| Physical Count | What you entered |
| Variance | Shortfall (red) or surplus (green) |
| New Stock Added | Qty to Add you entered |
| Sell Price | Per unit price |
| Shortfall Value | \|Variance\| × Sell Price (shown for shortfall rows) |

**New items section** — products not previously in the system, with name, quantity, price, and new stock value.

**Totals panel:**
- Total shortfall quantity and value
- Total new stock value
- Estimated total inventory value after submit

**Responsible employees (required):**
- Select at least one employee from the dropdown.
- The system shows each employee's share of the shortfall (total shortfall value ÷ number of employees).
- Employees will receive a digital sign-off request after submission.

Click **Go Back** to return and make corrections. Click **Confirm & Submit** to apply all stock changes and create the report.

> **What happens on submit:** Stock quantities are updated immediately. The report enters **Pending Sign-off** status. Responsible employees must sign off digitally. A manager gives the final sign-off. Once all sign-offs are complete, the report is marked **Signed Off** and any shortfall deductions are available for payroll sync.

---

#### Stock Take Mode — Full Store Count

**Stock Take Mode** is a specialised version of the Bulk Stocking Panel designed for a complete physical inventory count.

**Activating Stock Take Mode:**
1. Open the Bulk Stocking panel (creating or resuming a draft).
2. Click the **📋 Stock Take** button in the scan bar.
3. If you already have rows in the current draft, a confirmation appears: "This will start a new Stock Take draft. Your current work will be saved first. Continue?" — confirm to proceed.
4. Once activated, the mode is **locked for the lifetime of this draft** — the button changes to "📋 Stock Take Mode — Active" (greyed out, cannot be toggled off).

**Loading inventory:**
- The system immediately loads **all active inventory** for your business into the table. This includes all tracked products and variants.
- A loading overlay shows progress: "Loading inventory… 87 / 120 products".
- All rows are pre-filled with system quantities and are read-only for name/barcode. You only need to fill in the **Physical Count** column.

**Counting items:**
- In the **Physical Count** column, type what you counted on the shelf for each item.
- **Rows turn green** as soon as a physical count is entered — this gives you a clear visual of what has and hasn't been counted yet.
- A **"Counted: X / Y"** badge in the scan bar updates in real time.

**Scanning a barcode during stock take:**
- Scan any product barcode — if it is already in the list, the row **moves to the top of the table** and is highlighted so you can immediately enter its count. No duplicate warning appears — scanning an existing product is normal behaviour.
- If the barcode is not in the list (a new product), a new row is added at the top.

**Resuming a Stock Take draft:**
- When you resume a draft that was created in Stock Take Mode, the system automatically runs a sync to refresh all system quantities.
- After the sync, **all physical counts are reset to blank** so you start counting fresh with up-to-date system figures.
- A notice is shown: "Physical counts have been reset — synced stock levels are up to date."

---

#### Sales During a Stock Take — Sync & Submit Guard

Sales are **never blocked** while a stock take is in progress. The system tracks the impact automatically:

- When a sale occurs for a product that is in your active stock take draft, the draft is marked as having sales activity.
- Affected rows show an **amber highlight** with a "⚠ Review" badge and are sorted to the top of the table.
- A **warning banner** appears at the top of the panel:

> ⚠ Sales occurred since your last sync. Stock quantities may have changed. **[Sync Now]** | **[View Affected Rows]**

**Syncing:** Click **Sync Now** (or the **Sync** button in the header) to re-fetch the current system quantities for all affected rows. The affected row highlights are cleared after sync.

**Submitting after sales:** If sales occurred since your last sync, the **Review & Submit** button is disabled with a tooltip: "Sync required before submitting." You must sync first to ensure the report reflects accurate system quantities.

---

#### Item Type Badges (Stock Take Mode)

Each row shows a small badge to identify the item type:

| Badge | Colour | Meaning |
|-------|--------|---------|
| **Stk** | Blue | Regular tracked product (variant) |
| **BCI** | Teal | Barcode Inventory Item |
| **Bulk** | Purple | Custom Bulk Product |
| **Bale** | Orange | Clothing Bale |

---

#### Sold Out / Restock Candidates (Stock Take Report Preview)

In the **Review & Submit** screen, when submitting in Stock Take Mode:

- A dedicated **"Sold Out / Zero Stock — Restock Candidates"** section appears in orange.
- It lists all items where your physical count is zero OR the system quantity is zero.
- This is informational only — it does not affect the stock update. Use it as a procurement checklist.

---

#### Stock Take Reports

Go to **Inventory → 📋 Stock Take Reports** (button in the inventory page header — visible to users with financial data access).

Each report shows:

| Column | Meaning |
|--------|---------|
| **Date** | When the stock take was submitted |
| **Employees** | Responsible employees — green tick = signed, grey = pending |
| **Status** | Pending Sign-off / Signed Off / Voided |
| **Shortfall** | Total value of missing stock |
| **New Stock Value** | Total value of stock received |
| **Submitted by** | User who submitted |

**Signing off a report:**
1. Click **View** on a report.
2. Each responsible employee can click **Sign Off** against their own name (only visible to that employee or a manager acting on their behalf).
3. Once all employees have signed, the manager signs off using **Sign Off as Manager**.
4. Status changes to **Signed Off** with a timestamp.

**After sign-off:** Shortfall deductions are now available to pull into payroll — the manager clicks **Sync Stock Shortfall** on the payroll period page.

**Voiding a report:** Managers can click **Void** on any report with **Pending Sign-off** status. This marks it as voided — stock quantities that were already applied are **not** reversed. Use this if the count was done incorrectly and needs to be restarted.

> **Admin note:** If a stock take draft with Stock Take Mode enabled is blocking sales for a business (e.g. the count was abandoned and the cashier cannot process transactions), a system administrator can force-delete it from **Admin → Blocking Stock Take Drafts**. See [Admin — Blocking Stock Take Drafts](#admin--blocking-stock-take-drafts).

---

### Barcode Templates — Creating and Using Label Designs

A **barcode template** is a saved label design. It stores the visual layout (font size, paper size, what to print) AND default product data (name, price, size, colour). Once a template is set up, anyone can create a perfectly formatted product label just by scanning the barcode.

#### When to Create a Template

Create a template when:
- You receive the same product line regularly and want to label items consistently.
- You want to pre-define the price and name so staff cannot accidentally enter them wrong.
- You want to scan a barcode to instantly create a product with all details pre-filled.

#### Creating a Template

1. Go to **Universal → Barcode Management → Templates → New Template**.
2. Fill in the **Product details**:
   - **Template name** — e.g. "Ladies T-Shirt $2.50"
   - **Product name** — the name that will appear on the label
   - **Barcode value** — the actual barcode number (scan it in or type it)
   - **Default price** — the selling price pre-filled when creating a product from this template
   - **Default size** — e.g. "M", "XL", "One Size"
   - **Default colour** — e.g. "Assorted"
   - **Batch ID** — optional grouping reference
   - **Type** — choose the business type (clothing, grocery, hardware, etc.)

3. Fill in the **Label layout**:
   - **Paper size** — A4 (for laser/inkjet), Label 2×1 or Label 4×2 (for dedicated label printers), Receipt strip (for receipt printers)
   - **Orientation** — Portrait or Landscape
   - **Barcode symbology** — CODE128 is the most universal; EAN-13 for standard retail products
   - **Width / Height** — label dimensions in millimetres
   - **Display value** — tick this to print the barcode number below the bars (recommended)
   - **Font size** — size of the human-readable text
   - **Background colour / Line colour** — leave as white/black unless you have a specific need

4. Click **Save Template**.

#### How a Label Looks When Printed

Labels generated from templates follow this layout (top to bottom):

```
┌────────────────────────────┐
│  BUSINESS NAME             │  ← bold, centred
│  Product Name              │  ← centred
│  Description (if any)      │
│  Size: XL                  │  ← large text
│  Batch: BALE-HXI-042  Qty:5│
│  ┌──────────────────────┐  │
│  │ ||| BARCODE |||       │  │  ← scannable barcode
│  │ 1234567890123         │  │  ← number below bars
│  └──────────────────────┘  │
│  SKU: BALE-HXI-042         │
│  $2.50                     │  ← price, very large
│  Colour: Assorted          │
│  Template: Ladies T-Shirt  │  ← small footer
├────────────────────────────┤  ← fold / cut line
```

> For thermal label printers (e.g. Zebra, HPRT), the print job uses ESC/POS commands and prints immediately. For laser or inkjet printers, the system produces a grid of labels on A4 (3 columns × 6 rows = 18 labels per page) with cut guides.

#### Printing Labels from a Template

1. Go to **Universal → Barcode Management → Print Jobs → New Print Job**.
2. Select your template.
3. Choose the item type:
   - **Product** — prints a label for an existing product
   - **Bale** — prints a label for a bale (pre-fills from bale record)
   - **Custom** — manually enter the data for this print run
4. Enter **quantity** (how many labels to print — up to 1,000).
5. Select the printer.
6. Click **Print**.

The job is added to the print queue with status **Queued → Processing → Completed**. You can track it under **Barcode Management → Print Queue**.

#### Editing or Deactivating a Template

1. Go to **Universal → Barcode Management → Templates**.
2. Find the template and click **Edit**.
3. Make changes and save — existing labels already printed are not affected.
4. To stop the template appearing in print job dropdowns, toggle **Active** to off.

> The template list shows **usage count** and **last used date** so you can see which templates are actively in use.

---

## 15. Restaurant Menu Management

> **Who reads this:** Restaurant managers and owners who maintain the menu.

---

### Menu Structure Overview

The restaurant menu is organised into **categories** (e.g., Starters, Mains, Beverages, Desserts) and **items** within each category. Each item can optionally have **variants** for different sizes or options (e.g., Small / Large, Regular / Extra Spicy).

---

### Creating a Menu Category

Before adding items, ensure the correct category exists:

1. Go to **Restaurant → Menu**.
2. Click **Add Category** (or use the category field in the item form — it includes a "Create New" option inline).
3. Fill in:
   - **Name** — e.g., "Grills", "Cold Drinks", "Sides"
   - **Emoji** — choose an emoji to represent the category (e.g., 🥩 for Grills)
   - **Colour** — pick a colour used for the category button in the POS
   - **Display order** — lower number = appears first
4. Save.

The category appears immediately as a filter tab in the POS.

---

### Adding a Menu Item

1. Go to **Restaurant → Menu → Add Menu Item**.
2. Fill in the details:

| Field | Notes |
|-------|-------|
| **Name** *(required)* | What appears on the POS and receipt (e.g., "Chicken Burger") |
| **Category** *(required)* | Choose from existing categories or create one inline |
| **Base Price** *(required)* | The standard selling price |
| **Original Price** | The "was" price — shown with a strikethrough if set (for promotions) |
| **Discount %** | Automatic percentage off the base price |
| **Description** | Shown on the customer display screen |
| **Preparation time** | Minutes — informational, for kitchen display |
| **Spice level** | 1 (mild), 2 (medium), 3 (hot) |
| **Calories** | Informational |
| **Dietary flags** | Tick any that apply: Vegetarian, Vegan, Gluten Free, etc. |
| **Allergens** | Tick any that apply: Nuts, Dairy, Eggs, Wheat, etc. |
| **Available** | Toggle off to hide the item from the POS without deleting it |
| **Barcode** | Optional — assign a barcode so the item can be scanned at the till |

3. Click **Save Menu Item**.

---

### Adding Variants (Small / Large, Options)

If the same dish is sold in different sizes or options at different prices, use variants instead of creating separate items.

On the item form:
1. Scroll to the **Variants** section.
2. Click **Add Variant**.
3. For each variant enter:
   - **Variant name** — e.g., "Regular", "Large", "Boneless"
   - **Price** — can differ from the base price
   - **Available** — toggle off if a size is temporarily out
4. Add as many variants as needed.
5. Save.

At the POS, when the cashier adds this item to the cart, a size/option picker appears for them to choose which variant.

---

### Cloning a Menu Item

If you need a new item that is similar to an existing one (e.g., a variant without the size picker, or a seasonal special based on an existing dish):

1. On the Menu page, hover over the item card.
2. Click **Clone** (or the duplicate icon).
3. The system copies all fields except the ID, barcode, and image.
4. The name is pre-filled as **"[Original Name] (Copy)"** — rename it.
5. Adjust the price, category, and any other details.
6. Click **Save** — a new product is created.

> Cloning is the fastest way to build out a menu when many items share similar settings (e.g., a range of burgers that differ only in name and price).

---

### Marking an Item as Unavailable

If an ingredient runs out or a dish is temporarily off the menu:

1. Find the item on the Menu page.
2. Click the **availability toggle** (the on/off switch on the item card).
3. The item is immediately hidden from the POS.
4. Toggle it back on when it is available again.

> Use "Unavailable" for temporary situations. Use **Delete** only if the item will never be sold again — deletion removes all historical data links.

---

### Menu Promotions

To run a promotion on a specific item (e.g., "20% off all burgers on Tuesdays"):

1. Open the item for editing.
2. Set the **Original Price** to the current price.
3. Set the **Discount %** to 20 (or the **Discounted Price** directly).
4. The POS will show the strikethrough original price and the new lower price.
5. Remove the original price and reset the discount when the promotion ends.

For buy-one-get-one or min-order promotions, use **Restaurant → Promotions** (a separate promotions module that applies rules automatically at checkout).

---

## 15a. Services as Products — Selling Services via Barcode

> **Who reads this:** Any business that sells services (labour, access, utilities) alongside physical products.

A **service** is any non-physical item you charge for — examples include:

- Cellphone charging (e.g., $0.50 per charge)
- Shoe repair / alterations (clothing store)
- Device repair assessment fee
- Consultation fee
- Parking fee
- Access fee (e.g., pool, gym)

Services are created exactly like products but with **no stock quantity** — they never run out.

---

### Creating a Service Item

1. Go to your business's **Products / Inventory → Add Product** (or **Restaurant → Menu → Add Item**).
2. Fill in:
   - **Name** — e.g., "Phone Charging", "Trouser Hem", "Shoe Sole Repair"
   - **Category** — create a "Services" category if one does not exist
   - **Price** — the fee charged
   - **Barcode** — assign a barcode (type one in or scan a sticker) so the cashier can add it by scanning
   - **Stock tracking** — set to **None** or leave quantity blank — services do not deplete stock
   - **Description** — optional, shown on the customer display
3. Save.

The service appears in the POS search and can be added to any order just like a physical product.

---

### Assigning a Barcode to a Service

Assign a barcode so the cashier does not have to type the service name — they simply scan a sticker placed at the counter.

**Option A — Assign during creation:**
- In the product form, click the **Barcode** field and scan a barcode sticker (or type in a code).
- Save.

**Option B — Assign after creation:**
1. Open the service item.
2. Go to the **Barcodes** tab.
3. Click **Add Barcode**.
4. Scan a sticker or enter the code manually.
5. Set as Primary.
6. Save.

Print a barcode sticker label (via **Barcode Management → Print Jobs**) and stick it at the service point. The cashier scans it to add the service to the cart instantly.

---

### Example: Cellphone Charging at a Clothing Store

1. Create a product: Name = "Phone Charging", Category = "Services", Price = $0.50, Barcode = (scan a sticker), No stock tracking.
2. Print a label and stick it next to the charging station.
3. When a customer wants to charge their phone:
   - Cashier scans the sticker.
   - "Phone Charging $0.50" appears in the cart.
   - Process payment.
   - Receipt is printed as normal — the service appears as a line item.
4. If the customer is a loyalty card holder, the $0.50 is added to their monthly spend total and counts toward campaign thresholds.

---

### Services in Combos

A service can be bundled into a combo deal just like a physical product — e.g., "Meal + Phone Charge" for $6.00. See the Combos section in the menu/POS settings to set this up.

---

## 16. Quick Reference Cards

---

### Quick Reference: POS Cashier

```
MAKING A SALE
─────────────────────────────────────────────
1. Search product name OR scan barcode
2. Click to add to cart
3. Adjust quantity if needed
4. (Optional) Select customer
5. (Optional) Apply coupon code
6. Click CHARGE / PAY NOW
7. Choose payment method
8. Enter amount received (for cash)
9. Click COMPLETE SALE
10. Print receipt
─────────────────────────────────────────────

SCANNING BALES / BULK PRODUCTS / BARCODE ITEMS
  Scan the container/shelf label barcode
  Product appears in cart at its unit price
  Adjust quantity to units being purchased

PAYMENT METHODS
  Cash   → Enter received amount → change is shown
  Card   → Select Card → confirm
  Split  → Enter cash amount first → remaining on card

COUPONS
  Click "Add Coupon" → type code → discount applied

CANCEL A SALE
  Click "Clear Cart" (before payment only)
  After payment → call manager
```

---

### Quick Reference: Stock Take

```
BULK STOCKING — RECEIVING A DELIVERY
─────────────────────────────────────────────
1. Inventory → 📦 Bulk Stock
2. Name your draft (e.g. "March Delivery") → Open
3. Scan each item barcode
   → Existing item: name/price pre-filled, enter Qty
   → New item: fill in all details
4. Set Domain, Category, Supplier per row (optional)
5. Click Save Draft to pause / auto-saves every 60s
6. Click Review & Submit when done
7. Select responsible employees → Confirm & Submit
─────────────────────────────────────────────

RUNNING A STOCK TAKE (full count)
─────────────────────────────────────────────
1. Inventory → 📦 Bulk Stock → click 📋 Stock Take
2. Confirm to start new Stock Take draft
3. System loads ALL active inventory automatically
4. Enter Physical Count for each item on the shelf
5. Scan barcode → row moves to top for fast entry
6. Rows turn GREEN when counted
   "Counted: X / Y" shows progress
7. Click Review & Submit → select employees → Confirm
─────────────────────────────────────────────

IF SALES OCCUR DURING A STOCK TAKE
  Amber rows with ⚠ Review badge appear
  Warning banner shows at top of panel
  Click "Sync Now" to refresh quantities
  Submit button blocked until synced

MULTIPLE DRAFTS
  Can have multiple named drafts at once
  Switch Draft button saves current, shows list
  Resume any draft from the draft selection screen

AFTER SUBMITTING
  Stock updated immediately
  Report: Pending Sign-off
  Each responsible employee signs digitally
  Manager gives final sign-off → Signed Off
  Shortfall available for Payroll → Sync Stock Shortfall

ITEM TYPE BADGES (in table)
  Stk  (blue)   = Regular product
  BCI  (teal)   = Barcode inventory item
  Bulk (purple) = Custom bulk product
  Bale (orange) = Clothing bale

VOIDING A REPORT (manager only)
  Inventory → 📋 Stock Take Reports → View → Void
  Stock changes already applied are NOT reversed

CUSTOM BULK PRODUCTS
─────────────────────────────────────────────
REGISTER:  Bulk Stocking → 📦 Bulk Product
           Fill name, item count, unit price
           Click Generate for auto barcode

PRINT LABEL:
  After register → 🖨 Print Barcode Label
  OR: Inventory → Custom Bulk Products → 🖨 Print

SELLING: Scan container label at POS
         Remaining count decreases per item sold
```

---

### Quick Reference: Cash Office (End of Day)

```
EOD CHECKLIST
─────────────────────────────────────────────
□ Count all physical cash
□ Open Expense Accounts → Payment Batches (or EOD)
□ Confirm date range covers today
□ Enter physical cash count
□ Note any discrepancies
□ Submit reconciliation
□ Manager reviews and approves
─────────────────────────────────────────────

PAYROLL CASH WITHDRAWAL
□ Receive voucher from manager
□ Count cash as per voucher per cash box
□ Hand cash to payroll officer
□ Both parties sign voucher
□ System updates automatically
```

---

### Quick Reference: Manager — Payroll

```
PAYROLL CHECKLIST
─────────────────────────────────────────────
□ Payroll → New Period → set dates → Create
□ Click ⟳ Sync All (absences + clock-in)
□ Click 📋 Sync Stock Shortfall (if stock takes
  were signed off this period)
□ Review all employee entries
  - Per Diem column visible in table (read-only)
  - Stock shortfall deductions shown in entry detail
□ Check total needed vs. account balance
□ If short → Fund Payroll → print voucher
□ Submit for Owner Approval
□ Owner Approves → Export to Excel
□ Make all payments
□ Reconcile and Close period
─────────────────────────────────────────────

EXPORT INCLUDES
  Basic, Commission, Overtime, Per Diem,
  Benefits, Advances, Loans, Gross, Net

APPROVING EXPENSE REQUESTS
  Bell icon → Pending Actions → Open item
  Review → Approve OR Decline (add reason)
```

---

### Quick Reference: Manager — Reports

```
WHERE TO FIND REPORTS
─────────────────────────────────────────────
Sales         → Reports → Sales Summary
Payroll       → Payroll → Account → Reports
Expenses      → Expense Accounts → Reports
Customers     → Customers → Reports
Cash Bucket   → Cash Bucket → Report
Petty Cash    → Petty Cash → Reports
Chicken Run   → Chicken Run → Reports
Employees     → Employees → Clock-In → Reports
─────────────────────────────────────────────

TO SAVE A REPORT
  Set filters → click Save Report → give it a name
  Find again under Reports → Saved Reports

TO EXPORT
  Set filters → Export CSV (for Excel)
             → Export PDF (for printing/sharing)
```

---

### Quick Reference: Employee (Clock-In & Leave)

```
CLOCK IN
─────────────────────────────────────────────
  Employees → Clock-In → Find your name
  → Click CLOCK IN

CLOCK OUT
  Employees → Clock-In → Find your record
  → Click CLOCK OUT

FORGOT? → Tell your manager immediately
  Manager can manually add or fix the entry:
  Employees → Clock-In → Records → Edit/Add Entry

─────────────────────────────────────────────

LEAVE REQUEST
  Employees → Your Name → Time Off
  → Request Time Off → choose type & dates
  → Submit
  (manager gets notified and approves/declines)

PER DIEM
  1. Get blank form: Employees → Per Diem → Request Form → Print
  2. Fill in dates, amounts, purpose (by hand)
  3. Get manager to sign the Approver line
  4. HR/cashier enters approved data:
     Employees → Per Diem → New Entry
     → Select employee + month/year
     → Add one row per travel day (date, amount, purpose)
     → Save
  5. Per diem is automatically included in payroll export for that month
```

---

### Quick Reference: Petty Cash

```
REQUEST PETTY CASH
─────────────────────────────────────────────
  Petty Cash → New Request
  → Enter amount & reason → Submit
  (wait for approval notification)

COLLECT YOUR CASH
  After approval → go to cashier with approval
  → cashier releases cash

SETTLE YOUR PETTY CASH
  Keep all receipts
  Petty Cash → find your request → Settle
  → attach receipts → submit
─────────────────────────────────────────────

STATUS MEANINGS
  Pending  = waiting for manager approval
  Approved = approved, collect from cashier
  Settled  = done and accounted for
  Cancelled = declined or withdrawn
```

---

### Quick Reference: Chicken Run

```
DAILY ROUTINE
─────────────────────────────────────────────
□ Check dashboard for alerts
□ Record morning feed (batch → Feed Log)
□ Record any deaths (batch → Mortality Log)
□ Record weight check if weigh day
□ Check vaccination schedule for due vaccines

STARTING A BATCH
  Chicken Run → New Batch
  → Enter chick count, arrival date, supplier
  → Start Batch

HARVEST / PROCESSING
  Inventory → select batch → Record Harvest
  → enter count and weight → save
─────────────────────────────────────────────

ALERTS
  Red warning = mortality > 5% → tell manager immediately
  Orange warning = low inventory → plan purchase
```

---

### Quick Reference: WiFi Tokens

```
SELL A TOKEN (via POS)
─────────────────────────────────────────────
  Open POS → search WiFi package name
  → add to cart → process payment
  → print receipt (token credentials on receipt)
  → give receipt to customer

TOKEN IS THEIR PASSWORD — ONE USE ONLY

CHECK AVAILABILITY
  Product card shows count (e.g., "12 available")
  If low → click "Request 5 More"
─────────────────────────────────────────────

DIRECT SALE (not via POS)
  R710 Portal → Sales → New Direct Sale
```

---

---

## 16. Suppliers & Payees

> **Who reads this:** Managers and accounts staff who create and maintain the supplier list used in expense accounts, rent accounts, and purchase orders.

### What Is a Supplier / Payee?

A **supplier** (also called a payee) is any business or individual that your company pays money to. This includes:
- Goods suppliers (wholesale grocers, clothing bale vendors, hardware merchants)
- Service providers (cleaners, security firms, IT contractors)
- Landlords (for rent payments)
- Utilities (electricity, water, internet)
- Any recurring or one-off payee

Suppliers are recorded in the system so that payments can be linked to the correct payee, expense account reports show who was paid, and the manager can see spending patterns per supplier.

---

### Adding a Supplier

1. Go to **Suppliers** in the menu (or **Expense Accounts → Suppliers → New Supplier**).
2. Fill in the required fields:
   - **Name** *(required)* — the trading name of the supplier or individual
   - **Phone number** *(required)* — used for contact and verification
3. Fill in the optional fields (recommended for a complete record):
   - **Contact person** — the name of your point of contact at the supplier
   - **Email address** — for sending purchase orders or payment remittances
   - **Tax ID / VAT number** — the supplier's tax registration number (needed for VAT-registered businesses)
   - **Physical address** — delivery or correspondence address
   - **Supplier type** — choose the most appropriate type:
     - **General** — for most suppliers
     - **Landlord** — for property owners you pay rent to (these are shared across all your businesses)
     - **Utility** — electricity, water, internet, etc.
     - **Service** — labour contractors, cleaners, security, etc.

4. Click **Save Supplier**.

The supplier is now available in dropdown menus when creating expense payment requests, payment batches, and rent accounts.

---

### Suppliers vs Landlords — Key Differences

Although landlords are a type of supplier, they behave differently in the system. Understanding the distinction prevents confusion when setting up rent accounts or expense payments.

| | Regular Supplier | Landlord |
|---|---|---|
| **Purpose** | Goods, services, utilities — anything you buy or pay for | Property owner you pay rent to |
| **Tied to a business?** | Yes — each business has its own supplier list | **No — landlords are global** and shared across all businesses |
| **Where created** | Suppliers menu | Suppliers menu **or** directly from the Rent Account → Manage screen |
| **Used in** | Expense payment requests, payment batches, purchase orders | Rent Account configuration only |
| **Appears in expense dropdowns?** | Yes | No — landlords only appear in the Rent Account landlord picker |
| **Can be linked to multiple businesses?** | No — supplier belongs to one business | Yes — one landlord record can be the landlord for multiple business locations |

**Practical example:**

> You have three shops — a grocery, a clothing store, and a restaurant — all renting from the same property company "Harare Properties Ltd". You create **one** landlord record for "Harare Properties Ltd". Each shop's rent account then links to that single landlord record. When you search for the landlord in any shop's rent account, it appears because landlords are global.

> By contrast, your grocery's flour supplier "City Millers" only appears when you are in the grocery's expense accounts — it does not appear in the clothing store's supplier list.

---

### Landlord Suppliers — Setup Detail

Landlords are handled separately from regular suppliers:

- They are **global** — not tied to a specific business. A landlord you add can be linked to any business's rent account.
- They are created either from the **Suppliers** menu (choose type = Landlord) or directly from the **Rent Account → Manage** screen using the **+ Add Landlord** quick-add form.
- The quick-add form pre-fills the name from whatever you typed in the search box — so if you searched "Harare Properties" and found nothing, clicking **+ Add Landlord** opens a form with "Harare Properties" already filled in.
- If a landlord name already exists in the system, the system will find it by search — you should link to the existing record rather than creating a duplicate.

**Required for a landlord:**
- Name
- Phone number

---

### Editing or Deactivating a Supplier

1. Go to **Suppliers** and find the supplier.
2. Click **Edit**.
3. Update any details and click **Save**.

To deactivate a supplier (so they no longer appear in dropdown menus):
1. Open the supplier record.
2. Toggle **Active** to off.
3. Save.

Deactivated suppliers are hidden from new transactions but their historical payment records are preserved.

---

### Supplier Payment History

To see all payments made to a specific supplier:
1. Open the supplier record.
2. Click the **Payments** tab.
3. The full list of expense payments, batch payments, and rent payments linked to this supplier is shown, with dates and amounts.

---

## 17. Batch EOD Catch-Up — Manager and Cashier Roles

This section explains who does what when multiple days of EOD have been missed and need to be caught up at once.

---

### When Is a Batch Catch-Up Needed?

If the business traded for several days without running EOD (e.g. the manager was away, or there was a system outage), the system detects all unclosed trading days and offers a grouped catch-up. The system looks back up to **60 days** to find dates that:
- Had actual sales orders, OR
- Have an active rent or auto-deposit config (meaning money should have been set aside even on quiet days)

---

### Manager's Role in the Catch-Up

The manager drives the catch-up process.

**Step 1 — Open the Catch-Up Wizard**

Go to **[Business] → Reports → EOD Catch-Up** (or from Cash Allocation → Catch-Up button).

**Step 2 — Select the Days to Close**

A list of unclosed dates appears, each showing the sales total for that day. The manager:
- Ticks the days to include (can select all or just a subset).
- Leaves out dates that genuinely had no activity if needed.

Click **Next → Preview**.

**Step 3 — Review the Preview**

A table appears showing each selected date with:
- Total sales
- Number of orders
- Estimated rent transfer (if configured)
- Estimated auto-deposits (if configured)

The manager reviews this to confirm the numbers look right before committing.

Click **Next → Sign-Off**.

**Step 4 — Manager Sign-Off**

The manager enters:
- **Manager name** — this is the electronic authorisation signature for all the selected days.
- **Total cash received** — a single lump-sum figure representing all cash taken across all the selected days combined. This is the physical cash the cashier or manager is handing over to reconcile.
- **Notes** (optional) — e.g. "Closed 5 days, manager was on leave".

Click **Run Catch-Up**.

**What the system does automatically:**
1. Processes each selected date in order from oldest to newest.
2. For each date: runs rent transfer (if configured), runs auto-deposits (if configured).
3. Creates a locked EOD report for each date.
4. Creates a **single combined Cash Allocation Report** covering all selected dates.
5. Returns a summary showing total days closed, total sales, total rent transferred, total auto-deposits processed.

---

### Cashier's Role in the Catch-Up

After the manager completes the catch-up run, the cashier has one task: **complete the Cash Allocation Report**.

**Step 1 — Open the Report**

The cashier receives a 🔔 notification: "Batch EOD catch-up complete — cash allocation report ready for review."

Go to **[Business] → Reports → Cash Allocation** (or follow the notification link). The report shows as a grouped allocation report covering all the catch-up dates.

**Step 2 — Review Line Items**

The report lists every money movement across all closed dates:
- All rent transfers (one per trading day)
- All auto-deposits (one per config per trading day)

The cashier counts out the physical cash matching the **total reported amount** for all line items combined.

**Step 3 — Check and Confirm Each Line**

For each line item, the cashier:
1. Confirms the amount looks correct.
2. Ticks ✅ the checkbox.

**Step 4 — Lock**

Click **Lock Allocation**. The report is locked, Cash Bucket INFLOW and OUTFLOW entries are recorded, and the catch-up is fully complete.

> **Key difference from a single-day EOD:** In a catch-up, the cashier is reconciling cash for multiple days at once. The **Total Cash Received** entered by the manager in Step 4 is the total physical cash for all days — the cashier's job is simply to confirm the breakdown adds up and sign it off.

---

### Summary of Roles

| Step | Who Does It | What They Do |
|------|------------|-------------|
| Select days | **Manager** | Chooses which unclosed days to catch up |
| Preview | **Manager** | Checks sales totals before committing |
| Sign-off | **Manager** | Enters name + total cash received, runs the batch |
| Cash allocation review | **Cashier** | Ticks off each line item, confirms amounts |
| Lock allocation | **Cashier** | Locks the report — catch-up complete |

---

## 20. Team Chat

> **Who reads this:** All users — employees, managers, cashiers, and owners. Chat is available to everyone with a system account.

### What is Team Chat?

Team Chat is a built-in **company-wide messaging tool** that lets all staff communicate in real time — no need for WhatsApp groups or external apps. It is always available from any screen in the system.

There is one shared room: **General**. All users with a system account can see and send messages here.

---

### Opening the Chat Panel

The chat lives in a **floating panel** that you can open without leaving whatever page you are on:

- **Sidebar:** Click the **💬 Chat** button in the left navigation bar.
- **Mobile:** Tap the chat icon in the mobile menu.
- **Dashboard:** Click the chat shortcut button on the dashboard.

The panel opens as a draggable window — you can move it to any corner of the screen so it does not cover your work.

---

### Sending a Message

1. Open the chat panel.
2. Type your message in the input field at the bottom.
3. Press **Enter** or click **Send**.

Your message appears immediately for all connected users.

---

### Real-Time Updates

Messages are delivered using **WebSockets** — they appear instantly without needing to refresh the page. If the connection drops temporarily, the system falls back to polling automatically and reconnects.

---

### Unread Message Badge

When the chat panel is closed and a new message arrives:
- A **red badge** appears on the chat button showing the number of unread messages.
- The badge shows `9+` if there are more than nine unread messages.
- The count clears as soon as you open the panel.

You also receive a **🔔 bell notification** in the notification panel for each message sent while you were inactive.

---

### Message History

When you open chat, the last **100 messages** are loaded automatically. Messages are grouped by date:

```
── Monday, 10 March 2026 ──────────────────────
  09:14  Alice      Good morning everyone
  09:16  Bob        Morning! Till 3 is open
  09:45  Manager    All staff meeting at 14:00
── Tuesday, 11 March 2026 ─────────────────────
  08:55  Alice      Running 5 mins late
```

> Messages older than **7 days** are automatically deleted. Chat is intended for day-to-day communication — it is not a permanent record store.

---

### Deleting a Message

You can delete your **own** messages:
1. Hover over the message.
2. Click the **Delete** button that appears.
3. The message is replaced with: *🚫 This message was deleted.*

The placeholder is visible to everyone — deleted messages are not hidden from the chat history, only their content is removed.

> Only the message author can delete a message. You cannot delete other people's messages.

---

### What Chat Does Not Support

| Feature | Available? |
|---------|-----------|
| File or image attachments | Not yet |
| Direct messages (person to person) | Not yet — all messages go to General |
| Per-business or per-team channels | Not yet — one shared room for all users |
| Read receipts | Not yet |
| Typing indicators | Not yet |
| Message search | Not yet |
| Message editing | Not yet — delete and re-send |

---

### Chat Tips

- **Tag people by name** in your message so they know it is for them (e.g. *"@Alice, please check till 2 float"*). The system does not parse mentions automatically, but other users will see the name and know.
- **Keep sensitive information out of chat** — chat messages are visible to all users and auto-delete after 7 days. Use Expense Account notes or payroll records for financial records.
- **Use it for quick coordination** — shift handovers, quick questions, daily briefings, closing reminders.

---

---

## 21. Grocery POS — Desk Mode

> **Who reads this:** Grocery cashiers and floor staff who use the product-badge layout instead of a barcode scanner.

### What is Desk Mode?

The Grocery POS has two operating modes:

| Mode | How you add items | Best for |
|------|------------------|----------|
| **Scan Mode** (default) | Scan a barcode or type a PLU code | Cashier with a physical scanner |
| **Desk Mode** | Tap product badges on screen | Counter service, shared till, or stock managers browsing |

Toggle between modes using the **🖥️ Desk Mode** button in the top bar of the POS:
- When **off**, the button is grey with text "🖥️ Desk Mode".
- When **on**, the button turns blue with text "🖥️ Desk Mode ON".

The barcode entry field and PLU entry field are **hidden** in Desk Mode. Products are added by tapping their card on screen.

---

### Stock Badges on Product Cards (Desk Mode)

In Desk Mode, every product card shows a **stock count badge** in the bottom-right corner of the card:

| Badge colour | Meaning |
|-------------|---------|
| **Grey pill** — "42 left" | Normal stock level |
| **Orange pill** — "3 left" | Low stock (fewer than 5 units) |
| **Red pill** — "Out of stock" | Zero units in system |

These badges refresh when you open the POS and when you complete a sale. Use them as a quick at-a-glance guide — if a badge shows "Out of stock", the product cannot be sold until restocked.

---

### Performance Bars (Desk Mode)

Each product card also shows a **performance bar** — a thin coloured bar below the price showing how well this item is selling today relative to its best recent day:

- **Green bar** — strong sales day
- **Yellow bar** — moderate sales
- **Blue bar** — low sales today compared to recent history

Below the bar you will see:
- **"X sold"** badge — units sold today
- **Revenue figure** — today's revenue for this item (visible to users with financial access)
- **"yesterday: Y"** — yesterday's unit count for quick context

---

### Category Sidebar Stock Totals

The left-hand category sidebar (when Desk Mode is on) shows each category with a total stock count beside it, e.g. **"Fresh Produce · 142 in stock"**. This helps you quickly identify which departments need restocking.

---

### Bulk Stock from Desk Mode

The **📦 Bulk Stock** button is always visible in the POS, regardless of mode. Click it to open the full Bulk Stocking Panel (see Section 14) without leaving the POS screen. This lets a stock manager receive deliveries on the same till used for sales.

---

### Cart in Desk Mode

Adding items to the cart in Desk Mode works identically to Scan Mode — click a product card to add one unit. A **blue quantity badge** appears on the card showing how many of that item are in the cart. Click again to add more.

---

## 22. Expense Account — Quick Payment & My Payment Queue

> **Who reads this:** Managers and cashiers who process expense payments. Covers the Quick Payment modal and the My Payment Queue panel on the account detail page.

---

### Quick Payment Modal

The **Quick Payment** button appears on any expense account detail page. It opens a focused payment form directly on the account, without navigating away. This is the fastest way to record a payment from an account.

#### Opening Quick Payment

1. Go to **Expense Accounts** and open the account you want to pay from (e.g. "Fashions HXI Expense Account — Balance: $329.43").
2. Click the **+ Payment** button in the account header.
3. The Quick Payment modal opens.

---

#### Business / Domain Selector

If your login covers more than one business, a **Business** field appears at the top of the modal. This is a **searchable dropdown** — type to filter by business name or domain name.

The dropdown contains two types of entries:

| Entry type | Example | What it does |
|-----------|---------|-------------|
| **Business name** | "HXI Fashions" | Switches to that business's primary expense account and loads its default category set |
| **Business Domain** | "Services Business Domains" | Overrides the category picker to show categories from that specific domain (e.g. Services expenses) |
| **🏠 Personal Expenses** | "Personal Expenses" | Available on personal accounts only — loads the Personal Expenses domain so you can classify your own spending |

Use a **Business Domain** entry when you are recording a payment that belongs to a specific spending category that doesn't match your business's default domain — for example, paying a services supplier from a retail business account.

> **Personal accounts:** When you open Quick Payment from a **Personal** expense account, the Business dropdown automatically pre-selects **🏠 Personal Expenses** and loads the personal spending categories (Housing, Food & Groceries, Transport, Health, Education, etc.). You do not need to select this manually.

> **Tip:** Selecting a domain does not change which account the payment is drawn from. It only changes which categories are available in the Category picker below.

---

#### Category Picker — Domain → Category → Sub-category

Payments can be classified using a three-level hierarchy:

```
Domain  ▶  Category  ▶  Sub-category
e.g. 🛒 Grocery  ▶  Fresh Produce  ▶  Vegetables
```

1. **Domain** — auto-selected based on the current business type or your Business/Domain dropdown selection.
2. **Category** — filtered to categories within the selected domain. Required.
3. **Sub-category** — optional, further classifies the payment.

Changing the **Business** or **Domain** clears the Category and Sub-category fields.

---

#### Payee Field

The **Payee** field lets you specify who is being paid. Start typing a name to search:
- Employees
- Suppliers
- Other contacts

If no payee applies (e.g. a miscellaneous cash expense), leave it as **General**.

---

#### What is this payment for? (Notes) — with Suggest Classification

The **"What is this payment for?"** field is where you describe the payment. As you type, two modes are available:

- **Saved phrases** — pick from a list of previously used payment descriptions (faster for recurring payments).
- **Type a note** — free-text description (e.g. "Replacement printer cartridge HP 63XL").

Once you have typed at least 3 characters, a **💡 Suggest Classification** button appears next to the field label.

---

#### 💡 Suggest Classification — Quick Category Assignment

Instead of manually stepping through Domain → Category → Sub-category dropdowns, you can let the system suggest the right classification based on what you typed in the notes field.

**How to use it:**

1. Type a description in the **"What is this payment for?"** field (at least 3 characters).
2. Click **💡 Suggest Classification** (button next to the field label).
3. A **Suggested Classifications** modal opens, showing up to 5 best matches:

```
💡 Suggested Classifications
Based on: "office printer ink"

🏢 Business (General) › 🖨️ Office Supplies
   🖨️ Printer & Ink Supplies

📋 Consulting › 🏢 Business and Office Services
   🖥️ Office Equipment & Supplies
```

4. Click any suggestion to **instantly fill** the Domain, Category, and Sub-category fields — no manual selection required.
5. While the fields are being filled, a pulsing "💡 Applying suggestion…" indicator appears. The fields are ready when it disappears.

If no matches are found, the message "No matches found — please select manually." is shown — use the dropdowns to select manually.

> **Tip:** The more specific your description, the better the suggestions. "fuel pump repair" will match Vehicle Maintenance sub-categories more precisely than just "fuel".

---

#### Amount and Notes

| Field | Required | Notes |
|-------|----------|-------|
| **Amount** | Yes | Enter the payment amount in dollars |
| **Payment Channel** | Yes | Cash, EcoCash, Bank Transfer, etc. |
| **Notes / Reference** | No | Invoice number, receipt number, or free text description |

Click **Submit Payment** to record the payment.

- **Personal accounts:** The balance is debited immediately and the payment appears in the transaction history.
- **Business accounts (non-admin):** The payment is placed **IN QUEUE** (amber badge) and appears in your **My Payment Queue** panel. It will be included in the next batch submitted by a cashier or manager. Your balance is debited when the batch is submitted.
- **Business accounts (admin / owner):** The payment is submitted directly without queuing.

---

### My Payment Queue Panel

The **My Payment Queue** panel appears on any expense account detail page. It shows **your own** payments that are awaiting action — payments you submitted that have not yet been fully disbursed. You do not need special cashier permissions to see your own payments here.

#### Panel Header

```
My Payment Queue   [12]   ▼
```

- The **count badge** (blue pill) shows the total number of items across all statuses.
- Click the header to **collapse or expand** the panel. It defaults to open.

#### Search

When the panel is open, a **search box** appears below the header. Type any part of a payee name, category name, or payment description to filter the list in real time.

#### Payment Statuses

Payments in the queue are grouped by status, each with a colour-coded badge:

| Badge | Colour | Meaning |
|-------|--------|---------|
| **AWAITING CASHIER** | Blue | Payment request submitted — cashier is reviewing (personal accounts only) |
| **APPROVED** | Green | Approved and ready to be physically disbursed |
| **IN QUEUE** | Amber | Queued for batch approval (business accounts) — awaiting manager review |

#### Actions per Status

**APPROVED payments** — payments that have been approved but not yet physically handed over:
- **📄 Voucher** — generate a payment voucher document for record-keeping.
- **✓ Mark as Paid** — confirm physical handover. The item disappears from the queue immediately and the account balance updates instantly.
- **📱 Mark as Sent** (EcoCash only) — enter the EcoCash transaction code to confirm mobile transfer. Balance also updates instantly.

**AWAITING CASHIER payments** (personal accounts) — requests pending cashier approval:
- **✕ Cancel** — withdraw the request before the cashier acts on it.

**IN QUEUE payments** (business accounts) — payments awaiting the next batch submission:
- **✎ Edit** — change the amount or notes before the batch is submitted.
- **✕ Cancel** — withdraw the payment request entirely.

> **Live updates:** The queue and account balance refresh automatically when a payment is approved or marked as paid — no browser refresh needed. If an AWAITING CASHIER request is approved or rejected while you have the page open, it moves out of the queue and the transaction list updates within 10 seconds.

---

### Cashier-Assisted Payment Requests (Personal Accounts)

> **Who reads this:** Personal expense account holders who want to hand cash to a cashier for verification, and the cashiers who review and approve those requests.

Sometimes you have cash ready to pay out, but you need a cashier to physically handle the transaction before the balance is debited. The **"Request cashier approval before payment"** checkbox lets you submit a payment as a **request** rather than an immediate deduction — the balance is only debited when the cashier approves it.

This is available on **personal expense accounts only**. Business accounts use the EOD batch workflow instead.

---

#### For the Requester — Submitting a Payment Request

1. Open quick payment from your personal expense account.
2. Fill in all payment details (payee, amount, category, notes).
3. Tick the **"Request cashier approval before payment"** checkbox (appears only on personal accounts).
4. Click **Submit Payment**.

The payment is created with status **⏳ Awaiting Cashier** — your balance is **not** debited yet.

You will receive a **bell notification** once a cashier approves or rejects your request.

> **Tip:** Only tick this box when you need a cashier to physically handle or verify the cash. For normal personal payments you process yourself, leave it unticked.

---

#### Viewing Your Pending Request

On the payment detail page the request shows an amber panel:

> ⏳ This payment is awaiting cashier approval. You will be notified when it is reviewed.

The status badge reads **⏳ Awaiting Cashier** (amber). On the recent payments panel of your account page, the same amber badge appears next to the payment.

To cancel the request before a cashier acts on it:

1. Open the payment detail page.
2. Click **Cancel Request** in the amber info panel.
3. Confirm the dialog.

The payment is set to **CANCELLED** and any notified cashiers receive a bell notification that the request was cancelled.

---

#### For the Cashier — Reviewing Payment Requests

When a user submits a cashier-assisted payment request, you receive a **bell notification** (only if you have a grant on that account). These requests also appear on the **Admin → Pending Actions** page under the **"Personal Payment Requests"** section. Note: this section covers both accounts explicitly typed as Personal and any standalone expense accounts not linked to a business.

Each request shows:
- Requester name
- Payee name
- Amount and payment date
- Categories and notes
- Priority (Normal / Urgent)

**To approve a request:**

1. Go to **Admin → Pending Actions**.
2. Find the request under **Personal Payment Requests**.
3. Click **Approve**.

The system performs a live balance check. If the account has sufficient funds, the payment is moved to **SUBMITTED**, the balance is debited, and the requester receives a notification:

> ✅ Payment Request Approved — $X.XX was approved by [your name]

If the account does not have enough funds, you will see a **422 Insufficient Balance** error — ask the requester to top up the account first.

**To reject a request:**

1. Click **Reject** on the request row.

The payment is set to **REJECTED**, no balance change is made, and the requester receives:

> ❌ Payment Request Rejected — $X.XX was rejected by [your name]

---

#### Status Reference

| Status | Colour | Meaning |
|--------|--------|---------|
| ⏳ Awaiting Cashier | Amber | Request submitted — balance not yet debited |
| SUBMITTED | Default | Approved by cashier — balance has been debited |
| REJECTED | Red | Rejected — no balance change |
| CANCELLED | Grey | Cancelled by the requester before approval |

---

> **Who reads this:** System administrators only.

Go to **Admin → Blocking Stock Take Drafts** to see a list of all active stock take drafts that have **Stock Take Mode** enabled. These drafts block sales for their respective businesses until the draft is deleted or submitted.

#### The Drafts Table

| Column | What it shows |
|--------|--------------|
| **Business** | Which business is currently blocked |
| **Draft Title** | Name given to the draft (e.g. "March Full Count") |
| **Created By** | Employee name and email who started the draft |
| **Created At** | Date and time the draft was created |
| **Action** | Delete button to forcibly remove the draft and unblock sales |

#### Warning Banner

If any blocking drafts exist, a banner appears at the top of the page:

> ⚠️ **2 business(es) currently blocked from processing sales**

This means those businesses' cashiers cannot complete sales until the draft is resolved.

#### Deleting a Blocking Draft

1. Find the draft in the table.
2. Click **Delete**.
3. Confirm the dialog: "This will delete the stock take draft '[title]' for [business name]. Sales will be unblocked immediately."
4. Click **Delete Draft** (red button).
5. A toast notification confirms: "Draft deleted — [business name] sales unblocked".

> **Warning:** Deleting a draft discards all counted data in it. The responsible employee will need to start a fresh stock take. Only delete a draft if the count was abandoned or if a technical error is blocking operations.

---

### Adding Inventory Items Directly to Cart

> **Who reads this:** Stock managers and cashiers who use the Inventory page to add stocked items to the POS cart.

From any **Inventory** page (Clothing, Hardware, Restaurant, Grocery), each item row has a **🛒** (cart) button. Clicking it adds the item directly to the active POS cart — no need to navigate to the POS first.

#### How It Works

1. Go to **[Business] → Inventory**.
2. Find the item you want to add (use search, domain filter, or scroll).
3. Click the **🛒** button on the item's row.
4. A toast appears: "Added [Item Name] to cart".
5. Navigate to the POS (or click **Proceed to Checkout** in the mini-cart) to complete the sale.

#### Product Types

The inventory page shows two types of items, both cartable:

| Type | How to recognise | Notes |
|------|-----------------|-------|
| **Tracked product** | UUID-style ID, linked to a product variant | Has variants — if multiple variants exist, you are redirected to the POS to select the variant |
| **Barcode inventory item** | Shown with a "📦 POS tracked" badge | Single unit, adds directly — no variant selection |

#### Stock and Price Checks

Before adding to cart, the system checks:
- **Selling price must be set** — if the item has no selling price, an error toast appears: "Product has no selling price set".
- **Stock must be available** — if stock is zero, an error toast appears: "Product is out of stock".

If a product has only one variant with a valid price and stock, it is added to the cart directly. If it has multiple variants, you are redirected to the POS product selection screen.

---

### Bulk Stocking Panel — Auto-Classification (Suggest Feature)

When entering product names in the Bulk Stocking Panel, the system can **suggest a domain, category, and sub-category** based on the product name.

#### Using the Suggest Feature

1. Type a product name in the **Name** column of any row (at least 2 characters).
2. A **💡 lightbulb icon** appears in the row number column.
3. Click the 💡 icon to open the **Suggested Classification** popover.
4. The popover shows up to 5 best-matching classifications, scored by how well the product name matches known category names:

```
💡 Suggested Classification
Based on: "ladies underwear"

🛍 Retail › 👙 Intimates and Sleepwear
   👙 Bras & Bralettes

👗 Clothing › 👙 Intimates and Sleepwear
   🩲 Underwear & Briefs

→ No matches found — select manually.
```

5. Click any suggestion to **auto-fill** the Domain, Category, and Sub-category fields for that row.
6. The popover closes and the fields are filled — you can adjust them manually if needed.

> **How scoring works:** Sub-category name matches score highest (3 points), followed by category matches (2 points) and domain matches (1 point). The top 5 unique sub-category matches are shown.

If no matches are found, the message "No matches found — select manually." is shown. Select the domain and category manually using the dropdowns.

---

---

## 23. Quick Deposit — Income Categorisation

> **Who reads this:** Anyone who deposits money into an expense account — personal account holders, cashiers, and managers.

When you deposit money into an expense account, you can now classify **where the money came from** using a three-level income hierarchy. This helps with financial reporting and keeps personal and business income properly separated.

---

### Opening Quick Deposit

1. Go to **Expense Accounts** and open the account you want to deposit into.
2. Click the **+ Deposit** button in the account header.
3. The **Quick Deposit** modal opens — it is now a wider two-column layout to reduce scrolling.

---

### The Two-Column Layout

The modal organises fields into two columns to fit more information on screen:

- **Left column:** Amount
- **Right column:** Deposit Date

Below these, the Income Source section and Sender fields appear full-width.

---

### Income Source Section

Every deposit now shows an **INCOME SOURCE** panel (blue-tinted border). This lets you classify the deposit's origin.

#### Income Type

A searchable dropdown lets you choose the income domain:

| Option | When to use |
|--------|------------|
| **💵 Personal Income** | Auto-selected for personal accounts — salary, freelance work, investments, government grants |
| **🏢 Business Income** | Auto-selected for business-linked accounts — sales revenue, service income, financial income |

> **Auto-selection:** The system pre-selects the correct income type based on the account:
> - Personal accounts → **Personal Income** is selected automatically.
> - Business-linked accounts → **Business Income** is selected automatically.
> - You can change this manually if needed.

#### Category (appears after Income Type is selected)

Once an income type is selected, a **Category** dropdown appears showing categories within that domain:

**Personal Income categories:**
| Category | Examples |
|----------|----------|
| Employment Income | Salary & Wages, Allowances, Self-Employment |
| Business Income | Freelance / Contract, Consulting, Online Business |
| Investment Income | Capital Gains, Dividends, Rental Income |
| Government Income | Social Grants, Pension, Tax Refunds |
| Other Income | Gifts, Inheritance, Miscellaneous |

**Business Income categories:**
| Category | Examples |
|----------|----------|
| Sales Revenue | Product Sales, Service Sales, Recurring Sales |
| Operating Income | Professional Income, Commission & Referral, Rental & Usage |
| Financial Income | Interest Earned, Investment Returns, Currency Gains |
| Government & Support | Grants, Subsidies, Tax Incentives |
| Other Business Income | Asset Sales, Insurance Proceeds, Miscellaneous Revenue |

#### Subcategory (appears after Category is selected)

An optional **Subcategory** dropdown gives finer classification. For example:
- Employment Income → **Salary & Wages**
- Business Income → **Product Sales** → **Online Sales**

---

### Who Sent This Money? (Sender field)

The **Who sent this money?** field is now open by default (type-a-name mode) so it is always ready to fill in. Enter the name of the person or organisation that sent the deposit.

You can:
- **Type a name** (default) — free-text, e.g. "Mary Hwandaza"
- **Select from list** — choose from previously saved senders
- **Not specified** — leave blank if not relevant

The sender appears as the **Source** in the transaction history.

---

### Deposit Source (non-personal accounts)

For standard business expense accounts, a **Deposit Source** dropdown lets you specify how the money arrived:

| Option | Meaning |
|--------|---------|
| Manual Entry | Cash counted in by hand |
| From Business Account | Transfer from a linked business account |
| Other Source | Any other origin |

This field is hidden for **Personal** accounts (always Manual Entry).

---

### The Transaction List — Source Column

After a deposit is saved, the **Source** column in the transaction history shows:
- The **sender name** if one was entered
- Or a friendly label based on the deposit type (e.g. "Manual Entry", "Bank Transfer") if no sender was specified
- The **Category** column now shows the income category and subcategory for deposits that were classified (e.g. "💵 Employment Income / Salary & Wages")

---

## 24. Payment Vouchers — Creating, Viewing & Locking

> **Who reads this:** Managers and cashiers who process expense payments.

A **Payment Voucher** is an official payment record generated for an expense account payment. It captures the collector's name, ID, signature, and the purpose of the payment, and can be printed or saved as a PDF.

---

### Generating a Voucher (First Time)

1. In the **Transaction History**, find the payment row.
2. A faint **📄** icon appears at the right of the row — hover over it to see: *"No voucher yet — click to generate one"*.
3. Click **📄** to open the **Payment Voucher** form.
4. Fill in:
   - **Collector Full Name** (required)
   - **Phone Number** (optional)
   - **National ID** (optional)
   - **Driver's Licence No.** (optional)
   - **What is this payment for?** (required — a description of the purpose)
   - **Notes** (optional)
   - **Collector Signature** — draw on the pad using mouse or touch
5. Click **📄 Save & Generate PDF**.
6. A **preview** of the voucher opens showing all the details, voucher number (e.g. VCH-2026-0003), and a footer with the business name.
7. Use **🖨️ Print** or **⬇️ Save PDF** to keep a copy.
8. Click **×** to close.

> A notification is sent to all admins and managers when a new voucher is generated.

---

### Viewing an Existing Voucher

Once a voucher has been generated, the row in the transaction list changes:

- The faint **📄** icon is replaced by a teal **✅ VCH** badge.
- Hover over the badge to see: *"Voucher issued: VCH-2026-0003 — click to view PDF"* (the actual voucher number is shown).
- Click the **✅ VCH** badge to open the **voucher preview directly** — the form is not shown again.
- From the preview you can **Print** or **Save PDF** the voucher.

---

### Locking Payments After Voucher Issuance

Once a voucher is issued:

- The **Edit** button for that payment row **disappears**.
- The payment record is considered finalised — it cannot be changed through the normal edit flow.
- This prevents accidental modification of a payment that has an official voucher on record.

> If a correction is genuinely needed after a voucher has been issued, contact your system administrator.

---

### Voucher Details Reference

Every generated voucher includes:

| Field | Source |
|-------|--------|
| Voucher Number | Auto-generated (VCH-YYYY-NNNN) |
| Date | Payment date |
| Amount Paid | Payment amount |
| Paid To — Name | Payee name from the payment record |
| Paid To — Type | Payee type (Employee, Supplier, etc.) |
| Purpose | Description entered in the voucher form |
| Category | Payment category (if classified) |
| Collector Name | Entered in the voucher form |
| National ID | Entered in the voucher form (optional) |
| Collector Signature | Drawn on the signature pad (optional) |
| Prepared By | Name of the staff member who generated the voucher |
| Business Name | The business the account belongs to |

---

*Last updated: April 2026*
*For technical support, contact your system administrator.*
