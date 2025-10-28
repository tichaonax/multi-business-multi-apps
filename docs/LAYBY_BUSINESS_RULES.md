# Layby Management - Business Rules Reference

## Table of Contents
1. [Introduction](#introduction)
2. [Rule Components Explained](#rule-components-explained)
3. [Clothing Business Rules](#clothing-business-rules)
4. [Hardware Business Rules](#hardware-business-rules)
5. [Grocery Business Rules](#grocery-business-rules)
6. [Restaurant Business Rules](#restaurant-business-rules)
7. [Construction Business Rules](#construction-business-rules)
8. [Default Business Rules](#default-business-rules)
9. [Rule Examples and Scenarios](#rule-examples-and-scenarios)
10. [Rule Change History](#rule-change-history)

---

## Introduction

### What Are Business Rules?

Business rules define how the layby system operates for each business type. Different businesses have different needs:
- **Clothing stores** need longer layby periods for seasonal items
- **Hardware stores** require higher deposits for expensive tools
- **Grocery stores** need shorter periods for perishable goods
- **Restaurants** require full payment for event bookings
- **Construction suppliers** allow longer terms for project materials

### How Rules Are Applied

**Automatic Application:**
- System determines your business type
- Applies appropriate rules automatically
- Enforces rules during layby creation
- Prevents invalid configurations

**Rule Enforcement:**
- Minimum/maximum values enforced
- Invalid entries rejected
- Helpful error messages displayed
- Business integrity maintained

### Viewing Your Business Rules

**For Users:**
1. Log into the system
2. Navigate to **Laybys** menu
3. Click **"Business Rules"** link
4. View rules for your business type

**What You'll See:**
- Deposit rules
- Installment options
- Duration limits
- Fee structures
- Policies and settings
- Automation configuration

---

## Rule Components Explained

### Deposit Rules

**Minimum Percentage:**
- Smallest deposit allowed
- Example: 20% means $20 deposit on $100 total

**Maximum Percentage:**
- Largest deposit allowed
- Example: 80% means maximum $80 deposit on $100 total

**Default Percentage:**
- Pre-filled value when creating layby
- Can be adjusted within min/max range

**Why Limits Exist:**
- Minimum protects business (customer commitment)
- Maximum ensures customer has payment plan (not full payment upfront)

---

### Installment Frequency

**Options:**
- **WEEKLY**: Every 7 days
- **FORTNIGHTLY**: Every 14 days
- **MONTHLY**: Every 30 days (approximately)
- **CUSTOM**: Negotiated schedule

**Allowed Frequencies:**
- Business type determines available options
- Some businesses allow all, others restrict

**Example:**
- Grocery stores typically WEEKLY (shorter term)
- Construction typically MONTHLY (longer projects)

---

### Maximum Duration

**What It Means:**
- Longest time from deposit to completion
- Counted in days from layby creation date

**Why It Matters:**
- Inventory tied up longer = risk
- Perishable goods need faster turnover
- Seasonal items may become outdated

**Examples:**
- 30 days: Grocery (perishables)
- 60 days: Hardware (tools, materials)
- 90 days: Clothing (seasonal items)
- 120 days: Construction (project duration)

---

### Fee Structure

**Service Fee:**
- Percentage of total amount
- Charged for providing layby service
- Added to balance at creation
- Example: 1% of $1000 = $10

**Late Fee:**
- Fixed amount per occurrence
- Applied when payment overdue
- Added after X days overdue
- Example: $5.00 per late payment

**Administration Fee:**
- Fixed amount per layby
- Charged at creation
- Covers paperwork/processing
- Example: $5.00 per layby

**Cancellation Fee:**
- Percentage of total paid
- Deducted from refund when cancelled
- Covers processing and restocking
- Example: 10% of $300 paid = $30 fee

---

### Policies

**Inventory Reservation:**
- **FULL**: Reserve all items immediately
- **PARTIAL**: Reserve some items (non-perishables)
- **NONE**: No reservation (services, perishables)

**Refund Policy:**
- **FULL**: Return all money paid
- **PARTIAL**: Keep deposit, return payments
- **NONE**: No refunds (rare)

**Approval Requirement:**
- **Required**: Manager must approve layby
- **Not Required**: Staff can create independently

**Partial Release:**
- **Allowed**: Release items as sections paid
- **Not Allowed**: All items released together

---

### Automation Settings

**Auto-Complete on Full Payment:**
- System automatically completes when balance reaches $0
- Creates order automatically
- Releases items
- Most businesses enable this

**Payment Reminders:**
- Automated notifications before due date
- Sent via SMS and/or email
- Reduces missed payments

**Default After Missed Payments:**
- Number of missed payments before default
- 1-2 missed payments typical
- System changes status to DEFAULTED

**Apply Late Fee After Days:**
- Days after due date before late fee applied
- Typically 1 day
- Gives grace period

---

### Validation Rules

**Minimum Item Count:**
- Fewest items allowed per layby
- Usually 1 item minimum

**Maximum Item Count:**
- Most items allowed per layby
- Prevents overly complex laybys
- Typically 10-20 items

**Minimum Total Amount:**
- Smallest layby value accepted
- Ensures worthwhile for business
- Example: $50 minimum

**Maximum Total Amount:**
- Largest layby value accepted (if any)
- Risk management
- Example: $5000 maximum

---

## Clothing Business Rules

### Overview
**Business Type:** `clothing`
**Common For:** Fashion stores, boutiques, apparel retailers

### Complete Rule Set

#### Deposit Rules
```
Minimum:  20%
Maximum:  80%
Default:  20%
```

**Example:**
- $500 total → $100 minimum deposit (20%)
- $500 total → $400 maximum deposit (80%)

---

#### Installment Frequency
```
Allowed:  WEEKLY, FORTNIGHTLY, MONTHLY
Default:  FORTNIGHTLY
```

**Typical Schedule:**
- Deposit: $100 (20% of $500)
- Fortnightly payments: $50
- Duration: 8 fortnights (16 weeks)

---

#### Maximum Duration
```
90 days (approximately 3 months)
```

**Why:**
- Seasonal changes (winter → spring)
- Fashion trends change quickly
- Stock turnover important

---

#### Fees
```
Service Fee:        0% (no service fee)
Late Fee:           $5.00 per occurrence
Administration Fee: $0 (no admin fee)
Cancellation Fee:   10% of total paid
```

**Fee Examples:**

**Late Fee:**
- Payment due: October 15
- Paid: October 18
- Late fee: $5.00 applied

**Cancellation Fee:**
- Total paid: $300
- Cancellation fee: $30 (10%)
- Refund: $270

---

#### Policies
```
Inventory Reservation:  FULL
  └─ All items reserved immediately

Refund Policy:          PARTIAL
  └─ Keep deposit, refund payments minus cancellation fee

Approval Required:      No
  └─ Staff can create laybys independently

Partial Release:        No
  └─ All items released together at completion
```

---

#### Automation Settings
```
Auto-Complete:          Yes
Payment Reminders:      Yes (3 days before, 1 day before, due date)
Default After:          2 missed payments
Late Fee After:         1 day overdue
```

---

#### Validation Rules
```
Minimum Items:      1
Maximum Items:      20
Minimum Amount:     $50.00
Maximum Amount:     $5,000.00
```

---

### Clothing Business Scenarios

**Scenario 1: Small Purchase**
- Items: 2 t-shirts, 1 jeans ($150 total)
- Deposit: $30 (20%)
- Payments: $30 fortnightly × 4 = $120
- Duration: 8 weeks
- No fees

**Scenario 2: Large Purchase**
- Items: Winter coat, boots, accessories ($800 total)
- Deposit: $160 (20%)
- Payments: $80 fortnightly × 8 = $640
- Duration: 16 weeks
- Service fee: $0
- Total: $800

**Scenario 3: Late Payment**
- Payment due: Nov 1
- Customer pays: Nov 3
- Late fee: $5
- New balance includes late fee

**Scenario 4: Cancellation**
- Total paid: $400
- Cancellation fee: $40 (10%)
- Refund: $360

---

## Hardware Business Rules

### Overview
**Business Type:** `hardware`
**Common For:** Hardware stores, tool shops, building supplies

### Complete Rule Set

#### Deposit Rules
```
Minimum:  30%
Maximum:  80%
Default:  50%
```

**Why Higher Deposit:**
- Expensive items (tools, equipment)
- Higher risk of damage/theft
- Specialized products harder to resell

**Example:**
- $1000 total → $300 minimum deposit (30%)
- $1000 total → $500 default deposit (50%)

---

#### Installment Frequency
```
Allowed:  FORTNIGHTLY, MONTHLY
Default:  MONTHLY
```

**Typical Schedule:**
- Larger items suit monthly payments
- Higher payment amounts
- Professional customers prefer monthly

---

#### Maximum Duration
```
60 days (approximately 2 months)
```

**Why Shorter:**
- Tool rental opportunity cost
- Inventory turnover
- Project deadlines

---

#### Fees
```
Service Fee:        1% of total
Late Fee:           $10.00 per occurrence
Administration Fee: $5.00 per layby
Cancellation Fee:   5% of total paid
```

**Fee Examples:**

**Service Fee:**
- Total: $1000
- Service fee: $10 (1%)
- Added to balance

**Late Fee:**
- Higher than clothing (more expensive items)
- $10 per late payment

**Administration Fee:**
- $5 charged at creation
- Covers paperwork and processing

**Cancellation Fee:**
- Total paid: $600
- Cancellation fee: $30 (5%)
- Refund: $570

---

#### Policies
```
Inventory Reservation:  FULL
  └─ Tools and equipment reserved completely

Refund Policy:          FULL (if cancelled within 48 hours)
                        PARTIAL (after 48 hours)
  └─ Early cancellation: Full refund minus admin fee
  └─ Later cancellation: Refund minus cancellation fee

Approval Required:      No

Partial Release:        Yes
  └─ Can release items as sections paid
  └─ Example: Pay 50%, release half the items
```

---

#### Automation Settings
```
Auto-Complete:          Yes
Payment Reminders:      Yes
Default After:          1 missed payment
  └─ Stricter than clothing (expensive items)
Late Fee After:         1 day overdue
```

---

#### Validation Rules
```
Minimum Items:      1
Maximum Items:      15
Minimum Amount:     $100.00
Maximum Amount:     $10,000.00
```

---

### Hardware Business Scenarios

**Scenario 1: Power Tool Purchase**
- Item: Cordless drill set ($600)
- Deposit: $300 (50%)
- Service fee: $6 (1%)
- Admin fee: $5
- Balance: $311
- Monthly payment: $155.50 × 2
- Duration: 60 days

**Scenario 2: Multiple Tools**
- Items: Saw, drill, sander ($1500 total)
- Deposit: $750 (50%)
- Service fee: $15 (1%)
- Admin fee: $5
- Balance: $770
- Monthly payment: $385 × 2
- Duration: 60 days

**Scenario 3: Partial Release**
- 3 items on layby
- Paid 50% of balance
- Release 1 item immediately
- Remaining items released at completion

**Scenario 4: Quick Cancellation**
- Created layby today
- Customer cancels within 48 hours
- Full refund minus $5 admin fee
- No cancellation fee (within grace period)

---

## Grocery Business Rules

### Overview
**Business Type:** `grocery`
**Common For:** Grocery stores, supermarkets (bulk orders, events)

### Complete Rule Set

#### Deposit Rules
```
Minimum:  30%
Maximum:  70%
Default:  30%
```

**Why These Limits:**
- Perishable goods risk
- Quick turnover needed
- Event-based purchases common

---

#### Installment Frequency
```
Allowed:  WEEKLY
Default:  WEEKLY
```

**Why Weekly Only:**
- Short duration (30 days)
- Perishable goods
- Event deadlines
- Quick payment completion

---

#### Maximum Duration
```
30 days (approximately 1 month)
```

**Why So Short:**
- Perishable goods (meat, produce)
- Event dates (catering)
- Stock rotation
- Freshness concerns

---

#### Fees
```
Service Fee:        0%
Late Fee:           $2.00 per occurrence
Administration Fee: $0
Cancellation Fee:   15% of total paid
```

**Why These Fees:**

**Low Late Fee:**
- Shorter term, smaller amounts
- Customer-friendly

**Higher Cancellation Fee:**
- Perishable goods harder to resell
- Event catering has preparation costs
- Last-minute cancellations costly

---

#### Policies
```
Inventory Reservation:  PARTIAL
  └─ Non-perishables reserved
  └─ Perishables not reserved (ordered at completion)

Refund Policy:          PARTIAL
  └─ Cancellation fee protects against spoilage

Approval Required:      No

Partial Release:        No
  └─ All items for single event/order
```

---

#### Automation Settings
```
Auto-Complete:          Yes
Payment Reminders:      Yes
Default After:          1 missed payment
  └─ Short term, strict enforcement
Late Fee After:         1 day overdue
```

---

#### Validation Rules
```
Minimum Items:      1
Maximum Items:      50
  └─ Bulk orders common (event catering)
Minimum Amount:     $100.00
Maximum Amount:     $3,000.00
```

---

### Grocery Business Scenarios

**Scenario 1: Event Catering Order**
- Items: Meats, vegetables, drinks for party ($800)
- Deposit: $240 (30%)
- Weekly payment: $140 × 4 = $560
- Duration: 28 days (4 weeks)
- Items prepared/delivered at completion

**Scenario 2: Bulk Purchase**
- Items: Non-perishable goods ($400)
- Deposit: $120 (30%)
- Weekly payment: $70 × 4 = $280
- Duration: 28 days
- Non-perishables reserved immediately

**Scenario 3: Late Payment**
- Payment due: Friday
- Customer pays: Monday (3 days late)
- Late fee: $2 (lower than other business types)

**Scenario 4: Last-Minute Cancellation**
- Event in 3 days
- Customer cancels
- Total paid: $600
- Cancellation fee: $90 (15%)
- Refund: $510
- Higher fee covers preparation/spoilage

---

## Restaurant Business Rules

### Overview
**Business Type:** `restaurant`
**Common For:** Restaurants, catering, event venues

### Complete Rule Set

#### Deposit Rules
```
Minimum:  100%
Maximum:  100%
Default:  100%
```

**Why 100% Deposit:**
- Event-based bookings
- Catering requires full payment upfront
- Venue reservations
- Not traditional layby (prepayment model)

---

#### Installment Frequency
```
Allowed:  WEEKLY
Default:  WEEKLY
```

**Usage:**
- Even with 100% deposit, allows payment schedule
- Large events may pay in chunks leading up to event
- Deposits weeks before event

---

#### Maximum Duration
```
14 days (2 weeks)
```

**Why So Short:**
- Event-specific
- Food ordered close to event date
- Short booking window

---

#### Fees
```
Service Fee:        2% of total
Late Fee:           $20.00 per occurrence
Administration Fee: $10.00 per layby
Cancellation Fee:   25% of total paid
```

**Why Higher Fees:**

**Service Fee:**
- Event planning overhead
- Menu customization
- Coordination costs

**Late Fee:**
- Events have fixed dates
- Late payment affects planning
- Staff scheduling depends on payment

**Administration Fee:**
- Event booking paperwork
- Menu planning
- Coordination

**Cancellation Fee:**
- Food already ordered
- Staff already scheduled
- Lost opportunity cost
- Higher than other business types

---

#### Policies
```
Inventory Reservation:  NONE
  └─ Service-based (food made fresh)
  └─ No physical inventory to reserve

Refund Policy:          PARTIAL
  └─ High cancellation fee (food, staff costs)

Approval Required:      Yes
  └─ Manager approval for events

Partial Release:        No
  └─ Event happens all at once
```

---

#### Automation Settings
```
Auto-Complete:          Yes
Payment Reminders:      Yes
Default After:          1 missed payment
  └─ Events have fixed dates
Late Fee After:         1 day overdue
  └─ Strict timing for event preparation
```

---

#### Validation Rules
```
Minimum Items:      1
  └─ Typically one "event package"
Maximum Items:      10
Minimum Amount:     $100.00
Maximum Amount:     $20,000.00
  └─ Large events (weddings, corporate)
```

---

### Restaurant Business Scenarios

**Scenario 1: Wedding Catering**
- Event: Wedding for 100 people ($5000)
- Deposit (full amount): $5000
- Service fee: $100 (2%)
- Admin fee: $10
- Total: $5110
- Payment schedule: $1022 weekly × 5 weeks before wedding
- Event date: Fixed

**Scenario 2: Corporate Event**
- Event: Company lunch ($800)
- Payment: $816 total (includes fees)
- Paid 2 weeks before event
- Cancellation 5 days before: $204 cancellation fee (25%)

**Scenario 3: Late Payment**
- Payment due: 7 days before event
- Customer pays: 6 days before
- Late fee: $20 applied
- Creates stress on planning

**Scenario 4: Cancellation**
- Event: 3 days away
- Customer cancels
- Total paid: $2000
- Cancellation fee: $500 (25%)
- Refund: $1500
- Food already ordered, staff scheduled

---

## Construction Business Rules

### Overview
**Business Type:** `construction`
**Common For:** Construction suppliers, building materials, contractor supplies

### Complete Rule Set

#### Deposit Rules
```
Minimum:  40%
Maximum:  90%
Default:  40%
```

**Why Higher Deposit:**
- Large orders (project materials)
- Specialized items
- Bulk quantities
- Longer duration

---

#### Installment Frequency
```
Allowed:  FORTNIGHTLY, MONTHLY
Default:  MONTHLY
```

**Typical Usage:**
- Project-based purchases
- Professional contractors
- Align with project milestones
- Monthly invoicing common

---

#### Maximum Duration
```
120 days (approximately 4 months)
```

**Why Longer:**
- Project duration (construction takes time)
- Materials delivered in phases
- Payment tied to project milestones
- Contractor payment schedules

---

#### Fees
```
Service Fee:        1.5% of total
Late Fee:           $15.00 per occurrence
Administration Fee: $10.00 per layby
Cancellation Fee:   5% of total paid
```

**Fee Structure:**

**Service Fee:**
- Order management
- Delivery coordination
- Project tracking

**Late Fee:**
- Moderate ($15)
- Professional customers
- Project delays costly

**Administration Fee:**
- Order processing
- Delivery scheduling
- Documentation

**Cancellation Fee:**
- Low (5%) - materials often reusable
- Project cancellations happen
- Good customer relationships important

---

#### Policies
```
Inventory Reservation:  FULL
  └─ Bulk orders reserved completely
  └─ Special orders may be placed

Refund Policy:          FULL
  └─ Professional customers
  └─ Materials can be resold

Approval Required:      Yes
  └─ Large orders need approval
  └─ Credit checks may apply

Partial Release:        Yes
  └─ Materials delivered in phases
  └─ Release as project progresses
  └─ Align with construction stages
```

---

#### Automation Settings
```
Auto-Complete:          Yes
Payment Reminders:      Yes
Default After:          2 missed payments
  └─ Professional customers, more lenient
Late Fee After:         1 day overdue
```

---

#### Validation Rules
```
Minimum Items:      1
Maximum Items:      100
  └─ Large orders common (full project materials)
Minimum Amount:     $500.00
Maximum Amount:     $50,000.00
  └─ Large construction projects
```

---

### Construction Business Scenarios

**Scenario 1: House Build Materials**
- Items: Lumber, concrete, supplies ($20,000)
- Deposit: $8,000 (40%)
- Service fee: $300 (1.5%)
- Admin fee: $10
- Balance: $12,310
- Monthly payment: $3,077.50 × 4
- Duration: 120 days
- Partial release: Foundation materials first, framing later, finishing last

**Scenario 2: Renovation Project**
- Items: Flooring, fixtures, hardware ($5,000)
- Deposit: $2,000 (40%)
- Service fee: $75 (1.5%)
- Admin fee: $10
- Balance: $3,085
- Monthly payment: $1,542.50 × 2
- Duration: 60 days

**Scenario 3: Partial Release Schedule**
- Phase 1 (Foundation): Release after 25% paid
- Phase 2 (Framing): Release after 50% paid
- Phase 3 (Finishing): Release after 75% paid
- Final materials: Release at completion

**Scenario 4: Project Cancellation**
- Project cancelled mid-way
- Total paid: $10,000
- Cancellation fee: $500 (5%)
- Refund: $9,500
- Low fee maintains good contractor relationships
- Materials returned to inventory

---

## Default Business Rules

### Overview
**Business Type:** `default`
**Used When:** Business type not recognized or not specified

### Complete Rule Set

#### Deposit Rules
```
Minimum:  20%
Maximum:  80%
Default:  30%
```

---

#### Installment Frequency
```
Allowed:  WEEKLY, FORTNIGHTLY, MONTHLY
Default:  MONTHLY
```

---

#### Maximum Duration
```
90 days
```

---

#### Fees
```
Service Fee:        0%
Late Fee:           $5.00
Administration Fee: $0
Cancellation Fee:   10%
```

---

#### Policies
```
Inventory Reservation:  FULL
Refund Policy:          PARTIAL
Approval Required:      No
Partial Release:        No
```

---

#### Automation Settings
```
Auto-Complete:          Yes
Payment Reminders:      Yes
Default After:          2 missed payments
Late Fee After:         1 day overdue
```

---

#### Validation Rules
```
Minimum Items:      1
Maximum Items:      20
Minimum Amount:     $50.00
Maximum Amount:     $5,000.00
```

**When Used:**
- New business types not yet configured
- General retail businesses
- Miscellaneous shops
- Until specific rules created

---

## Rule Examples and Scenarios

### Cross-Business Comparisons

#### Scenario: $1000 Purchase Across Business Types

**Clothing Store:**
- Deposit: $200 (20%)
- Service fee: $0
- Admin fee: $0
- Balance: $800
- Fortnightly payments: $100 × 8
- Duration: 16 weeks (112 days)
- **Total cost: $1000**

**Hardware Store:**
- Deposit: $500 (50%)
- Service fee: $10 (1%)
- Admin fee: $5
- Balance: $515
- Monthly payments: $257.50 × 2
- Duration: 60 days
- **Total cost: $1015**

**Grocery Store:**
- Deposit: $300 (30%)
- Service fee: $0
- Admin fee: $0
- Balance: $700
- Weekly payments: $175 × 4
- Duration: 28 days
- **Total cost: $1000**

**Restaurant/Event:**
- Deposit: $1000 (100%)
- Service fee: $20 (2%)
- Admin fee: $10
- Balance: $30
- Duration: Up to 14 days
- **Total cost: $1030**

**Construction Supplies:**
- Deposit: $400 (40%)
- Service fee: $15 (1.5%)
- Admin fee: $10
- Balance: $625
- Monthly payments: $312.50 × 2
- Duration: 60 days
- **Total cost: $1025**

---

### Cancellation Refund Comparison

**Scenario: Paid $600, Now Cancelling**

| Business Type | Cancellation Fee % | Fee Amount | Refund |
|---------------|-------------------|------------|--------|
| Clothing      | 10%               | $60        | $540   |
| Hardware      | 5%                | $30        | $570   |
| Grocery       | 15%               | $90        | $510   |
| Restaurant    | 25%               | $150       | $450   |
| Construction  | 5%                | $30        | $570   |

**Why Different:**
- **Higher fees** (Grocery, Restaurant): Perishable goods, event costs
- **Lower fees** (Hardware, Construction): Reusable materials
- **Mid-range** (Clothing): Seasonal but not perishable

---

### Late Fee Impact

**Scenario: $100 Payment, 5 Days Late**

| Business Type | Late Fee | New Balance |
|---------------|----------|-------------|
| Clothing      | $5       | $105        |
| Hardware      | $10      | $110        |
| Grocery       | $2       | $102        |
| Restaurant    | $20      | $120        |
| Construction  | $15      | $115        |

**Frequency:**
- One-time per late occurrence (not daily)
- Applied day after due date
- Automated if automation enabled

---

## Rule Change History

### Version 1.0 (2025-10-27)
- Initial rule set
- 5 business types defined
- Default rules established

### Future Changes
**To be documented here:**
- Rule modifications
- New business types added
- Policy updates
- Fee adjustments

### How Rules Are Updated

**Process:**
1. Business analysis and review
2. Administrator updates rules file
3. Testing in development
4. Deployment to production
5. Communication to users
6. Documentation updated

**Impact:**
- New laybys use new rules immediately
- Existing laybys keep original rules
- Changes don't affect in-progress laybys

---

## Quick Reference Table

### Deposit Percentages

| Business Type | Min | Max | Default |
|---------------|-----|-----|---------|
| Clothing      | 20% | 80% | 20%     |
| Hardware      | 30% | 80% | 50%     |
| Grocery       | 30% | 70% | 30%     |
| Restaurant    | 100%| 100%| 100%    |
| Construction  | 40% | 90% | 40%     |
| Default       | 20% | 80% | 30%     |

### Maximum Duration

| Business Type | Days | Weeks | Months |
|---------------|------|-------|--------|
| Clothing      | 90   | 13    | 3      |
| Hardware      | 60   | 9     | 2      |
| Grocery       | 30   | 4     | 1      |
| Restaurant    | 14   | 2     | 0.5    |
| Construction  | 120  | 17    | 4      |
| Default       | 90   | 13    | 3      |

### Fee Structures

| Business Type | Service | Late  | Admin | Cancellation |
|---------------|---------|-------|-------|--------------|
| Clothing      | 0%      | $5    | $0    | 10%          |
| Hardware      | 1%      | $10   | $5    | 5%           |
| Grocery       | 0%      | $2    | $0    | 15%          |
| Restaurant    | 2%      | $20   | $10   | 25%          |
| Construction  | 1.5%    | $15   | $10   | 5%           |
| Default       | 0%      | $5    | $0    | 10%          |

---

## Contact for Rule Questions

**Questions About:**
- Specific rule interpretation
- Exceptions or special cases
- Rule change requests
- New business type rules

**Contact:**
- Your Manager/Supervisor
- Business Administrator
- System Administrator

**Documentation:**
- User Manual: General usage
- Admin Guide: Technical details
- This Document: Complete rule reference

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**For System Version**: 1.0
**Rules Effective**: All new laybys from 2025-10-27
