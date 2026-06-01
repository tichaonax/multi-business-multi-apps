# System User Guide

> **Who this guide is for:** Everyone who uses this system day-to-day — cashiers, sales staff, managers, HR, drivers, and business owners. Each section is written for a specific role. Jump straight to your section.

---

## Table of Contents

1. [Getting Started — All Users](#1-getting-started--all-users)
2. [POS Cashier — Making Sales](#2-pos-cashier--making-sales)
    - [Re-ordering from Recent Orders](#re-ordering-from-recent-orders)
3. [Cash Office — Cash Handling & End of Day](#3-cash-office--cash-handling--end-of-day)
    - [Payroll Account Auto-Contribution (EOD)](#step-3b--payroll-account-auto-contribution-automatic)
    - [Setting Up EOD Payroll Auto-Contribution for a Business](#setting-up-eod-payroll-auto-contribution-for-a-business)
4. [Manager — Approvals, Payroll & Reports](#4-manager--approvals-payroll--reports)
5. [HR & Employee Management](#5-hr--employee-management)
    - [Leave Management — HR Direct Actions](#leave-management--hr-direct-actions)
    - [Employee Scan Cards (ID / Clock-In Cards)](#employee-scan-cards-id--clock-in-cards)
    - [Printer Troubleshooting — Clearing Stuck Jobs](#printer-troubleshooting--clearing-stuck-jobs)
6. [Employees — Clock-In, Leave & Per Diem](#6-employees--clock-in-leave--per-diem)
7. [Expense Accounts & Petty Cash](#7-expense-accounts--petty-cash)
    - [Switching Between Expense Accounts](#switching-between-expense-accounts)
    - [Transferring Funds Between Non-Business Accounts](#transferring-funds-between-non-business-accounts)
8. [Business Loans](#8-business-loans)
9. [Customers, Loyalty Cards & Campaigns](#9-customers-loyalty-cards--campaigns)
10. [Chicken Run Management](#10-chicken-run-management)
11. [Construction & Projects](#11-construction--projects)
12. [Driver & Vehicle Log](#12-driver--vehicle-log)
13. [WiFi Token Sales — ESP32 and R710](#13-wifi-token-sales--esp32-and-r710)
14. [Inventory & Barcode Labels](#14-inventory--barcode-labels)
    - [Predefined Domains & Category Taxonomy](#predefined-domains-categories--sub-categories--all-business-types)
    - [Custom Bulk Products](#custom-bulk-products--complete-guide)
    - [Bulk Stocking Panel & Stock Take](#bulk-stocking-panel--receiving-and-counting-stock)
    - [Used Clothing Bales](#used-clothing-bales--complete-guide)
    - [Merging Duplicate Inventory Items](#merging-duplicate-inventory-items)
    - [Inventory Activity Report](#inventory-activity-report--per-item-stock-history)
    - [Barcode Templates](#barcode-templates--creating-and-using-label-designs)
    - [Adding Inventory Items Directly to Cart](#adding-inventory-items-directly-to-cart)
    - [Admin — Blocking Stock Take Drafts](#admin--blocking-stock-take-drafts)
    - [Copying a Product to Another Business](#copying-a-product-to-another-business)
15. [Restaurant Menu Management](#15-restaurant-menu-management)
15a. [Services as Products](#15a-services-as-products--selling-services-via-barcode)
16. [Quick Reference Cards](#16-quick-reference-cards)
17. [Suppliers & Payees](#17-suppliers--payees)
    - [Attaching Receipts to Expense Payments](#attaching-receipts-to-expense-payments)
    - [Payee Receipt Report](#payee-receipt-report)
    - [Payee Payment History Report](#payee-payment-history-report)
18. [Batch EOD Catch-Up — Manager and Cashier Roles](#18-batch-eod-catch-up--manager-and-cashier-roles)
19. [Employee Termination Checklist](#employee-termination--full-checklist)
20. [Team Chat](#20-team-chat)
21. [Grocery POS — Desk Mode](#21-grocery-pos--desk-mode)
22. [Expense Account — Quick Payment & My Payment Queue](#22-expense-account--quick-payment--my-payment-queue)
    - [Recent Payments to Payee](#recent-payments-to-payee)
    - [My Payments Page — Approved & Rejected Tabs](#my-payments-page--approved--rejected-tabs)
    - [Cancelling a Submitted Request](#cancelling-a-submitted-request-before-the-cashier-acts)
    - [Cashier-Assisted Payment Requests (Personal Accounts)](#cashier-assisted-payment-requests-personal-accounts)
23. [Quick Deposit — Income Categorisation](#23-quick-deposit--income-categorisation)
24. [Payment Vouchers — Creating, Viewing & Locking](#24-payment-vouchers--creating-viewing--locking)
25. [Eco-Cash to Cash Conversions](#25-eco-cash-to-cash-conversions)
26. [Printer Setup & QZ Tray](#26-printer-setup--qz-tray)
27. [Stock Velocity & Reorder Reports](#27-stock-velocity--reorder-reports)
28. [Invoices & Quotations](#28-invoices--quotations)
29. [Restaurant Prep Inventory Tracking](#29-restaurant-prep-inventory-tracking)
30. [Salesperson EOD Reporting](#30-salesperson-eod-reporting)
31. [Restaurant Delivery Service](#31-restaurant-delivery-service)
32. [Business Asset Management](#32-business-asset-management)
33. [Inventory Expiry Tracking](#33-inventory-expiry-tracking)
34. [Policy Management & Employee Acknowledgment](#34-policy-management--employee-acknowledgment)
35. [Salesperson Role — Access & Restrictions](#35-salesperson-role--access--restrictions)
36. [Manager Override Code](#36-manager-override-code)
37. [Order Cancellation](#37-order-cancellation)
    - [Re-ordering from Recent Orders (POS)](#re-ordering-from-recent-orders)
    - [Receipt Watermarks — Reprints & Cancelled Orders](#receipt-watermarks--reprints--cancelled-orders)
38. [Cancellation Reports](#38-cancellation-reports)
39. [Combo Payment Requests](#39-combo-payment-requests)
    - [Requester — Creating a Request](#requester--creating-a-request)
    - [Requester — Submitting a Request](#requester--submitting-a-request)
    - [Cashier — Approving a Request](#cashier--approving-a-request)
    - [Cashier — Returning a Request for Edits](#cashier--returning-a-request-for-edits)
    - [Requester — Editing a Returned Request](#requester--editing-a-returned-request)
    - [Requester — Marking Items as Paid](#requester--marking-items-as-paid)
    - [Requester — Requesting Settlement (Returning Change)](#requester--requesting-settlement-returning-change)
    - [Cashier — Confirming Settlement](#cashier--confirming-settlement)
    - [Cancelling a Request](#cancelling-a-request)
    - [Status Reference](#status-reference)
40. [Expense Account — Restricted User Access](#40-expense-account--restricted-user-access)
    - [Granting Access](#granting-access)
    - [Managing Existing Access](#managing-existing-access)
    - [Revoking Access](#revoking-access)
41. [Vehicle Renewal Receipts](#41-vehicle-renewal-receipts)
    - [Recording a Renewal Receipt](#recording-a-renewal-receipt)
    - [Payment Breakdown Fields](#payment-breakdown-fields)
    - [Licenses Renewed](#licenses-renewed)
42. [Vehicle Exemptions](#42-vehicle-exemptions)
    - [Adding an Exemption](#adding-an-exemption)
    - [Exemption Fields](#exemption-fields)
43. [Vehicle Licence Documents & Issuing Authorities](#43-vehicle-licence-documents--issuing-authorities)
    - [Uploading a Licence Document](#uploading-a-licence-document)
    - [Issuing Authorities](#issuing-authorities)
    - [Driver Licence Documents](#driver-licence-documents)
44. [Stock Additions Report](#44-stock-additions-report)
    - [Opening the Report](#opening-the-report-1)
    - [Date Range Filters](#date-range-filters)
    - [Summary Cards](#summary-cards)
    - [The Movements Table](#the-movements-table)
    - [Dashboard Activity Feed — Stock Additions](#dashboard-activity-feed--stock-additions)
45. [Clothing POS — Live Sales Activity](#45-clothing-pos--live-sales-activity)
    - [Sold-Today Badge](#sold-today-badge)
    - [Today vs Yesterday Progress Bar](#today-vs-yesterday-progress-bar)
    - [Bales Tab](#bales-tab)
    - [R710 WiFi Tab](#r710-wifi-tab)
    - [Quick Add Tab](#quick-add-tab)
    - [Showing Hidden Sold-Out Items](#showing-hidden-sold-out-items)
46. [Missing Cost Price Report](#46-missing-cost-price-report)
47. [Payee Expense Insights](#47-payee-expense-insights)
48. [Supplier, Contractor & Payee Categories](#48-supplier-contractor--payee-categories)
49. [Edit Business Settings](#49-edit-business-settings)
50. [Warehouse Import & Move Wizard](#50-warehouse-import)
    - [Manifest Qty & ORDER MAX](#understanding-the-two-quantity-columns)
    - [Manifest Qty filter pills](#manifest-qty-filter-pills)
    - [Classification Suggestion (💡 Cat button)](#classification-suggestion--cat-button)
    - [Per-Item Target Business Override](#per-item-target-business-override)
    - [Transport Cost & Transaction Fee](#transport-cost--transaction-fee)
    - [Reference Locks](#reference-locks)
    - [Reversing a Warehouse Move (Admin)](#reversing-a-warehouse-move-admin)
51. [Salesperson Shortfall Report](#51-salesperson-shortfall-report)
52. [Backup & Restore — Full Guide](#52-backup--restore--full-guide)
    - [Creating a Backup](#creating-a-backup)
    - [Pre-Restore Validation](#pre-restore-validation)
    - [Restoring a Backup](#restoring-a-backup)
    - [Backup Types](#backup-types)
    - [Verifying a Restore](#verifying-a-restore)
    - [Restore Progress & Warnings](#restore-progress--warnings)
53. [Scale Integration — Star Micronics MG-S8200](#53-scale-integration--star-micronics-mg-s8200)
    - [Connecting the Scale](#connecting-the-scale)
    - [Weight Pricing Rules](#weight-pricing-rules)
    - [Marking a Product as Sold by Weight](#marking-a-product-as-sold-by-weight)
    - [Selling by Weight at the POS](#selling-by-weight-at-the-pos)
    - [Livestock Purchase Workflow](#livestock-purchase-workflow)

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
- **👤 Your name:** Open your profile menu. From here you can access:
  - **Profile Settings** — change your name, photo, password
  - **Printer Setup** — configure your local QZ Tray receipt printer (available to all users)
  - **Sign Out**

### The Dashboard

When you sign in, you land on the **Dashboard**. It shows:

- **Today's activity** — sales, deposits, and transactions for the day.
- **Pending tasks** — things waiting for you to approve or complete.
- **Recent activity** — a log of what has been happening across the business.
- **Alerts** — warnings about low balances, overdue laybys, or stock levels.

#### Business Summary Cards

At the top of the dashboard, each business type (e.g. Clothing, Grocery, Restaurant) has its own summary card. These are only visible to users with financial data access.

Each card shows:

| Row | What it means |
|-----|---------------|
| **Account balance** (large number) | The running business account balance — total revenue minus expenses |
| **Sales** | Total revenue from all completed and pending orders |
| **💵 / 📱 split** | Cash vs EcoCash breakdown of sales (shown only when EcoCash sales exist) |
| **🪣 Cash Box** | Physical cash and EcoCash currently held in the till |
| **📦 Inventory** | Total value of stock on hand — calculated as quantity × cost price (or selling price if no cost price is set). Only shown when inventory value is greater than zero. |
| **🏠 Rent** | How much of this month's rent target has been contributed, with a progress bar |

The **All** card at the far left shows the combined totals across every business type.

Click any card to open a detailed breakdown showing each individual business within that type.

#### Today's Performance

Below the summary cards, the **Today's Performance** section shows a card for each active POS business (restaurant, grocery, clothing, hardware). These update automatically every 60 seconds.

Each card shows:

| Row | What it means |
|-----|---------------|
| **Today orders** | Number of orders placed today. Also shows how many individual items were sold (with a ▲/▼ badge comparing to yesterday's item count). |
| **Today sales** | Total dollar sales today, with a ▲/▼ badge showing the percentage change versus yesterday. |
| **Yesterday** | Yesterday's item count (▲/▼ vs the day before) and dollar sales (▲/▼ vs the day before), shown together on one line. |
| **2 days ago** | Raw item count and dollar sales from two days ago — no comparison badge since there is no third day to compare against. |
| **Pending** | Orders that have been placed but not yet completed or paid (shown only when pending orders exist). |

**Reading the delta badges:**
- A **green ▲** badge means that figure is higher than the previous period.
- A **red ▼** badge means it is lower.
- The percentage shown is how much higher or lower, e.g. `▼17%` means 17% less than the comparison period.
- On the **Yesterday** row, the first badge (items) compares yesterday's items to two days ago, and the second badge ($) compares yesterday's sales to two days ago.

> **Example:** "Yesterday: ▼11% 74 items ▼17% $87" means yesterday had 74 items sold (11% fewer than the day before) and $87 in sales (17% less than the day before).

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

#### Searching Notifications

Both the bell preview dropdown and the blue notification side-panel include a **search bar** (appears automatically when there are more than 4 items).

- Type any part of a name, amount, date, or note to filter the list instantly.
- Click the **×** button inside the search box to clear the filter.
- The search works across all sections of the panel simultaneously.

#### Jumping Directly to a Payment Request

When a **Personal Payment Request** appears in the bell preview, clicking it takes you straight to that specific request on the Pending Actions page — it scrolls into view automatically and is highlighted with a blue ring so you can spot it instantly. You do not need to scroll through the list manually.

### Trusting the Site Certificate on a New Device

If your browser shows a **NET::ERR_CERT_AUTHORITY_INVALID** warning when you open the system, it means that device doesn't yet trust the server's root certificate. The fix depends on the device type. You only need to do this once per device.

> **Where to find `rootCA.pem`:** It is in the `certs\` folder on the server machine. Copy it to the device before following the steps below.

#### Windows PC

1. Copy these two files to the PC (via USB drive or network share):
   - `rootCA.pem`
   - `setup-ssl.bat`

   Both files must be in the **same folder**.

2. Double-click **setup-ssl.bat** to run it.
3. When it says **Done!**, close and reopen Chrome — the warning will be gone.

**If the script fails (no admin rights):** install manually —
- Open Chrome → go to `chrome://settings/security` → **Manage certificates** → **Trusted Root Certification Authorities** → **Import** → select `rootCA.pem`.

#### Android Phone or Tablet

1. Transfer `rootCA.pem` to the device (via Google Drive, WhatsApp, USB cable, etc.).
2. Open the file from the device's file manager — Android will prompt you to install it.
3. Give it a name (e.g. *Multi-Business App CA*) and set **Used for: CA certificate** (or **VPN and apps** on older Android versions). Tap **OK**.
4. Open Chrome and navigate to the app — the warning will be gone.

> On Android 11 and newer you may need to go to **Settings → Security → Encryption & credentials → Install a certificate → CA certificate** and select the file from there if tapping it directly doesn't work.

#### iPhone or iPad

1. Transfer `rootCA.pem` to the device (via AirDrop, email, iCloud Drive, etc.) and tap/open it — iOS will show **"Profile Downloaded"**.
2. Go to **Settings → General → VPN & Device Management** → tap the downloaded profile → tap **Install** (top right) → enter your passcode → tap **Install** again to confirm.
3. Go to **Settings → General → About → Certificate Trust Settings** → toggle **on** the certificate listed under *Enable Full Trust for Root Certificates*.
4. Open Safari or Chrome and navigate to the app.

> Step 3 is required — without it iOS installs the certificate but does not trust it for HTTPS, so the warning will persist.

#### Quick Reference

| Device | Script available? | Notes |
|---|---|---|
| Windows PC | Yes — `setup-ssl.bat` | Or use Chrome → Manage certificates |
| Android | No | Install via file manager or Settings → Security |
| iPhone / iPad | No | Install profile, then enable trust in Settings → About |

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

1. A **receipt preview modal** appears showing the full receipt.
2. Choose your print method from the dropdown:
   - **QZ Tray Printer** — sends directly to your saved local printer (fastest, no dialog). Requires QZ Tray to be running and a printer saved via **Profile → Printer Setup**.
   - **Browser Print** — opens the browser's print dialog. Works on any machine but may need margin adjustments.
3. Click **Print Receipt**.
4. If the sale includes a WiFi token, the token details (username and password) are printed on the receipt automatically.

> **Tip:** If the customer does not need a printed receipt, click **Skip**.

> **First time printing?** Go to **👤 Profile → Printer Setup** to connect QZ Tray and save your printer. See [Section 26 — Printer Setup & QZ Tray](#26-printer-setup--qz-tray) for full instructions.

### Handling a $0 Sale (Free Items or Fully Discounted Orders)

If a discount brings the total to $0.00:
- The system will allow you to complete the sale without choosing a payment method.
- Click **Complete Sale** and a receipt can still be printed.

### Voiding / Cancelling a Sale

If you need to cancel before payment is complete:
- Click **Clear Cart** to remove all items and start over.
- If you need to cancel a completed sale, contact your manager — completed sales need to be voided by a manager.

### Re-ordering from Recent Orders

Every POS user (admin and non-admin alike) can quickly repeat a previous order using the **Recent Orders** panel in the POS sidebar.

**How it works:**

1. In the left-hand sidebar, find the **📋 Recent Orders** collapsible section. It shows today's last 5 orders.
2. Click on any order row to expand it. You will see the full list of items and the order total.
3. Click **+ Re-order** to add all items from that order to the current cart.
4. Items are merged into the cart — if an item is already in the cart, its quantity is increased rather than creating a duplicate line.

> **Tip:** The most recent order is labelled **latest** and is always at the top of the list.

This works in both the **Restaurant POS** and **Grocery POS**. Admins and managers see the same panel in their financial summary section; salespeople see it as a standalone collapsible card at the top of the product area.

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

#### Step 3b — Payroll Account Auto-Contribution (Automatic)

Below the expense account auto-deposit rows, the EOD preview table shows a **Payroll Account** row. This is separate from the expense account auto-deposits — it runs automatically whenever the conditions below are met and requires no manual setup or toggle.

**What it does:** Calculates a daily cash contribution from this business's sales into the shared Payroll Account, so that the account is gradually funded throughout the month ready for salary payments.

**How the amount is calculated:**
1. Adds up the base salary + living allowance of every employee with an active contract across all businesses (total monthly payroll).
2. Works out how much is still needed to reach that target (remaining = target − current payroll balance).
3. Calculates this business's share based on how many of its employees have active contracts (e.g. 3 of 8 total = 37.5% share).
4. Divides the share by the remaining days in the month to get today's daily target.
5. Caps the contribution at 80% of net daily sales (sales minus prorated daily rent, if a rent config is active).
6. Floors the result to a whole dollar — contributions below $1.00 are skipped.

**What you see on the EOD screen:**

| Condition | What the row shows |
|---|---|
| Contribution calculated | 💼 Payroll Account — `3/8 staff · 38% share` — **$42** |
| Already done today | 💼 Payroll Account — `Already contributed today` — **$42** |
| Payroll fully funded | ⚠ Skipped — `Payroll account already fully funded` |
| No contracts for business | ⚠ Skipped — `No contracts for this business` |
| Contribution rounds to $0 | ⚠ Skipped — `Contribution rounds to $0 (target $3, net sales $2.40)` |
| Insufficient business funds | ⚠ Skipped — `Insufficient business account funds (target $42)` |
| No global payroll account | ⚠ Skipped — `No global payroll account` |

**The row is informational only** — you cannot override or skip it. It either runs automatically when EOD is processed or is silently skipped.

**Why a business might show "Skipped":**

| Skipped reason | What to do |
|---|---|
| `No contracts for this business` | The most common cause. The business has no active employee contracts assigned to it. Go to **Employees → [Employee] → New Contract** and ensure the contract's **Primary Business** is set to this business and the contract status is **active**. |
| `No global payroll account` | A one-time admin task. Ask your administrator to create the global payroll account under **Payroll → Payroll Account**. |
| `Payroll account already fully funded` | Good — the target is already met for the month. No action needed. |
| `Contribution rounds to $0` | Today's net sales were too low relative to the contribution target. Will retry tomorrow. No action needed. |
| `Insufficient business account funds` | The business account balance is $0 or below the contribution amount. Deposit funds into the business account first. |

> **No toggle or setting is needed to enable this.** As long as the business has active contracts and a sufficient business account balance, the payroll contribution will happen automatically on every EOD.

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

Click **Save EOD Report** (or **Close Day**). A two-step confirmation modal appears:

**Step 1 — Manager confirmation:**
- Enter the **Manager Name** (your electronic signature on the record).
- Enter the **Cash Counted** (optional) — the physical till count. The system calculates the variance automatically.

**Step 2 — EcoCash Transaction Verification:**
All EcoCash orders for the day are listed with checkboxes:

| Field | Meaning |
|-------|---------|
| **Time** | When the EcoCash payment was processed |
| **Amount** | Gross amount charged to the customer (including fee) |
| **Reference code** | The EcoCash transaction code entered at the POS |

Check off each transaction you have confirmed against your EcoCash merchant statement. The **Confirmed EcoCash total** updates as you tick. You can also **Deselect All** and re-check individually.

> **Note:** EcoCash reference codes are captured at the point of sale. If a transaction shows "—" instead of a code, it was processed before this feature was fully enabled — go forward all new sales will capture the code automatically.

Click **Save & Lock** to finalise.

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

**Searching the bell dropdown:** When there are more than 4 pending items, a search box appears at the top of the bell preview. Type to filter by name, amount, account, or note. Click **×** to clear.

**Searching the full Pending Actions page:** A search bar at the top of the page filters all sections at once — useful when you have many items across different categories.

**Going straight to a request:** Clicking a Personal Payment Request in the bell preview opens the Pending Actions page and scrolls directly to that card, which is highlighted with a blue ring for 2–3 seconds.

---

### Setting Up EOD Payroll Auto-Contribution for a Business

> **Use this section if a business (e.g. Mvimvi) is running EOD but the Payroll Account row is showing "Skipped — No contracts for this business" or is not contributing anything.**

The payroll auto-contribution is completely automatic — there is no on/off switch. It runs during every EOD as long as four conditions are met. Work through the checklist below in order.

---

#### Checklist: Why Is [Business Name] Not Contributing to Payroll?

**Step 1 — Confirm the global payroll account exists (one-time, admin only)**

Go to **Payroll → Payroll Account** in the top navigation. If you see a payroll account with a balance and transaction history, this is already done — skip to Step 2.

If there is no payroll account, ask your administrator to create one:
- Navigate to **Admin → Payroll Account → Create**
- Leave the "Business" field blank (it must be a global account, not linked to one business)
- Set status to **Active**

This only needs to be done once for the entire system.

---

**Step 2 — Ensure the business has employees with active contracts (most common fix)**

This is the most frequent reason a business is skipped. The system counts how many employees have an **active contract** with **this business set as their Primary Business**.

1. Go to **Employees** and filter by the business (e.g. Mvimvi).
2. For each employee who works at this business, click their name → **Contracts**.
3. Check that at least one contract shows status **Active**.
4. Check that the contract's **Primary Business** field is set to this business (e.g. Mvimvi) — not to another business or left blank.

**If an employee has no active contract:**
- Go to **Employees → [Employee Name] → New Contract**
- Fill in Job Title, Compensation Type, Base Salary, Start Date
- Set **Primary Business** = Mvimvi (or the correct business)
- Submit — the contract starts as a draft and must be activated

**If an employee's contract shows the wrong Primary Business:**
- Create a new contract renewal with the correct Primary Business set
- The old contract will be superseded

> The system calculates this business's payroll share as: `(number of this business's active contracts) ÷ (all active contracts across all businesses)`. Even one active contract is enough for the contribution to start.

---

**Step 3 — Ensure the business account has a balance**

Go to **[Business] → Business Account** (or **Finance → Business Account**). The current balance must be greater than $0 and greater than the daily contribution amount.

If the balance is $0:
- Record today's sales income into the business account, or
- Make a manual deposit into the business account before running EOD

The system will not debit a business account that cannot cover the contribution.

---

**Step 4 — Check the rent configuration (optional, affects the calculation)**

If a rent config is active for this business, the daily rent equivalent is subtracted from sales before calculating the contribution (net sales = sales − daily rent). This reduces the contribution amount but does not block it unless net sales are $0.

To check: go to **Admin → Business Settings → Rent Config** for the business. If no config exists, the full daily sales figure is used — this is fine.

---

**Step 5 — Run EOD and confirm the Payroll row**

After completing the steps above, run the EOD for today:
1. Go to **[Business] → Reports → End of Day**
2. Look at the auto-deposit preview table
3. The **Payroll Account** row should now show a dollar amount and the share percentage (e.g. `2/10 staff · 20% share — $28`)
4. Process the EOD — the contribution will execute automatically

If the row still shows "Skipped", hover over the reason text or check the exact skip reason against the table in **Step 3b** above.

---

**Quick reference — what each skip reason means for setup:**

| Skip reason | Fix |
|---|---|
| `No contracts for this business` | Create or reassign active contracts with this business as Primary Business (Step 2) |
| `No global payroll account` | Admin creates the global payroll account (Step 1) |
| `Insufficient business account funds` | Deposit funds into the business account (Step 3) |
| `Contribution rounds to $0` | Sales were very low today — no fix needed, retries tomorrow |
| `Payroll account already fully funded` | No fix needed — payroll is ready for the month |

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
   - Approved items are paid out; rejected items are moved to **REJECTED** status and the requester is notified with the reason.
   - You may approve some payments and leave others undecided — undecided items are deferred to the next EOD batch automatically.
   - You may reject all items if needed — the batch can still be processed.
5. If any payments are being rejected, enter a **rejection reason** (required):
   - Choose a predefined reason from the dropdown (e.g. "Insufficient funds", "Incorrect payee or amount").
   - Or type a custom reason in the text box.
   - The global reason applies to all rejected items. You can override it per-item using the inline text box that appears below each rejected payment's row.
6. Click **Process X of Y** (or **Process & Print Report** when all are decided) once you are ready.
7. Print the **Batch Payment Voucher** as a physical record.

**What happens:**
- Approved requests move to status **APPROVED** and cash is disbursed from the cash bucket.
- Rejected requests move to status **REJECTED** with the reason recorded. The requester receives a 🔔 notification linking them to their **Rejected** tab where they can act on it.
- Undecided items (neither approved nor rejected) are automatically deferred to the next EOD batch — they remain in the queue with no notification.
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
| Batch review — payment **rejected** | Requester (🔔 notification links directly to the **Rejected** tab of My Payments — shows the rejection reason and action buttons) |
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
   - **Reject** — the payment moves to **REJECTED** status. The requester is notified immediately with your rejection reason and can then edit and resubmit, resubmit as-is, or cancel their request.
   - **Leave undecided** — you do not have to decide every item. Undecided items are automatically deferred to the next EOD batch with no notification to the requester.
6. If any payments are being rejected, a **Rejection Reason** field appears:
   - Select from the predefined list (Insufficient funds, Incorrect payee or amount, Duplicate request, Not in budget, Needs manager approval, Other).
   - Or type a custom reason. This reason applies to all rejected items.
   - To give a different reason for a specific payment, use the per-item override input that appears below that payment's **Reject** button.
7. Click **Process X of Y** (partial) or **Process & Print Report** (all decided).
8. Print the **Batch Payment Voucher** as a record.

> **Rejecting a rent payment:** If the rent payment is not ready to go out (e.g., landlord gave an extension), reject it in the batch review — it will move to REJECTED and the requester can resubmit it in the next cycle.

> **Partial processing:** You do not need to decide every item before submitting. Click **Process X of Y** to process only the items you've actioned — the rest are quietly deferred to the next EOD batch without any notification.

---

#### Standalone Account Approvals — Per-Payment Voucher Panel

When you approve payments from a **standalone expense account** (personal or family accounts not linked to a business), a post-approval voucher panel opens automatically at the bottom of the screen.

**Why individual vouchers?** Each voucher captures the payee's signature as proof of receipt. Because signatories differ per payment, you cannot combine multiple payments into a single voucher — each one is created separately.

**How the panel works:**

After clicking **Submit Decisions**, a panel appears showing every payment you just approved:

```
✅ 3 Payments Approved — Create Vouchers
Each voucher captures the payee's signature as proof of receipt.

John Doe    $45.00  Fuel        CASH      [📄 Voucher]  [Skip]
Jane Smith  $20.00  Stationery  ECOCASH   ✅ Voucher created
Bob Moyo    $80.00  Repairs     CASH      [Skipped]
```

| Button | What it does |
|--------|-------------|
| **📄 Voucher** | Opens the Payment Voucher form for that specific payment |
| **Skip** | Marks the row as skipped — no voucher is created |
| **✕ (close)** | Dismisses the panel; any un-actioned payments can still have vouchers created from the payment detail page |

After you complete and save the voucher form, the row updates to show "✅ Voucher created". After clicking Skip, the row dims to show "Skipped".

> **Missed a payment?** If you dismiss the panel before creating all the vouchers you need, open the individual payment detail page (Expense Account → Payments → [Payment]) and click the **📄 Create Voucher** button that appears for APPROVED payments with no existing voucher.

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
| **Sales Analytics Dashboard** | Sales and expense trend chart with daily or monthly grouping |

#### Sales Analytics Dashboard

Go to **Reports → Sales Analytics** to see your business performance over any date range.

The dashboard shows:
- **Summary cards** — total sales, expenses, average order value
- **Top performers** — best products by units and revenue, top categories, top sales reps
- **Sales trend chart** — a line graph of sales and expenses over the selected period, with a margin indicator in the tooltip

**Daily vs Monthly grouping:**

The chart has a **Daily / Monthly** toggle in the top-left of the chart panel. Switching to **Monthly** collapses the daily data points into one point per calendar month, making it easy to compare month-over-month performance across a long date range (e.g. "All Time" or a full year). The period totals (total sales, expenses, and margin) stay the same in both views — only the chart granularity changes. Switch back to **Daily** at any time to see day-by-day detail again.

> **Tip:** Use the Monthly view when your date range spans several months. Use the Daily view for shorter ranges (last 30 days) where individual day spikes are useful.

**Drilling down into a day:**

Click any dot on the **Daily** chart to open the **Daily Detail** report for that specific day. Drill-down is not available in Monthly view because each point represents an entire month.

The Daily Detail report includes:
- **Summary bar** — sales total, expenses total, net profit, and margin for the day
- **Day navigation** — use the **← Prev** and **Next →** buttons beside the date heading to move to the previous or next day without going back to the chart; the Next button is greyed out when you reach today
- **Filter tabs** — switch between All, Sales, and Expenses views
- **Search** — type any keyword (payee name, product, category, amount, or who recorded it) to filter the list; a match count and filtered total appear automatically above the results; click **Reset** to clear the search
- **Sales orders** — each order shows time, payment method, server name, and order amount; click a row to expand and see the individual items sold with quantities and unit prices
- **Expense payments** — each payment shows time, category, payment channel, payee, description, and who recorded the payment; the recorder's name is colour-coded so you can quickly distinguish entries made by different staff members

> **Tip:** The Daily Detail expenses only include payments in **PAID** status, matching exactly what is counted in the Sales Analytics chart. If an expense shows as Pending Approval or Queued it will not appear here until it is marked as paid.

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

---

### Leave Management — HR Direct Actions

HR managers can place employees on leave and record their return directly from two places: the **Employees list** and the dedicated **Leave Management** page.

#### Leave Status Badges on the Employee List

When you open **Employees**, the system automatically checks who is currently on approved leave. Each employee on leave shows a coloured pill next to their name:

| Pill colour | Meaning |
|-------------|---------|
| **Amber** — "On Sick Leave since …" | Employee is on approved sick leave |
| **Teal** — "On Annual Leave since …" | Employee is on approved annual leave |

No pill = not currently on leave.

---

#### Placing an Employee on Leave (HR Direct Action)

Unlike the self-service leave request flow (where employees submit and managers approve), this path is instant — no approval step.

**From the Employee List:**
1. Find the employee.
2. Click **✓ Return to Work** if they are already on leave, or go to the **Leave Management** page for placement actions.

**From the Leave Management page (`Employees → Leave Management`):**
1. Use the search bar to find the employee by name or employee number.
2. Click **Sick Leave** or **Annual Leave** next to their name.
3. Fill in the modal:
   - **Start date** — first day of leave (defaults to today)
   - **Expected return date** — first day back at work
   - **Reason** (optional)
4. Click **Confirm**.

The system will:
- Create an approved leave request immediately (no pending step).
- Deduct the days from the employee's leave balance.
- Sync the open payroll entry for the period with the correct `sickDays` / `leaveDays` count.

> The employee's amber or teal badge will appear on the Employees list as soon as the action is saved.

---

#### Recording a Return to Work

When an employee returns — whether on the expected date or earlier — you must record their actual return so the system can correct the balance and payroll.

**From the Employee List or Leave Management page:**
1. Find the employee (they will be showing a leave badge).
2. Click **✓ Return to Work**.
3. Pick the **return date** (first day back at work — defaults to today).
4. Click **Confirm**.

The system will:
- Record the actual return date on the leave request (the leave badge disappears).
- If the employee returned **early** — refund the unused days back to their leave balance.
- If sick leave days taken **exceeded the allocation** — automatically create absence records for the excess days (see below).
- Correct the payroll entry for the leave period.

---

#### Sick Day Overflow — When Sick Leave Runs Out

If an employee takes more sick days than their annual allocation allows, the excess days automatically become **unpaid absent days**:

- The system calculates: `excess = actual sick days taken − sick leave allocation`.
- The last N days of the sick leave period (where N = excess) are converted to individual absence records.
- These absence records feed into payroll as absent days — they are **not** paid.
- A toast notification appears when you record the return, showing how many days overflowed.

**Example:** Employee has 5 sick days allocated. They take 8 days. On return, 3 days become absent/unpaid and appear in the absence log.

> Overflow days do **not** consume annual leave — they are treated as unpaid absence.

---

#### Leave Management Page — Reports Tab

Go to **Employees → Leave Management → Reports** for three live report cards:

| Report | What it shows |
|--------|--------------|
| **Currently on Leave** | All employees on approved leave right now — name, type, start date, expected return |
| **Sick Leave Usage** | All employees for the current year: allocated days, used days, remaining. Rows in red if ≥ 80% of allocation has been used. |
| **Sick Day Overflow Log** | Employees who have exceeded their sick allocation this year and how many days became unpaid absent days |

---

### Employee Scan Cards (ID / Clock-In Cards)

Every employee has a personal barcode card used to clock in and out quickly. The card contains the employee's name, photo, and a unique barcode.

**Issuing or reprinting a card:**
1. Open the employee's profile (**Employees → [Employee Name]**).
2. Go to the **ID Card** tab (or **Clock-In Card** tab).
3. Choose a print method (see below).

#### Option A — Print ID Card (A4 / Laser / Inkjet)

Click **🖨️ Print ID Card**. A browser print window opens showing **two identical copies side by side** separated by a dashed fold line.

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

Print → fold along the dashed line (both faces outward) → trim to card size → laminate. A standard credit-card-sized laminating pouch works perfectly.

#### Option B — Print Card to Receipt Printer (Thermal)

Click **Print Card to Receipt Printer** to send the card directly to a thermal receipt printer. The printer outputs **two copies stacked vertically** with a fold/cut line between them — fold at the line and trim so you have a card with identical faces on each side.

This option requires either:
- A **network receipt printer** already configured for your business (set up under Settings → Printers), or
- **QZ Tray** — a free desktop app that lets the system print to any USB or locally-installed printer on the same PC.

**Setting up QZ Tray (one-time per machine):**

See **[Section 26 — Printer Setup & QZ Tray](#26-printer-setup--qz-tray)** for the complete step-by-step guide. The short version:

1. Download and install QZ Tray from **https://qz.io/download/** — Java is bundled, no separate install needed.
2. Start QZ Tray — look for its icon in the system tray (bottom-right of the Windows taskbar).
3. Open **👤 Profile → Printer Setup** in the app.
4. On first connection, a QZ Tray security dialog will appear — click **Allow** and select **Always allow from this site** so you are not asked again.
5. Select your printer from the dropdown, click **Save Printer**, then **Test Print** to confirm.

> The Printer Setup page is accessible to all users from the profile menu — no admin access needed.

**Updating a card (e.g. name change or new photo):**
1. Update the employee's details or profile photo on their profile.
2. Return to the **ID Card** tab and reprint — the card automatically reflects the latest information.

> Cards use the employee's unique number (e.g. `RES-EMP-000012`) as the barcode value. If a card is lost, simply reprint from the same screen — the barcode does not change.

#### Printer Troubleshooting — Clearing Stuck Jobs

If a printer is not responding or is printing garbage, open the **Test Print** panel (printer icon in the top bar) to manage print queues without leaving the app.

| Button | What it does |
|---|---|
| **Bring Online** | Pings the printer to check its network connection and refresh its online status |
| **Test** | Sends a short test page to confirm the printer is reachable |
| **🗑 Clear Print Queue** | Cancels all stuck jobs for that printer and restarts the Windows print spooler |
| **⏹ Stop QZ / Clear Pending Jobs** | Disconnects QZ Tray and drops all pending QZ print jobs immediately |

> Use **Clear Print Queue** first if the printer is online but stuck (e.g. printing the same job repeatedly). Use **Stop QZ** if a QZ Tray job is looping or printing garbage — then reconnect QZ Tray from the ID Card or receipt page.

> **No printers found after connecting QZ Tray?** Check the Windows taskbar for a QZ Tray security dialog and click **Allow**. Then click the refresh icon on the panel. If the list is still empty, enter your printer name manually (find it under Windows **Start → Settings → Printers & scanners**). See [Section 26](#26-printer-setup--qz-tray) for full troubleshooting.

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

---

### Switching Between Expense Accounts

When you are inside an expense account detail page, a **⇄ Switch** button appears in the breadcrumb bar next to "Accounts /". This lets you jump directly to another account without going back to the list.

**How to use it:**
1. Open any expense account.
2. Click **⇄ Switch** in the top breadcrumb area.
3. A dropdown appears showing all expense accounts you have access to, along with each account's current balance (green = positive, red = zero/negative).
4. Type to search by account name or account number.
5. Click any account to navigate directly to it.

> The current account is highlighted in blue in the switcher list.

---

### Transferring Funds Between Non-Business Accounts

The **Transfer** feature moves money from one expense account to another. Transfers are only available on accounts that are **not tied to a specific business** — these are shared or personal accounts accessible via direct grants.

> If an account belongs to a business (e.g. "Office Supplies – Restaurant"), the Transfer button will not appear on that account. Only accounts with no business link show the Transfer button.

**Who can transfer:**
- Users who have been granted **Full Access** to the source account.
- System administrators.

#### Transferring from the Account Detail Page

1. Open the expense account you want to transfer **from**.
2. Click **⇄ Transfer** (top-right action buttons area).
3. In the Transfer Funds modal:
   - **From** — pre-filled with the current account and its balance (read-only).
   - **To** — select the destination account from the dropdown. Each option shows the account name, number, and current balance. Type to search.
   - **Amount** — enter the amount to transfer. A "Balance after transfer" preview updates as you type.
   - **Notes** — required. Describe the reason for the transfer (e.g. "Covering shortfall for supplier payment").
4. Click **Transfer**.

The transfer is atomic — the debit and credit happen together. If the source account has insufficient balance the transfer is rejected.

#### Transferring from the Accounts List Page

On the **Expense Accounts** list, accounts without a business link show a **⇄ Transfer** button directly on the account card. Click it to open the same Transfer Funds modal without navigating into the account first.

#### Viewing Transfer History

Inside any non-business expense account, click the **⇄ Transfers** tab to see all transfers involving that account — both inbound and outbound — with the date, amount, counterpart account, and notes.

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

#### Loan Repayments — Requesting Money Back

> **Who uses this:** Anyone who lent money to the business (a lender) and wants to request a repayment. Also used by loan managers who submit requests on behalf of a lender.

When the business is ready to return funds to the lender, the lender submits a **Withdrawal Request**. This is how money flows back out — it goes through admin approval and then cashier disbursement before funds are released.

##### Finding the Loan Repayments Screen

1. In the left sidebar, click **Loan Repayments**.
2. A list of loans you are associated with appears.
3. Click on a loan to open it.
4. Select the **Withdrawals** tab to see all requests and the **Request Withdrawal** button.

---

##### Withdrawal Request Statuses

| Status | What it means |
|--------|--------------|
| **Pending** | Submitted and waiting for admin review |
| **Draft** | You clicked "Edit Request" — the request is temporarily on hold while you make changes |
| **Approved** | Admin approved it; waiting for the cashier to disburse the funds |
| **Paid** | Funds have been disbursed to the lender |
| **Denied** | The request was declined — by the admin (wrong amount, wrong timing) or by the cashier (insufficient funds) |
| **Rescinded** | You cancelled the request before it was approved |

> **One withdrawal request per month** per loan. The reference number format is `WR-{LoanNumber}-{YYYYMM}` (e.g. `WR-LN-20260317-001-202605`).

---

##### Submitting a Withdrawal Request

1. Open the loan (via **Loan Repayments** in the sidebar).
2. Go to the **Withdrawals** tab.
3. Click **Request Withdrawal**.
4. Enter:
   - **Amount** — how much you are requesting
   - **Notes** — reason or reference (optional)
5. Click **Submit**.

The admin and cashier are automatically notified. Your request appears with status **Pending**.

---

##### Editing a Pending Request

If you need to change the amount or notes **before the admin approves it**:

1. Find the request on the Withdrawals tab (status: **Pending**).
2. Click **Edit Request**.
   - The system immediately sets the status to **Draft** — this prevents the admin from approving stale figures while you are editing.
3. Update the amount or notes in the form that appears.
4. Click **Resubmit** to send the updated request back for admin review.
   - Status returns to **Pending** and the admin is notified again.

> If you open the edit form and change your mind, click **Cancel Edit** — the request goes back to Pending without any changes.

---

##### Rescinding a Request

To cancel a request you no longer need (while it is still **Pending** or **Draft**):

1. Find the request on the Withdrawals tab.
2. Click **Rescind** and confirm.

The request is permanently cancelled. You can submit a new one if needed.

---

##### What Happens After You Submit

The request moves through two stages before funds are released:

**Stage 1 — Admin Review (Pending → Approved or Denied)**
- The admin sees your request in the **Loans** admin page (amber banner) and in **Pending Actions**.
- Admin either **Approves** (moves to Approved, cashier is notified) or **Denies** with a reason (moves to Denied, you are notified).

**Stage 2 — Cashier Disbursement (Approved → Paid or Denied)**
- The cashier sees the approved request in **Pending Actions**.
- Cashier either **Marks as Paid** (funds disbursed, you are notified) or **Denies — Insufficient Funds** (moved to Denied, you are notified).

---

##### If Your Request Is Denied

You will receive a notification with the denial reason. Your request shows as **Denied** on the Withdrawals tab.

To resubmit:
1. Click **Edit & Resubmit** on the denied request.
2. Adjust the amount or notes if needed.
3. Click **Resubmit** — a fresh **Pending** request is created and the admin is notified again.

---

#### Recording Pre-Lock Repayments (Manager/Admin)

> **Note:** This is a manager-only action for recording repayments that happened **before** the loan was locked (e.g. an early part-payment during setup). It is separate from the lender's withdrawal request process described above.

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

#### Direct Token Sale — R710 Portal Sales Page

The **R710 Portal → Sales** page is a dedicated selling interface for R710 tokens, separate from the main POS. It supports selling **multiple packages in one transaction** using a cart.

**How to make a direct sale:**

1. Go to **R710 Portal → Sales**.
2. Browse the package cards (sorted shortest to longest duration).
3. Click **+ Add to Cart** on each package you want to sell. You can add the same package type multiple times using the **−** / **+** quantity controls that appear once it is in the cart.
4. In the **Cart panel** on the right, review line items:
   - Adjust the quantity of any line using the **−** and **+** buttons.
   - Edit the **price per unit** directly in the price field if a different rate applies.
   - The line total and grand total update in real time.
5. Select a **Payment Method** (Cash / Card / Mobile Money / EcoCash). For $0 total (free tokens), no payment method is required.
6. Click **Proceed to Payment**.
7. In the confirmation modal:
   - Review the line-item breakdown and total.
   - For **Cash** payments, enter the **amount received** — the change is calculated automatically.
   - For **EcoCash** payments, the fee and customer-pays total are shown. Enter the **EcoCash transaction code** (optional but recommended for records).
   - Click **Complete Sale**.
8. The system generates one token per unit sequentially, showing progress ("Generating token 2 of 5…").
9. When complete, all issued credentials appear in a result panel:

```
✅ 3 tokens sold!
──────────────────────────────────────────────
  Package       Username            Password
  2 Week Pass   DS-260516-F9B       GXHUM-AAAFW
  8 Hour Pass   DS-260516-619       TEILB-OQSTE
  2 Hour Pass   DS-260516-3CC       WADIO-DSNBK
──────────────────────────────────────────────
```

10. Click **🖨️ Print** to print all credentials on a single receipt, or **👁️ Preview** to review before printing.

> **Tip:** The cart is cleared after a successful sale. To sell another batch, simply add packages to the cart again — no page refresh needed.

#### Sales History & Reprinting

If a receipt is missed or the window is closed before printing, credentials are **never lost** — every token sale is saved to the database and retrievable from the **Sales History** panel at the bottom of the Sales page.

**How to find and reprint a sale:**

1. Scroll to the bottom of **R710 Portal → Sales** and click **▼ show** on the **🕐 Sales History** panel.
2. Use the **date range pills** to narrow the window:

| Pill | What it shows |
|---|---|
| All time | Every direct sale ever made |
| Today | Current calendar day (default) |
| Yesterday | Previous calendar day |
| Last 7 / 30 / 90 Days | Rolling window |
| Custom Range | Enter From / To dates manually |
| Specific Date | Pick a single date |

3. Type in the **search box** to filter by package name, username, password, network name, or payment method.
4. Each row shows: package, date/time, payment method, amount, username, password, network, and who made the sale.
5. Click **🖨️ Reprint** on the row — the receipt preview opens so you can select a printer and confirm.

> The panel auto-expands and refreshes immediately after each new checkout, so the most recently issued tokens always appear at the top of the list.

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

### Printing a WiFi Advertising Flier

A printable A4 flier can be generated for any business that has a WiFi integration active (R710 or ESP32). The flier tells customers the network name, how to connect, what packages are available and their prices, and the terms of use.

#### Where to Find the Print Button

| Location | How to reach it |
|---|---|
| **R710 settings page** | Open any business WiFi settings page (e.g., Restaurant → Settings → R710 WiFi). Click the **📶 Print WiFi Flier** button in the top-right corner of the configuration panel. |
| **ESP32 settings page** | Open the ESP32 WiFi token menu settings. Click the **📶 Print WiFi Flier** button in the top-right corner of the info panel. |
| **Restaurant POS — WiFi tab** | Switch the category tab to **📡 ESP32 WiFi** or **📶 R710 WiFi**. A **📶 Print Flier** button appears above the product grid. |

#### Before the PDF is Generated

A small modal opens asking for:

| Field | Notes |
|---|---|
| **Network Name (SSID)** | For R710 this is pre-filled from the system. For ESP32 it must be entered manually (SSID is not stored). |
| **Tagline** *(optional)* | A short marketing line printed under "WiFi Available" — e.g., *"Fast and reliable internet for all"*. Leave blank for no tagline. |

Click **Print PDF** — the A4 flier downloads immediately.

#### What the Flier Contains

```
┌──────────────────────────────────────────────────┐
│  [Business Name]                    )))           │
│         WiFi Available                            │
│         [Optional tagline]                        │
├──────────────────────────────────────────────────┤
│  NETWORK NAME                                     │
│  BusinessGuest                                    │
├──────────────────────────────────────────────────┤
│  HOW TO CONNECT                                   │
│  1. Connect your device to the network above      │
│  2. Purchase a token from the cashier             │
│  3. Open your browser — a login page appears      │
│  4. Enter the USERNAME & PASSWORD on your slip    │  ← R710
│     (or: Enter the TOKEN CODE on your slip)       │  ← ESP32
│  5. Click Connect and enjoy your session!         │
├──────────────────────────────────────────────────┤
│  PACKAGES                                         │
│  1 Hour     $0.20  │  8 Hours    $0.50            │
│  1 Day      $1.10  │  1 Week     $2.00            │
├──────────────────────────────────────────────────┤
│  TERMS & CONDITIONS                               │
│  • Tokens are single-use and non-transferable     │
│  • One active session per token                   │
│  • No refunds on purchased tokens                 │
│  • For help, speak to staff at the counter        │
└──────────────────────────────────────────────────┘
```

- Packages are listed **shortest-to-longest duration** and shown in a two-column grid.
- The connection instructions automatically adapt to the hardware type — ESP32 fliers say "Enter the TOKEN CODE"; R710 fliers say "Enter the USERNAME & PASSWORD".
- The flier is entirely black and white — optimised for toner-saving on standard A4 printers.

> Print one flier and laminate it, or print multiples to place at tables and counters. The PDF is re-generated each time, so it always reflects your current packages and prices.

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

#### Duplicate Product Name Detection

When you click **Save** on a new product, the system checks whether any active item in this business already has a similar name. If a match is found:

- An **amber warning banner** appears below the form, listing the matching items (name and SKU).
- You have two options:
  - **Create anyway** — saves the new item even though a similar name exists. Use this only if the two products are genuinely different things.
  - **Cancel** — dismisses the warning so you can rename the item or locate the existing one instead.

> This check only runs when **creating** a new item. Editing an existing item does not trigger it.

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

> **Custom Bulk vs Bales:** Bales are used for used clothing where the exact item count is estimated. Custom Bulk is for packaged goods where the item count is exact and the per-item selling price is fixed.

#### Accessing Custom Bulk Products

There are two ways to reach the Custom Bulk Products management page:

**Option 1 — Sidebar (direct link)**
Click **📦 Custom Bulk Products** in the left sidebar. This link is visible to any user with inventory management permission and takes you directly to the full management page.

**Option 2 — Via the Bulk Stocking panel**
Open the Bulk Stocking panel (e.g. Grocery POS → **📦 Bulk Stock**), then click the **📦 Bulk Product** button in the panel header. This opens the Bulk Products modal, which has two tabs: **Register New** and **📋 Manage Existing**.

The sidebar link and the modal cover the same products — use whichever suits your workflow. The sidebar page gives a full table with richer detail; the modal is useful when you are already in the stocking panel.

#### Registering a New Bulk Product

1. Open the Bulk Products modal (sidebar → **📦 Custom Bulk Products** then use the **📦 Bulk Product** button in the Bulk Stocking panel, or go directly via the panel header).
2. In the **Register New** tab, fill in:

| Field | Required | Notes |
|-------|----------|-------|
| **Business** | Yes | Shown only when you belong to more than one business. Select the business this product belongs to. |
| **Product Name** | Yes | e.g. "Chocolates", "Hand Sanitiser 500ml". Type a name and click **✨ Suggest** to auto-fill the expense classification. |
| **Barcode** | No | Scan an existing barcode on the container, or click **Generate** to auto-create one |
| **Item Count** | Yes | Total number of individual units in the container |
| **Container Cost** | No | What you paid for the whole container — shown as guidance only. The system displays the calculated cost per item beneath this field (e.g. "Cost/item: $0.33"). This does **not** auto-fill the selling price. |
| **Selling Price** | Yes | The price charged to the customer per individual item. Must be entered manually. |
| **Expense Domain → Category → Sub-category** | No | Three-level hierarchy for expense classification. Use **✨ Suggest** next to the product name to auto-populate these fields. |
| **Supplier** | No | Select from the list. Click **+ New supplier** to add one inline. |
| **Notes** | No | Optional internal note |

3. Click **Register Bulk Product**.
4. The success screen shows:
   - The assigned **batch number** and **barcode**.
   - A **🖨 Print Barcode Label** button — click this to immediately print a scannable label for the container.

> **Auto-generated barcode:** If you leave the Barcode field empty, the system generates a unique 8-character hex code (e.g. `a3f2b7c9`). This becomes the barcode scanned at the POS.

> **Selling below cost:** If you enter a selling price lower than the calculated cost per item, the system shows a warning modal displaying the cost/item, the new selling price, and the loss per item. You must explicitly confirm before the price is saved.

> **✨ Suggest:** After typing a product name, click the **✨ Suggest** button next to the name field. The system scores your name against known expense categories and pre-fills the Domain, Category, and Sub-category dropdowns with the best match. You can accept the suggestion or change it manually.

#### Printing a Barcode Label

Labels for custom bulk products use the same print system as bales:

1. Click **🖨 Print Barcode Label** on the success screen after registering, **or**
2. Go to **📦 Custom Bulk Products** (sidebar), find the product row, and click **🖨 Print** in the Actions column, **or**
3. In the Bulk Product modal, switch to the **📋 Manage Existing** tab, find the product, and click **🖨 Print**.

The print modal lets you:
- Select a **label template** (size, font, layout)
- Set the **quantity** of labels to print
- Send to a **receipt/label printer** or **save as PDF**

Stick the printed label on the container or shelf edge. Cashiers scan this label at the POS.

#### Selling a Custom Bulk Product at the POS

1. **Scan the barcode** on the container label at any POS terminal, or search by product name in the POS search bar.
2. The product is added to the cart at the selling price (e.g. $0.35).
3. Adjust the quantity to however many units the customer is buying.
4. Complete the sale normally.

The product's **remaining count decreases** by the quantity sold. When the remaining count reaches zero, the product is automatically deactivated and will no longer appear in barcode lookups.

#### Stock Badge on POS Product Cards

Custom bulk products display a **remaining stock badge** on their product card in the POS grid — the same badge shown for regular inventory items:

| Badge colour | Meaning |
|---|---|
| Grey | 5 or more items remaining |
| Orange | Fewer than 5 items remaining |
| Red | Out of stock |

The badge shows the count (e.g. **3 left**) so cashiers know at a glance whether a container is nearly empty before adding items to the cart.

#### Managing Existing Bulk Products

Go to **📦 Custom Bulk Products** in the left sidebar. The page shows all products — active, low-stock, and deactivated — in a single table:

| Column | What it means |
|--------|---------------|
| **Product** | Name, notes, and a **Deactivated** badge if the product is inactive |
| **Batch / Barcode** | Auto-generated batch number and barcode value |
| **Category** | Assigned category |
| **Items Left** | Remaining count with a colour-coded progress bar |
| **Selling Price** | Per-item price charged to customers |
| **Container Cost** | Original purchase cost of the full container (read-only guidance) |
| **Added** | Date registered |
| **Actions** | + Top Up · Edit · 🖨 Print · Deactivate |

Use the **Show inactive / sold-out** toggle to include deactivated products in the table. Use the search box to filter by name, batch number, or barcode. Click the **×** button that appears inside the search box to clear the filter instantly.

#### Restock Candidates Panel

Products that are low on stock or fully sold out appear in an **orange panel** at the top of the page. This includes:
- Active products with 5 or fewer items remaining
- Products that were automatically deactivated when they reached zero items

Each card shows the product name, batch number, a stock progress bar, and a **+ Top Up** button.

- **Click a card** to jump straight to that product's row in the table below (the row is highlighted in orange for 2 seconds so you can find it instantly).
- **Click + Top Up** on a card to open the top-up form for that product without scrolling.

#### Topping Up Stock (Restocking a Container)

When a new delivery arrives for an existing bulk product, use **Top Up** to add stock to the same product — the barcode and batch number stay the same, so existing labels remain valid.

**To top up:**

1. Click **+ Top Up** in the Actions column of a table row, or click **+ Top Up** on a Restock Candidates badge card.
2. The top-up form expands below the row showing the current state:
   - **Remaining stock** — how many items are left in the existing container
   - **Current selling price** — the price currently charged per item
   - **Current cost/item** — the original container cost divided by original item count (shown when a container cost was recorded)
3. Fill in the new delivery details:

| Field | Required | Notes |
|-------|----------|-------|
| **New container item count** | Yes | Number of individual items in the new delivery |
| **New container cost ($)** | No | What you paid for the new delivery |
| **New selling price ($/item)** | Yes | Pre-filled with the existing selling price — change it if pricing has changed |

4. As you type, the system calculates and displays a **weighted average cost per item** — this blends the cost of remaining existing stock with the cost of the new delivery:

   > `Weighted avg = (remaining items × old cost/item + new container cost) ÷ (remaining + new items)`

   This is shown in a blue panel and gives you a realistic cost basis for deciding your new selling price. A warning appears if the new selling price is below the weighted average cost.

5. Click **Confirm Top Up** to save.

**What happens after a top-up:**
- The item count increases by the number of new items added.
- The remaining count increases by the same amount.
- If the product was deactivated (stock had hit zero), it is automatically **reactivated** — it reappears in POS barcode lookups immediately.
- The selling price and container cost are updated to the new values you entered.
- The existing barcode and batch number are unchanged — no relabelling required.

> **Top Up is also available from the 📋 Manage Existing tab** inside the Bulk Products modal (accessible via the Bulk Stocking panel). The same weighted-average form appears there in compact form, including all three inputs and the calculated average cost guidance.

#### Editing a Bulk Product

Click **Edit** on any row. You can update:
- Product name
- **Selling price** — press **Enter** to save or **Escape** to cancel
- Notes

The **Container Cost** column is shown as read-only guidance during editing, including the calculated cost per item (e.g. `$0.33/item`) so you can set the selling price with full margin visibility.

> **Selling below cost warning:** If you set a selling price lower than the cost per item, the system shows a confirmation modal before saving. It displays the cost/item, the new selling price, and the resulting loss per item. You must confirm to proceed.

> Item count cannot be changed via Edit. Use **+ Top Up** to add stock to an existing product, or deactivate the old product and register a new one to correct a count error.

#### Updating the Price from the Bulk Products Modal

You can also update the selling price directly from the **📋 Manage Existing** tab inside the Bulk Products modal (accessible from the Bulk Stocking panel):

1. Find the product in the list (use the **search box** to filter by name or batch number).
2. Click **✏ Price** on the product row.
3. An inline editor expands showing:
   - **Container cost** and **cost per item** as read-only guidance
   - A **New price $** input — type the new selling price
4. Press **Enter** or click **Save**. Press **Escape** or click **Cancel** to dismiss without saving.

The same below-cost warning applies here.

#### Deactivate vs Delete

The action button label changes based on whether any items have been sold:

| Button | When shown | What happens |
|--------|------------|--------------|
| **Delete** | No items have been sold yet | Permanently removes the product from the database |
| **Deactivate** | At least one item has been sold | Marks the product as inactive — it disappears from the POS but sales history is preserved |

Use **Deactivate** when:
- The container is physically removed from sale before it is fully sold.
- You registered it with incorrect details but sales have already occurred.

Deactivated products appear in the Restock Candidates panel with a **Deactivated** badge. If new stock arrives, use **+ Top Up** to reactivate the product without creating a new record.

#### Searching in the Manage Tab

The **📋 Manage Existing** tab inside the Bulk Products modal includes a search box. Type any part of the product name or batch number to filter the list in real time. Click the **×** inside the search box to clear it.

#### Dismissing the Drafts Modal

When opening the Bulk Stocking panel with existing saved drafts, a **Your Saved Drafts** screen appears. You can now close this screen by clicking the **×** button in the top-right corner — returning to the panel without selecting or creating a draft.

#### Inline Supplier Creation

When registering a new bulk product, if the supplier you need does not exist:
- Click **+ New supplier** under the Supplier dropdown — fill in the supplier form and save. The new supplier is immediately selected.

---

### Bulk Stocking Panel — Receiving and Counting Stock

The **Bulk Stocking Panel** is a full-screen workspace used by stock managers to receive incoming deliveries and run formal stock takes. It is accessed from:

- **Clothing → Inventory → 📦 Bulk Stock**
- **Restaurant → POS → 📦 Bulk Stock** (admin only)
- **Grocery → POS → 📦 Bulk Stock**

The panel supports scanning many items in a single session, saving work in progress as named drafts, and submitting a full report with employee sign-off.

---

#### Barcode Input & Filter Bar — Clear Buttons

Both text inputs in the panel header have an inline **×** clear button:

| Input | Clear button behaviour |
|-------|----------------------|
| **Barcode field** | Appears when text is present and the scanner is idle. Click **×** to clear the field and return focus to it — ready for the next scan. |
| **Filter bar** (below the table) | Appears when text is present. Click **×** to clear the filter and show all rows. A match count (e.g. *12 / 165*) shows how many rows are currently visible. |

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
| **Current Stock** | Read-only / overridable | System quantity at last sync. In Stock Take mode you can override it — see [Overriding the System Quantity](#overriding-the-system-quantity-stock-take-mode) below. |
| **Qty to Add** | Yes | How many new units you are receiving |
| **Physical Count** | Yes | What you counted on the shelf (for Stock Take mode — see below) |
| **Variance** | Read-only | Physical Count − Effective System Quantity. Red = shortfall, green = surplus. Only calculated when Physical Count is entered. |
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

#### Overriding the System Quantity (Stock Take Mode)

Sometimes the system quantity recorded is known to be incorrect before you even begin counting — for example, a previous entry error or a unit that was lost and never logged. In Stock Take mode you can **override the system quantity for any row** without altering the live database. The override only affects the variance and shortfall calculations for this stock take report.

**How to override:**
1. In the **System Qty** column, click the small ✏️ pencil button to the right of the value. The button only appears for existing-item rows in Stock Take mode.
2. A modal opens showing:
   - The item name
   - A **New system qty** number input (pre-filled with the current value)
   - A **Reason** text area — this is **mandatory**
3. Enter the corrected quantity and type a clear reason (e.g. *"Previous count had a data entry error — confirmed via delivery note"*).
4. Click **Apply Override**.

**What you see after overriding:**
- The System Qty cell turns **amber** and shows the overridden value.
- A small **⚑ flag** appears next to the value — hover over it to see your reason.
- Variance and Shortfall Value are recalculated using the overridden quantity.
- The row stays flagged (amber System Qty + ⚑) until the draft is submitted.

**Removing an override:**
- Open the ✏️ modal again — a **Clear** button appears. Click it to restore the original system quantity.

**Audit trail:**
- The override value, reason, your username, and the timestamp are saved with the draft and included in the submitted report — managers reviewing the report can see exactly what was changed and why.

> **Important:** Overriding the system quantity does **not** change the actual stock in the database. It only adjusts the reference point used to calculate variance for this stock take. The final stock quantity applied on submit is always **Physical Count + Qty to Add**.

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

### Merging Duplicate Inventory Items

If the same product was accidentally created twice (e.g. "Miller Genuine Draft Beer" appearing twice with separate stock quantities), managers can merge them into a single record without losing any stock data.

> **Who can merge:** Managers and business owners only.

#### Starting a Merge

1. On any inventory page (Grocery, Clothing, Hardware, or Restaurant), click **🔀 Merge Mode** in the toolbar.
2. Checkboxes appear on every row — the grid switches to selection mode.
3. Tick **two or more** items you want to merge.
4. A **Merge** button appears in the toolbar showing the count (e.g. *Merge 2 items*).
5. Click **Merge** to open the confirmation modal.

#### The Merge Modal

| Field | Description |
|-------|-------------|
| **Winner** | The item that survives — auto-selected as the one with the highest current stock. |
| **Being merged** | All other selected items — they are deactivated after the merge. |
| **Combined stock** | Total units that will be on the winner after the merge. |
| **Final name** | Editable — defaults to the winner's name. Change it if neither original name is ideal. |

The modal uses a **two-step confirm** for safety: first click turns the button amber with a warning; second click (red) executes the merge. This action is permanent.

#### What Happens After a Merge

- The winner's stock quantity is increased by the sum of all merged items' stock.
- An **ADJUSTMENT** stock movement is recorded on the winner, labelled *"Merged from [item names]"* — visible in the stock movements log as the audit trail.
- All merged items are marked **inactive** and no longer appear in the inventory list.

#### Exiting Merge Mode

Click **Exit Merge** (or **🔀 Merge Mode** again) to return to the normal inventory view. Any unconfirmed selections are discarded.

---

### Inventory Activity Report — Per-Item Stock History

The **Activity Report** shows a day-by-day breakdown of stock movements for a single inventory item: units received, sold, adjusted, lost, and any unexplained variance.

#### Opening the Report

- From the inventory grid, click the **📊** button in the item's Actions column.
- Or open an item's detail view and click **📊 Activity**.

#### Reading the Report

Each row represents one calendar day:

| Column | What it shows |
|--------|--------------|
| **Date** | The calendar day |
| **Added** | Units received into stock (restocked) |
| **Sold** | Units sold at the POS |
| **Adjusted** | Manual stock corrections |
| **Lost** | Units marked as lost or damaged |
| **Variance** | Unexplained difference between expected and actual closing stock |

#### Showing and Hiding Blank Days

Days with no activity are included by default.

- Click **Hide blank days** to collapse them and show only days with actual movement. The button switches to **Show blank days** to restore the full view.
- When blank days are hidden, a **dashed amber line** and a **`+Nd` badge** appear between any two non-consecutive dates, indicating how many days were skipped. For example, `+4d` between two rows means four consecutive days had no activity.

#### Printing / Saving as PDF

Click **Print / Save PDF** — a new browser window opens with a clean, print-ready version of the report. Blank days are always removed from the printed version automatically to save paper. Use your browser's **Print → Save as PDF** option to create a PDF copy.

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

### Copying a Product to Another Business

If you sell the same product or service across multiple businesses — for example a "Cellphone Charge" service offered at both a clothing shop and a grocery store — you can copy an existing product definition from one business to another without re-entering it manually. The copy includes the product name, prices, barcode definitions, and attributes. Stock starts at zero in the target business.

#### Who can use this

Any user who is a member of **both** the source and the target business. Admins can copy between any businesses.

#### Business type compatibility

The system only offers compatible businesses in the target dropdown:

| Source business type | Can copy to |
|---|---|
| Restaurant | Other restaurant businesses only |
| Grocery, Clothing, Hardware, Retail, Services, Other | Any non-restaurant business |

Restaurant menu items contain food-specific fields (ingredients, allergens, preparation time) that are not meaningful outside a restaurant context, so cross-type copying is blocked for that type.

#### How to copy a product

1. Go to **Inventory** for the business that has the product you want to copy.
2. Find the product in the inventory list — use the search box to locate it quickly.
3. Click the **📋** button in the Actions column for that product row (on mobile, tap **📋 Copy** in the card action buttons).
4. The **Copy to Another Business** modal opens. Type in the search box to filter your businesses by name or type.
5. Click the target business to select it — a **✓ BusinessName selected** confirmation appears below the search box.
6. Click **Copy to [Business Name]**.

A green banner confirms the copy was successful. The product now appears in the target business's inventory with zero stock.

#### What is copied

| Field | Copied |
|---|---|
| Product name | ✅ |
| Description | ✅ |
| SKU | ✅ |
| Selling price | ✅ |
| Cost price | ✅ |
| Barcode definitions | ✅ |
| Product attributes (PLU code, brand, etc.) | ✅ |
| Stock quantity | ❌ — starts at 0 |
| Category | ✅ Auto-matched — see below |
| Supplier, location | ❌ — business-specific, set these after copying |

#### Category auto-matching

The system tries to place the copied product into the correct category in the target business automatically, in this order:

1. **Same category ID** — if the exact category exists in the target, it is used.
2. **Same category name** — if a category with a similar name exists in the target (e.g. "Service" in clothing matches "Services" in grocery), that category is used.
3. **Alphabetical fallback** — if no name match is found, the product is placed in the first available category alphabetically. You can reassign it afterwards.

This means a service product copied from a clothing business to a grocery business will be placed in the grocery **Services** category automatically.

#### If the SKU already exists in the target

The copy is blocked and an error is shown: *"A product with SKU '...' already exists in [Business Name]."* This prevents accidental duplicates. Either edit the existing product in the target business or delete it first if you want a clean copy.

#### After copying — making the product available at the POS

Once copied, the product appears in the target business's inventory list immediately.

**For physical products:** The product appears in the POS once it has a price greater than zero. Add opening stock via **Inventory → Receive Stock** before selling.

**For service products (no stock):** The service appears automatically in the POS with no stock step required. In the **Grocery POS**, service products appear directly in the Desk Mode product grid under the **Services** category tab — tap the tile to add to cart. No stock quantity is shown because services do not deplete.

To add a product to **Quick Add** (category-pinned shortcuts in the POS), open the POS, switch to the category tab, and click the **pin icon** on the product card.

#### Receiving stock after copying (physical products only)

After copying a physical product, it has zero stock in the target business. To add opening stock:

1. Go to **Inventory → Receive Stock** for the target business.
2. Search for the copied product by name or SKU.
3. Enter the quantity and click **Receive Stock**.

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
   - **Category** — select or create a "Services" category
   - **Price** — the fee charged
   - **Barcode** — assign a barcode (type one in or scan a sticker) so the cashier can add it by scanning
   - **Stock tracking** — set to **None** or leave quantity blank — services do not deplete stock
   - **Description** — optional, shown on the customer display
3. Save.

The service appears in the POS and can be added to any order just like a physical product. In the **Grocery POS**, it appears as a tile in the Desk Mode grid under the **Services** category tab — no stock receiving required.

> **Tip — offering the same service at multiple businesses:** Use the **Copy to Another Business** feature (Section 14) to copy a service from one business to another. The category is matched automatically so it lands in the correct Services tab at the target business.

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
  OR: 📦 Custom Bulk Products (sidebar) → 🖨 Print

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

## 17. Suppliers & Payees

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

### Attaching Receipts to Expense Payments

> **Who reads this:** Cashiers and managers who process expense account payments. Physical receipts can be captured after a payment is recorded — even days later.

Each expense account payment can have one or more receipts attached to it. A receipt records the actual physical document details: the date on the receipt, the amount, a description of what was purchased, and which supplier or individual was paid.

#### The Receipt Badge

On the transaction history table, every payment row has a small receipt icon (🧾) at the right side:

| Badge appearance | Meaning |
|---|---|
| **🧾 N** (green, with a number) | N receipts are already attached — click to view or add more |
| **🧾** (grey, no number) | No receipt yet — click to attach the first one |

#### Attaching the First Receipt

1. In the transaction history, find the payment row and click the grey **🧾** icon.
2. The **Add Receipt** form opens.

**Step 1 — Payee:**
- If the payment already has a known payee, their name is shown and pre-selected. Click **Change** if the receipt is from a different person or supplier.
- If no payee is recorded, click **Select** and type to search.
- As you type, matching individuals, suppliers, and contractors appear in a dropdown. Select the correct one.
- If the payee does not exist yet, click **+ Create individual** or **+ Create supplier** directly from the search results to add them on the fly.

**Payee mismatch — correcting a wrong payee:**

Sometimes a payment is recorded with a placeholder name (the person who collected the cash) rather than the actual supplier. When you select a different payee from the one on the payment, an amber banner appears:

> ⚠️ Payment was recorded under **[old name]**. Update it to **[new name]**?

- Click **Yes, update payment** to correct the payment record to point to the right payee. The transaction row updates immediately.
- Click **No, keep original** to save the receipt linked to the new payee without changing the payment record itself.

**Step 2 — Receipt details:**

| Field | Required | Notes |
|---|---|---|
| Receipt Date | Yes | The date printed on the physical receipt — may differ from the payment date |
| Amount | Yes | The amount on the receipt — may differ from the payment amount |
| Description | No | Brief note of what was purchased (e.g. "Cleaning supplies — March") |
| Internal Notes | No | Any internal memo that does not need to appear on reports |

3. Click **Save Receipt**.

#### Viewing and Managing Existing Receipts

Click the green **🧾 N** badge on any payment row to open the receipts panel. This shows:
- Each receipt with its date, amount, payee name, and description
- Who added the receipt and when
- A **✕** delete button — visible to the receipt's creator within 7 days, or to admins at any time

To add another receipt to the same payment, click **+ Add Receipt** at the bottom of the panel.

#### Why Attach Receipts?

- Provides a paper trail linking physical documents to digital payments
- Corrects the payee on a payment when the original entry used a placeholder name
- Enables per-payee spending reports (see [Payee Receipt Report](#payee-receipt-report) below)
- Helps with audits — each receipt shows who recorded it and when

---

### Payee Receipt Report

Once receipts are attached to payments, you can view a spending summary for any individual or business payee directly from the Payees page.

1. Go to **Payees** in the menu.
2. Find the person or business payee.
3. Click the **🧾 Receipts** button on their card.

The report shows:
- **Summary card** — total number of receipts and total amount across all receipts linked to this payee
- **Receipt table** — each receipt listed with its date, the payment it belongs to, the expense account, the amount, and the description
- Results are sorted newest first

This gives managers a quick view of total spending with a specific supplier or contractor across all expense accounts and all time.

---

### Payee Payment History Report

The Payee Payment History report shows every individual payment transaction made to any recipient in the system — employees, persons, suppliers, businesses, or users — for any date range you choose.

**Who can use it:** Anyone with expense account report access.

#### Opening the Report

**Option A — From the Expense Accounts Reports Hub**

1. Go to **Expense Accounts → Reports**.
2. Click the **Payee Payment History** card.

**Option B — From a Contractor's Profile (shortcut)**

1. Go to **Contractors** in the menu.
2. Find the contractor and click **View Details**.
3. In the **Payment History** section, click **View Payment History**.
   The report opens pre-filtered to that contractor — no searching needed.

---

#### Selecting a Payee

The **Select Payee** dropdown at the top of the report searches across all payee types:

| Type | Who | Badge colour |
|------|-----|-------------|
| Employee | Staff on payroll | Blue |
| Person | Named individuals (e.g. contractors, relatives) | Green |
| Supplier | Business suppliers registered in the system | Orange |
| Business | Other registered businesses | Purple |
| User | System user accounts | Amber |

1. Click the **Select Payee** field.
2. Start typing a name — the list filters instantly.
3. Scroll to the right group (Employees, Persons, Suppliers…) and click the name.
4. To change the payee, click the **×** on the selected name and search again.

---

#### Filtering by Date

Use the **date pills** to filter the payment history:

| Pill | Covers |
|------|--------|
| Today | Current calendar day |
| Yesterday | Previous calendar day |
| Last 7 Days | Rolling 7 days back from today |
| Last 30 Days | Rolling 30 days (default) |
| Last 90 Days | Rolling 90 days |
| Custom Range | Type start and end dates manually |
| Specific Date | Pick a single day |
| All Time | No date filter — returns every payment ever recorded |

Click a pill to apply it immediately. The payment table and summary cards refresh automatically.

---

#### Reading the Results

Once a payee is selected, two summary cards appear at the top:

- **Total Paid** — sum of all payments in the selected period
- **Payments** — count of individual payment transactions

Below the cards, the **payments table** lists each transaction:

| Column | What it shows |
|--------|--------------|
| Date | Date the payment was recorded |
| Amount | Payment amount |
| Category | Expense category (if set) |
| Receipt # | Receipt or reference number (if attached) |
| Account | Which expense account the payment came from |
| Status | SUBMITTED, APPROVED, or REJECTED |
| Notes | Free-text notes entered at payment time |

Payments are returned newest first. If no payments exist for the selected period, the table shows "No payments found for the selected period."

---

#### Exporting to CSV

Click **Export CSV** (top-right of the table) to download all visible rows as a spreadsheet. The file is named `[Payee Name]_payment_history.csv`.

---

## 18. Batch EOD Catch-Up — Manager and Cashier Roles

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

There is one shared room: **General**. All users with a system account can see and post here. You can also send **private messages** to one or more specific people, and have **threaded reply conversations** within any message.

---

### Opening the Chat Panel

The chat lives in a **floating panel** that you can open without leaving whatever page you are on:

- **Sidebar:** Click the **💬 Chat** button in the left navigation bar.
- **Mobile:** Tap the chat icon in the mobile menu.
- **Dashboard:** Click the chat shortcut button on the dashboard.

The panel opens as a draggable window — move it to any corner of the screen so it does not cover your work.

---

### Sending a Message

**Broadcasting to everyone (default):**
1. Open the chat panel.
2. Type your message in the input field at the bottom.
3. Press **Enter** or click **Send**.

Your message appears immediately for all connected users.

---

### Sending a Private Message

You can target a message to one or more specific people. Only those recipients (and you) will see it — no one else.

1. In the input area, click **@ Add**.
2. A search box appears. Type part of a person's name and select them from the list.
3. Their name appears as a **chip** above the input field.
4. Add more people if needed. Click **✕** on a chip to remove them.
5. Type your message and send.

> **Note:** Only **active staff members** appear in the recipient list. Terminated or deactivated employees are automatically excluded.

Private messages are marked with a **🔒 Private** badge so the recipients clearly know it is not a broadcast.

To return to a normal broadcast, click **Clear** next to the recipient chips.

#### Online Presence Indicators

When the recipient picker is open, each person in the list shows a small presence dot next to their name:

| Dot colour | Meaning |
|------------|---------|
| 🟢 Green | Currently connected to the system |
| ⚫ Grey | Offline or not currently logged in |

An **online** label also appears to the right of any user who is active. The presence updates in real time — if someone signs in or closes the browser while the picker is open, their dot changes automatically.

> **Tip:** Sending a private message to an online user means they will see it immediately. Offline users will see it the next time they open the system.

---

### Threaded Replies

Any top-level message can have a thread of replies attached to it. Threads keep conversations focused without cluttering the main chat.

**Starting a reply:**
1. Hover over the message you want to reply to — a **↩ Reply** button appears.
2. Click **↩ Reply**.
3. A banner appears above the input field showing who you are replying to and two scope buttons:

   | Button | What it does |
   |--------|-------------|
   | **Reply to sender** | Your reply goes only to the person who wrote the original message |
   | **Reply to all** | Your reply is visible to everyone who could see the original message |

4. Choose the scope, type your reply, and send.
5. To cancel the reply and return to normal, click **✕** in the banner.

**Viewing replies:**
- After a message receives replies, a **▼ N replies** link appears below it.
- Click the link to expand the thread inline. Replies are indented under the original message.
- Click **▲ Hide replies** to collapse the thread.

---

### Real-Time Updates

Messages and replies are delivered using **WebSockets** — they appear instantly without refreshing. Private messages arrive via your personal notification channel, so you receive them even if you are on a different page.

---

### Unread Message Badge

When the chat panel is closed and a new message arrives:
- A **red badge** appears on the chat button showing the number of unread messages.
- The badge shows `9+` if there are more than nine unread messages.
- The count clears as soon as you open the panel.
- You also receive a **🔔 bell notification** in the notification panel — private messages are labelled *(private)* so you can spot them at a glance.

---

### Message History

When you open chat, the last **100 messages** you can see are loaded automatically. Messages are grouped by date:

```
── Monday, 10 March 2026 ──────────────────────
  09:14  Alice       Good morning everyone
  09:16  Bob         Morning! Till 3 is open
  09:45  Manager     All staff meeting at 14:00
                     ▼ 3 replies
── Tuesday, 11 March 2026 ─────────────────────
  08:55  Alice  🔒 Private    Running 5 mins late
```

> Messages older than **7 days** are automatically deleted. Chat is intended for day-to-day communication — it is not a permanent record store.

---

### Deleting a Message

You can delete your **own most recent** message:
1. Hover over the message.
2. Click the **Delete** button that appears.
3. The message is replaced with: *🚫 This message was deleted.*

The placeholder is visible to everyone who could see the original — only its content is removed.

> Only the message author can delete a message. You cannot delete other people's messages.

---

### Feature Summary

| Feature | Available? |
|---------|-----------|
| Broadcast to all users | ✅ Yes |
| Private messages (targeted recipients) | ✅ Yes |
| Threaded replies | ✅ Yes |
| Reply to sender only | ✅ Yes |
| Real-time delivery via WebSocket | ✅ Yes |
| 🔒 Private badge on targeted messages | ✅ Yes |
| File or image attachments | Not yet |
| Per-business channels | Not yet |
| Read receipts | Not yet |
| Typing indicators | Not yet |
| Message search | Not yet |
| Message editing | Not yet — delete and re-send |

---

### Chat Tips

- **Use private messages for sensitive coordination** — e.g. alerting a specific manager about a till discrepancy without broadcasting it to all staff.
- **Use threads to keep replies organised** — if a broadcast message needs follow-up, reply in the thread rather than sending a new top-level message.
- **Keep sensitive financial information out of general chat** — general messages are visible to all users. Use Expense Account notes or payroll records for financial records.
- **Use broadcast for quick coordination** — shift handovers, daily briefings, closing reminders, stock alerts.

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

### Service Items in Desk Mode

Service products (such as Cellphone Charging, Airtime Top-Up, or any other in-store service) appear in the Desk Mode grid alongside physical inventory items. They behave differently in two ways:

| Behaviour | Physical inventory item | Service item |
|---|---|---|
| Stock badge | Shows "X left", turns orange/red when low | No badge — services have no stock limit |
| Disappears when sold out | Yes | No — always available for sale |
| Stock receiving required | Yes | No — available immediately after creation or copy |

Service items appear under the **Services** category tab in the category bar. Tap their card to add to the cart — no quantity entry needed unless selling more than one session at a time.

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
3. A **Suggested Classifications** modal opens with up to two sections:

```
💡 Suggested Classifications
Based on: "office printer ink"

In this business
  🏢 Business (General) › 🖨️ Office Supplies
     🖨️ Printer & Ink Supplies

Other Categories
  📋 Consulting › 🏢 Business and Office Services
     🖥️ Office Equipment & Supplies

  🛒 Grocery › 🏪 Store Operations
     🖨️ Print & Packaging Supplies
```

| Section | What it shows |
|---------|--------------|
| **In this business** | Best matches within the current business's expense domain |
| **Other Categories** | Additional matches from across all domains — shown when the business search alone isn't enough |

If the current business domain returns no matches, **Other Categories** results are shown automatically — there is no separate step. A true "no results" is only shown when there are no matches anywhere.

4. Click any suggestion to **instantly fill** the Domain, Category, and Sub-category fields — no manual selection required.
   - Picking from **Other Categories** automatically switches the Domain picker to match the selected category.
5. While the fields are being filled, a pulsing "💡 Applying suggestion…" indicator appears. The fields are ready when it disappears.

If no matches are found anywhere, the message "No matches found — please select manually." is shown — use the dropdowns to select manually.

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

### Recent Payments to Payee

When you select a **Payee** in either the **Quick Payment** modal or the **Edit Payment** modal, the system automatically looks up the two most recent payments previously made to that payee from this account and displays them directly below the payee field.

```
Recent payments to Ngonidzashe Mapfumo
  $45.00   🏠 Home › Vehicle and Transport   SUBMITTED   View →
  $12.50   🛒 Grocery › Staff Welfare         SUBMITTED   View →
```

This helps you:
- Spot duplicate payments before submitting (e.g. the same supplier was just paid yesterday).
- Check how much was paid last time and for what category.
- Quickly confirm the correct payee is selected before entering an amount.

The panel appears automatically as soon as a payee is chosen and disappears if you clear the payee field. If the payee has no previous payments in this account the panel is not shown.

#### Viewing Full Payment Details

Each row in the recent payments list has a **View →** link on the right side. Clicking it opens a **Payment Detail** overlay — a compact popup that shows all information about that payment without leaving the current modal.

The Payment Detail overlay shows:

| Field | Notes |
|-------|-------|
| **Payee** | Full name of the person, employee, or supplier |
| **ID** | National ID of the payee (employees and individuals only, if recorded) |
| **Phone** | Formatted phone number (employees, individuals, and suppliers) |
| **Amount** | Payment amount |
| **Date** | Payment date |
| **Category** | Domain category (with emoji) |
| **Subcategory** | If set |
| **Channel** | 📱 EcoCash or 💵 Cash |
| **Status** | Colour-coded status badge |
| **Receipt #** | If recorded |
| **Notes** | Payment notes |
| **Created by** | Staff member who created the payment |

Close the overlay by clicking **Close** or clicking anywhere outside the popup. The Quick Payment or Edit Payment modal remains open underneath.

---

#### Repeating a Previous Payment

The **Repeat** button in the transaction history lets you open the Quick Payment modal pre-filled with all the details of an existing payment — saving time for recurring payments such as rent, regular supplier runs, or standing wages.

**Where the button appears:**

The **Repeat** link appears on any payment row in the transaction history that is:
- A regular payment (not a deposit, not an auto-transfer, not a combo request disbursement)

Any user with access to make or edit payments on the account can see the button.

**How to use it:**

1. Open the expense account detail page and scroll to the **Transaction History**.
2. Find the payment you want to repeat and click **Repeat** on the right side of the row.
3. The **Quick Payment** modal opens, pre-filled with:
   - **Payee** — same person, employee, or supplier
   - **Amount** — same amount (edit as needed)
   - **Payment date** — today's date (not the original date)
   - **Category / Sub-category** — same classification
   - **Notes** — same description
   - **Payment channel** — same channel (Cash, EcoCash, etc.)
   - **Priority** — same priority
4. A blue banner at the top of the modal confirms: *"Pre-filled from a previous payment — review and adjust as needed."*
5. Make any adjustments (amount, date, notes) and click **Submit Payment**.

> **Note:** The **Requester** field always defaults to you (the currently logged-in user), not the original requester. This is intentional — the repeat creates a new payment request under your name.

> **Tip:** Use Repeat for recurring fixed payments (same payee, same amount, same category). For payments where only the amount changes, it is faster to Repeat and update the amount than to fill in the form from scratch.

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
- **✕ Cancel** — withdraw the request before the cashier acts on it. A confirmation modal appears requiring you to enter a reason for cancellation (required for audit trail).

**IN QUEUE payments** (business accounts) — payments awaiting the next batch submission:
- **✎ Edit** — change the amount or notes before the batch is submitted.
- **✕ Cancel Request** — withdraw the payment request entirely. A confirmation modal appears requiring a cancellation reason. The reason is stored in the payment notes for audit purposes.

> **Activity banner:** The queue polls for changes every 10 seconds when you have payments awaiting cashier approval. If a payment is approved or rejected while you have the page open, an amber banner appears at the top of the queue:
>
> **"Payment activity detected on this account. Refresh now"**
>
> Click **Refresh now** to update the transaction list and balance. The page does **not** refresh automatically — this protects any unsaved work (open forms, amounts being typed) from being wiped mid-entry.

---

### My Payments Page — Approved & Rejected Tabs

Go to **Expense Accounts → My Payments** (or click the notification link from a rejection notification) to see a full view of your payments organised into two tabs.

#### ✓ Approved Tab

Lists all your approved payments that are awaiting physical collection. For each payment you will see:
- Amount, category, business name, and payee.
- Tap **Payment Made** once you have physically received the cash — the payment is marked complete.

#### ✗ Rejected Tab

Lists all your payment requests that were **rejected** by the cashier during a batch review. The tab badge shows the count of rejected requests requiring your attention.

For each rejected payment you will see:
- **Rejection reason** (amber panel) — the message the cashier provided when rejecting.
- **Rejected by** and **date** of rejection.
- Three action buttons:

| Button | What it does |
|--------|--------------|
| **Edit & Resubmit** | Opens the payment edit page with the rejection banner visible. Update the details (e.g. fix the payee phone number), then click **Save & Resubmit** to return the payment to the EOD queue for the next batch. |
| **Resubmit As-Is** | Resubmits the payment with no changes. Use this when the rejection was due to a temporary issue (e.g. insufficient funds) and the details are correct. |
| **Cancel Request** | Permanently withdraws the request. A confirmation modal appears — you must enter a reason. The reason is stored in the payment record for audit purposes. |

> **Notification link:** When the cashier rejects your payment, the 🔔 notification links directly to the **Rejected** tab so you see it immediately. The tab badge also appears on the **My Payments** page header.

#### Cancelling a Submitted Request (Before the Cashier Acts)

If you submitted a payment but want to withdraw it **before** it reaches a batch review:

1. Open the payment via **Expense Accounts → [Account] → [Payment]**.
2. In the status panel at the top of the detail page, click **Cancel Request**.
3. A confirmation modal appears. Enter a reason for cancellation (required).
4. Click **Confirm Cancel**. The request is withdrawn and will not appear in any future batch.

---

### Cashier-Assisted Payment Requests (Personal Accounts)

> **Who reads this:** Personal expense account holders who want to hand cash to a cashier for verification, and the cashiers who review and approve those requests.

Sometimes you have cash ready to pay out, but you need a cashier to physically handle the transaction before the balance is debited. The **"Request cashier approval before payment"** checkbox lets you submit a payment as a **request** rather than an immediate deduction — the balance is only debited when the cashier approves it.

This is available on **personal expense accounts only**. Business accounts use the EOD batch workflow instead.

---

#### For the Requester — Submitting a Payment Request

1. Open quick payment from your personal expense account.
2. Fill in the payment details (amount, category, notes).
3. Tick the **"Request cashier approval before payment"** checkbox (appears only on personal accounts).
4. **Payee is optional** when this box is ticked — you can leave it blank if the recipient is not yet known. The label changes to *(optional — required at payment)* as a reminder.
5. Click **Submit Payment**.

The payment is created with status **⏳ Awaiting Cashier** — your balance is **not** debited yet.

You will receive a **bell notification** once a cashier approves or rejects your request.

> **Tip:** Only tick this box when you need a cashier to physically handle or verify the cash. For normal personal payments you process yourself, leave it unticked.

---

#### Marking the Payment as Paid — Adding the Payee

Once the cashier approves your request, the payment moves to **APPROVED** and appears in the **My Queue** panel on your account page with a green **✓ Mark as Paid** button.

**If you submitted the request without a payee:**

Clicking **✓ Mark as Paid** will open a small popup asking you to select the payee **before the payment can be confirmed**. Select the person or supplier who received the funds and click **✓ Mark as Paid** to finalise.

**If you already provided a payee upfront:**

Clicking **✓ Mark as Paid** opens the standard confirmation dialog and marks the payment immediately.

> **Why is the payee required at this point?** The payment record must have a payee before it is finalised so that expense reports and receipts are accurate. The flexibility to skip it during submission is provided so that approval can start before all details are available — but the name must be captured before funds are confirmed.

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

After approving, the **Payment Voucher** form opens automatically so you can capture the payee's signature immediately (see [Section 24 — Payment Vouchers](#24-payment-vouchers--creating-viewing--locking)).

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

### When Vouchers Are Created

| Flow | How the voucher form opens |
|------|---------------------------|
| **Personal payment request** (cashier-assisted) | Automatically after the cashier clicks Approve |
| **Standalone account group approval** | Post-approval panel — cashier picks which payments to voucher individually |
| **Any APPROVED or PAID payment (fallback)** | Open the payment detail page → click **📄 Create Voucher** |
| **Transaction history row** | Click the faint 📄 icon on any row without a voucher |

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

### Vouchers on the Payment Detail Page

For any payment that has been **APPROVED** or **PAID** and has no voucher yet, the payment detail page shows a **📄 Create Voucher** button. Click it to open the voucher form for that individual payment.

Once a voucher exists, the button is replaced by a **📄 Voucher VCH-XXXX** badge — click the badge to view and print the voucher.

This is the fallback path for payments that were skipped during the post-approval panel, or for vouchers created outside the normal approval flow.

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

## 25. Eco-Cash to Cash Conversions

> **Who reads this:** Cashiers and managers who handle mobile money (EcoCash) and need to convert it to physical cash for customers or staff.

A **Cash Bucket** cashier can convert eco-cash (mobile money) into physical cash. The system tracks the transaction through a multi-step workflow so that both the eco-cash wallet balance and the physical cash bucket balance stay accurate.

---

### Who Is Involved

| Role | What they do |
|------|--------------|
| **Requester** | Submits a request for a specific amount to be converted from eco-cash to cash |
| **Cashier / Approver** | Reviews the request, verifies the eco-cash wallet has sufficient balance, and confirms the tendered amount |
| **Cashier / Completer** | Physically sends the eco-cash transfer, receives the cash, and records the final amounts |

Approver and Completer can be the same person.

---

### Step 1 — Submitting a Conversion Request (Requester)

1. Go to **Cash Bucket** in the menu.
2. Click **New Eco-Cash Conversion**.
3. Select the **business** whose eco-cash wallet will be used.
4. Enter the **amount** you want converted (in USD).
5. Add any **notes** — e.g. the reason or the recipient's name.
6. Click **Submit Request**.

The request is created with status **PENDING** and cashiers with approval access are notified.

---

### Step 2 — Approving the Request (Cashier)

1. Open the 🔔 **bell** menu or go to **Pending Actions**. Pending conversions appear under *Eco-Cash Conversions*.
2. Click **Review** to open the Cash Bucket page.
3. Find the PENDING conversion and click **Approve**.
4. Confirm the **Tendered Amount** — the exact eco-cash amount that will be sent to the requester. This may differ slightly from the requested amount (e.g. requested $66.00 but eco-cash fees round it to $66.35).
5. Click **Approve**.

The system checks that the eco-cash wallet has sufficient balance before approving. If the balance is too low the approval is blocked.

Status changes to **APPROVED**.

---

### Step 3 — Completing the Conversion (Cashier)

1. Use the eco-cash app or USSD to send the approved amount to the requester's eco-cash number. The requester must have the **cash ready** to hand over.
2. Note the **transaction code** from the eco-cash confirmation SMS or app (e.g. `66567DE`).
3. In the system, find the APPROVED conversion and click **Complete**.
4. Fill in the three fields:

| Field | What to enter | Required? |
|-------|---------------|-----------|
| **Eco-Cash Transaction Code** | The reference code from the eco-cash confirmation message | Optional but strongly recommended |
| **Eco-Cash Total Sent** | Exact decimal amount debited from the eco-cash wallet (e.g. `66.35`) — may include fees | Required |
| **Cash Tendered** | Whole dollar amount of physical cash received from the requester (e.g. `67`) | Required |

5. Click **Confirm & Complete**.

The system records:
- An **OUTFLOW** from the eco-cash wallet for the eco-cash amount sent.
- An **INFLOW** into the cash bucket for the cash received.
- The conversion status changes to **COMPLETED** with the transaction code stored.

---

### Step 4 — Rejecting a Request (if needed)

1. Find the PENDING conversion and click **Reject**.
2. Enter a **rejection reason** — this is saved and visible to the requester.
3. Click **Reject**.

Status changes to **REJECTED**. No ledger entries are created.

---

### Status Overview

| Status | Meaning |
|--------|---------|
| **PENDING** | Request submitted, awaiting cashier approval |
| **APPROVED** | Cashier confirmed the tendered amount; ready to complete |
| **COMPLETED** | Eco-cash sent, cash received, both ledgers updated |
| **REJECTED** | Request declined; no ledger entries created |

---

### Important Tips

- Always record the **transaction code**. If the eco-cash payment is disputed later, the code is your proof.
- The **Eco-Cash Total Sent** (decimal) and **Cash Tendered** (integer) may differ — fees, rounding, or change. Enter both exactly as they occurred.
- The eco-cash balance check happens at **Approve** time. If another transaction reduces the balance between approval and completion the system will still allow completion — always verify the balance yourself before sending.
- Completed conversions appear in the list with a summary: *EcoCash: $66.35 → Cash: $67* and the transaction code for quick reference.

---

## 26. Printer Setup & QZ Tray

Receipt and label printing uses **QZ Tray** — a small desktop application that runs in your Windows system tray and bridges the browser to locally-attached or network printers. Because it runs on your own machine, **every user must install it on their own computer**. Your saved printer is stored in your browser (not on the server), so it stays with your device.

### Who Needs This

Every user who wants to print receipts or ID cards directly from the app — cashiers, managers, HR, stock managers. There are no special permissions required; the **Printer Setup** page is accessible to all users via **👤 Profile → Printer Setup**.

### Step 1 — Install QZ Tray

1. Download QZ Tray from **https://qz.io/download/** — choose the Windows installer. Java is bundled; you do not need to install Java separately.
2. Run the installer and follow the prompts.
3. After installation, QZ Tray starts automatically and shows as a **QZ icon in the system tray** (bottom-right corner near the clock). If you don't see it, open it from the Start menu.

> QZ Tray must be running whenever you want to print. If receipts stop printing, check that the QZ icon is visible in your system tray.

### Step 2 — Trust the Site Certificate (first time only)

The system uses a signed certificate so QZ Tray can verify the connection is genuine. The first time you connect from this site, QZ Tray will ask for approval:

1. Go to **👤 Profile → Printer Setup**. The page automatically tries to connect to QZ Tray.
2. A QZ Tray security dialog will appear — it may open as a separate window or show as a taskbar notification.
3. The dialog will show the site certificate as **Third-party issued** with a **Trusted** status.
4. Click **Allow**. To avoid being asked again, select **"Always allow from this site"** or **"Remember this decision"** before clicking Allow.

> **If no dialog appears** and the page shows "QZ Tray not detected": check the system tray — QZ Tray may have an open dialog behind other windows. Right-click the QZ Tray icon → **Open Site Manager** to manually add this site as trusted.

> **HTTPS is required.** QZ Tray will not connect to a plain `http://` address. The app must be accessed via `https://` (e.g. `https://192.168.0.108:8080`) for QZ Tray to work.

### Step 3 — Select and Save Your Printer

1. Once connected, the Printer Setup page shows a green **QZ Tray connected** indicator.
2. A dropdown lists all printers detected on your machine — select your receipt printer (e.g. `EPSON TM-T20III`).
3. Click **Save Printer**. Your selection is saved in your browser.
4. Click **Test Print** to confirm a test receipt prints correctly.

**Printer not listed?** Enter the printer name manually:
- Open Windows **Start → Settings → Bluetooth & devices → Printers & scanners** and copy the exact printer name.
- Paste it into the manual entry field and click **Save Printer**.

### Step 4 — Printing Receipts from the POS

After completing a sale:
1. The **receipt preview modal** opens.
2. Select **QZ Tray Printer** from the print method dropdown — your saved printer is pre-selected.
3. Click **Print**.

### Troubleshooting

| Problem | Solution |
|---|---|
| "QZ Tray not detected" even though it's running | Make sure the app is accessed over **HTTPS**, not HTTP. Check the system tray for a pending approval dialog and click **Allow**. |
| Approval dialog appears on every print | When the dialog appears, check **"Always allow from this site"** before clicking Allow. Or open QZ Tray **Site Manager** → set this site to Always allow. |
| "Invalid Signature" or certificate warning | Right-click the QZ icon → **Open Site Manager** → find this site → click **Trust**. Contact your admin if it persists — the server certificate may need re-generating. |
| QZ Tray connected but no printers in dropdown | Look for a pending QZ Tray dialog in the taskbar and click **Allow**, then click the refresh icon on the Printer Setup page. If the list is still empty, enter the printer name manually. |
| Receipt prints only top half or garbled output | Always use the **QZ Tray Printer** option — do not use the browser print dialog for thermal receipts. The system sends raw ESC/POS commands that a browser cannot interpret. |
| "No printers found" in the receipt modal | QZ Tray may not be running or no printer is saved. Go to **Profile → Printer Setup**, confirm QZ Tray is connected, and save a printer. |

### Clearing Stuck Print Jobs

If a printer is stuck or printing the same job on repeat, open the **Test Print** panel (printer icon in the top bar):

| Button | What it does |
|---|---|
| **Bring Online** | Pings the printer to check its network status |
| **Test** | Sends a short test page |
| **🗑 Clear Print Queue** | Cancels all stuck jobs and restarts the Windows print spooler |
| **⏹ Stop QZ** | Disconnects QZ Tray and drops all pending QZ print jobs immediately |

> Use **Clear Print Queue** first for a printer stuck printing the same job. Use **Stop QZ** if a QZ job is looping or printing garbage — reconnect from Printer Setup afterwards.

---

## 27. Stock Velocity & Reorder Reports

These two reports help grocery and retail businesses understand how quickly products are moving and which items need restocking. Both are available to **all salespersons** — no admin permission required. Access them from **Reports → Fast & Slow Moving Stock** or **Reports → Reorder Suggestions**.

### Stock Velocity Report

Shows how fast every product is selling over the selected period, ranked from fastest to slowest.

**How to use:**
1. Go to **Grocery → Reports → Fast & Slow Moving Stock**.
2. Select a date range using the standard filter (Today / Last 7 Days / Last 30 Days / Custom).
3. The report loads automatically.

**What you see:**

| Column | Meaning |
|---|---|
| **Product** | Product name, variant, and category |
| **SKU** | Product code |
| **Units Sold** | Total units sold in the period |
| **Avg / Day** | Average units sold per day |
| **Current Stock** | Stock on hand right now |
| **Days of Stock Left** | At the current sales rate, how many days until stock runs out |

**Sections:**
- **🔥 Fast Moving** — top 20 products by daily sales rate. These are your best sellers.
- **🐌 Slow Moving** — products selling fewer than 0.1 units per day (or no sales at all). Consider markdowns or returns.

**Colour coding for Days of Stock Left:**
- 🔴 Red (bold) — fewer than 3 days of stock remaining. Urgent.
- 🟠 Orange — fewer than 7 days. Order soon.
- Grey — more than 7 days. No immediate action needed.

> **Note:** A product must have had at least one sale during the selected period to appear in the Fast Moving section. Products with no sales appear in Slow Moving.

### Reorder Suggestions Report

Shows only the products that are running low and need to be reordered, based on their sales velocity. Includes a suggested order quantity and estimated cost.

**How to use:**
1. Go to **Grocery → Reports → Reorder Suggestions**.
2. Select a date range — use at least **Last 30 Days** for a reliable velocity estimate.
3. Adjust the thresholds if needed:
   - **Reorder when stock left ≤** — default 7 days. Items with fewer than this many days of stock appear.
   - **Order enough for** — default 30 days. Suggested order qty covers this many days of stock.
4. Click **Export CSV** to download the list for your supplier.

**Urgency levels:**
- 🔴 **Critical** — fewer than 3 days of stock left. Order immediately.
- 🟡 **Low** — approaching the threshold. Order within the week.

> **Items that never appear:** If a product has no sales history in the selected period and its reorder level is set to zero, the system cannot calculate velocity. Set a reorder level on the product (in inventory settings) to ensure it always appears when stock is low.

---

## 28. Invoices & Quotations

> **Who this is for:** Managers, business owners, and system administrators who need to create formal invoices or quotations for customers.

Invoices and quotations are professional documents you can create, save, print, and track. They pull your company's name, address, and logo automatically from umbrella business settings.

| Document Type | Number Format | Use When |
|---------------|--------------|----------|
| **Invoice** | INV-0001 | Billing a customer for goods or services delivered |
| **Quotation** | QUO-0001 | Providing a price estimate before work begins |

---

### Finding the Page

Click **Invoices & Quotes** in the left sidebar. If you do not see it, ask your system administrator to check your permissions.

---

### Creating a New Invoice

1. Click **+ New Invoice** (blue button, top right).
2. The **New Invoice** modal opens.

**Step 1 — Customer details**
- Type a customer name in the search box. Matching customers from your customer list will appear — click one to auto-fill their name, phone, email, and address.
- If the customer is not in the system, type their name directly and fill in the remaining fields manually.

**Step 2 — Document details**
- **Issue Date** — defaults to today. Change if needed.
- **Valid Until** — the date the invoice expires. Defaults to 60 days from today.
- **Notes** — optional internal or customer-facing notes.

**Step 3 — Line items**
- Each row represents one product or service.
- Fill in **Description**, **Qty**, **Unit Price**, and optionally a **Disc %** (per-line percentage discount).
- The **Total** column calculates automatically.
- Click **+ Add line item** to add more rows (maximum 30).
- Click **×** on a row to remove it.
- Use the **Document Discount** field (below the table) to apply a flat amount discount to the whole document.
- If your business has tax enabled, a tax line and the final **Total** are calculated automatically.

**Step 4 — Save**
- Click **Save & Preview** to save the invoice and immediately view the printable document.
- Click **Save as Draft** to save without entering preview mode.

---

### Creating a New Quotation

1. Click **+ New Quotation** (amber button, top right).
2. The process is identical to creating an invoice, with two differences:
   - The document is labelled **QUOTATION** with a **QUO-** number.
   - A disclaimer — *"This quotation is subject to change at any time prior to acceptance."* — is printed at the bottom of the document.
   - Valid-until defaults to **30 days** (shorter than an invoice).

---

### Printing a Document

1. Open an existing invoice or quotation by clicking **View** in the list, or save a new one.
2. In the preview panel, click **🖨 Print**.
3. A new browser window opens with the formatted A4 document and the print dialog appears automatically.
4. Select your printer and click **Print**.

> **Tip:** The printed document includes your company logo, address, and registration number pulled from umbrella business settings. Make sure those are filled in for a professional result.

---

### Viewing & Managing Existing Documents

On the **Invoices & Quotes** list page:

- **Tabs** — switch between *All*, *Invoices*, and *Quotations*.
- **Status filter** — filter by DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, or CANCELLED.
- **Search box** — type a customer name or document number (e.g. `INV-0003`) to filter the list. Typing an **exact** document number opens that document immediately.

Click **View** on any row to open the document in preview mode.

---

### Document Status Lifecycle

| Status | Meaning | Next Actions |
|--------|---------|-------------|
| **DRAFT** | Saved but not yet sent | Mark as Sent, or Cancel |
| **SENT** | Delivered to the customer | Mark as Accepted or Rejected |
| **ACCEPTED** | Customer agreed | No further transitions |
| **REJECTED** | Customer declined | No further transitions |
| **EXPIRED** | Quotation past its valid-until date | No further transitions |
| **CANCELLED** | Voided | No further transitions |

To update a status, open the document (click **View**) and use the action buttons in the preview header.

> **Note:** Cancelled documents are never deleted — they remain in the history for audit purposes.

---

### Setting Up Company Branding (Administrators)

The logo and company details printed on every invoice come from **Umbrella Business Settings**.

1. In the sidebar, click **Umbrella Business Settings**.
2. Scroll to the **Company Logo** card.
3. Click **Upload Logo** and choose a JPG, PNG, or WebP image (max 2 MB).
4. Click **Remove** to clear the logo.

Company name, address, phone, email, and registration number are taken from the main business details fields on the same settings page.

---

### Setting the Invoice / Quotation Start Number (Administrators)

If your business has existing paper invoices and you want the system to continue from a specific number (e.g. start at INV-0051):

1. Go to **Umbrella Business Settings**.
2. Scroll to the **Invoice & Quotation Numbering** card.
3. Enter the desired starting number in the **Invoice Start Number** or **Quotation Start Number** field.
4. Click **Save Numbering Settings**.

The system will never assign a number lower than the start number you set. Existing numbers already issued will not be changed.

---

### Quick Reference — Keyboard & UI Tips

| Action | How |
|--------|-----|
| Add a line item | Click **+ Add line item** or press Tab past the last field |
| Remove a line item | Click **×** at the end of the row |
| Find a document by number | Type the exact number in the search box (e.g. `QUO-0007`) |
| Print | Open the document → click **🖨 Print** |
| Cancel a document | Open the document → click **Cancel Document** in the preview header |

---

*Last updated: April 2026*

---

## 29. Restaurant Prep Inventory Tracking

> **Who reads this:** Restaurant managers and owners who prepare food in advance and want to track how many portions are available throughout the day.

This feature lets you record how many portions of each menu item were prepared at the start of each day. The system tracks remaining counts in real time as orders are placed, shows live "N left" badges on the POS, and provides a revenue-vs-cost report.

---

### How It Works — Overview

```
Morning: Manager initialises stock
  → "We prepared 20 portions of Grilled Chicken today, cost $3.50 each"

During the day: POS shows live counts
  → "12 left" badge on the Grilled Chicken card

Orders reduce the count automatically (FIFO)
  → Each sale deducts from the oldest batch first

Evening: Report shows profit per item
  → Revenue, cost, margin for every tracked item
```

---

### Step 1 — Configure Which Items Are Tracked

Before initialising stock, a manager must mark which menu items should be tracked.

1. In the sidebar, click **Restaurant → Prep Track Config** (or **Configure Tracked Items**).
2. The page lists all active menu items with prices.
3. Use the **toggle switch** on the right to enable or disable tracking for each item:
   - **Toggle ON (teal)** — item appears on the Initialization page; a "N left" badge shows on the POS.
   - **Toggle OFF (grey)** — item is hidden from initialization; no badge shown. All historical batch data is preserved.
4. Items with **No price set** cannot be tracked (toggle is disabled until a price is added).

**Tips:**
- Use the search box to quickly find an item by name or category.
- Use the **Tracked only** button to see only the items currently being tracked.
- Click the **Product** or **Price** column headers to sort.

---

### Step 2 — Daily Initialization (Adding Today's Prepared Stock)

Each morning (or whenever a batch is prepared), a manager enters the day's quantities.

1. In the sidebar, click **Restaurant → Prep Initialization** (or **Daily Initialization**).
2. Each tracked item appears as a card.
3. For each item, fill in:

| Field | What to Enter |
|-------|--------------|
| **Portions today** | How many portions were prepared (e.g., 20) |
| **Cost per unit ($)** | Price paid for one full raw unit (e.g., $14.00 for one whole chicken) |
| **Portions per unit** | How many portions come from that unit (e.g., 4 chicken portions) |
| **Total cost** | Calculated automatically — no entry needed |

4. The **Cost/portion** figure (top right of each card) is calculated automatically: Cost per unit ÷ Portions per unit.
5. Click **Add Batch** to save. The carried-over count from previous days is shown in amber — no action required, it is already counted.

> **Carry-over:** If portions were left over from yesterday's batch, they are shown with an amber left border and "X carried over" label. You do not need to re-enter them — they are already in stock.

> **Permissions:** Only users with the **Manager**, **Owner**, or **Admin** role can add batches.

---

### POS — Live "N left" Badges

Once stock is initialized, the POS automatically shows remaining counts on tracked item cards:

| Badge colour | Meaning |
|-------------|---------|
| **Orange** | More than 5 portions remaining |
| **Amber** | 5 or fewer portions remaining — consider preparing more |
| **Red "Out of prep"** | 0 portions remaining — the card stays enabled; selling is still allowed |

Badges update automatically after each order is completed. If an item shows "Out of prep" but food was prepared, a manager can add a new batch on the Initialization page and counts will update immediately.

---

### Reports — Revenue vs Cost

1. In the sidebar, click **Restaurant → Reports → Prep Inventory**.
2. Set a **Start Date** and **End Date** and click **Load Report**.
3. The summary cards show totals across all tracked items:
   - **Units Initialized** — total portions prepared in the date range
   - **Units Sold** — portions actually sold
   - **Total Revenue** — units sold × selling price
   - **Total Cost** — sum of batch costs
   - **Net Profit** — Revenue − Cost
4. The detail table breaks down each item individually with a **Margin %** column.

---

### Backup & Restore — New Tables

The following tables are included in all system backups automatically:

| Table | Contents |
|-------|----------|
| `menu_item_inventory_config` | Which menu items have tracking enabled |
| `menu_item_inventory_batches` | Every batch ever initialized (quantity, cost, remaining count) |

**Verification after restore:** Confirm both tables are present and populated:

```sql
SELECT COUNT(*) FROM menu_item_inventory_config;
SELECT COUNT(*) FROM menu_item_inventory_batches;
```

Both counts should match the source system. If either returns 0 but the source had data, re-run the restore — these tables are near the end of the restore order and may have been skipped due to a prior FK error on `businessProducts`.

---

### Troubleshooting

| Issue | Solution |
|-------|---------|
| Item not appearing on Initialization page | Go to **Prep Track Config** and ensure the toggle is ON for that item |
| Badge not showing on POS | Item may not have any initialized batches for today. Add a batch on the Initialization page |
| Cost/portion shows nothing | Enter both "Cost per unit" and "Portions per unit" — both fields are required for the calculation |
| "Add Batch" button greyed out | Fill in all required fields: Portions today, Cost per unit, Portions per unit |
| Counts not updating after an order | Refresh the POS page — counts update on each checkout completion |
| Report shows 0 revenue | No batches were initialized in the selected date range, or no sales matched tracked items |

*For technical support, contact your system administrator.*

---

## 30. Salesperson EOD Reporting

> **Who reads this:** Salespersons who submit daily cash/EcoCash reports, and managers who review those reports and reconcile them against the system's End-of-Day figures.

When **Salesperson EOD** is enabled for a business, every salesperson must submit a daily report declaring how much cash and EcoCash they collected. Managers see those reports alongside the system EOD figures to quickly spot discrepancies.

---

### Overview — How It Works

```
Each day (before the deadline):
  Salesperson submits their cash + EcoCash totals
    → Status: PENDING → SUBMITTED

Manager runs End of Day:
  Salesperson EOD section shows on the EOD page
  If all submitted → Cash Counted auto-fills from their totals
  If any salesperson hasn't submitted → Save is blocked

Manager can override a missing submission:
  → Status becomes OVERRIDDEN (with a reason)

Saved (locked) EOD report captures the full salesperson breakdown
  → Shows each person's figures, status, and any discrepancies
```

---

### Salesperson — Submitting Your Daily Report

**Where:** Sidebar → **EOD → Submit Daily Report**

1. Select today's date (defaults to today).
2. Enter the **Cash Total** — total cash you physically collected during the day.
3. The **EcoCash Total** is **automatically calculated** from POS system records and shown as a **read-only** field. You do not enter this — it is pulled directly from the system.
4. Add any **Notes** (optional).
5. Click **Submit Report**.

After submission you are taken directly back to the **POS** to continue serving customers.

> **Note for Grocery Associates:** The **Submit Daily Report** and **My EOD History** links are visible in the sidebar for grocery-associate role members on grocery businesses, in addition to the standard salesperson role.

**Rules:**
- **One report per date.** Once submitted for a date, the figures cannot be changed.
- The Submit button is **disabled** while the system fetches the EcoCash total. Wait for it to load before submitting.
- A manager can override an overdue or missing submission on your behalf.

**Status badges:**

| Badge | Meaning |
|-------|---------|
| **Submitted** (green) | Report accepted for this date |
| **Pending** (amber) | Not yet submitted |
| **Overdue** (red) | Deadline passed and no report submitted |
| **Overridden** (purple) | Manager entered figures on your behalf |

---

### Salesperson — Viewing Your History & Catching Up Missed Dates

**Where:** Sidebar → **EOD → My EOD History**

The history page shows all your past reports in card format:
- **Date**, **Cash Total**, **EcoCash Total**, **Status**, and the time you submitted.
- If a report was **Overridden**, the override reason appears in a highlighted callout box.
- Use the **From / To** date filters to narrow the list.
- Pagination (20 per page) — use **Previous / Next** at the bottom to browse older records.

> **Today's pending record** is hidden from the history list until the business EOD deadline time has passed, so you are not distracted by it during your shift.

#### Submitting a Catch-Up Report for a Missed Date

If a past date shows as **Pending** in your history, a **Submit** button appears next to it.

1. Click **Submit** on the pending row to expand a form.
2. Enter the **Cash** you collected on that date.
3. The **EcoCash** field is **read-only** and auto-filled from order records for that specific calendar day — wait for it to load before submitting.
4. Add any notes (optional).
5. Click **Submit EOD Report**.

The record changes to **Submitted** and the row updates immediately.

> If a manager already submitted an override for a past date, it shows as **Override** with the manager's figures — you cannot re-submit over an override.

---

### Manager — Reviewing Salesperson Reports

**Where:** Sidebar → **EOD → Manager EOD View** (or **Staff EOD Status**)

The manager page shows all salespersons' statuses for a selected date:

| Column | Meaning |
|--------|---------|
| **Name** | Salesperson's display name |
| **Cash Total** | Amount they declared |
| **EcoCash Total** | EcoCash amount they declared |
| **Status** | SUBMITTED / PENDING / OVERDUE |
| **Submitted At** | Timestamp of submission |

**Filtering:**
- Use the **Date** picker to view any past date.
- Use the **Status** filter to show only Pending, Submitted, or Overdue.

**Overriding any submission:**

The **Override** button appears on every record regardless of status. Use it to correct wrong figures or submit on behalf of a salesperson who didn't submit.

1. Click **Override** next to the salesperson's row.
2. Enter the correct **Cash** and **EcoCash** amounts.
3. Enter a short **Reason** (e.g. "Staff forgot to submit — figures confirmed from till").
4. Click **Submit Override**.

The record changes to **Overridden** and both the salesperson and manager can see the reason.

**Back to EOD Report:** A **← Back to EOD Report** link at the top of this page takes you directly back to the business End-of-Day report page.

---

### Manager — Dashboard Widget

On the main **Dashboard**, managers see a compact **Salesperson EOD Status** widget showing:

- **X / Y submitted** — how many salespersons have submitted out of the total required.
- A progress bar: green (all submitted), amber (some pending), red (deadline passed with missing reports).
- A **View all →** link that opens the full Manager EOD View.

The widget only appears when **Salesperson EOD** is enabled for the business and the logged-in user has the **Can Close Books** permission.

---

### Manager — EOD Integration (Auto-Fill & Blocking Save)

When salesperson EOD is enabled, a **Salesperson EOD Reports** section appears on the End-of-Day report page, above Till Reconciliation. It shows:

- A progress bar (green = all done, amber = some pending).
- Each salesperson's name, status, cash total, EcoCash total, and submission time.
- An **Open EOD Manager →** link to jump directly to the Manager EOD View.
- An **Override** button for any salesperson whose report is overdue from a past date.

**Auto-fill of Cash Counted:**

When all salespersons have submitted (or been overridden), the **Cash Counted** field in the Till Reconciliation section is **automatically filled** with the combined cash total from all salesperson submissions. A note "✓ Auto-filled from salesperson EOD submissions — edit if different" confirms this. You can override the auto-filled value by typing directly in the field.

**Blocking Save:**

The Save & Lock buttons are blocked until all salesperson statuses show **Submitted** or **Overridden**. To unblock: either wait for the salesperson to submit, or click **Open EOD Manager →** and use the **Override** button.

---

### Manager — Saved (Locked) EOD Report — Salesperson Breakdown

When an EOD report is saved and locked, the full salesperson submission breakdown is permanently captured inside the report.

**Where:** Reports → Saved Reports → View any locked EOD report.

The **Salesperson EOD Submissions** section in a saved report shows:

**Status badge at the top:**

| Badge | Meaning |
|-------|---------|
| ✅ **ALL CLEAR** (green) | All salespersons submitted, no cash discrepancy |
| ⚠️ **ISSUES FOUND** (red) | One or more problems detected — see flags below |

**Issue flags (shown when relevant):**

| Flag | Meaning |
|------|---------|
| ⛔ Red alert | One or more salespersons did not submit before books were closed |
| ⚠️ Amber alert | One or more reports were submitted via manager override |
| ❌ / 💰 Cash discrepancy | The manager's Cash Counted differs from the salespersons' combined cash total — shows exact shortfall or overage |

**Per-person table:**

| Column | Meaning |
|--------|---------|
| **Salesperson** | Staff member's name |
| **Status** | Submitted / Override / ⛔ Not submitted |
| **Cash** | Cash amount they declared |
| **EcoCash** | EcoCash amount they declared |
| **Submitted** | Time of submission |
| **By** | Who submitted — shows "(mgr)" when a manager submitted on their behalf |

Rows with **⛔ Not submitted** status are highlighted red. The totals row at the bottom sums submitted records only.

This breakdown is permanently locked with the report and cannot be changed after saving.

---

### Manager — Discrepancy Report

**Where:** Sidebar → **Reports → EOD Discrepancy**

This report compares what salespersons declared against what the POS system recorded.

**Daily Tab:**

| Column | Meaning |
|--------|---------|
| **Date** | Report date |
| **Salesperson** | Name of the staff member |
| **SP Cash** | Cash total from the salesperson's submission |
| **SP EcoCash** | EcoCash total from the salesperson's submission |
| **System Cash** | Cash recorded in the system EOD for that day |
| **System EcoCash** | EcoCash recorded in the system EOD |
| **Cash Variance** | SP Cash − System Cash (red if negative, green if positive) |
| **EcoCash Variance** | SP EcoCash − System EcoCash |

**Colour coding:**
- **Green** — Salesperson declared more than the system recorded (over-declaration).
- **Red** — Salesperson declared less than the system recorded (shortfall).
- **No highlight** — Figures match exactly.

**Filtering:**
- Use **From / To** date pickers to select a date range.
- Click **Export CSV** to download the data for further analysis.

---

**Summary Tab (Weekly / Monthly):**

Switch to the **Summary** tab and choose **Weekly** or **Monthly** grouping to see aggregated variances over time.

Each row shows:
- **Period** — week starting date or month name.
- **Reports** — number of individual daily reports in that period.
- **Total SP Cash / SP EcoCash** — sum of declared amounts.
- **Total Sys Cash / Sys EcoCash** — sum of system amounts.
- **Cash Variance / EcoCash Variance** — total difference for the period.
- **Trend arrow** — ↑ variance increased vs prior period, ↓ decreased, → unchanged.

Summary stat cards at the top show totals for the selected date range.

---

### Admin — Enabling Salesperson EOD

**Where:** Business Settings → EOD Settings (or Admin → Business Config)

| Setting | Description |
|---------|-------------|
| **Require Salesperson EOD** | Toggle ON to activate the feature for this business |
| **EOD Deadline Time** | The cut-off time by which reports must be submitted (e.g. `18:00`). Today's pending record is hidden from the salesperson's history list until this time passes. |

Once enabled, the Submit Daily Report and My EOD History links appear in salespersons' (and grocery-associates') sidebars, and the Manager EOD View / EOD Discrepancy links appear for managers.

---

### Troubleshooting

| Issue | Solution |
|-------|---------|
| "Submit Daily Report" not in sidebar | Feature may not be enabled for this business, or your role is not recognised. Ask your admin to turn on **Require Salesperson EOD** in Business Settings and verify your membership role |
| EcoCash field shows $0.00 | No EcoCash sales were recorded since your last submission. If you believe there were EcoCash sales, ask a manager to check the POS records |
| Submit button is greyed out | The system is still fetching the EcoCash total — wait a moment for it to load, then the button will enable |
| Report already submitted — can't change figures | Ask a manager to use the **Override** button on the Manager EOD View page to correct the amounts |
| EOD Save button blocked | The Salesperson EOD section on the EOD report page shows who is still Pending. Click **Open EOD Manager →** and use Override to unblock |
| Cash Counted did not auto-fill | Auto-fill only triggers when **all** salespersons have submitted or been overridden, and Cash Counted is still empty. If one person is still Pending, auto-fill waits |
| EcoCash codes show "—" in the Save modal | Those transactions were processed before automatic code capture was enabled. All new transactions will show their codes correctly |
| Discrepancy report shows no data | Ensure the date range includes dates where both salesperson reports AND system EOD saves exist |
| Dashboard widget not visible | Widget only shows for users with **Can Close Books** permission when the feature is enabled |
| Saved report shows no Salesperson section | The salesperson section only appears in reports saved after this feature was enabled. Older locked reports do not have the breakdown |

---

*For technical support, contact your system administrator.*

---

## 31. Restaurant Delivery Service

> **Who reads this:** Restaurant cashiers and sales staff who take phone-in orders, managers who dispatch drivers and review delivery reports, and delivery drivers who fulfil runs.

The Restaurant Delivery Service lets the restaurant accept phone-in orders, track delivery status from Pending through to Delivered, manage per-customer prepaid credit accounts, dispatch named drivers with vehicle and odometer tracking, print kitchen + customer receipts, and fully reconcile cash collected by drivers.

**Delivery window:** 12:00 PM – 2:00 PM daily (informational — orders outside this window show a warning but are not blocked).

---

### Overview — How It Works

```
Customer calls in → Staff creates delivery order in POS
  → New customer created on the fly if needed
  → Credit deducted automatically (if available)
  → Two receipts auto-print: Kitchen copy (with items + barcode) + Customer copy

Manager prints Driver Sheet before dispatch
  → Staff or manager assigns orders to a delivery run
  → Driver takes the sheet, leaves customer receipt at each stop, collects cash

Driver returns → Manager marks orders Delivered
  → Staff or manager records cash collected per order
  → Payments page reconciles total due vs collected

Manager closes run → odometer end saved, run marked complete
```

---

### Cashier / Staff — Taking a Delivery Order

1. Open the restaurant POS.
2. Select **Delivery** as the order type (alongside Dine-In / Takeaway).
3. Search for the customer by name or phone number, **or** click **New Customer** to register them on the spot — enter their name and phone number, then click **Create & Select**. Phone numbers are formatted automatically as you type.
   - **Credit badge:** Any customer with a delivery credit balance shows a green **$X.XX credit** badge next to their name in the search dropdown. This lets you confirm the balance at a glance without opening the account. Blacklisted customers show a red **Blocked** badge instead.
4. Add items to the cart as normal.
5. (Optional) Enter a **Delivery Note** — address or special instructions.
6. The customer panel shows their **delivery credit balance** and blacklist status:
   - If blacklisted → checkout is blocked; reason is shown.
   - If outside 12–2 PM → amber warning banner (order is not blocked).
7. At checkout, the credit deduction preview shows: **"Credit: −$X.XX | Due on delivery: $X.XX"**
8. Complete the sale. Two receipts print automatically:
   - **Kitchen copy** — full item names and quantities, no prices, "DELIVERY" header, plus a scannable barcode (`DEL-XXXX`) matching the order.
   - **Customer copy** — full receipt with credit used, balance due, remaining credit, and the barcode. This receipt stays with the customer.

#### Paying the Remainder with EcoCash (Credit + EcoCash Split)

If a customer's credit only partially covers the order total, you can collect the remainder via EcoCash at the POS:

1. At checkout the credit section shows the amount being applied and the **remaining balance due**.
2. Select **EcoCash** as the payment method.
3. Enter the EcoCash reference code.
4. Click **Complete Sale**.

The EcoCash fee is calculated **only on the remainder** (not the full order total). For example, if the order is $51.84 and the customer has $45.00 credit, EcoCash is charged on $6.84 — the fee is a fraction of what it would be on the full amount.

What the **customer receipt** shows:
```
CREDIT PAYMENT
  Opening balance      $45.00
  Credit applied      -$45.00
  Remaining balance    $0.00

Payment: EcoCash + Credit
  EcoCash Ref: XXXX
  EcoCash charged      $6.84
  EcoCash Fee          $0.24
  EcoCash Total        $7.08
```

What the **delivery copy** (printed at POS) shows:
```
** PAID **
Credit + EcoCash $7.08
```

The delivery copy confirms the order is fully settled — the driver does not need to collect any cash on delivery.

---

### Manager — Customer Credit Accounts

**Where:** Sidebar → **Delivery → Customer Accounts**

Each customer can have a delivery credit account. Credit is pre-loaded by management and deducted automatically at checkout.

The page opens with a **Customer Balances** list showing all customers who currently have a credit balance, sorted highest first. Each row shows name, phone, and balance.

**Quick top-up from the list:**
1. Find the customer in the Customer Balances list.
2. Click **+ Top Up** next to their row.
3. Enter the amount and optional notes, then click **Add Credit**.
4. The balance on the row updates immediately — no page reload.

**Adding credit via search (including new accounts):**
1. Use the **Find Customer** search box to look up by name or phone.
2. Click the customer to open their account detail.
3. Click **Add Credit**, enter the amount and notes, then save.
4. The Customer Balances list updates instantly — if the customer was not previously on the list (first ever top-up), they are added automatically. No page reload required.

**Partial credit:** If a customer's credit is less than their order total, available credit is deducted and the remainder is collected on delivery.

**Blacklisting a customer:**
1. Open the customer's account page (via Find Customer).
2. Click **Blacklist Customer**.
3. Enter the reason (required).
4. Save. The customer is immediately blocked from placing delivery orders.

To lift a ban: click **Remove from Blacklist** on the same page.

---

### Manager — Delivery Queue

**Where:** Sidebar → **Delivery → Delivery Queue**

Shows all delivery orders for today grouped by status:

| Status | Meaning |
|--------|---------|
| **Pending** | Order received, not yet prepared |
| **Ready** | Kitchen has prepared the order |
| **Dispatched** | Order is with the driver on a run |
| **Delivered** | Driver has returned and delivery is confirmed |
| **Cancelled** | Order was cancelled before preparation |

**Who can advance status:**

| Transition | Who can do it |
|------------|--------------|
| Pending → Ready | Staff with `canUpdateDeliveryStatus` or manager |
| Ready → Dispatched | Staff with `canUpdateDeliveryStatus` or manager |
| Dispatched → Delivered | **Managers only** (`canManageDeliveryRuns`) |
| Cancel (Pending only) | **Managers only** |

**Date restrictions on status changes:**

| Role | Allowed date range |
|------|--------------------|
| Staff | **Today only** — cannot change status on orders from a previous day |
| Manager / Owner | Up to **5 days back** — older orders are locked |

If you try to update a status outside your allowed range, the system will return an error with a clear message. This prevents accidental late edits or back-dated changes.

**Viewing past orders:** Use the date filter to see historical orders and runs.

---

### Reverting Status (Correcting Errors)

Managers can reverse a status change if a mistake was made:

1. Find the order card on the Delivery Queue page.
2. Click **↩ Revert to [Previous Status]** (amber button, managers only).
3. Enter a **reason** — this is mandatory and is recorded in the audit log.
4. Click **Confirm**.

The status steps back one level: Delivered → Dispatched → Ready → Pending.

> **Lock rule:** If a Delivered order already has payment collected recorded, the revert button is hidden and the status is permanently locked. This prevents altering records after cash has been reconciled.

**Cancelling an order** (Pending only):
- Click **Cancel Order** (red button, managers only) on any Pending order.
- Enter a reason. If the customer had credit applied, it is automatically restored to their account.
- A cancelled delivery order is **excluded from all sales and EOD reports** — the underlying sale record is voided automatically so it does not inflate revenue figures or appear in end-of-day totals.

---

### Status History & Audit Trail

Every status change — including who made it, when, and the reason — is permanently recorded.

To view the history of any order:
1. Click the **🕐 clock icon** on the order card.
2. A history panel opens showing each transition: `FROM → TO`, the staff member's name, the timestamp, and the reason given.

This log cannot be edited or deleted.

---

### Printing — Driver Sheet & Kitchen Batch

Three print options are available on the Delivery Queue toolbar:

| Button | Who can use | What it prints |
|--------|------------|---------------|
| **Driver Sheet (A4)** | Staff + Managers | A4 browser-printable sheet: all active orders with customer names, phones, notes, amount due, checkbox column, and collected $ lines. Includes driver/vehicle blank fields and signature lines. |
| **Driver Sheet (Thermal)** | Staff + Managers | Same content printed to the receipt printer as a single continuous roll. Orders are separated by a `- - - FOLD HERE - - -` fold line (no paper cut between orders). Driver tears off the roll and folds at each line for easy handling. |
| **Print Kitchen Batch** | Managers | Sends a kitchen receipt for every Pending order — each showing the full item names, quantities, delivery note, and order barcode. |

**Recommended workflow:**
1. Print the **Driver Sheet (Thermal)** before dispatch — driver carries the roll.
2. At each stop the driver leaves the **customer receipt** (printed at POS), collects cash, and marks the order as done on the sheet.
3. On return the manager marks each order **Delivered** and records cash collected.

---

### Manager — Creating a Delivery Run

1. On the Delivery Queue page, click **Create Run**.
2. Select the **Driver** (from registered employees).
3. Select the **Vehicle** (from vehicle management) or enter the plate number manually.
4. Enter the **Odometer Start** reading.
5. Assign orders to the run — tick the orders the driver will deliver.
6. Click **Dispatch**. The orders move to **Dispatched** status.
7. A run sheet is sent to the receipt printer automatically on dispatch.

**Closing a run:**
1. When the driver returns, open the run.
2. Enter the **Odometer End** reading.
3. Click **Complete Run**.

---

### Collecting & Recording Cash — Payments Page

**Where:** Delivery Queue → **Payments** button (green, top right)

After orders are marked Delivered, managers or staff record the cash actually collected from each order:

1. Open the Payments page and select the date.
2. Find any order showing **"+ Record"** in the Collected column.
3. Click **+ Record** to open an inline input field.
4. Type the amount received and press **Enter** (or click ✓).
5. The amount is saved and the person who recorded it is stored against the order.

The page shows:
- **Total Due** — sum of all delivered ON_DELIVERY orders
- **Collected** — cash recorded so far
- **Shortfall** — difference (shown in red if > $0)
- **Recorded by** — the staff member who entered each collection amount (shown in the Notes column)

Previously recorded amounts can be updated by clicking on the displayed amount.

---

### Manager — Delivery Reports

**Where:** Sidebar → **Delivery → Reports**

Four report types available:

| Report | What it shows |
|--------|--------------|
| **Delivery Sales** | Orders, revenue, credit used, cash to collect — by date range |
| **Customer Credit** | Per-customer top-up and deduction history, current balance |
| **Blacklist** | All bans — customer, reason, banned by, date, lifted date |
| **Driver Runs** | Per run: driver, vehicle, odometer start/end, distance, orders delivered, cash collected |

---

### EOD Integration — Delivery Prepayments

When a customer tops up their delivery credit account with cash, that cash goes into the till. The End-of-Day cash reconciliation automatically includes **Delivery Prepayments** as a separate line item in the expected cash calculation.

On days with no credit top-ups the line is hidden to keep the EOD clean.

---

### Permissions

All delivery permissions are individually toggleable in **User Management → Edit Permissions → Delivery Service** for any restaurant staff member.

| Permission | What it controls |
|------------|-----------------|
| `canViewDeliveryQueue` | See the delivery management page |
| `canCreateDeliveryOrders` | Place delivery orders at the POS |
| `canUpdateDeliveryStatus` | Mark Ready / Dispatched; print driver sheets; create customers on the fly |
| `canManageDeliveryRuns` | Create runs, assign driver + vehicle, enter odometer; **mark Delivered**; revert / cancel orders |
| `canManageDeliveryCredit` | Top up customer delivery credit accounts |
| `canManageDeliveryBlacklist` | Ban or unban customers from delivery |
| `canViewDeliveryReports` | Access delivery reports and Payments page |
| `canPrintDeliveryMarketing` | Print delivery marketing materials |

> **Key distinction:** Only users with `canManageDeliveryRuns` (managers) can mark an order Delivered or revert/cancel status changes. Staff with `canUpdateDeliveryStatus` (e.g. salesperson/cashier) can move orders from Pending → Ready → Dispatched and print driver sheets, but the final delivery confirmation belongs to the manager.

To grant or change individual permissions:
1. Go to **Business Settings → Members**.
2. Click the employee.
3. Open the **Permissions** tab.
4. Scroll to **Delivery Service** and toggle the required permissions.

---

### Marketing Materials

**Where:** Sidebar → **Delivery → Marketing**

Two printable templates for promoting the delivery service:
- **A5 Flyer** — featured menu items (live from the active menu), delivery hours, restaurant name and phone number.
- **Business Card** (4-up on A4 for cutting) — bold "Order by phone" call-to-action with delivery hours and contact details.

Click **Print** on either template to send directly to your printer. Navigation is hidden in print mode.

---

### Troubleshooting

| Issue | Solution |
|-------|---------|
| Delivery order type not showing in POS | Feature requires the restaurant business type — contact your admin |
| "Insufficient permissions" when creating a new customer | User needs `canUpdateDeliveryStatus` or higher delivery permission |
| Checkout blocked — "Customer is blacklisted" | Management must lift the ban on the Customer Accounts page before the order can proceed |
| Receipts didn't print automatically | Check printer connection and QZ Tray status; use "Reprint" on the order detail page |
| Kitchen copy shows "Item x2" with no name | The product may not be linked to a menu item — check the product variant in the menu |
| "Mark Delivered" button not showing | Only managers with `canManageDeliveryRuns` see this button |
| Revert button not showing on Delivered order | Payment has already been collected — the status is locked to protect financial records |
| Driver Sheet (Thermal) not printing | No printer configured — set up your receipt printer via QZ Tray Setup on the delivery page or your profile |
| Barcode scan didn't open status modal | Ensure the barcode is a `DEL-` delivery barcode, not a product or customer barcode |
| Run Sheet not printing | Confirm orders have been assigned to the run before clicking Print Run Sheet |

---

## 32. Business Asset Management

> **Who reads this:** Business owners and managers who want to track physical and digital assets, record depreciation, log maintenance history, and manage asset disposal.

Asset Management is available to all business types. It tracks every asset from purchase through to disposal, calculates book value over time using straight-line or declining-balance depreciation, and produces financial reports on asset values, maintenance costs, and disposals.

**Access:** Sidebar → **Assets**. Requires the **Manage Assets** permission.

---

### Overview — Asset Lifecycle

```
Add Asset → Record Depreciation (monthly / annually) → Log Maintenance
                                                    ↓
                                              Dispose Asset
                                  (Sale | Gift | Trade-In | Scrap | Write-Off)
```

---

### Adding an Asset

1. Go to **Assets** in the sidebar.
2. Click **Add Asset**.
3. Fill in the details:

| Field | Description |
|-------|-------------|
| **Name** | Descriptive name (e.g. "HP LaserJet 4015") |
| **Category** | Select from the list (Vehicles, Office Equipment, Furniture, IT Equipment, Machinery & Tools, Land & Buildings, or any custom category) |
| **Serial Number** | Optional — useful for warranty and insurance claims |
| **Location** | Where the asset is kept (e.g. "Head Office", "Store Room") |
| **Purchase Date** | Date acquired |
| **Purchase Price** | Amount paid |
| **Depreciation Method** | Straight-Line, Double-Declining Balance, or None |
| **Useful Life (years)** | How many years before the asset reaches its salvage value |
| **Salvage Value** | Estimated residual value at end of useful life |

4. Click **Save**. The system auto-generates a unique **Asset Tag** (e.g. `RST-AST-0001`) for labelling.

---

### Depreciation Methods

| Method | How it works | Best for |
|--------|-------------|---------|
| **Straight-Line** | Equal amount each year: (Purchase − Salvage) ÷ Useful Life | Furniture, equipment with steady wear |
| **Double-Declining Balance** | 2× straight-line rate on current book value each year; front-loads depreciation | Vehicles, IT equipment (lose value quickly) |
| **None** | Book value never changes | Land, collectibles |

Depreciation is **manually triggered** — the system calculates the amount but you choose when to record each period. This keeps your records under your control.

---

### Recording Depreciation

1. Open the asset detail page (click any asset in the list).
2. Click **Record Depreciation** (in the footer action bar or on the Depreciation History tab).
3. Select the **Period Date** (typically the last day of the month or year).
4. The calculated amount is pre-filled — override it if needed.
5. Add optional notes.
6. Click **Save**. The book value updates immediately.

The **Depreciation History** tab shows all past entries. Entries cannot be edited or deleted — they are an append-only audit trail.

The **Details** tab shows a projected depreciation schedule for future periods.

---

### Logging Maintenance

1. Open the asset detail page.
2. Click **Log Maintenance** (or go to the **Maintenance** tab and click **Add Maintenance**).
3. Fill in:

| Field | Description |
|-------|-------------|
| **Date** | When maintenance was performed |
| **Type** | Preventive / Corrective / Inspection |
| **Description** | What was done |
| **Cost** | Optional — what was paid |
| **Vendor** | Who performed the work |
| **Next Maintenance Date** | Optional reminder for next scheduled service |

---

### Asset Photos

The **Photos** tab on the asset detail page lets you attach photos of the asset (useful for insurance and audits).

- Click **Upload Photo** to add an image.
- Click **Set as Primary** to make a photo the main display image.
- Click the bin icon to delete a photo.
- Click any photo to open a full-size lightbox view.

---

### Disposing of an Asset

When an asset is sold, gifted, traded in, scrapped, or written off:

1. Open the asset detail page.
2. Click **Dispose Asset**.
3. Select the **Disposal Method**: Sale / Gift / Trade-In / Scrap / Write-Off.
4. Enter the **Disposal Date** and **Sale/Trade Value** (for Sale or Trade-In).
5. Enter the **Recipient** (for Gift or Sale).
6. Review the **Gain/Loss on Disposal** (disposal value vs current book value).
7. Click **Confirm Dispose**.

> **This action cannot be undone.** The asset status changes to Disposed and it no longer appears in the active asset list.

---

### Asset Register Page

The main `/assets` page shows:

- **Summary bar**: Total assets, total book value, assets with low book value, assets disposed this year.
- **Filters**: Business (multi-business users), Category, Status (Active / Maintenance / Disposed / Written Off).
- **Search**: by name, asset tag, or serial number.
- **Table**: Asset Tag | Name | Category | Purchase Price | Book Value | Status | Purchase Date.

Click any row to open the asset detail page.

---

### Reports

**Where:** Assets page → **Reports** tab

| Report | What it shows |
|--------|--------------|
| **Asset Value by Category** | Total book value grouped by asset category |
| **Depreciation Summary** | Total depreciation charged YTD and cumulative since purchase |
| **Disposal Report** | All disposed assets with gain/loss calculation — filter by date range |
| **Maintenance Cost Report** | Total maintenance spend per asset and per category |

---

### Managing Categories

**Where:** Sidebar → **Assets → Manage Categories**

Six system-wide default categories are provided (read-only). You can create custom categories specific to your business with default depreciation settings so new assets in that category are pre-configured.

---

### Permissions

The **Manage Assets** permission controls full access to the Assets module (view, create, edit, depreciate, dispose). Owners and Managers have this permission by default. It can be enabled per employee via the Permissions editor.

---

### Troubleshooting

| Issue | Solution |
|-------|---------|
| Assets link not visible in sidebar | Account needs the **Manage Assets** permission — ask your admin |
| "Record Depreciation" button greyed out | Asset may already be disposed, or depreciation method is set to "None" |
| Book value went below salvage value | The system warns if an entry would do this — override only if intentional |
| Asset tag not printing | Use the barcode label printing feature (reuse existing barcode templates) — tag format: `{BUS-TYPE}-AST-NNNN` |
| Photos tab not showing | Photos feature requires the asset to be saved first |

---

## 33. Inventory Expiry Tracking

> **Who reads this:** Stock managers, purchasing officers, and any staff responsible for managing perishable inventory. Also relevant to managers who authorize disposing of or discounting expired stock.

Expiry Tracking lets you record the expiry date for each batch of stock received, see real-time alerts when batches are near expiry or have expired, and take action — either dispose of the stock (records an EXPIRED movement) or create a discounted product that appears in the POS with an "Expiry Deal" or "BOGO" badge.

---

### Overview — How It Works

```
Stock received → Record batch with optional expiry date
                  (Custom Bulk Top-Up, Quick Stock Modal, or Bulk Stocking Panel)

System monitors expiry dates:
  → Within 7 days: 🟡 Near Expiry alert
  → Past expiry: 🔴 Expired alert

Manager takes action per batch:
  → Dispose: records EXPIRED stock movement, reduces qty
  → Price Reduction: creates new product at discounted price with "Expiry Deal" badge
  → BOGO: creates new product at 50% price with "BOGO" badge
```

---

### Recording Expiry Dates at Intake

Expiry dates are entered when stocking inventory. They are **optional** — if omitted, a batch row is still created (for intake history) but no expiry alert is generated.

**Custom Bulk Top-Up:**
- The bulk entry table has an **Expiry Date** column per row.
- Each line item creates its own batch. The same product can have multiple batches with different expiry dates.

**Quick Stock Modal:**
- An **Expiry Date** date field is available alongside the quantity field.

**Bulk Stocking Panel:**
- An **Expiry Date** column is available in the stocking table rows.

---

### Dashboard Alert Widget

When any batches are near expiry or expired, a widget appears on the main **Dashboard**:

```
🔴  X batches EXPIRED — Requires action
🟡  Y batches EXPIRING WITHIN 7 DAYS — Review soon
                [View All Expiring Items →]
```

- Counts are batch-level (one product with two expiring batches counts as 2).
- Widget is hidden when both counts are zero.
- Visible to users with **Can View Stock Alerts** or **Can Manage Expiry Actions** permission.
- Click the link to open the Expiry Management page.

---

### Expiry Management Page

**Where:** Sidebar → **Expiry**

**Needs Action tab** shows all unresolved batches that are expired or expiring within 7 days:

| Column | Meaning |
|--------|---------|
| **Barcode** | Product barcode |
| **Name** | Product name |
| **Batch Qty** | Units in this specific batch |
| **Expiry Date** | When the batch expires |
| **Status** | 🔴 "X days ago" (expired) or 🟡 "X days" (near expiry) |
| **Actions** | Dispose / Apply Discount buttons |

Row background: red for expired, amber for near-expiry.

**Resolved tab** shows the full action history — what was disposed or discounted, by whom, and when.

**Filters:** Filter by All / Expired / Expiring This Week, or search by product name or barcode.

---

### Taking Action on Expired Stock

#### Dispose

Use when the stock must be destroyed.

1. Click **Dispose** on the batch row.
2. Enter the **Quantity to Dispose** (up to the full batch quantity).
3. Add optional notes.
4. Click **Confirm Dispose**.

The system records an **EXPIRED** stock movement and reduces the product's inventory count by the disposed quantity. If the full batch quantity is disposed, the batch is marked Resolved.

---

#### Apply Expiry Discount — Price Reduction

Creates a new product at a reduced price that appears in the POS with an **"Expiry Deal"** badge.

1. Click **Discount** on the batch row.
2. Choose **Price Reduction**.
3. Enter:
   - **Quantity to move** — units to transfer to the discounted product.
   - **New price per unit** — the discounted selling price.
   - **New product name** — defaults to "{Original Name} - Expiry Deal".
4. The system auto-generates a new barcode (e.g. `EXP-2604-7291`).
5. Click **Apply**.

The source product's stock quantity reduces by the moved quantity. The new discounted product appears in inventory and the POS immediately.

---

#### Apply Expiry Discount — BOGO (Buy 1 Get 1)

Creates a new product at 50% of the original price with a **"BOGO"** badge.

1. Click **Discount** → **BOGO (Buy 1 Get 1)**.
2. Enter the quantity to move.
3. The price is calculated automatically at 50%.
4. Click **Apply**.

---

### Expiry Deal Indicators in the POS and Inventory

Products created via a discount action carry a visible badge throughout the system:

| Location | Badge |
|----------|-------|
| **Universal POS card** | Teal ribbon at the bottom: "Expiry Deal" or "BOGO" |
| **Grocery POS card** | Same teal ribbon |
| **Inventory list** | Teal pill badge next to the product name |
| **Product detail** | Info banner: "⚠️ Expiry-discounted product. [View original →]" |

These badges render only on discounted items; no change to the appearance of normal products.

---

### Inventory Item Batches View

On the **Inventory Item Detail** page (the insights panel), a **Batch History** section shows:
- All batches received for that item.
- Receipt date, quantity, expiry date (if set), and status (Active / Near Expiry / Expired / Resolved).

This gives a full picture of stock intake and expiry status without leaving the product record.

---

### Permissions

| Permission | What it controls |
|------------|-----------------|
| `canViewStockAlerts` | See expiry alerts on the dashboard and Expiry Management page |
| `canManageExpiryActions` | Take action — dispose or create discounted products |

Owners and Managers have both permissions by default. Supervisors and below do not — enable per employee via the Permissions editor if needed.

---

### Troubleshooting

| Issue | Solution |
|-------|---------|
| Expiry date field not visible in bulk entry | Ensure you are on the Custom Bulk Top-Up, Quick Stock, or Bulk Stocking Panel — not an older entry form |
| Alert widget not on dashboard | User needs `canViewStockAlerts` or `canManageExpiryActions` permission; also hidden when no batches are near/past expiry |
| "Dispose" / "Discount" buttons not showing | Requires the `canManageExpiryActions` permission |
| New discounted product not appearing in POS | Products sync on page refresh — reload the POS after creating the discount product |
| Batch shows as expired but stock was already sold | The batch quantity reflects what was received; sold units reduce the parent product's total stock, not individual batch quantities. Use Dispose to write off remaining physical stock |
| Expiry deal badge not showing on POS card | Confirm the product was created via the Discount action (has `isExpiryDiscount = true`). Manually created products will not have this flag |

---

## 34. Policy Management & Employee Acknowledgment

> **Who reads this:** Business owners, managers (creating and publishing policies), and all employees (reading and acknowledging policies).

---

### Overview

The Policy Management system lets you create, version, assign, and track employee acknowledgment of workplace policies — HR policies, safety rules, conduct standards, and any other documents that require a sign-off trail.

---

### Key Concepts

| Term | Meaning |
|------|---------|
| **Policy** | A document belonging to a specific business (e.g., Leave Policy, Code of Conduct) |
| **Version** | Each edit to a policy creates a new numbered version; previous versions are preserved |
| **Assignment** | A directive that tells one or more employees to read and acknowledge a specific version by a due date |
| **Acknowledgment** | The employee's recorded sign-off: timestamp, IP address, and confirmation they scrolled to the end |
| **Policy Template** | A pre-written starting-point (system-wide) you can copy from when creating a new policy |

---

### Manager — Creating and Publishing a Policy

1. Go to **Policies** in the sidebar (under your business section).
2. Click **New Policy**.
3. Fill in:
   - **Title** — e.g., "Leave & Absence Policy"
   - **Category** — HR, Safety, Conduct, Financial, IT, Operational, or Other
   - **Content** — write directly in the rich-text editor, or start from a **Template**
4. Click **Save as Draft** to keep it private, or **Publish** to make it live.

> Saving as Draft lets you review before employees can be assigned.

---

### Manager — Assigning a Policy

After a policy is published:

1. Open the policy and click **Assign**.
2. Choose the scope:
   - **Individual** — pick one specific employee or user
   - **Role** — all users with a given role (e.g., all Salespersons)
   - **All Staff** — everyone in the business
3. Set a **Due Date** (optional but recommended — triggers overdue tracking).
4. Click **Assign**.

Employees included in the assignment immediately see a banner on their dashboard and a **Policy** badge in the header.

---

### Manager — Tracking Acknowledgments

On the Policy detail page, the **Assignments** tab shows:

| Column | Meaning |
|--------|---------|
| Assigned To | Employee name / role target |
| Due Date | When acknowledgment is required by |
| Status | Pending / Acknowledged / Overdue |
| Acknowledged At | Timestamp of sign-off |

Export or print the acknowledgment list for compliance records.

---

### Manager — Waiving an Acknowledgment

If an employee cannot acknowledge (e.g., no system access), a manager can:

1. Open the assignment.
2. Click **Waive** next to the employee.
3. Enter a reason.

This records a waiver instead of leaving the item as overdue.

---

### Employee — Acknowledging a Policy

When a policy is assigned to you:

1. A red **Policy** badge appears in the top navigation bar showing the number of pending acknowledgments.
2. Click the badge or go to **My Profile → Policy Agreements**.
3. Open the policy — you must scroll to the bottom before the **Acknowledge** button activates.
4. Click **Acknowledge**. Your name, timestamp, and device details are recorded.

---

### Employee — Viewing Past Acknowledgments

In **My Profile → Policy Agreements**:

| Column | Meaning |
|--------|---------|
| Policy | Document title |
| Category | HR, Safety, etc. |
| Version | Which version you acknowledged |
| Acknowledged At | Date and time |
| Actions | View the document, Print signed summary |

**Print Signed Summary** opens a formatted page showing the policy title, your name, acknowledgment time, and a disclaimer — suitable for filing.

---

### Overdue Reminders

- If a policy has a due date **3 days away or less** and you have not yet acknowledged it, the system automatically sends a bell notification reminding you.
- Reminders are sent at most once per 24 hours per policy to avoid noise.

---

### Permissions

| Permission | Who has it by default | What it controls |
|------------|-----------------------|-----------------|
| `canManagePolicies` | Owner, Manager | Create, edit, publish, assign, and waive policies |
| *(all users)* | Everyone | View and acknowledge policies assigned to them |

---

### Policy Templates

System-wide policy templates are pre-written starting points. When creating a new policy:

1. Click **Use Template**.
2. Browse templates by category.
3. Select one — its content is copied into your new policy for editing.

Your customised copy is entirely separate from the template — edits you make do not affect the original.

---

### Managing Policy Templates (System Admins Only)

System administrators can create, edit, and manage all global policy templates via **Admin → Policy Templates**.

#### Creating a Template

1. Click **+ New Template**.
2. Fill in the **Title**, **Category**, and optional **Description**.
3. Write the **Content** — full HTML is supported.
   - Use `{{BUSINESS_NAME}}` anywhere in the content; it will be substituted with the actual business name when an employee views a policy created from this template.
4. Use the **Preview** tab to see how the rendered HTML will look (with `{{BUSINESS_NAME}}` shown as *[Your Business Name]*) before saving.
5. Click **Create Template**.

#### Editing a Template

1. Click **Edit** next to the template in the list.
2. Update any fields — Title, Category, Description, or Content.
3. Switch to the **Preview** tab at any time to review the rendered output before saving.
4. Click **Save Changes**.

> Changes to a template do not retroactively affect policies that were already created from it.

#### Deactivating / Restoring a Template

- Click **Deactivate** to hide a template from the template picker (it is soft-deleted — data is preserved).
- Click **Restore** to make it available again.
- Use the **Show inactive** checkbox to include deactivated templates in the list.

#### Filtering

- Search by **title** using the text box.
- Filter by **Category** (HR, Safety, IT, Finance, Code of Conduct, Other).

---

## 35. Salesperson Role — Access & Restrictions

> **Who reads this:** Business owners and managers setting up salesperson accounts.

---

### What a Salesperson Can and Cannot Do

The **Salesperson** role is designed for front-of-house staff who should access the POS but not management areas.

#### Business Homepage

When a salesperson navigates to a business homepage (grocery, restaurant, clothing, hardware, etc.), they are **automatically redirected to the POS** for that business. No financial summaries, inventory widgets, or management dashboards are shown.

#### Inventory

Salespersons can view the inventory list (read-only) but:

| Blocked | Why |
|---------|-----|
| ✏️ Edit and 🗑️ Delete buttons | Requires `canManageInventory` |
| Bulk Stock / Stock Take / Add New Item buttons | Requires `canManageInventory` |
| Stock Movements, Alerts, Analytics, Transfer History tabs | Requires `canViewInventoryReports` |
| Grocery Store Inventory Features panel | Requires `canManageInventory` |

#### Sidebar Links

| Link | Visible to Salesperson? |
|------|------------------------|
| Services | No — requires `canViewServices` |
| All management areas | Only what their permissions grant |

---

### Unlocking Individual Permissions

Every restriction above can be individually overridden per employee in the **Business Permission Modal**:

1. Go to **Business Settings → Members**.
2. Click the employee.
3. Open the **Permissions** tab.
4. Toggle the specific permission on.

| Permission Key | What it unlocks |
|----------------|-----------------|
| `canManageInventory` | Edit/delete items, Bulk Stock, Stock Take, Add Item |
| `canViewInventoryReports` | Movements, Alerts, Analytics, Transfer History tabs |
| `canViewServices` | Services link in the sidebar |
| `canAccessFinancialData` | Financial reports, metrics, snapshots |

---

### Grocery Associate Role & EOD Access

The **Grocery Associate** role behaves like a salesperson on grocery businesses. In addition to the standard salesperson restrictions, grocery associates:

- See the **Submit Daily Report** and **My EOD History** sidebar links when **Salesperson EOD** is enabled for the grocery business.
- Can submit and catch up their own EOD reports exactly as a salesperson would.
- Do **not** see management EOD links (Manager EOD View, EOD Discrepancy) unless granted **Can Close Books**.

---

### Other Restricted Roles

The same inventory restrictions apply to **Delivery Driver** and **Restaurant Associate** roles — they also default to `canViewInventoryReports: false` and `canViewServices: false`.

---

## 36. Manager Override Code

### Overview

The **Manager Override Code** is a personal 6-character security code that identifies a manager and authorises sensitive actions — starting with order cancellations. Every manager must set up their own code before they can approve any override request.

The code is stored as a one-way hash (it is never readable, even by system administrators). Only the manager who set it knows their own code.

### Setting Up Your Override Code

1. Open the **sidebar → Profile**.
2. Scroll down to the **Manager Override Code** section (visible only to users with manager permissions).
3. Click **Set Up Override Code** (or **Renew Code** if one already exists).
4. Enter a code that meets all four requirements:
   - Exactly **6 characters**
   - At least **one letter** (A–Z)
   - At least **one digit** (0–9)
   - **Not a recently used code** (last 12 months are blocked)
5. The composition bar turns green when all requirements are met. Click **Save Code**.

A green **Active** badge and the expiry date confirm the code is set.

### Code Expiry

Override codes expire after **30 days**. Five days before expiry, a bell notification appears reminding the manager to renew. After expiry the code is blocked — a new one must be set before overrides can be approved.

To renew: follow the same steps as setup. The old code is retired automatically.

### Permissions

Only users with the **Can Close Books** permission see the Manager Override Code section on their profile page.

---

## 37. Order Cancellation

### Overview

Any completed, paid order can be cancelled on the **same day it was placed**, before End-of-Day (EOD) is closed. Cancellations require a mandatory written reason and a manager's physical authorisation via their override code or employee card scan.

Both the cancellation and any denied/aborted attempts are logged in full — the audit trail cannot be edited or deleted.

### Who Can Initiate a Cancellation

Any logged-in staff member can start a cancellation request. A manager (someone with **Can Close Books** permission) must physically be present to authorise it.

### Staff Flow — Starting a Cancellation Request

Cancellations can be started from two places:

**From the POS receipt modal** (immediately after an order is completed):
- On the receipt that appears after payment, click **Cancel Order** (shown in red, below the Print button).

**From Order History**:
- Navigate to the business **Orders** page.
- Find the order (today's orders only — the Cancel button does not appear for older orders).
- Click **Cancel Order** on the order card.

**Step 1 — Enter a reason:**

A modal opens showing the order details and refund amount. If the order was paid by **EcoCash**, a fee notice explains the deduction (see EcoCash Refunds below). Enter a mandatory reason (minimum 10 characters) explaining why the order is being cancelled. Click **Request Manager Authorisation** when ready.

### Manager Flow — Authorising the Request

**Step 2 — Select manager and enter override code:**

The modal switches to the authorisation screen. The staff reason is shown read-only so the manager can review it. Two options to identify the manager:

**Option A — Manager name + code (keyboard entry):**
1. Click the **Select manager** search box and type the manager's name. A dropdown lists all eligible managers for this business.
2. Click the correct manager name to select them (the box turns green and shows "Manager selected").
3. Click the **Override code** field and type the 6-character code, then press **Enter** or click **OK**.
   - The OK button stays disabled until both a manager is selected and a code has been entered.

**Option B — Employee card scan:**
1. Have the manager scan their employee card using the barcode scanner. The system detects the scan automatically and identifies the manager without needing to use the dropdown or type anything.

After a successful code or card scan:
- The manager's name appears confirmed on screen.
- Two buttons appear: **Approve Cancellation** and **Deny Request**.

If the code is invalid, an error appears and the manager can retry. After **3 failed attempts** the input locks for the session.

**Step 3a — Approve:**

The manager clicks **Approve Cancellation**. The order is immediately cancelled and the refund amount is shown on the success screen. The customer-facing display also updates to show the cancellation and refund amount.

**Step 3b — Deny:**

The manager clicks **Deny Request** and must enter a mandatory denial reason. After confirming, the denial is logged and the modal closes. **The first denial is final** — the same order cannot be submitted for cancellation again with a different manager.

### EcoCash Refunds

EcoCash charges a fee on both the original payment and the refund. The net refund to the customer is:

```
Net refund = Order total − (2 × EcoCash fee)

Example:
  Order total   $88.51
  EcoCash fee    $0.51
  Fee deducted   $1.02  (2 × $0.51)
  Customer gets $87.49
```

This breakdown is shown in the modal **before** the manager authorises, so the customer can be informed. The customer-facing display also shows the breakdown after cancellation.

For Cash and Card orders, the full order total is refunded (no deduction).

### What Happens When an Order is Cancelled

- The order status changes to **Cancelled** and the payment status to **Refunded**.
- Stock levels are restored for the cancelled items (except restaurant orders — food cannot be returned to inventory).
- Loyalty points earned on the original order are reversed (deducted from the customer's balance).
- A debit entry is recorded in the business account ledger for the refund amount.
- The cancelled order is **excluded from EOD calculations** — it does not appear in daily sales totals, cash counts, or EcoCash figures.

### Constraints

| Constraint | Detail |
|------------|--------|
| Same-day only | Orders can only be cancelled on the day they were placed, before EOD is closed |
| Manager required | A manager with Can Close Books permission must be physically present |
| One cancellation per order | An order can only be cancelled once |
| Denial is final | Once a manager denies a request, no further attempts are permitted for that order |

### Customer Display

If a customer-facing display screen is connected, it automatically shows a cancellation confirmation when the order is cancelled — including the refund amount and EcoCash fee breakdown where applicable. The display clears after 10 seconds and returns to the normal idle screen.

---

## Receipt Watermarks — Reprints & Cancelled Orders

When a receipt is reprinted or belongs to a cancelled order, clear watermarks are added so the receipt cannot be confused with an original.

### Reprinted Receipts

Every time a receipt is reprinted from the **Orders** page or the receipt detail modal, a **RE-PRINT** watermark is added automatically:

- **Thermal printer (paper):** A header `*** RE-PRINT ***` is printed at the top of the receipt showing the reprint date/time and who reprinted it. A matching footer `*** RE-PRINT ***` followed by **THIS IS A REPRINTED RECEIPT — NOT VALID FOR RETURNS/EXCHANGES** appears at the bottom.
- **Screen preview:** A large diagonal red **RE-PRINT** watermark is overlaid on the receipt preview.

The receipt detail modal also shows a **Reprint History** section listing every reprint event — who did it and when.

### Cancelled Order Receipts

If a receipt is viewed or reprinted for an order that has been **cancelled and refunded**, an additional notice is printed at the top:

```
** ORDER CANCELLED / REFUNDED **
Refund amount: $XX.XX
Requested by: [Staff name]
Approved by: [Manager name]
```

This notice appears on both the thermal print-out and the screen preview so it is immediately clear to anyone reading the receipt that the order was voided.

---

## 38. Cancellation Reports

**Location:** Sidebar → Reports → **Order Cancellations**

**Access:** System Admin, users with Can Close Books, or users with Can Access Financial Data.

### Overview

The Cancellation Reports page provides a full audit of order cancellations and manager override attempts for a selected business and date range.

### Filters

- **Business** — select a specific business or All (umbrella)
- **Date range** — From and To date pickers; click **Apply** to refresh

### Summary Cards

| Card | Description |
|------|-------------|
| Total Cancellations | Number of approved cancellations in the period |
| Total Net Refund | Sum of all refund amounts paid out (net of EcoCash fees) |
| EcoCash Fees Lost | Total fees deducted across EcoCash cancellations |
| Cancellation Rate | Cancellations as a percentage of all orders in the period |
| Denial Rate | Denied attempts as a percentage of all decided attempts |

### Approved Cancellations Tab

A table of all successfully cancelled orders, showing:

| Column | Description |
|--------|-------------|
| Date | When the cancellation was processed |
| Order # | Original order reference |
| Payment | Cash or EcoCash |
| Gross | Original order total |
| Fee Deducted | EcoCash fee deducted (blank for cash orders) |
| Net Refund | Amount returned to the customer |
| Customer | Name and loyalty number (or "Walk-in" if no linked customer) |
| Phone | Customer phone if captured |
| Items | Hover the count to see the full item list snapshot |
| Staff Reason | Mandatory reason entered by the requesting staff member |
| Requested By | Staff member who initiated the cancellation |
| Authorised By | Manager who approved it |

Click **Export CSV** to download the full table.

### Override Attempt Log Tab

All override attempts — including approved, denied, aborted, and failed-code outcomes — are listed here. This tab is the complete audit trail.

| Column | Description |
|--------|-------------|
| Date | When the attempt occurred |
| Order # | Target order |
| Amount | Original gross order amount |
| Payment | Cash or EcoCash |
| Customer | Name and number if available |
| Outcome | APPROVED / DENIED / ABORTED / FAILED_CODE |
| Manager | Manager who entered the code (blank for FAILED_CODE) |
| Requested By | Staff who initiated |
| Staff Reason | Cancellation reason |
| Denial Reason | Manager's reason (DENIED outcomes only) |
| Items | Item snapshot (hover the count) |

Click **Export CSV** to download the full log.

### Troubleshooting

**Cancel Order button not visible on an order:**
- The order must be from today and have status Completed + payment status Paid. Orders from previous days cannot be cancelled.
- If EOD has already been closed for today, cancellations are also blocked.

**"Manager Override Code not set up" error:**
- The manager must set up their override code on their Profile page before they can authorise any override.

**"Override code expired" error:**
- The manager's code has passed its 30-day expiry. They must go to Profile → Manager Override Code → Renew Code before authorising.

**"Invalid code" error:**
- The code or scanned card does not match any active manager. Check that the correct code was entered. After 3 failed attempts the input locks for this session.

**"Cancellation denied — cannot retry" message:**
- Once a manager denies a cancellation request, it is final. No further attempts are permitted for that specific order. If the denial was in error, contact a system administrator.

---

## 39. Combo Payment Requests

> **Who reads this:** Staff who need to request multiple payments in a single bundled request (requesters), and cashiers or managers who approve and process those requests.

A **Combo Payment Request** lets you bundle several payment needs — grocery shopping, school fees, supplier payments, and more — into one structured request. A cashier reviews and approves the request, you spend the money, and then you mark each item paid as you go. Any remaining change is returned through a formal settlement step.

---

### Overview — How It Works

```
You create a request (DRAFT)
    ↓  Submit
Cashier reviews it (SUBMITTED)
    ↓  Approve                        ↓  Return for Edits
Request is funded (APPROVED)          You correct and re-submit (DRAFT)
    ↓  You spend and mark items paid
All items paid (PAID)
    ↓  You notify cashier of remaining change
Cashier confirms change received (SETTLED)
```

If only some items are funded, the status will be **PARTIALLY APPROVED** and you can still mark approved items as paid.

---

### Requester — Creating a Request

1. Go to **Expense Accounts** and open the account you want to draw from.
2. Click **New Combo Request**.
3. Enter a **Title** (required) — e.g. "July School Fees + Grocery Run".
4. Optionally add **Notes** for the cashier — e.g. "Fees must be paid by Friday".
5. Click **+ Add Section** to add a spending category:

| Section type | Use it for |
|---|---|
| **Grocery** | Supermarket or fresh produce shopping |
| **Monthly Contribution** | Recurring payments — clubs, SACCO, insurance |
| **School Fees** | Tuition, exam fees, school supplies |
| **Custom** | Anything else — give it a name |

6. Within each section, click **+ Add Item** and fill in:
   - **Description** (required) — what is being bought or paid
   - **Quantity** and **Unit** (optional) — e.g. "3 × bags"
   - **Estimated Amount** — how much you expect to spend
   - **Domain / Category / Sub-category** — expense classification. You can select these manually or click **✨ Suggest** to auto-classify based on the description (see below).
   - **Payee** — who is being paid (person, employee, supplier, business, or leave blank)
   - **Item Notes** — any extra details

> **✨ Suggest on combo items:** After typing a description, click **✨ Suggest** next to the Domain field. The system searches for matching expense categories and displays results in up to two sections — **matches within the selected domain** (if one is chosen) and **Other Categories** from across all domains. Selecting a result from either section fills in the Domain, Category, and Sub-category automatically. If no domain is selected, all results are shown as a flat list so you can discover the right classification from scratch.

7. Repeat for all sections and items. The **Grand Total** at the bottom updates automatically.
8. Click **Save Draft** at any time to save your work without submitting.

> **Tip:** You can re-open a saved draft any time from the Combo Requests list and continue editing before submitting.

---

### Requester — Submitting a Request

When your request is complete:

1. Click **Submit Request**.
2. The system saves the latest draft and opens a **Confirm Submission** panel at the bottom of the screen.
3. The panel shows the **Estimated Total** calculated from all your items.
4. If the actual amount you need differs from the sum (e.g. you know an item will cost slightly more), you can type a different value in the **Amount to Request** field.
5. Click **Confirm & Submit**.

The request is sent to the cashier queue. You will receive a notification when it has been approved or returned.

> **Note:** Once submitted you cannot edit the request. If changes are needed, the cashier must return it to you first.

---

### Cashier — Approving a Request

When a user submits a combo request, you receive a notification and it appears on the **Submitted** tab of the Combo Requests list.

1. Open the request to review all sections and items.
2. Check the account balance shown at the top — it must cover the requested amount.
3. Click **Approve Request**.
4. An approval panel opens showing each item with its estimated amount. You can:
   - Leave an item's amount unchanged to approve it in full.
   - Reduce an item's amount if the account cannot cover it or you want to limit it.
   - Set an item's amount to **$0** to mark it as **Not Funded** — the requester will not be able to mark that item as paid.
5. Optionally add an **Approval Note** (e.g. "Approved $45 for school fees only — grocery budget not available this week").
6. Click **Confirm Approval**.

The request status changes to **APPROVED** (all items funded) or **PARTIALLY APPROVED** (some items set to $0 or reduced). The requester is notified.

---

### Cashier — Returning a Request for Edits

If the request needs clarification or corrections before you can approve it:

1. Open the submitted request.
2. Click **↩ Return for Edits**.
3. An inline panel opens. Type your feedback in the **Return Note** field (minimum 10 characters — be specific so the requester knows what to fix).
4. Click **Confirm Return**.

The request goes back to **DRAFT** status. The requester receives a notification and sees a yellow banner at the top of the request showing your feedback.

---

### Requester — Editing a Returned Request

When a cashier returns your request:

1. Open the request — you will see a yellow banner: **"↩ Returned for edits by [Cashier Name]"** with the cashier's note.
2. Make the requested changes — you can edit the title, notes, sections, and items freely while the request is in DRAFT.
3. When ready, click **Submit Request** again (same confirmation panel as the first submission).

---

### Requester — Marking Items as Paid

Once your request is approved:

1. Open the approved request.
2. For each item you have spent money on, click **Mark Paid** next to that item.
3. A panel opens showing:
   - The item description
   - The approved amount
   - A **Paid Amount** field (defaults to the approved amount — change it if you spent a different amount)
   - A **Receipt Number** field (optional — enter the supplier's receipt or invoice number)
4. Click **Confirm**.

The item is marked as **Paid** and the total paid amount updates. Once all funded items are marked paid, the request moves to **PAID** status.

> **Not Funded items** (approved for $0) cannot be marked as paid.

---

### Requester — Requesting Settlement (Returning Change)

If you were approved for more than you actually spent, you must notify the cashier so they can collect the remaining change.

1. Open your **PAID** request. A **Remaining Balance** figure is shown (approved amount minus total paid).
2. Click **Request Settlement**.
3. An inline panel opens showing the exact amount to return, e.g. **$45.50 to return to cashier**.
4. Click **Notify Cashier**.

The status changes to **SETTLE REQUESTED**. The page automatically refreshes every 10 seconds while you wait. You will see a pulsing indicator: *"Awaiting cashier confirmation…"*

---

### Cashier — Confirming Settlement

When a requester notifies you of remaining change:

1. You receive a notification or can find the request on the **Settle Requested** tab of the Combo Requests list.
2. Open the request and review the **Remaining Balance** shown at the top.
3. Click **Confirm Change Received**.
4. A panel opens showing the amount to collect.
5. Optionally add a **Note** (e.g. "Received $45.50 in cash from John").
6. Click **Confirm Receipt**.

The request is marked **SETTLED**. The audit trail records who confirmed and when.

> **Note:** The Confirm Change Received button is never shown to the person who created the request — only to cashiers and admins.

---

### Cancelling a Request

Either the requester or a cashier can cancel a request that has not yet been fully paid or settled.

1. Open the request.
2. Click **Cancel Request**.
3. Confirm the cancellation in the dialog that appears.

The request is marked **CANCELLED**. All cashiers and admins are notified, and if someone other than the creator cancels it, the creator is also notified.

> Requests that are already **PAID** or **SETTLED** cannot be cancelled.

---

### Status Reference

| Status | What it means |
|---|---|
| **DRAFT** | Being built by the requester. Can be edited and re-submitted. |
| **SUBMITTED** | Waiting for cashier review. Cannot be edited by requester. |
| **APPROVED** | All items funded. Requester can start spending. |
| **PARTIALLY APPROVED** | Some items funded; others marked Not Funded. |
| **PARTIALLY PAID** | Some items marked paid; others still outstanding. |
| **PAID** | All funded items marked as paid. Settlement may be needed if change remains. |
| **SETTLE REQUESTED** | Requester has notified cashier of remaining change. Awaiting confirmation. |
| **SETTLED** | Change collected and confirmed. Request fully closed. |
| **CANCELLED** | Request voided before completion. |

---

### Permissions

| Action | Who can do it |
|---|---|
| Create & edit requests | Request creator (DRAFT status only); Admin |
| Submit | Request creator; Admin |
| Approve / Return for Edits | Cashiers with expense payment permissions; Admin |
| Mark items as paid | Request creator; Admin |
| Request settlement | Request creator (PAID status, remaining balance > $0); Admin |
| Confirm settlement | Cashiers with expense payment permissions; Admin (not the creator) |
| Cancel | Request creator; Cashiers; Admin |
| View all requests | Cashiers; Admin; Users granted full view access |
| View own requests only | Users granted restricted access (see Section 40) |

---

### Troubleshooting

**Submit button is greyed out:**
- The title field must not be empty.
- At least one item with a description is required.
- Save a draft first if you need to come back to it.

**"Only DRAFT requests can be edited" error:**
- The request has already been submitted. Ask the cashier to return it if changes are needed.

**Mark Paid button not visible on an item:**
- The item was approved for $0 (Not Funded) and cannot be marked as paid.
- The request is not in APPROVED, PARTIALLY APPROVED, or PARTIALLY PAID status.

**"Return note must be at least 10 characters" error:**
- Cashiers must enter a meaningful explanation when returning a request so the requester knows what to fix.

**Confirm Change Received button not visible:**
- You created this request. The settlement confirmation must be done by a different cashier or admin.

---

## 40. Expense Account — Restricted User Access

> **Who reads this:** Managers and admins who need to give staff members the ability to submit combo requests from a specific expense account, without giving them full cashier access to the whole system.

By default, only cashiers and admins can interact with expense accounts. The **Restricted Access** panel lets you grant named users a limited, account-specific permission set — for example, allowing a department head to submit their own combo requests without seeing anyone else's payments.

---

### Granting Access

1. Go to **Expense Accounts** and open the account you want to share.
2. Scroll to the **Restricted Access** section near the bottom of the account detail page.
3. Click **+ Grant Access**.
4. A form opens:

   **User** — search by name or email to find the person you want to grant access to.

   Then configure their permissions using the three toggles:

   | Toggle | Default | What it controls |
   |---|---|---|
   | **Can submit combo requests** | ON | The user can create and submit new combo payment requests from this account |
   | **Can only view own requests** | ON | The user sees only the requests they created — not other users' requests or the general payment history |
   | **Can view account balance** | OFF | The user can see the current account balance on the account page |

5. Click **Grant Access**.

The user appears in the active access list immediately. They receive a notification that access has been granted and the account will appear in their navigation.

> **Tip:** Leave "Can only view own requests" ON unless you specifically need the user to see the full payment history of the account.

---

### Managing Existing Access

The active access list shows each user's current permissions. You can adjust individual toggles at any time:

- Toggle **Can submit requests** to enable or disable their ability to create new requests without revoking all access.
- Toggle **Can only view own requests** to expand or restrict what they can see.
- Toggle **Can view balance** to show or hide the account balance for that user.

Changes take effect immediately.

---

### Revoking Access

To remove a user's access entirely:

1. Find the user in the active access list.
2. Click **Revoke Access** next to their name.
3. Their entry moves to the **Revoked Access** section (collapsed by default — click to expand and see the full history).

A revoked user immediately loses access to the account. Their past requests remain visible to cashiers and admins for audit purposes.

**Re-granting access:** If you revoke a user and later want to restore their access, click **+ Grant Access** and search for the same person. The system reactivates their record rather than creating a duplicate entry.

---

### Permissions

| Action | Who can do it |
|---|---|
| Grant / revoke access | Cashiers with expense payment permissions; Admin |
| Toggle individual permissions | Cashiers with expense payment permissions; Admin |
| View access list | Cashiers with expense payment permissions; Admin |
| Submit combo requests | Users granted "Can submit combo requests" permission |

---

### Troubleshooting

**User cannot see the expense account in their navigation:**
- Check that their access record is **Active** (not revoked) in the Restricted Access panel.
- Confirm the **Can submit combo requests** toggle is ON.

**User can see other users' requests when they should only see their own:**
- Ensure the **Can only view own requests** toggle is ON for that user.

**User reports they cannot see the account balance:**
- The **Can view balance** toggle is OFF by default. Enable it for that user in the access list.

---

*For technical support, contact your system administrator.*

---

## 41. Vehicle Renewal Receipts

### Overview

When you renew a vehicle's licences at the licensing office, you receive a printed receipt. The **Record Renewal Receipt** workflow lets you capture that receipt inside the system so all payment details, fee breakdowns, and the specific licences that were renewed are stored against the vehicle record.

Access: **Fleet Management → Vehicles tab → select a vehicle → Record Renewal Receipt button**.

---

### Recording a Renewal Receipt

1. Open Fleet Management and go to the **Vehicles** tab.
2. Click on the vehicle you are renewing.
3. Click **Record Renewal Receipt**.
4. Fill in the **Receipt Details** header section (see fields below).
5. Enter the **Payment Breakdown** (arrears, penalties, fees, total).
6. Switch between the **Registration**, **Radio / TV**, and **Insurance** tabs to record which licences were renewed and their new numbers and dates.
7. Optionally upload a scanned copy of the physical receipt.
8. Click **Save Receipt**.

The new receipt appears in the vehicle's renewal history, and the linked licences are updated with their new expiry dates.

---

### Payment Breakdown Fields

| Field | Description |
|---|---|
| Receipt Number | Reference number printed on the official receipt |
| Transaction Type | Defaults to "VEHICLE LICENSING"; edit if different |
| Date Paid | Date the payment was made at the licensing office |
| Currency | ZiG, USD, or ZWL |
| Payment Received By | Name of the official who processed the payment |
| Office of Issue | Name / code of the licensing office |
| Arrears | Any overdue amount included in the payment |
| Penalties | Late-payment penalties charged |
| Administration Fee | Admin processing charge |
| Transaction Fee | Any bank or system transaction fee |
| Surcharge / Debt Management | Additional charges (hidden if vehicle is exempt) |
| Deposit | Deposit amount paid |
| Total Paid | Grand total of the payment |
| Notes | Free-text notes |

Upload a scanned copy of the physical receipt using the **Scanned Receipt** upload field (PDF, JPG, or JPEG).

---

### Licenses Renewed

The renewal receipt form has three tabs — **Registration**, **Radio / TV**, and **Insurance**. On each tab you can specify:

| Field | Description |
|---|---|
| License Number | New licence number issued |
| Issuing Authority | Authority that issued the licence (ZINARA, ZIMRA, etc.) |
| Issue Date | Date the licence was issued |
| Expiry Date | Date the licence expires |
| Renewal Cost | Amount paid for this specific licence |
| Late Fee | Any late fee charged for this licence |
| Reminder Days | How many days before expiry to show a reminder (default: 30) |
| Usage | Description of use — Radio / TV tab only (e.g., "PRIVATE VEHICLE") |
| Exempt | Tick if this licence has been waived / exempted |

Only fill in the tabs for licences that were actually renewed on this receipt.

---

## 42. Vehicle Exemptions

### Overview

Some vehicles qualify for exemption from certain licensing fees — for example, vehicles exempt from radio/TV licence fees. The **Vehicle Exemptions** feature records the official exemption certificate details against a vehicle so renewal staff and auditors can see what is and is not payable.

Access: **Fleet Management → Vehicles tab → select a vehicle → Add Exemption**.

---

### Adding an Exemption

1. Open the vehicle detail.
2. Click **Add Exemption**.
3. Select the **Exemption Type** (Radio/TV Licence, Road Use, Insurance, or Other).
4. Set the **Start Date** and **End Date** for the exemption period.
5. Choose the **Exemption Reason** from the dropdown (e.g., "NO RADIO/TV FITTED") and optionally add a description.
6. Fill in the **Requested By** fields (name, email, contact number).
7. Fill in the **Data Capturing Official** fields (name, user ID, issue office, issue date).
8. Upload the exemption certificate document (PDF or image).
9. Click **Save Exemption**.

The exemption appears in the vehicle's exemption history. When an active exemption exists, the renewal receipt form automatically hides the surcharge / debt management field for the relevant licence type.

---

### Exemption Fields

| Field | Description |
|---|---|
| Exemption Type | Category of the exemption (Radio/TV, Road Use, Insurance, Other) |
| Start Date | Date from which the exemption is valid |
| End Date | Date on which the exemption expires |
| Exemption Reason | Standardised reason code (e.g., "NO RADIO/TV FITTED") |
| Reason Description | Free-text description of the reason |
| Requested By — Name | Name of the person who requested the exemption |
| Requested By — Email | Contact email |
| Requested By — Contact | Phone or other contact number |
| Data Capturing Official — Name | Name of the licensing office official |
| Login User ID | Official's login / system ID |
| Issue Office | Name or code of the issuing office |
| Issue Date | Date the certificate was issued |
| Certificate Document | Scanned PDF or image of the exemption certificate |
| Notes | Any additional notes |

---

## 43. Vehicle Licence Documents & Issuing Authorities

### Overview

When adding or editing a vehicle licence you can attach a scanned copy of the licence document and record the authority that issued it. Driver records also support attaching a copy of the driver's licence.

---

### Uploading a Licence Document

1. Open **Fleet Management → Vehicles tab** and select a vehicle.
2. Click **Add Licence** (or the edit icon on an existing licence).
3. In the licence form, scroll to the **Licence Document** section.
4. Click **Choose File** and select a PDF, JPG, or JPEG file, or drag and drop the file into the upload area.
5. The file name appears once uploaded. Click the **×** to remove and replace it.
6. Complete the rest of the form and click **Save**.

The document is stored against the licence record and can be viewed or downloaded from the licence detail at any time.

---

### Issuing Authorities

The **Issuing Authority** field on the licence form is backed by a shared list of known authorities (ZINARA, ZIMRA, etc.).

**Selecting an existing authority:**
- Click the **Issuing Authority** dropdown and type to filter the list.
- Select the authority.

**Adding a new authority:**
- If the authority is not in the list, click **+ Add new authority**.
- Type the name in the text field and press **Save**.
- The authority is saved to the shared list and selected immediately.

New authorities added by any user are available to all users going forward — each authority only needs to be added once.

---

### Driver Licence Documents

When registering a new driver you can attach a copy of their driving licence:

1. Go to **Fleet Management → Drivers tab** and click **Add Driver**.
2. Fill in the driver's details.
3. In the **Licence Document** section, upload a PDF, JPG, or JPEG copy of the licence.
4. Click **Save Driver**.

The document is stored against the driver's record and is visible in their detail panel.

---

### Permissions

| Action | Who can do it |
|---|---|
| Record renewal receipt | Users with Manage Vehicles permission |
| Add / edit vehicle exemption | Users with Manage Vehicles permission |
| Upload licence documents | Users with Manage Vehicles permission |
| Add issuing authority | Users with Manage Vehicles permission |
| Upload driver licence document | Users with Manage Drivers permission |
| View vehicle detail and documents | Users with Access Vehicle Module permission |

---

*For technical support, contact your system administrator.*

---

## 44. Stock Additions Report

> **Who reads this:** Store managers, purchasing staff, and business owners who need to track what inventory was received, when, from which suppliers, and by whom.

The **Stock Additions Report** shows every inventory receipt — bulk restocks, stock-take submissions, and individual add-stock operations — for a selected date range. It is available under **Grocery → Reports → Stock Additions**.

> **Note:** The report covers items with stock movement records. Items created before movement logging was introduced may not appear for the period before that date.

---

### Opening the Report

1. Go to **Grocery → Reports**.
2. Click the **🗃️ Stock Additions** card.
3. The report loads automatically showing the last **7 days**.

---

### Date Range Filters

Use the date-range pills at the top of the page to change the period:

| Pill | What it shows |
|------|---------------|
| **Today** | Movements recorded today only |
| **Yesterday** | Movements recorded yesterday only |
| **7 Days** | Last 7 days (default) |
| **30 Days** | Last 30 days |
| **All Time** | Every movement on record |

---

### Summary Cards

Below the date pills, four summary cards give a quick snapshot of the period:

| Card | Meaning |
|------|---------|
| **Movements** | Total number of stock-in events |
| **Units In** | Combined units received across all items |
| **Total Value** | Combined cost value of all received stock |
| **Suppliers** | Number of distinct suppliers involved |

---

### The Movements Table

Each row represents one stock addition event:

| Column | What it shows |
|--------|---------------|
| **Item** | Product name and SKU |
| **Category** | Product category |
| **Supplier** | Supplier the item is linked to (if set) |
| **Qty Added** | Number of units received in this event |
| **Unit Cost** | Cost per unit at time of receipt |
| **Total Cost** | Qty × Unit Cost |
| **Added By** | The employee who processed the receipt |
| **Date / Time** | When the movement was recorded |
| **Reference** | Purchase order or reference number (if entered) |

**Exporting:**
Click **Export CSV** (top right of the table) to download the current filtered view as a spreadsheet.

**Pagination:**
Results are paginated at 50 rows per page. Use the **Next / Previous** buttons at the bottom of the table to navigate.

**Zero results:**
If no stock was added in the selected period, the table shows an empty-state message. Try widening the date range.

---

### Dashboard Activity Feed — Stock Additions

Recent stock additions appear in the **Recent Activity** feed on the main Dashboard (visible to managers and owners). Each card shows:

```
📦  Stock Added  ·  [Business Name]
    [Qty] units of [Item Name] received      > View Report
    [Date / Time]
```

The feed shows stock additions from the **last 7 days** (up to 5 entries).
Clicking **View Report** navigates directly to the Stock Additions report filtered to the business and today's date.

---

### Permissions

| Action | Who can do it |
|--------|---------------|
| View Stock Additions report | Users with financial data access or manager role |
| Export CSV | Users with financial data access or manager role |
| See stock additions in dashboard feed | Managers and business owners |

---

## 45. Clothing POS — Live Sales Activity

> **Who reads this:** Clothing store cashiers, floor supervisors, and managers who want to monitor what is selling during the day without leaving the POS.

---

The Clothing POS displays real-time sales activity indicators directly on each product and bale card. These indicators update automatically after every sale and give staff an instant read on what is moving, what is slowing down, and what has sold out.

The POS browse panel has three tabs — **Bales**, **R710 WiFi**, and **Quick Add** — and all three show the same types of indicators.

---

### Sold-Today Badge

A small green badge appears on a product or bale when at least one unit of that item has been sold today.

```
Ladies Tops M    (2 left)   [ 3 sold ]   $5.00   [ Add ]
```

| Who can see it | Permission required |
|----------------|---------------------|
| Admins | Always visible |
| Managers / financials | Users with **financial data access** permission |
| Sales staff | Users with the **View POS Sold Count** permission |
| All other staff | Badge is hidden — they see stock counts only |

The number inside the badge is the total units sold **today** (since midnight in the store's local timezone). It updates immediately after each checkout without requiring a page refresh.

---

### Today vs Yesterday Progress Bar

Below each variant or bale row, a thin progress bar appears whenever any units have been sold today. The bar compares today's sales to yesterday's sales for that same item.

| Bar colour | Label | Meaning |
|------------|-------|---------|
| 🟢 Green | **Good** | Today's sales ≥ yesterday's sales |
| 🟡 Amber | **Fair** | Today's sales are 50–99% of yesterday's |
| 🔴 Red | **Low** | Today's sales are less than 50% of yesterday's |
| 🟢 Green | **New** | Sold today, but no sales yesterday to compare against |

The bar fills proportionally — if yesterday you sold 10 and today you have sold 10, the bar is 100% full and green. If today you have sold 5 out of yesterday's 10, the bar is 50% full and amber.

Yesterday's count is shown to the right of the bar (e.g. `yest: 8`) so staff can see the reference figure at a glance.

The progress bar is visible to **all users** regardless of permissions — it shows pace, not exact revenue figures.

---

### Bales Tab

Each bale card shows:

- **Items remaining** count
- **Sold-today badge** (permissioned) — how many individual pieces from this bale have been sold today
- **Progress bar** — today's piece count vs yesterday's piece count for this bale

Bales with the highest today's sales bubble to the top of the list, sorted by the time of their first sale today (earliest first). Bales with no sales today appear below.

After a sale, the bale's remaining count and badge update immediately in the UI without a page refresh.

---

### R710 WiFi Tab

Each WiFi package card (e.g. "1 Hour", "24 Hours", "Weekly") shows:

- **Available tokens** — how many pre-generated tokens are ready to sell
- **Sold-today badge** (permissioned) — tokens sold today from this package
- **Progress bar** — today's token count vs yesterday's

Packages with today's sales sort to the top. If a package is running low on available tokens (fewer than 5 remaining), a **Request More** button appears on the card — clicking it notifies the admin to generate more tokens.

---

### Quick Add Tab

Products pinned or available in Quick Add show the same badges and progress bars as Bales and WiFi. Each variant row within a product card displays:

- **Stock remaining** count (or **Out** in red when stock reaches zero)
- **Sold-today badge** (permissioned) — units of this specific variant sold today
- **Progress bar** — today vs yesterday comparison

**Sorting:** Pinned products (starred ★) always appear first. Among unpinned products, those with any variant sold today sort ahead of those with no sales, and within that group they are ordered by time of first sale today (earliest first).

**Sold-out variants stay visible** — if a variant's stock reaches zero but units were sold today, the row remains in the card so the sold-today badge and progress bar remain visible. The Add button is disabled and the count shows **Out** in red.

After a sale, the Quick Add tab updates the badge, progress bar, and stock count **immediately** — the sold count increments and the stock count decrements without waiting for a page refresh.

---

### Showing Hidden Sold-Out Items

By default the Quick Add tab hides products where **all variants have zero stock AND zero sales today**. These are items that are fully sold out and have not moved at all today — showing them would just be clutter.

When any products are hidden, a button appears in the Quick Add tab header:

```
[ Show 3 hidden ]
```

Clicking it reveals all hidden sold-out products, greyed out, with their Add buttons disabled. The button label changes to:

```
[ Hide 3 sold out ]
```

Click again to collapse them back.

**Why this is useful:** If a badge you expected to see is missing, click "Show hidden" to check whether the product is there but sold out. If the product does not appear even in the hidden list, it may need to be restocked or re-activated in Inventory.

---

### Permissions Summary

| Feature | Who sees it |
|---------|-------------|
| Sold-today badge (exact count) | Admin, financial data access, or View POS Sold Count permission |
| Progress bar (today vs yesterday pace) | All users |
| Stock count / "Out" label | All users |
| "Show hidden" toggle | All users |

---

## 46. Missing Cost Price Report

**Who can access:** Admins, users with Manage Inventory permission, or Expense Account access.

**Where:** Sidebar → Inventory → ⚠️ Missing Cost Price

This report lists every **active inventory item that has no cost price set**. Without a cost price, profit margin calculations and inventory valuation are incomplete.

### Summary Cards

| Card | Meaning |
|------|---------|
| 🔴 Missing Cost Price | Total active items with no cost price — the number you need to fix |
| 🟡 Businesses Affected | How many different businesses have at least one item missing a cost price |
| 🔵 Showing (filtered) | How many items are currently visible after applying filters |

### Filters

- **Business** — drop-down to limit the list to one specific business
- **Search** — type any part of an item name or SKU to narrow the list

### Table Columns

| Column | Description |
|--------|-------------|
| Business | Which business the item belongs to |
| Item Name | Product name and SKU (if set) |
| Category | Category emoji and name |
| Selling Price | Current selling price |
| Stock | Units currently in stock |
| Updated | Date the item record was last modified |

### Exporting

Click **Export CSV** (top-right) to download the filtered list as a spreadsheet. The button is disabled when the filtered list is empty.

### Fixing Items

Click any row to go directly to that item's edit page where you can add the cost price.

---

## 47. Payee Expense Insights

**Who can access:** Admins and users with financial data access.

**Where:** Expense Accounts → Reports → Payee Expense Insights

This report shows spending patterns broken down by payee group — how much has been paid to **Contractors** and **Suppliers** over any date range, with charts and a per-payee breakdown.

### Tabs

| Tab | Covers |
|-----|--------|
| Contractors | All persons/contractors who received expense payments |
| Suppliers | All business suppliers who received payments |

Click a tab to switch the entire report view to that group.

### Date Filter

- Use the date range pill at the top to pick a preset period (this month, last month, last 3 months, last year) or enter a custom date range.
- Check **All time** to remove the date restriction and see totals across all records.

### Summary Card (per tab)

Shows the total paid to that group in the selected period, the number of unique payees, and the payment count.

### Charts

| Chart | What it shows |
|-------|---------------|
| Spending by Group | Bar chart comparing total paid to Contractors vs Suppliers side-by-side |
| Top Payees | Horizontal bar chart of the top individual payees in the active tab, sorted by amount paid |
| Monthly Spending Trend | Line chart of total payments per calendar month for the active tab |

### Payee List

Below the charts, a searchable table lists every payee in the active group with their total paid and payment count. Click any row to jump to that payee's full payment history.

---

## 48. Supplier, Contractor & Payee Categories

The system supports a two-level category system — **groups** and **categories** — for classifying suppliers, contractors, and payees. These categories help with filtering, reporting, and organising who you work with.

### Structure

Each of the three areas (Suppliers, Contractors, Payees) has its own independent category hierarchy:

```
Group (e.g. "Building Materials")
  └─ Category (e.g. "Cement Suppliers")
  └─ Category (e.g. "Steel Merchants")

Group (e.g. "Transport & Logistics")
  └─ Category (e.g. "Fuel Suppliers")
```

### Where Categories Appear

- When adding or editing a **Supplier** — you can assign a supplier category from the drop-down.
- When adding or editing a **Contractor** (person/payee) — you can assign a contractor category.
- When adding or editing a **Payee** — you can assign a payee category.

### Managing Categories

Admins can manage the category groups and categories from the relevant settings pages. Categories are shared across all businesses — they are global reference data, not per-business.

### Why Use Categories?

- Filter the payee insights report by category to see spending patterns by supplier type
- Group contractors by trade (plumbing, electrical, construction) for organised reporting
- Classify payees so that expense reports are more meaningful

---

## 49. Edit Business Settings

**Who can access:** System admins and business owners with the appropriate permission.

**Where:** Admin → Businesses → Edit (pencil icon), or Business Settings page.

The Edit Business modal is arranged in two columns to make all settings accessible without excessive scrolling.

### Left Column

| Section | Fields |
|---------|--------|
| Basic Information | Business Name, Business Type (read-only when editing), Description |
| Contact & Location | Business Address, Business Phone |
| Rent Account | Manage or create the rent expense account for this business |
| Branding | Business Slogan, Show on Customer Display toggle, Default Landing Page |
| Receipt & Tax | Return Policy Message (printed on receipts), Enable Tax Calculation, Tax Included in Price, Tax Rate (%), Tax Label |

### Right Column

| Section | Fields |
|---------|--------|
| Features | Accepts Eco-Cash (+ fee config), Include Transport Cost in Pricing (+ distance/rate config), Require Salesperson EOD Report (+ deadline time), Enable Coupons, Enable Customer Promos |

### Branding

- **Business Slogan** — up to 200 characters. Displayed on receipts and, if toggled on, on the customer-facing display screen.
- **Show on customer display** — tick to show the slogan on the second screen (customer display). Untick to hide it.
- **Default Landing Page** — the page users land on after selecting this business. Options vary by business type (e.g. POS System, Dashboard, Inventory).

### Receipt & Tax

- **Return Policy Message** — printed at the bottom of every receipt. Leave blank for no policy message.
- **Enable Tax Calculation** — when ticked, tax is applied to sales. When unticked, prices are shown as-is.
- **Tax Included in Price** — when ticked, the tax is embedded in product prices (no separate line on receipt). When unticked, tax is calculated on top at checkout.
- **Tax Rate (%)** — e.g. enter `14.5` for 14.5% tax.
- **Tax Label** — the label shown on receipts, e.g. `VAT`, `GST`, `Sales Tax`.

### EcoCash Fee Configuration

Shown when **Accepts Eco-Cash** is enabled.

| Field | Description |
|-------|-------------|
| Fee Type | Fixed amount ($) or Percentage (%) of the sale total |
| Fee Value | The dollar amount or percentage to charge |
| Min Fee ($) | Minimum fee charged when using Percentage mode |

### Transport Cost Configuration

Shown when **Include Transport Cost in Pricing** is enabled. Used by the pricing calculator to factor in delivery cost.

| Field | Description |
|-------|-------------|
| One-way distance to supplier (km) | Distance from the store to the supplier in kilometres |
| Cost per km ($/km) | Fuel/transport cost per kilometre |

The estimated round-trip cost is shown automatically as a guide.

### EOD Submission Deadline

Shown when **Require Salesperson EOD Report** is enabled. Set the time by which salespersons must submit their end-of-day cash and EcoCash totals. After this time, overdue warnings appear at the POS.

---

## 50. Warehouse Import

The Warehouse module is a staging layer that sits between supplier orders and your business inventory. You import an Excel spreadsheet from your supplier (or buying agent), review the items, then move them into business inventory or record them as personal expenses.

### Who Can Use It

Warehouse access is controlled by two permissions:

| Permission | What it allows |
|------------|---------------|
| `canAccessWarehouse` | View the warehouse, import batches, edit items |
| `canMoveWarehouseToInventory` | Move items into a business's product inventory |

Admins automatically have both permissions. Grant them to staff in the user permissions panel.

---

### Workflow Overview

```
Excel File → Import → Warehouse Batch → Review & Edit → Move to Business / Personal
```

1. **Import** — Upload an `.xlsx` spreadsheet to create a batch.
2. **Review** — Check items: edit costs, exchange rates, short names, flag personal items.
3. **Move** — Send items to a business's inventory (with selling prices) or log personal items as expenses.

---

### Step 1 — Import a Batch

Navigate to **Warehouse → Import Batch**.

| Field | Description |
|-------|-------------|
| Excel File (.xlsx) | Drag-and-drop or browse. Only `.xlsx` files accepted. |
| Batch Name | Auto-filled from the filename (e.g. `batch_29 — 2026-05-25`). Edit if needed. |
| Notes | Optional notes about this batch. |
| Picked up from Harare | Toggle if you collected the goods in Harare. Enter the transport cost (US$) — it will be divided equally across all items. |

**Duplicate file detection:** The system checks a SHA-256 hash of the file. If you upload the same file twice, you'll see an error with the name of the existing batch.

**Overlapping order numbers:** If any order numbers in the new file already exist in a previous batch, you'll see a warning with the list. You can cancel or import anyway (duplicate rows are allowed for re-orders).

**Expected spreadsheet columns:**

| Column | Contents |
|--------|----------|
| A | Product image (embedded) |
| B | Order number |
| C | Tracking number |
| D | Product name (full, may be in Chinese) |
| E | Quantity |
| F | Cost (USD) |
| G | Order date |
| H | Price (Yuan ¥) |
| I | Row number |
| J | Exchange rate |
| K | Stage |
| L | Shipment |
| M | Location |
| N | Courier name |
| O | Courier status |
| P | Courier time |
| Q | Parent order |
| R | Parcel number |

**Source batch columns (optional — present when your supplier groups orders into clearance batches):**

| Column | Contents |
|--------|----------|
| `Batch ID` | Integer — identifies which source batch this item belongs to |
| `Batch Name` | Human-readable batch label (e.g. `Pre-Batch Import 5-31`) |
| `Clearance Cost (USD)` | Total customs/clearance cost for the whole batch — the **same value repeats on every row** in that batch. Empty for OPEN batches. |
| `Batch Status` | `OPEN` (clearance not yet paid) or `CLOSED` (clearance confirmed) |

When these columns are present the system reads the total clearance cost once per source batch and allocates it **pro-rata by Yuan cost** across all items in that batch. Items in OPEN batches receive $0 clearance allocation until the batch is closed and re-imported.

Sub-parcels (`_p2`, `_p3`, …) are automatically merged into the primary row (`_p1`), with their tracking numbers stored alongside.

---

### Step 2 — Review the Batch

Open a batch from the **Warehouse** list to see the item grid.

#### Status tabs

| Tab | Meaning |
|-----|---------|
| ALL | Every item in the batch |
| IN WAREHOUSE | Items not yet moved — available for editing |
| PERSONAL | Items flagged as personal purchases |
| MOVED TO BUSINESS | Items already added to a business's inventory |
| MOVED TO PERSONAL | Items recorded as personal expenses |

#### Manifest Qty filter pills

Below the status tabs, three pills let you sub-filter by received quantity:

| Pill | Shows |
|------|-------|
| **All** (default) | Every item in the current tab |
| **= 0 / unknown** | Items whose Manifest Qty is null or zero — goods not yet recorded as received |
| **> 0 received** | Items with a positive Manifest Qty — goods confirmed received |

The count on each pill updates live as you search or switch tabs. Switching tabs resets the pill to **All**; typing in the search box does not reset it.

#### Understanding the two quantity columns

| Column | What it is | Editable? |
|--------|-----------|-----------|
| **Qty** | Ordered quantity — what the supplier recorded for this tracking line | Read-only |
| **Manifest Qty** | Received quantity — what physically arrived, updated when you count the delivery | Yes — click to edit |

**ORDER MAX** is the total ordered quantity across all unique tracking lines for the same order number. It is computed automatically from every batch that has ever contained that order number and never decreases — even if you import fewer items later, the max only increases when new unique trackings appear.

Rules enforced:
- `Manifest Qty` per item ≤ ordered qty for that tracking line
- Total manifest qty moved for an order ≤ ORDER MAX for that order number
- Items with null or zero Manifest Qty **cannot be selected or moved to business**

#### Editing items

| Field | How to edit |
|-------|------------|
| **Manifest Qty** | Click the value (or the ⚠ unknown badge) — enter received qty. A **/ N** indicator shows the per-tracking cap. Optionally enter a reason. Click **Save**. |
| **Cost USD** | Click the cell. If a Rate is already set (row-level or bulk toolbar), a suggested cost (≈ ¥ price ÷ rate) is pre-filled in italic blue — accept or override. |
| **Rate** | Click the cell and type the exchange rate. |
| **Short Name** | Click the bold product name line. |
| **Notes** | Inline edit on the item row. |

When a Manifest Qty has been edited, the original value is shown above the current value as `orig: N`. Click it to see the full change record (before/after qty, before/after ¥ price, reason, timestamp).

When the ¥ Price changes because Manifest Qty was edited, the original price is shown above the current price as `orig: ¥NN.NN`.

#### Bulk Fill toolbar

When **no items are selected**, a fill bar appears at the top of the grid. Enter a Rate or Cost value and click **Apply to empty** to fill all items that are currently blank — useful for applying a single exchange rate to an entire batch.

When **one or more items are checked**, the toolbar shows additional actions:
- **Rate / Apply to empty** — fill the exchange rate for selected items that are blank.
- **Cost / Apply to empty** — fill the USD cost for selected items that are blank.
- **Flag Personal** — mark selected items as personal (removes them from business inventory candidates).
- **Flag Business** — un-flag selected items (returns them to IN_WAREHOUSE).
- **Move to Personal** — immediately record selected items as personal expenses.

#### Personal items panel

A collapsible panel at the bottom of the page lists all items flagged as personal. Use the **Move all X to Personal** button to record them as personal expenses in one click. Each expense is logged under the category *Warehouse* with the order number and batch name in the notes.

#### Source batch filter

When an import file contains items from **multiple source batches**, a filter dropdown appears above the item grid. Select a specific source batch to narrow the view to just those items. Each item row shows a coloured badge with the batch name and an OPEN / CLOSED status indicator, plus the allocated clearance cost per item.

#### Scan mode

Click **Scan Mode** (top-right) to open a persistent scan panel. Scan or type an order number, tracking number, or short name. The matching item is shown with its image, cost, and status. From the result you can go directly to **Move to Business** or **Move to Personal**.

---

### Step 3 — Move to Business Inventory

**Before you can move an item**, its **Manifest Qty must be set to a value greater than zero**. Items with unknown or zero manifest qty are greyed out and cannot be selected. Set the received quantity on the batch review page first.

Click **Move to Business** on the batch detail page (or from the scan panel) to open the move wizard.

1. **Select target business** — choose which business will receive the stock (global selector at the top).
2. **Set markup %** — enter a markup percentage and click **Apply** to auto-calculate selling prices for all items. Default is 30%.
3. **Review each item card** — items are displayed as cards. Each card shows:
   - Product image on the left (click to zoom to full size).
   - Full product name.
   - **Sell $ [price]** field — always displayed to two decimal places (e.g. `75.50`). Edit directly.
   - **💡** button — opens the inline pricing calculator for that item.
   - **Move →** button — moves that single item immediately once business, category, and price are set.
   - Order number and tracking number (second line).
   - Cost breakdown: `Cost $XX.XX  +$X.XX transport  +$X.XX fee  +$X.XX clearance  |  Unit cost $XX.XX`
   - Business combobox, Domain, Category, Sub-category dropdowns, **🏷 Suggest** button, and Barcode field — all filling the full card width.
4. **Classify each item** — pick Domain → Category → Sub-category. Use the **🏷 Suggest** button (next to the Barcode field) to auto-suggest classifications based on the product name (see [Classification Suggestion](#classification-suggestion) below).
5. **Set per-item target business (optional)** — override the global business for individual rows using the searchable business combobox in the classification row (see [Per-Item Target Business Override](#per-item-target-business-override)).
6. Click **Move selected (N)** at the bottom to move all selected items at once.

The **Qty** column in the move wizard shows the **Manifest Qty** (received qty), not the ordered qty. Cost-per-unit calculations use manifest qty so the numbers reflect what was actually received.

**ORDER MAX guard:** The system checks that the total quantity being moved for each order number (including any previously moved items from other batches) does not exceed the ORDER MAX for that order. If it would, the move is blocked with a message showing how many units have already been processed and how many remain.

For each item moved, the system creates:
- A **Business Product** record with the short name as product name.
- A **Product Variant** with the calculated selling price, stock quantity set to **Manifest Qty**, and optional barcode.
- A **Stock Movement** of type `PURCHASE_RECEIVED` for the manifest qty received.
- A **Product Image** linked from the warehouse item (if one was in the spreadsheet).
- A **Product Barcode** entry if a barcode was supplied (scanner-ready immediately).

The warehouse item status changes to **MOVED_TO_BUSINESS**.

**Cost price shown:** The unit cost reflects `costUsd per unit + transaction fee + transport per unit + clearance per unit`. All four components are shown separately in the cost breakdown line so you know exactly what margin you are working with. Clearance is only non-zero when the source batch is CLOSED and a clearance cost was present in the Excel file.

---

### Classification Suggestion

Each item card in the move wizard has a **🏷 Suggest** button, located in the classification row next to the Barcode field. Clicking it analyses the product name and suggests the best-matching inventory categories from **all business types** — not just the destination business.

**How it works:**
1. The product name is split into tokens (words / numbers), common English words ("for", "with", "and"…) are removed.
2. Each token is matched against all domain names, category names, and sub-category names in the system, including both singular and plural forms (e.g. "screws" matches "M6 screw").
3. Results are ranked by score and shown in a searchable list. The search box inside the popup lets you type to filter — there is no cap on results.

**Applying a suggestion:**
- Click any row in the popup — the Domain, Category, and Sub-category dropdowns for that item are filled automatically.
- If the matched domain belongs to a different business type than the destination (e.g. hardware sub-category while the destination is a clothing business), the classification is still applied — the dropdowns will show the cross-domain values correctly.

**When no suggestions appear:**
- The product name has too few recognisable keywords — edit the **Short Name** on the batch page to use plain English terms before clicking 🏷 Suggest.
- The sub-category may not exist yet — add it under **Inventory → Categories** first.

---

### Per-Item Target Business Override

By default, all items in the move wizard go to the **global target business** selected at the top of the page. If you are moving items destined for different businesses in the same session, you do not need to change the global selector for each item.

**Each item row has a compact searchable dropdown** underneath the product name:

- **Empty (default):** The row uses the global business (shown as `↑ BusinessName` in the placeholder).
- **Select a business:** Type to search, then click a business name. That item will go to the selected business when you click **Move**.
- The dropdown is portal-rendered and scrolls with fixed positioning — it is never clipped by the table.

When you click **Move X Items to Business**, items are grouped by their effective business (row override or global fallback) and a single API call is made per business group.

---

### Transport Cost, Transaction Fee & Clearance

When importing a batch you can supply:

| Field | What it does |
|-------|-------------|
| **Transport cost (USD)** | Total freight cost for the batch — divided equally across all IN_WAREHOUSE items |
| **Transaction fee %** | Percentage added to each item's USD cost (e.g. 3% PayPal or agent fee) |

In addition, if the Excel file contains source batch columns, a **clearance cost** is automatically allocated per item (see [Source batch columns](#source-batch-columns-optional)) .

All three adjustments are visible in the move wizard cost breakdown line and are factored into the default selling price:

```
selling price = (costPerUnit + txFee + transportPerUnit + clearancePerUnit) × (1 + markup%)
```

Individual rows can override the transport per-item amount using the **Transport Override** field in the row (visible when the batch has a non-zero transport cost).

---

### Reversing a Warehouse Move (Admin)

If an item was moved to business inventory by mistake, an administrator can reverse it using the CLI script. This is an admin-only operation run from the server.

```
node scripts/reverse-warehouse-move.js <batchId>
```

Or to reverse a single item by barcode:

```
node scripts/reverse-warehouse-move.js <batchId> --barcode 183212005
```

**What happens:**
- The Business Product (and all its variants, stock movements, barcodes, and images) is deleted.
- The warehouse item status is reset to `IN_WAREHOUSE` — the item becomes available for re-classification and re-move.
- The batch delete lock is also lifted for that item (a batch can only be deleted when no items have been moved).

> **Note:** The script requires database credentials in `.env.local` and must be run by someone with server access. It is not available through the web UI.

---

### Step 4 — Move to Personal Expenses

Items that are personal purchases (not business stock) can be recorded as personal expenses.

- **From the batch page:** Flag items as Personal, then use the Personal Items panel → **Move all to Personal**.
- **From the bulk toolbar:** Select items → **Move to Personal**.
- **From the scan panel:** Scan an item → **Move to Personal**.

Each item creates a **Personal Expense** entry:
- Category: `Warehouse`
- Description: the item's short name
- Amount: `costUsd` (USD)
- Notes: `Warehouse import — {batchName} / {orderNumber}`

The warehouse item status changes to **MOVED_TO_PERSONAL**.

---

### Deleting a Batch

A batch can be deleted only if **no items have been moved** (to business or personal). To delete, click the trash icon on the Warehouse list page. All items and their images are permanently removed.

If items have already been moved, the delete button is hidden — the batch record is kept for audit purposes.

---

### Reference Locks

The **Manage Locks** link (top-right of the batch detail page) opens the reference lock panel. Locks prevent an order number or tracking number from being imported again.

| Lock type | Trigger |
|-----------|---------|
| **Auto-lock** | Applied automatically when the total manifest qty moved for that reference equals the ORDER MAX. The lock label shows the qty ratio (e.g. `9/9 rcvd`). |
| **Manual lock** | Applied by a user — prevents any further imports for that reference even if the ORDER MAX has not been reached. |

A locked reference shows a 🔒 badge on every item row that contains it. Locked items can still be edited and their manifest qty adjusted, but the lock itself must be removed from the reference lock panel before a new import of the same reference is allowed.

---

### Warehouse Home — Search & Stats

The Warehouse home page has a **search box** that filters the batch list in real time by batch name or original filename. Type any part of the name to narrow the list.

It also shows four summary cards:

| Card | Meaning |
|------|---------|
| Total Batches | Number of imported batches |
| In Warehouse | Items still sitting in staging |
| Moved to Business | Items added to business inventory |
| Moved to Personal | Items recorded as personal expenses |

Each batch row shows a progress bar indicating what fraction of items have been moved out of the warehouse.

---

## 51. Salesperson Shortfall Report

> **Who reads this:** Managers and finance staff who need to cross-check salesperson EOD declarations against actual system figures.

The **Salesperson Shortfall Report** is a dedicated reconciliation view that compares what each salesperson declared in their daily EOD report against the expected cash/EcoCash collected according to system orders. It is separate from Section 30 (Salesperson EOD Reporting) — that section covers the salesperson's own submission workflow; this report is for managers reviewing the numbers.

---

### Opening the Report

Navigate to **Reports → Salesperson Shortfall**.

Permission required: `canCloseBooks`, `canAccessFinancialData`, or system admin.

---

### Filters

| Filter | What it does |
|--------|-------------|
| **Date range** | Preset pills (Today, Last 7 days, This month, Last month) or custom start/end date picker |
| **All time** | Toggle to remove the date filter entirely and show the complete history |
| **Salesperson** | Dropdown to drill into one person's daily history |
| **Status** | Filter to show only a specific status (see Status Reference below) |
| **Search** | Free-text filter on salesperson name |

---

### Summary Cards

When no specific salesperson is selected, four summary cards show totals across the filtered period:

| Card | Meaning |
|------|---------|
| Days with data | Number of days at least one salesperson submitted |
| Missing submissions | Days × salespersons with no report at all |
| Overrides | Rows where a manager submitted on the salesperson's behalf |
| Total collected | Sum of all reported cash + EcoCash |

---

### By-Person Summary Table

With no salesperson filter active, the table shows one row per salesperson:

| Column | Meaning |
|--------|---------|
| Name | Salesperson name |
| Days present | Days with a submitted or overridden report |
| Missing | Days with no submission |
| Overrides | Days a manager submitted on their behalf |
| Cash / EcoCash / Total | Sum across the period |

Click **Export CSV** to download this summary.

---

### Daily Detail Table

When you select a specific salesperson from the filter, the table switches to a per-day view:

| Column | Meaning |
|--------|---------|
| Date | The business day |
| Cash | Declared cash amount |
| EcoCash | Declared EcoCash amount |
| Total | Cash + EcoCash |
| Expected share | System-calculated expected total for that salesperson on that day |
| Variance | Total − Expected share (green ≤ $1, amber ≤ $10, red > $10) |
| Status | Submission status badge (see below) |
| Override reason | Shown when a manager submitted instead of the salesperson |

Click **Export CSV** to download the daily detail.

---

### Status Reference

| Badge | Meaning |
|-------|---------|
| **Submitted** (green) | Salesperson submitted their own report |
| **Override** (amber) | A manager submitted on the salesperson's behalf |
| **Zero reported** (yellow) | Report submitted with $0 declared |
| **Not submitted** (red) | No report exists for that day |

---

### Cash Counted Amendments

If a manager amended the "Cash Counted" figure on a saved EOD report after locking, a **✏️ Amended** badge appears on the relevant row. Click the badge to open a detail popup showing:

- Original cash counted
- New cash counted
- Who made the amendment and when
- The reason provided

---

### Permissions

| Action | Permission required |
|--------|-------------------|
| View report | `canCloseBooks` or `canAccessFinancialData` or system admin |
| Export CSV | Same as view |

---

## 52. Backup & Restore — Full Guide

> **Who reads this:** System administrators responsible for data safety and migration. Regular users do not need this section.

The system has a built-in backup and restore engine that covers every table in the database. Backups are downloaded as compressed JSON files (`.json.gz`) that can be stored offline and restored to any compatible installation.

Navigate to **Admin → Data Management** to access all backup and restore functions.

---

### Creating a Backup

1. Go to **Admin → Data Management**.
2. Select a **Backup Type** (see [Backup Types](#backup-types) below).
3. Set any options (include business data, include audit logs, include/exclude demo businesses).
4. Click **Create Backup**.
5. The file downloads automatically as `MultiBusinessSyncService-backup_<type>_<timestamp>.json.gz`.

Store the file in a safe location — cloud storage, an external drive, or a second server.

---

### Backup Types

| Type | What it includes |
|------|-----------------|
| **Full Backup (Production)** | All tables — users, employees, businesses, products, orders, inventory, payroll, chat, reports, assets, and more — excluding demo businesses by default |
| **Demo Businesses Only** | All data for businesses marked as demo — useful for resetting a demo environment |
| **Users & Permissions** | User accounts, business memberships, and permission settings only |
| **Business Data** | Business records, settings, and business-specific data |
| **Employee Data** | Employee records, contracts, and employment history |
| **Reference Data** | Job titles, compensation types, benefit types, policy templates |

**Options available for Full Backup:**

| Option | Default | Effect |
|--------|---------|--------|
| Include business data | ✅ On | Includes products, inventory, orders, categories, suppliers, customers |
| Include audit logs | ❌ Off | Adds last 10,000 audit log entries (makes file larger) |
| Include demo data | ❌ Off | Excludes demo businesses — leave off for production backups |

---

### Pre-Restore Validation

**Always validate a backup before restoring.** This checks the backup file against the live database without making any changes.

1. Go to the **Restore** section of Data Management.
2. Drag and drop your `.json.gz` (or `.json`) backup file into the upload area, or click to browse.
3. Click **Validate Backup**.
4. The system compares table-by-table record counts between the backup and the live database.

**Validation result statuses:**

| Status | Meaning |
|--------|---------|
| ✅ Success | All tables match exactly |
| ⚠️ Warning | Some tables differ by expected amounts (e.g. images table is always partial; demo business tables may be excluded) — safe to proceed |
| ❌ Error | A table count is unexpectedly different — investigate before restoring |

**Expected differences (will always show as warning, not error):**
- `images` — only backed up partially by design (large binary data)
- `clothingLabelPrintHistory` — partial backup by design
- `projects` / `vehicleLicenses` — belong to demo businesses excluded from a production backup

If validation shows ⚠️ Warning with only these expected differences, the backup is safe to restore.

---

### Restoring a Backup

> **This overwrites existing data. Run validation first and ensure you have a second backup as a safety net.**

1. Select your backup file (drag-and-drop or browse).
2. Click **Validate Backup** first and confirm the result.
3. Click **Restore Backup**.
4. Confirm the warning dialog.
5. A **live progress log** appears showing each table being restored and its record count.
6. When complete, an alert shows the total records restored and any warnings.
7. Click **OK** — the page reloads automatically.

**The restore uses upsert (insert or update)** — existing records with matching IDs are updated, new records are inserted. This makes it safe to run on a live database without wiping it first.

---

### Restore Progress & Warnings

While restoring, the progress panel shows:

```
✅ Restored users            12 records
✅ Restored businesses       8 records
✅ Restored businessProducts 3,241 records
⚠️  Skipped 4 records — foreign key constraint (referenced data not in backup)
✅ Restored orders           18,504 records
...
```

**Skipped records** are logged with the reason:
- **Foreign key errors** — the record references another record that was not in the backup or has not been restored yet.
- **Validation errors** — duplicate unique constraint or invalid data.
- **Other errors** — check server logs for details.

A small number of skipped records is normal. If a large table has many skips, run validation again post-restore to identify the gap.

---

### Verifying a Restore

After a restore, run validation again using the **same backup file** to confirm the live database now matches:

1. Select the same backup file.
2. Click **Validate Backup**.
3. All tables should now show ✅ Success (or the same expected ⚠️ warnings as before).

If any table shows ❌ Error (an unexpected mismatch), that table may need a targeted re-restore. Contact your system administrator.

**SQL verification (optional — requires database access):**

```sql
-- Check a specific table count
SELECT COUNT(*) FROM business_products;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM employees;
```

Compare these numbers to what was shown in the validation report.

---

### Schema Version

Each backup file records the schema version at the time it was created (e.g. `6.31.0`). When restoring to a different installation, the schema versions should match. If they differ, run `prisma migrate deploy` on the target installation first to bring the schema up to date, then restore.

The current schema version is **6.31.0** (adds `weight_pricing_rules`, `livestock_purchase_sessions`, `livestock_purchase_lines`, and two columns on `business_products` for scale integration — MBM-226).

---

### Backup Best Practices

| Practice | Reason |
|----------|--------|
| Run a full backup before every migration or major update | Migrations alter schema — always have a pre-migration snapshot |
| Store backups off-site (cloud or external drive) | A server failure would destroy on-disk backups |
| Validate before restoring | Saves time — catch mismatches before the restore runs |
| Keep at least two backups: yesterday and last week | Provides a recovery window if an issue is discovered late |
| Exclude demo data from production backups | Keeps files smaller and avoids polluting production with test data |
| Test a restore on a staging environment periodically | Ensures the restore process actually works before you need it in an emergency |

---

## 53. Scale Integration — Star Micronics MG-S8200

The system supports a **Star Micronics MG-S8200 RS-232 weighing scale** for two workflows:

1. **Selling by weight** — products priced per kg (e.g. deli meat, loose spices). The scale reading is captured at the POS and the item price is calculated automatically.
2. **Livestock purchase** — buying live animals from a vendor. Each animal category is weighed in turn, the total is calculated, and an expense payment voucher is printed at the end.

> **Desktop app only.** Scale integration is only available when running the Electron desktop application. It will not appear in a standard browser session.

---

### Connecting the Scale

The scale connects via a standard RS-232 serial cable. On a modern PC use a USB-to-RS-232 adapter. The MG-S8200 default settings are **9600 baud, 8N1**.

**Steps to configure:**

1. Plug the scale into the PC and note the COM port assigned (e.g. `COM3`). Windows Device Manager → Ports will show it.
2. Open the POS for your business (Restaurant or Grocery).
3. Click **⚙️ POS Settings** (top-right of the POS page).
4. Scroll to the **⚖️ Scale — MG-S8200** section.
5. Click **↺** to refresh the port list, then select the correct COM port from the dropdown.
6. Click **Connect**. The status indicator turns green and a live weight reading appears below.
7. Place an empty container on the scale and click **Tare** to zero it before weighing.

The selected COM port is saved locally on this PC only — it is not synced to the server. Repeat this step on every computer that has a scale attached.

**Status indicator:**

| Colour | Meaning |
|--------|---------|
| Green dot | Scale connected and streaming |
| Grey dot | Disconnected |
| Red dot | Error — check cable and COM port |

The scale service auto-reconnects every 5 seconds if the cable is briefly disconnected.

---

### Weight Pricing Rules

Weight pricing rules define the price per kilogram for each animal or product category. They are stored per business and are used by both the livestock purchase workflow and the POS weigh-item flow.

**Where to set them up:**

POS Settings → **🏷️ Weight Pricing Rules** section (Restaurant and Grocery only; requires **Manage Business Settings** permission).

**Adding a rule:**

1. Click **+ Add pricing rule**.
2. Enter the **Category name** (e.g. *Whole Chicken*, *Chicken Feet*, *Offals*, *Goat*).
3. Select the **Type**:
   - `PURCHASE` — price paid to a vendor when buying livestock
   - `SALE` — price charged to a customer when selling by weight at the POS
4. Enter the **Price / kg**.
5. Click **Add**.

**Editing:** Click the active toggle to enable or disable a rule without deleting it. Click **Remove** to delete permanently.

Rules are matched by category name. If no matching rule exists, the cashier can enter a custom price during the workflow.

---

### Marking a Product as Sold by Weight

Any restaurant or grocery inventory item can be flagged as "sold by weight". When a customer buys that item at the POS the cashier is prompted to place it on the scale instead of entering a quantity manually.

**Steps:**

1. Go to **Restaurant → Inventory** (or **Grocery → Inventory**).
2. Find the product and click **Edit**.
3. In the amber bar above the form, tick **Sell by Weight (kg)**.
4. Enter the **Price per kg** in the field that appears.
5. Save the form.

Once flagged, tapping the product card at the POS opens the **Weigh Item** modal instead of adding directly to the cart.

---

### Selling by Weight at the POS

When a cashier taps a product marked as *sold by weight*, the Weigh Item modal opens automatically.

**Workflow:**

1. Place the item on the scale (tare the container first if needed).
2. The modal displays the live reading in large digits:
   - **UNSTABLE** (amber) — the scale is still settling; wait.
   - **STABLE** (green) — the reading has settled. The calculated total appears.
3. The weight **auto-locks** when stable. The status changes to **LOCKED** (blue).
4. If the weight looks wrong, click **Re-weigh** to unlock and capture a fresh reading.
5. Click **Tare** to zero the scale (e.g. to remove packaging weight).
6. Click **Add to Cart** once you are satisfied with the weight and price.

The cart item is added as `Product Name (X.XXX kg)` with the total price pre-calculated (not unit price × quantity).

| Control | Action |
|---------|--------|
| **Tare** | Zeros the scale — remove all items first, tare, then place items back |
| **Re-weigh** | Unlocks a locked reading to capture a new value |
| **Add to Cart** | Disabled until a stable, positive weight is locked |
| **Cancel** | Closes the modal without adding anything to the cart |

> **No scale connected?** The modal shows "Scale not connected" and Add to Cart is disabled. Go to POS Settings → Scale to connect.

---

### Livestock Purchase Workflow

Use this when a vendor brings live animals to the premises and you need to weigh and pay for each category (whole chickens, offals, feet, etc.). The system records each weigh-in, submits an expense payment request for the total, and prints a vendor payment voucher.

**Prerequisites:**
- Scale connected (see [Connecting the Scale](#connecting-the-scale))
- Vendor registered as a **Supplier** for this business (Suppliers page → Add Supplier)
- PURCHASE pricing rules configured (optional but recommended)

**Opening the page:**
- Restaurant: **Restaurant → Livestock Purchase**
- Grocery: **Grocery → Livestock Purchase**

---

#### Step 1 — Select Vendor & Start Session

1. Click **Start New Purchase**.
2. Select the vendor from the dropdown.
3. Click **Start Session**. The weighing screen opens.

---

#### Step 2 — Weigh Each Category

For each category of animals (e.g. whole chickens first, then offals):

1. Place the animals on the scale and wait for **STABLE** — the weight auto-locks.
2. Select the **Category** from the dropdown. The matching purchase price per kg fills in automatically.
   - Choose *Other (custom)* to type a category name and enter the price manually.
3. Adjust the price if needed.
4. Add optional notes.
5. Click **+ Add Line**. The line appears in the table and the running total updates.
6. Click **Re-weigh** to unlock for the next group of animals.

Repeat for every category. To remove a mistaken line, click the **×** on that row.

---

#### Step 3 — Submit & Print Voucher

1. When all categories are entered, click **Submit & Print Voucher**.
2. The system:
   - Creates an **Expense Account Payment** (SUBMITTED) for the full total, payee = selected vendor, charged to the default business expense account.
   - Marks the session SUBMITTED.
   - Opens the **Receipt Preview** modal.
3. Select a printer and click **Print**.

The printed voucher shows: business name, date, vendor name, each line (category / kg / $/kg / total), and the grand total. Hand it to the vendor — the cashier completes the cash payment through the normal expense approval process.

**Cancelling a session:** Click **Cancel** (bottom-left of the wizard). No expense payment is created and the session is marked CANCELLED.

---

#### Livestock Purchase — Column Reference

| Column | Description |
|--------|-------------|
| Category | Animal type (e.g. Whole Chicken, Offals) |
| kg | Weight captured from scale |
| $/kg | Price per kilogram at time of weighing |
| Total | kg × $/kg, calculated automatically |

---

#### Permissions

| Action | Required permission |
|--------|-------------------|
| Connect scale / change COM port | Manage Business Settings |
| Manage weight pricing rules | Manage Business Settings |
| Mark product as sold by weight | Manage Inventory |
| Sell by weight at POS | Standard cashier access |
| Start / submit / cancel livestock purchase | Standard cashier access |

---

*For technical support, contact your system administrator.*
