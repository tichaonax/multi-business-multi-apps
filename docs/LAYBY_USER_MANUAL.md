# Layby Management - User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Creating Laybys](#creating-laybys)
4. [Managing Laybys](#managing-laybys)
5. [Recording Payments](#recording-payments)
6. [Completing Laybys](#completing-laybys)
7. [Cancelling Laybys](#cancelling-laybys)
8. [Reports and Analytics](#reports-and-analytics)
9. [Common Tasks](#common-tasks)
10. [FAQ](#faq)

---

## Introduction

### What is Layby?

Layby (also called lay-away) is a payment method that allows customers to reserve items by making a deposit, then paying the balance through regular installments. Once fully paid, the customer receives their items.

**Benefits:**
- Helps customers afford larger purchases
- Secures sales for your business
- Builds customer loyalty
- Provides predictable payment schedules

### Key Concepts

**Layby Agreement**: A contract between your business and the customer to reserve items
**Deposit**: Initial payment required to start a layby (e.g., 20% of total)
**Installment**: Regular payment amount (e.g., $50 every fortnight)
**Balance**: Amount still owing on the layby
**Completion**: When layby is fully paid and items are released to customer

---

## Getting Started

### Accessing Layby Management

1. Log in to your account
2. Navigate to the main menu
3. Click **"Laybys"**

### Permissions Required

To use layby management, you need the **"Manage Laybys"** permission. If you cannot see the Laybys menu:
- Contact your manager or system administrator
- They can grant you permission in the user management section

### First Time Setup

Before creating your first layby:
1. Ensure customers are set up in the system
2. Ensure products have correct pricing and stock levels
3. Review your business's layby rules (see Business Rules section)

---

## Creating Laybys

### Step-by-Step: Create New Layby

#### Step 1: Start New Layby
1. Click **"Laybys"** in the menu
2. Click **"New Layby"** button
3. The layby creation form will open

#### Step 2: Select Customer
1. Click the **Customer** dropdown
2. Search for customer by name or customer number
3. Select the customer
4. Customer information will display

**Note**: Customer must have layby enabled on their account. If customer is not available, contact your manager.

#### Step 3: Add Items
1. Click **"Add Item"** button
2. Search for product
3. Select product variant (size, color, etc.)
4. Enter quantity
5. Unit price will populate automatically
6. Total price will calculate
7. Click **"Add"** to confirm
8. Repeat for additional items

**Tips:**
- Check stock levels before adding items
- Insufficient stock will show an error
- You can add up to 20 items per layby

#### Step 4: Set Deposit Amount
1. Deposit percentage will default to your business rules
2. You can adjust within allowed range (e.g., 20-80%)
3. Deposit amount calculates automatically
4. Minimum deposit enforced by system

**Example:**
- Total: $500
- Deposit: 20%
- Deposit Amount: $100

#### Step 5: Set Payment Schedule
1. **Installment Amount**: Enter regular payment amount (e.g., $100)
2. **Frequency**: Select WEEKLY, FORTNIGHTLY, or MONTHLY
3. **Payment Due Date**: Set first payment due date
4. **Completion Due Date**: Set final completion date

**Note**: Completion date must be within maximum duration for your business type (e.g., 90 days for clothing stores).

#### Step 6: Add Fees (if applicable)
1. **Service Fee**: Automatically calculated based on business rules
2. **Administration Fee**: Enter if applicable
3. Total fees will add to balance

#### Step 7: Add Notes (optional)
- Add any special instructions
- Note customer preferences
- Document agreed terms

#### Step 8: Review and Create
1. Review all information:
   - Customer details
   - Items and quantities
   - Total amount
   - Deposit amount
   - Balance remaining
   - Payment schedule
2. Click **"Create Layby"** button
3. System will:
   - Generate unique layby number
   - Reserve inventory (if applicable)
   - Create deposit payment record
   - Display success message

### After Creation

Once created, you will see:
- **Layby Number**: e.g., LAY-CLO-20251027-000001
- **Status**: ACTIVE
- All layby details
- Link to layby detail page

**What to Do Next:**
1. Print layby receipt for customer
2. File physical copy (if required)
3. Inform customer of payment schedule
4. Set up payment reminders

---

## Managing Laybys

### Viewing All Laybys

#### Layby List Page
1. Click **"Laybys"** in menu
2. View all laybys in table format

**Table Columns:**
- Layby Number
- Customer Name
- Status Badge
- Total Amount
- Balance Remaining
- Created Date

#### Filtering Laybys
Use filters to find specific laybys:

**By Status:**
- ACTIVE: Currently accepting payments
- COMPLETED: Fully paid and finalized
- CANCELLED: Cancelled by customer or business
- ON_HOLD: Temporarily paused
- DEFAULTED: Payment default

**By Customer:**
- Select customer from dropdown
- Shows all laybys for that customer

**By Date:**
- Filter by creation date range
- Useful for monthly reporting

#### Sorting
- Click column headers to sort
- Default: Newest first

### Viewing Layby Details

1. Click layby number in list
2. Layby detail page opens

**Information Displayed:**

**Header Section:**
- Layby number (large, prominent)
- Status badge (colored by status)
- Created date

**Customer Section:**
- Customer name
- Customer number
- Phone number
- Email address

**Items Section:**
- Product name
- Variant (size, color, etc.)
- Quantity
- Unit price
- Total price per item

**Financial Summary:**
- Total Amount
- Deposit Amount (%)
- Total Paid
- Balance Remaining (highlighted)
- Service Fee
- Late Fee (if applicable)
- Administration Fee
- Total Fees

**Payment Schedule:**
- Installment Amount
- Frequency (weekly/fortnightly/monthly)
- Payment Due Date
- Completion Due Date

**Payment History:**
- Table of all payments
- Receipt numbers
- Dates and amounts
- Payment methods
- Processed by (staff name)
- Running balance

**Actions:**
- Record Payment
- Complete Layby
- Hold Layby
- Cancel Layby
- Print Receipt

---

## Recording Payments

### Step-by-Step: Record Payment

#### Step 1: Open Payment Form
1. Navigate to layby detail page
2. Click **"Record Payment"** button
3. Payment form opens

#### Step 2: Enter Payment Details

**Amount:**
- Enter payment amount received
- Cannot exceed balance remaining
- System shows warning if trying to overpay
- Example: Balance $150, can pay up to $150

**Payment Method:**
Select from:
- CASH
- EFTPOS
- CREDIT_CARD
- BANK_TRANSFER

**Payment Reference (optional):**
- Transaction number
- Receipt number
- Bank reference
- Useful for reconciliation

**Notes (optional):**
- Any additional information
- Customer comments
- Special circumstances

#### Step 3: Review Payment
Before submitting, review:
- Payment amount
- Payment method
- New balance (calculated automatically)
- "Will complete layby" indicator (if paying final amount)

#### Step 4: Submit Payment
1. Click **"Record Payment"** button
2. System processes payment:
   - Creates payment record
   - Generates receipt number
   - Updates balance
   - Creates transaction record
   - Auto-completes if balance reaches zero
3. Success message displays

### After Recording Payment

**Receipt Number Generated:**
- Format: RCP-CLO-20251027-000001
- Give receipt number to customer
- Used for tracking and refunds

**Balance Updated:**
- New balance shows immediately
- Payment appears in history
- Progress bar updates

**If Payment Completes Layby:**
- Status changes to COMPLETED
- Items marked as released
- Order created (if configured)
- Completion notification sent

### Payment Tips

**Best Practices:**
1. Always verify amount before recording
2. Use correct payment method
3. Add reference numbers for card payments
4. Print receipt for customer
5. Update customer on remaining balance

**Common Scenarios:**

**Exact Installment Amount:**
- Customer pays agreed installment (e.g., $100)
- Straightforward, standard payment

**Partial Payment:**
- Customer pays less than installment
- Acceptable, updates balance accordingly
- May adjust payment schedule

**Extra Payment:**
- Customer pays more than installment
- Acceptable, reduces balance faster
- Cannot exceed total balance

**Final Payment:**
- Customer paying remaining balance
- System auto-completes layby
- Items released to customer

---

## Completing Laybys

### When to Complete

A layby can be completed when:
- Balance remaining is $0.00
- All payments recorded
- Customer ready to collect items

### Automatic Completion

**System auto-completes when:**
- Final payment brings balance to zero
- You don't need to manually complete
- Status changes automatically
- Items released automatically

### Manual Completion

If layby is fully paid but not auto-completed:

#### Step 1: Verify Balance
- Check balance is $0.00
- If balance remains, record additional payment first

#### Step 2: Complete Layby
1. Click **"Complete Layby"** button
2. Confirmation dialog appears

#### Step 3: Order Creation Option
- **Create Order**: Check this to generate order record
- **Skip Order**: Uncheck if order already exists
- Most businesses should create order

#### Step 4: Confirm Completion
1. Click **"Confirm"** button
2. System processes:
   - Changes status to COMPLETED
   - Sets completion date
   - Marks items as released
   - Records who released items
   - Creates order (if selected)
   - Releases inventory reservation

### After Completion

**Status Changes:**
- ACTIVE → COMPLETED
- Status badge turns blue
- Completion date displays

**Items Released:**
- Items released flag: Yes
- Released date: [timestamp]
- Released by: [your name]

**Order Created:**
- Order number generated (e.g., ORD-CLO-20251027-000001)
- Link to order displayed
- Order status: COMPLETED
- Payment method: LAYAWAY

**Customer Collection:**
1. Verify customer identity
2. Review items with customer
3. Check items against layby list
4. Have customer sign collection receipt
5. Hand over items
6. Thank customer for their business

### Completion Checklist

Before releasing items to customer:
- [ ] Verify balance is $0.00
- [ ] Confirm customer identity
- [ ] Check items are available and in good condition
- [ ] Complete system completion process
- [ ] Generate order record
- [ ] Print final receipt
- [ ] Have customer sign collection form
- [ ] Hand over items
- [ ] Update any additional systems

---

## Cancelling Laybys

### When to Cancel

Laybys may be cancelled when:
- Customer requests cancellation
- Customer defaults on payments
- Business cannot fulfill layby
- Items no longer available

### Cancellation Policy

**Check your business rules:**
- Refund policy (FULL, PARTIAL, or NONE)
- Cancellation fee percentage
- Grace period (if any)

**Example (Clothing Store):**
- Refund policy: PARTIAL (keep deposit)
- Cancellation fee: 10%
- Calculation: Total paid - cancellation fee = refund

### Step-by-Step: Cancel Layby

#### Step 1: Open Cancellation Form
1. Navigate to layby detail page
2. Click **"Cancel Layby"** button
3. Cancellation form opens

#### Step 2: Enter Cancellation Details

**Cancellation Reason (required):**
Examples:
- "Customer changed mind"
- "Items no longer available"
- "Payment default"
- "Customer requested cancellation"

**Refund Amount:**
- System calculates based on business rules
- Shows: Total paid - cancellation fee
- You can adjust if needed
- Enter final refund amount

#### Step 3: Review Cancellation
Before confirming:
- Review reason
- Verify refund amount
- Check calculation
- Confirm with manager if large amount

#### Step 4: Confirm Cancellation
1. Check confirmation box
2. Click **"Cancel Layby"** button
3. System processes:
   - Changes status to CANCELLED
   - Records cancellation reason
   - Records refund amount
   - Sets cancellation date
   - Releases inventory reservation
   - Prevents further modifications

### After Cancellation

**Status Changes:**
- ACTIVE → CANCELLED
- Status badge turns red
- Cancellation date displays
- Reason displayed

**Refund Processing:**
- Refund amount recorded in system
- **Note**: System records refund, but you must process actual refund separately
- Process refund via your payment system
- Give customer refund receipt

**Inventory Released:**
- Items returned to available stock
- Reservation removed
- Items available for sale again

### Cancellation Process Checklist

- [ ] Discuss cancellation with customer
- [ ] Confirm cancellation reason
- [ ] Calculate refund based on business rules
- [ ] Cancel layby in system
- [ ] Process actual refund payment
- [ ] Give customer refund receipt
- [ ] Document cancellation
- [ ] Return items to stock (if applicable)
- [ ] Update customer record if needed

---

## Holding and Reactivating Laybys

### Putting Layby On Hold

**When to Use:**
- Customer traveling temporarily
- Temporary financial difficulty
- Customer requests pause
- Seasonal closure

#### Step 1: Hold Layby
1. Navigate to layby detail page
2. Click **"Hold Layby"** button
3. Enter reason (optional but recommended)
4. Click **"Confirm Hold"**

**Effect:**
- Status: ACTIVE → ON_HOLD
- Cannot record payments while on hold
- Automation paused (no reminders)
- Inventory remains reserved

### Reactivating Layby

**When to Reactivate:**
- Customer ready to resume payments
- Temporary issue resolved
- Hold period expired

#### Step 1: Reactivate Layby
1. Navigate to layby detail page
2. Click **"Reactivate Layby"** button
3. Click **"Confirm Reactivation"**

**Effect:**
- Status: ON_HOLD → ACTIVE
- Can accept payments again
- Automation resumes
- Payment schedule continues

---

## Reports and Analytics

### Accessing Business Rules

1. Navigate to **Laybys** menu
2. Click **"Business Rules"** link
3. View rules for your business type

**Information Displayed:**
- Deposit percentage rules (min/max/default)
- Installment frequency options
- Maximum duration (days)
- Fees (service, late, administration, cancellation)
- Policies (inventory, refunds, approval)
- Automation settings
- Validation rules

### Accessing Automation

1. Navigate to **Laybys** menu
2. Click **"Automation"** link
3. View automation features and job history

**Features:**
- Payment reminders (3 days before, on due date, after due date)
- Late fee application (after X days overdue)
- Default processing (after X missed payments)
- Completion reminders (before completion due date)

**Job History:**
- View past automation runs
- See what was processed
- Check for errors
- Trigger manual run

---

## Common Tasks

### Find Customer's Laybys

**Method 1: Filter by Customer**
1. Go to layby list page
2. Use customer filter
3. Select customer name
4. View all their laybys

**Method 2: Search by Customer Number**
1. Go to customer detail page
2. View layby section
3. See layby statistics and list

### Check Overdue Laybys

1. Go to layby list page
2. Filter by status: ACTIVE
3. Sort by payment due date
4. Laybys with past due dates shown first
5. Late fee indicator if applicable

### Print Receipts

**Payment Receipt:**
1. View layby detail page
2. Find payment in payment history
3. Click receipt number
4. Print/download receipt

**Layby Summary:**
1. View layby detail page
2. Click **"Print Summary"** button (if available)
3. Or use browser print function

### Handle Disputes

1. Review layby history thoroughly
2. Check all payment records
3. Verify receipt numbers
4. Check payment dates and amounts
5. Document communication
6. Escalate to manager if needed

### End of Day Reconciliation

1. Go to layby list page
2. Filter by today's date
3. List all payments recorded today
4. Export or print list
5. Match against cash/card receipts
6. Verify totals match
7. Document discrepancies

---

## FAQ

### General Questions

**Q: What is the minimum deposit?**
A: Depends on your business type. Usually 20-50%. Check Business Rules page.

**Q: How long can a layby last?**
A: Maximum duration varies by business type (30-120 days). Check Business Rules page.

**Q: Can we do laybys without a customer account?**
A: No, customer must be in the system with layby enabled.

**Q: Can we change the deposit percentage?**
A: Yes, within the minimum and maximum for your business type.

### Payment Questions

**Q: What if customer pays wrong amount?**
A: System accepts any amount up to balance. Balance updates accordingly.

**Q: What if customer overpays?**
A: System prevents overpayment. Maximum payment is current balance.

**Q: Can we refund a payment?**
A: Yes, but requires special process. Contact your manager.

**Q: What payment methods are accepted?**
A: CASH, EFTPOS, CREDIT_CARD, BANK_TRANSFER. Select appropriate method.

**Q: What if customer misses a payment?**
A: They can pay late. Late fee may apply based on business rules. System sends reminders.

### Completion Questions

**Q: What if items are out of stock at completion?**
A: Contact manager. May need to substitute items or cancel layby.

**Q: Do we have to create an order?**
A: Recommended, but optional. Order tracks the sale in your system.

**Q: What if customer hasn't paid full balance?**
A: Cannot complete. Must record remaining payments first.

**Q: Can customer collect items early?**
A: Only if fully paid. Balance must be $0.00.

### Cancellation Questions

**Q: How much refund does customer get?**
A: Based on business rules. Usually: Total paid - cancellation fee.

**Q: Can we cancel a completed layby?**
A: No, completed laybys cannot be cancelled. Would need separate refund process.

**Q: What happens to items when cancelled?**
A: Returned to available stock automatically.

**Q: Can customer reinstate cancelled layby?**
A: No, must create new layby. Cancelled status is permanent.

### Technical Questions

**Q: System says "Insufficient stock" - what do I do?**
A: Check product stock levels. May need to receive stock first or choose different items.

**Q: I don't see "Record Payment" button - why?**
A: Layby may be ON_HOLD, COMPLETED, or CANCELLED. Check status.

**Q: Layby number didn't generate - what's wrong?**
A: Contact technical support. May be system issue.

**Q: Can I delete a layby?**
A: No, laybys cannot be deleted. Cancel instead.

---

## Getting Help

### Quick Support

**For User Questions:**
- Check this manual first
- Check FAQ section
- Ask your manager
- Contact support team

**For Technical Issues:**
- Note error message
- Note what you were doing
- Contact technical support
- Provide layby number if relevant

### Contact Information

**Support Team:**
- Email: [support email]
- Phone: [support phone]
- Hours: [business hours]

**Manager:**
- Name: [manager name]
- Email: [manager email]
- Phone: [manager phone]

**Emergency After Hours:**
- Contact: [emergency contact]
- Phone: [emergency phone]

---

## Glossary

**Active Layby**: Layby currently accepting payments

**Balance**: Amount still owing on layby

**Cancellation Fee**: Fee charged when layby is cancelled

**Completion**: Process of finalizing layby and releasing items

**Deposit**: Initial payment to start layby (percentage of total)

**Installment**: Regular payment amount

**Layby Agreement**: Contract to reserve items with payment plan

**Layby Number**: Unique identifier (e.g., LAY-CLO-20251027-000001)

**Late Fee**: Fee applied when payment overdue

**On Hold**: Layby temporarily paused

**Receipt Number**: Unique identifier for payment (e.g., RCP-CLO-20251027-000001)

**Service Fee**: Fee for providing layby service

---

## Appendix: Business Rules by Business Type

### Clothing Store
- Deposit: 20-80% (default 20%)
- Frequency: Fortnightly
- Max Duration: 90 days
- Service Fee: 0%
- Late Fee: $5.00
- Cancellation Fee: 10%

### Hardware Store
- Deposit: 30-80% (default 50%)
- Frequency: Monthly
- Max Duration: 60 days
- Service Fee: 1%
- Late Fee: $10.00
- Cancellation Fee: 5%

### Grocery Store
- Deposit: 30-70% (default 30%)
- Frequency: Weekly
- Max Duration: 30 days
- Service Fee: 0%
- Late Fee: $2.00
- Cancellation Fee: 15%

### Restaurant
- Deposit: 100% (full payment)
- Frequency: Weekly
- Max Duration: 14 days
- Service Fee: 2%
- Late Fee: $20.00
- Cancellation Fee: 25%

### Construction Supplies
- Deposit: 40-90% (default 40%)
- Frequency: Monthly
- Max Duration: 120 days
- Service Fee: 1.5%
- Late Fee: $15.00
- Cancellation Fee: 5%

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**For System Version**: 1.0
