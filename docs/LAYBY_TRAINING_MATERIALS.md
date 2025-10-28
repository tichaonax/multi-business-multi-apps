# Layby Management - Training Materials & Quick Reference

## Table of Contents
1. [Training Overview](#training-overview)
2. [Admin Training (2 hours)](#admin-training-2-hours)
3. [Staff Training (1.5 hours)](#staff-training-15-hours)
4. [Manager Training (1 hour)](#manager-training-1-hour)
5. [Quick Reference Cards](#quick-reference-cards)
6. [Training Exercises](#training-exercises)
7. [Assessment Checklist](#assessment-checklist)

---

## Training Overview

### Training Objectives

**By End of Training, Participants Will:**
- Understand layby concepts and benefits
- Navigate the layby system confidently
- Create and manage laybys correctly
- Handle common scenarios
- Know when to escalate issues
- Follow business rules appropriately

### Training Materials Needed

**For All Sessions:**
- [ ] Projector/screen for demonstrations
- [ ] Computers/tablets for hands-on practice
- [ ] Test accounts with appropriate permissions
- [ ] Sample customer data
- [ ] Sample product data
- [ ] User manuals (printed or digital)
- [ ] Quick reference cards
- [ ] Assessment forms
- [ ] Attendance sheet

**Technical Setup:**
- Training environment (not production)
- Test data seeded
- All accounts working
- Internet connection stable

---

## Admin Training (2 hours)

### Session Agenda

**Duration**: 2 hours
**Audience**: System administrators, IT staff
**Prerequisites**: Technical background, database knowledge

#### Module 1: System Architecture (20 minutes)

**Topics:**
1. **Technology Stack**
   - Next.js application
   - Prisma ORM
   - PostgreSQL database
   - API structure

2. **Database Schema**
   - customer_laybys table
   - customer_layby_payments table
   - Relationships and foreign keys
   - Indexes and performance

3. **File Structure**
   - API routes location
   - Frontend pages
   - Business logic libraries
   - Configuration files

**Hands-On:**
- Tour of codebase
- View database tables
- Inspect API endpoints

---

#### Module 2: User Management (20 minutes)

**Topics:**
1. **Permission System**
   - `canManageLaybys` permission
   - Direct vs role-based permissions
   - Business membership requirements

2. **Granting Access**
   - Add permission to user account
   - Add permission to role
   - Add user to business

3. **Customer Configuration**
   - Enable `allowLayby` on customer
   - Bulk enabling customers

**Hands-On:**
1. Grant permission to test user
2. Create test role with layby permission
3. Assign user to role
4. Enable layby for test customer

**Exercise:**
```
Task: Set up new employee for layby management
1. Create user account
2. Add to "Sales Staff" role (has canManageLaybys)
3. Add user to business membership
4. Verify user can access layby pages
5. Enable layby for 5 test customers
```

---

#### Module 3: Business Rules Configuration (25 minutes)

**Topics:**
1. **Rule Components**
   - Deposit percentages
   - Installment frequencies
   - Duration limits
   - Fee structures
   - Policies
   - Automation settings

2. **Viewing Rules**
   - Business Rules page for users
   - Rules file for admins
   - How rules are applied

3. **Modifying Rules**
   - Editing business-rules.ts
   - Testing changes
   - Deploying updates
   - Impact on existing laybys

**Hands-On:**
1. View rules for each business type
2. Compare rule differences
3. Understand validation logic

**Exercise:**
```
Scenario: Need to change clothing store deposit minimum from 20% to 25%

Steps:
1. Open src/lib/layby/business-rules.ts
2. Find clothingBusinessRules
3. Change min from 20 to 25
4. Test in development
5. Verify validation enforces new minimum
6. Document change
```

---

#### Module 4: Automation Management (30 minutes)

**Topics:**
1. **Automation Tasks**
   - Payment reminders
   - Overdue notifications
   - Late fee application
   - Default processing

2. **Scheduling**
   - Cron job setup
   - Windows Task Scheduler
   - Manual triggering

3. **Monitoring**
   - Job history
   - Error logs
   - Success metrics

4. **Troubleshooting**
   - Job not running
   - Notifications not sending
   - Fee application issues

**Hands-On:**
1. View automation page
2. Check job history
3. Trigger manual run
4. Review results

**Exercise:**
```
Task: Set up daily automation
1. Configure cron job for 6:00 AM daily
2. Test manual run
3. Verify notifications sent
4. Check job history
5. Review error logs
```

---

#### Module 5: Database Administration (25 minutes)

**Topics:**
1. **Maintenance Tasks**
   - Vacuum and analyze
   - Reindex tables
   - Check table sizes

2. **Data Integrity**
   - Balance verification queries
   - Payment total checks
   - Completed layby validation

3. **Backup and Recovery**
   - Daily backup procedure
   - Verification steps
   - Recovery process

4. **Performance Monitoring**
   - Slow query detection
   - Connection monitoring
   - Index usage

**Hands-On:**
1. Run integrity check queries
2. Perform vacuum analyze
3. Check table sizes

**SQL Reference:**
```sql
-- Check balance integrity
SELECT id, "laybyNumber",
  "totalAmount", "totalFees", "totalPaid", "balanceRemaining",
  ("totalAmount" + "totalFees" - "totalPaid") AS calculated_balance
FROM customer_laybys
WHERE ABS("balanceRemaining" - ("totalAmount" + "totalFees" - "totalPaid")) > 0.01;

-- Verify payment totals
SELECT l.id, l."laybyNumber",
  l."totalPaid" AS layby_total,
  SUM(p.amount) AS payments_sum
FROM customer_laybys l
LEFT JOIN customer_layby_payments p ON l.id = p."laybyId"
GROUP BY l.id
HAVING ABS(l."totalPaid" - COALESCE(SUM(p.amount), 0)) > 0.01;
```

---

#### Module 6: Troubleshooting & Support (20 minutes)

**Topics:**
1. **Common Issues**
   - Permission problems
   - Balance calculation errors
   - Automation failures
   - Performance issues

2. **Diagnostic Steps**
   - Check logs
   - Verify database
   - Test API endpoints
   - Review configuration

3. **Escalation**
   - When to escalate
   - Information to collect
   - Emergency procedures

**Hands-On:**
1. Review common error scenarios
2. Practice diagnostic queries
3. Check application logs

---

### Admin Training Assessment

**Knowledge Check:**
1. [ ] Can explain system architecture
2. [ ] Can grant layby permissions
3. [ ] Understands business rules structure
4. [ ] Can configure automation
5. [ ] Can perform database maintenance
6. [ ] Knows troubleshooting procedures
7. [ ] Can access and interpret logs
8. [ ] Understands backup procedures

**Practical Assessment:**
- Grant permission to new user
- Configure customer for layby
- Trigger manual automation
- Run integrity check query
- Resolve sample issue

---

## Staff Training (1.5 hours)

### Session Agenda

**Duration**: 1.5 hours
**Audience**: Sales staff, customer service representatives
**Prerequisites**: General computer skills, customer service experience

#### Module 1: Introduction to Laybys (15 minutes)

**Topics:**
1. **What is a Layby?**
   - Payment plan concept
   - Reserve items with deposit
   - Pay balance over time
   - Collect items when paid

2. **Benefits**
   - For customers: Afford larger purchases
   - For business: Secured sales
   - For staff: Customer satisfaction

3. **Key Terms**
   - Deposit, Balance, Installment
   - Layby number, Receipt number
   - Status (ACTIVE, COMPLETED, etc.)

**Interactive Discussion:**
- Have you used layby as a customer?
- Why would customers choose layby?
- Questions about the concept?

---

#### Module 2: Navigating the System (15 minutes)

**Topics:**
1. **Accessing Laybys**
   - Login to system
   - Find Laybys menu
   - Understand page layout

2. **Layby List Page**
   - View all laybys
   - Use filters
   - Search by customer
   - Sort by date/status

3. **Layby Detail Page**
   - Customer information
   - Items list
   - Financial summary
   - Payment history
   - Action buttons

**Hands-On Practice:**
1. Login to training system
2. Navigate to Laybys page
3. Find a specific layby
4. View layby details
5. Review payment history

---

#### Module 3: Creating Laybys (25 minutes)

**Topics:**
1. **Before You Start**
   - Verify customer has layby enabled
   - Check stock availability
   - Understand business rules

2. **Step-by-Step Creation**
   - Click "New Layby"
   - Select customer
   - Add items (product, quantity)
   - Set deposit percentage
   - Configure payment schedule
   - Add any fees
   - Review and create

3. **Common Mistakes**
   - Wrong customer selected
   - Insufficient stock
   - Deposit too low
   - Completion date too far

**Hands-On Practice:**
1. Create layby for test customer
2. Add 2-3 items
3. Set 20% deposit
4. Configure fortnightly payments
5. Submit and verify creation

**Exercise Scenarios:**
```
Exercise 1: Simple Layby
- Customer: John Smith
- Items: 1 shirt ($50), 1 pants ($80)
- Total: $130
- Deposit: 20% ($26)
- Payments: $26 fortnightly × 4

Exercise 2: Multiple Items
- Customer: Jane Doe
- Items: 3 items totaling $400
- Deposit: 30% ($120)
- Payments: $70 fortnightly × 4

Exercise 3: Error Handling
- Try to create layby with 10% deposit (should fail)
- Try to add out-of-stock item (should fail)
- Correct and successfully create
```

---

#### Module 4: Recording Payments (20 minutes)

**Topics:**
1. **Payment Process**
   - Open layby detail
   - Click "Record Payment"
   - Enter amount
   - Select payment method
   - Add reference (optional)
   - Submit

2. **Payment Methods**
   - CASH: Physical money
   - EFTPOS: Card machine
   - CREDIT_CARD: Card payment
   - BANK_TRANSFER: Direct deposit

3. **Important Rules**
   - Cannot exceed balance
   - Cannot pay negative amounts
   - Auto-completes when balance hits $0

4. **Receipt Numbers**
   - Format: RCP-XXX-YYYYMMDD-######
   - Give to customer
   - Used for records

**Hands-On Practice:**
1. Open test layby
2. Record $50 payment (CASH)
3. Check balance updated
4. Note receipt number
5. Record another payment
6. Record final payment (watch auto-complete)

**Exercise Scenarios:**
```
Exercise 1: Regular Payment
- Layby balance: $200
- Customer pays: $50 CASH
- New balance: $150

Exercise 2: Final Payment
- Layby balance: $30
- Customer pays: $30 EFTPOS
- Status changes to COMPLETED
- Items released

Exercise 3: Overpayment Attempt
- Layby balance: $100
- Try to pay: $150
- System prevents (error message)
- Pay correct amount: $100
```

---

#### Module 5: Completing and Cancelling (15 minutes)

**Topics:**
1. **Completing Laybys**
   - When to complete
   - Auto-complete vs manual
   - Order creation
   - Releasing items to customer

2. **Cancelling Laybys**
   - When to cancel
   - Cancellation reasons
   - Refund calculation
   - Cancellation fee

3. **Holding and Reactivating**
   - Temporary holds
   - Customer traveling
   - Financial difficulty
   - Reactivating when ready

**Hands-On Practice:**
1. Complete a fully-paid layby
2. Cancel a layby with reason
3. Calculate refund
4. Put layby on hold
5. Reactivate held layby

---

#### Module 6: Real-World Scenarios (20 minutes)

**Role-Playing Exercises:**

**Scenario 1: Happy Customer**
- Customer wants layby for $300 dress
- Walk through creation process
- Explain payment schedule
- Answer customer questions

**Scenario 2: Stock Issue**
- Customer wants item out of stock
- Explain situation
- Offer alternatives
- Handle customer disappointment

**Scenario 3: Late Payment**
- Customer arrives to pay, 3 days late
- Late fee applied ($5)
- Explain fee politely
- Process payment
- Update schedule

**Scenario 4: Cancellation Request**
- Customer wants to cancel
- Total paid: $200
- Cancellation fee: $20 (10%)
- Refund: $180
- Process cancellation
- Issue refund

**Scenario 5: Completion Day**
- Customer arrives to collect
- Verify identity
- Check items
- Complete layby
- Release items
- Thank customer

---

### Staff Training Assessment

**Knowledge Check:**
1. [ ] Can explain layby concept
2. [ ] Can navigate system
3. [ ] Can create layby correctly
4. [ ] Can record payments
5. [ ] Knows payment methods
6. [ ] Can complete laybys
7. [ ] Can cancel with refund
8. [ ] Handles scenarios professionally

**Practical Assessment:**
- Create layby for test scenario
- Record payment correctly
- Complete layby properly
- Calculate cancellation refund
- Answer customer questions

**Certification:**
- Staff member has completed training
- Demonstrated competency
- Authorized to manage laybys
- Understands when to escalate

---

## Manager Training (1 hour)

### Session Agenda

**Duration**: 1 hour
**Audience**: Store managers, supervisors
**Prerequisites**: Business management experience, staff training completed

#### Module 1: Business Rules and Policies (15 minutes)

**Topics:**
1. **Your Business Rules**
   - Review rules for your business type
   - Deposit requirements
   - Duration limits
   - Fee structures

2. **Why These Rules**
   - Protect business interests
   - Match industry standards
   - Balance customer service with risk

3. **Explaining to Customers**
   - How to discuss deposit requirements
   - Explaining fees clearly
   - Setting expectations

**Discussion:**
- Review your specific business rules
- Questions about policies
- Scenarios where exceptions needed

---

#### Module 2: Monitoring and Reporting (15 minutes)

**Topics:**
1. **Layby Dashboard**
   - Active laybys count
   - Overdue payments
   - Completion rate
   - Revenue metrics

2. **Key Metrics**
   - Average layby value
   - Default rate
   - Cancellation rate
   - Time to completion

3. **Reports**
   - Daily layby summary
   - Monthly performance
   - Customer layby history
   - Staff performance

4. **Business Rules Page**
   - View current rules
   - Understand limitations
   - Know when to escalate rule changes

**Hands-On:**
1. Access layby list with filters
2. View automation page
3. Check business rules
4. Identify metrics to monitor

---

#### Module 3: Staff Management (15 minutes)

**Topics:**
1. **Training Staff**
   - Ensure all staff trained
   - Verify competency
   - Ongoing coaching
   - Refresher training

2. **Monitoring Performance**
   - Layby creation accuracy
   - Payment recording errors
   - Customer satisfaction
   - Adherence to policies

3. **Common Staff Mistakes**
   - Wrong customer selected
   - Incorrect calculations
   - Overpayment attempts
   - Missing documentation

4. **Coaching Opportunities**
   - Customer service excellence
   - Attention to detail
   - Problem-solving
   - Escalation judgment

---

#### Module 4: Problem Resolution (15 minutes)

**Topics:**
1. **Escalation Scenarios**
   - Customer disputes
   - System errors
   - Complex cancellations
   - Special circumstances

2. **Resolution Authority**
   - What you can approve
   - When to involve admin
   - Emergency procedures
   - Documentation requirements

3. **Customer Service**
   - Handling complaints
   - Win-back strategies
   - Policy explanations
   - Compensation decisions

**Scenario Practice:**

**Scenario 1: Late Fee Dispute**
- Customer disputes $5 late fee
- Payment was 1 day late
- Customer claims they called ahead
- How do you handle?

**Scenario 2: Cancellation Exception**
- Customer needs to cancel due to job loss
- Paid $500, cancellation fee would be $50
- Customer is regular, good customer
- Can you waive the fee?

**Scenario 3: Item Damage**
- Customer reserved item on layby
- Item damaged while in storage
- Customer fully paid
- What's the resolution?

---

### Manager Training Assessment

**Knowledge Check:**
1. [ ] Understands business rules
2. [ ] Can monitor performance
3. [ ] Knows key metrics
4. [ ] Can coach staff
5. [ ] Handles escalations appropriately
6. [ ] Makes sound business decisions
7. [ ] Balances policy with service
8. [ ] Documents decisions

**Management Scenarios:**
- Staff makes repeated errors
- Customer requests exception
- System issue affecting multiple laybys
- Staff needs coaching on process

---

## Quick Reference Cards

### Card 1: Creating a Layby

**Quick Steps:**
1. Laybys → New Layby
2. Select Customer
3. Add Items
4. Set Deposit (min 20%)
5. Configure Payments
6. Review → Create

**Remember:**
- Check stock first
- Verify customer details
- Note layby number
- Give customer copy

---

### Card 2: Recording Payment

**Quick Steps:**
1. Find layby
2. Click "Record Payment"
3. Enter amount (≤ balance)
4. Select method
5. Add reference
6. Submit

**Remember:**
- Check balance first
- Cannot exceed balance
- Note receipt number
- Auto-completes at $0

---

### Card 3: Completing Layby

**Quick Steps:**
1. Verify balance = $0
2. Click "Complete Layby"
3. Check "Create Order"
4. Confirm
5. Release items

**Remember:**
- Must be fully paid
- Verify customer ID
- Check all items present
- Get customer signature

---

### Card 4: Cancelling Layby

**Quick Steps:**
1. Click "Cancel Layby"
2. Enter reason
3. Check refund amount
4. Confirm cancellation
5. Process refund separately

**Formula:**
Refund = Total Paid - Cancellation Fee
(Fee = Total Paid × Fee %)

---

### Card 5: Business Rules Summary

**Clothing:**
- Deposit: 20-80%
- Duration: 90 days
- Late fee: $5

**Hardware:**
- Deposit: 30-80%
- Duration: 60 days
- Late fee: $10

**Grocery:**
- Deposit: 30-70%
- Duration: 30 days
- Late fee: $2

---

### Card 6: Troubleshooting

**Cannot see laybys?**
- Check permission
- Contact manager

**Cannot record payment?**
- Check status (must be ACTIVE)
- Check if on hold

**Balance wrong?**
- Refresh page
- Check payment history
- Contact support

**Stock error?**
- Check availability
- Reduce quantity
- Choose different item

---

### Card 7: When to Escalate

**Contact Manager:**
- Customer dispute
- Exception request
- Large refund
- Unusual situation

**Contact Admin:**
- System error
- Permission issue
- Data problem
- Technical failure

**Emergency:**
- System down
- Data corruption
- Security concern

---

## Training Exercises

### Exercise Set 1: Basic Operations

**Exercise 1.1: Create Simple Layby**
- Customer: Test Customer 1
- Item: $200 product
- Deposit: 20% ($40)
- Payments: Fortnightly $40 × 4

**Exercise 1.2: Record Multiple Payments**
- Use layby from 1.1
- Record 4 payments of $40 each
- Watch auto-complete on final payment

**Exercise 1.3: Cancel and Refund**
- Create $300 layby
- Record $150 payment
- Cancel with 10% fee
- Calculate refund ($135)

---

### Exercise Set 2: Problem Scenarios

**Exercise 2.1: Insufficient Stock**
- Try to create layby
- Product out of stock
- Handle error
- Find alternative

**Exercise 2.2: Overpayment Attempt**
- Layby balance: $100
- Try to pay $150
- Handle error
- Pay correct amount

**Exercise 2.3: Late Payment**
- Find overdue layby
- Note late fee applied
- Record payment
- Explain to "customer"

---

### Exercise Set 3: Complex Scenarios

**Exercise 3.1: Partial Release (Hardware)**
- Create layby with 3 items
- Pay 50%
- Discuss partial release
- Complete remainder

**Exercise 3.2: Event Booking (Restaurant)**
- Create event layby (100% deposit)
- Schedule payments before event
- Discuss cancellation policy

**Exercise 3.3: Project Materials (Construction)**
- Large order ($10,000)
- 40% deposit
- Monthly payments
- Phased delivery

---

## Assessment Checklist

### Staff Certification Checklist

**Trainee Name**: ________________
**Trainer Name**: ________________
**Date**: ________________

**Knowledge Assessment:**
- [ ] Explains layby concept correctly
- [ ] Understands business rules
- [ ] Knows deposit requirements
- [ ] Understands payment methods
- [ ] Can calculate balances

**System Navigation:**
- [ ] Logs in successfully
- [ ] Finds laybys page
- [ ] Uses filters correctly
- [ ] Views layby details
- [ ] Interprets information

**Creating Laybys:**
- [ ] Selects correct customer
- [ ] Adds items correctly
- [ ] Sets appropriate deposit
- [ ] Configures payment schedule
- [ ] Reviews before submitting
- [ ] Verifies creation success

**Recording Payments:**
- [ ] Checks balance first
- [ ] Enters amount correctly
- [ ] Selects payment method
- [ ] Notes receipt number
- [ ] Verifies balance update

**Completing/Cancelling:**
- [ ] Verifies requirements met
- [ ] Calculates refunds correctly
- [ ] Processes correctly
- [ ] Documents appropriately

**Customer Service:**
- [ ] Explains policies clearly
- [ ] Answers questions accurately
- [ ] Handles issues professionally
- [ ] Knows when to escalate

**Overall Assessment:**
- [ ] **CERTIFIED** - Ready for independent work
- [ ] **NEEDS PRACTICE** - Additional training needed
- [ ] **NOT READY** - Significant gaps, retrain

**Trainer Signature**: ________________
**Manager Signature**: ________________

---

### Training Feedback Form

**Session**: [ ] Admin  [ ] Staff  [ ] Manager
**Date**: ________________
**Trainer**: ________________

**Content Quality:**
- [ ] Excellent   [ ] Good   [ ] Fair   [ ] Poor

**Presentation:**
- [ ] Excellent   [ ] Good   [ ] Fair   [ ] Poor

**Hands-On Practice:**
- [ ] Excellent   [ ] Good   [ ] Fair   [ ] Poor

**Materials Provided:**
- [ ] Excellent   [ ] Good   [ ] Fair   [ ] Poor

**What worked well:**
_________________________________________________

**What could be improved:**
_________________________________________________

**Additional topics needed:**
_________________________________________________

**Questions still unclear:**
_________________________________________________

**Ready to use system:**
- [ ] Yes, confident
- [ ] Yes, with support
- [ ] No, need more training

**Participant Signature**: ________________

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**Training Valid**: Until system version changes
