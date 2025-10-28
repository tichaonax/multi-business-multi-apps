# Layby Management - Troubleshooting Guide

## Table of Contents
1. [Access and Permission Issues](#access-and-permission-issues)
2. [Creating Laybys Problems](#creating-laybys-problems)
3. [Payment Recording Issues](#payment-recording-issues)
4. [Completion and Cancellation Problems](#completion-and-cancellation-problems)
5. [Display and Data Issues](#display-and-data-issues)
6. [Performance Issues](#performance-issues)
7. [Notification Problems](#notification-problems)
8. [Automation Issues](#automation-issues)
9. [Error Messages](#error-messages)
10. [Emergency Procedures](#emergency-procedures)

---

## Access and Permission Issues

### Problem: Cannot See Laybys Menu

**Symptoms:**
- Laybys option not in menu
- Cannot navigate to `/business/laybys`

**Possible Causes:**
1. No "Manage Laybys" permission
2. Not logged in
3. Not member of any business

**Solutions:**

**Step 1: Check Login Status**
- Verify you are logged in
- Look for your name in top right corner
- If not logged in, log in first

**Step 2: Check Permission**
- Contact your manager or administrator
- Ask them to grant you "Manage Laybys" permission
- They can do this in User Management section

**Step 3: Check Business Membership**
- Verify you are a member of a business
- Contact administrator if not

**Still Not Working?**
- Clear browser cache
- Try different browser
- Contact technical support

---

### Problem: Permission Denied Message

**Symptoms:**
- See "You don't have permission to manage laybys" message
- Page loads but shows permission error

**Solutions:**

**Immediate Action:**
- Contact your manager
- Request "Manage Laybys" permission
- Provide your user ID/email

**For Managers:**
1. Go to User Management
2. Find the user
3. Edit permissions
4. Enable "canManageLaybys"
5. Save changes
6. Ask user to log out and log back in

---

### Problem: Cannot Access Specific Business's Laybys

**Symptoms:**
- Can access laybys for Business A
- Cannot see laybys for Business B

**Cause:**
- Not a member of Business B

**Solution:**
- Contact administrator
- Request addition to Business B
- Administrator adds you via Business Users management

---

## Creating Laybys Problems

### Problem: Cannot Find Customer in Dropdown

**Symptoms:**
- Customer doesn't appear in dropdown
- Search doesn't find customer

**Possible Causes:**
1. Customer doesn't exist in system
2. Customer has layby disabled
3. Customer belongs to different business
4. Customer inactive

**Solutions:**

**Step 1: Verify Customer Exists**
- Go to Customers page
- Search for customer by name or number
- If not found, create customer first

**Step 2: Check Layby Enabled**
- View customer details
- Look for "Allow Layby" setting
- If disabled, enable it (requires permission)

**Step 3: Check Customer Active**
- Inactive customers don't appear
- Reactivate customer if needed

**Step 4: Verify Business**
- Customer must belong to your current business
- Cannot use customers from other businesses

---

### Problem: "Insufficient Stock" Error

**Symptoms:**
- Error when adding product to layby
- Message: "Insufficient stock: X available, Y requested"

**Causes:**
- Not enough stock available
- Stock already reserved for other laybys/orders

**Solutions:**

**Option 1: Reduce Quantity**
- Lower requested quantity to available amount
- Create multiple laybys if needed

**Option 2: Receive Stock**
- Receive more stock into inventory
- Then create layby

**Option 3: Check Reserved Stock**
- Check if stock is reserved for other laybys
- Contact manager to review reservations

**Option 4: Use Different Product**
- Choose alternative product
- Suggest substitute to customer

---

### Problem: Cannot Set Deposit Percentage

**Symptoms:**
- Error: "Deposit must be at least X%"
- Cannot adjust deposit slider/input

**Cause:**
- Business rules enforce minimum/maximum deposit

**Solutions:**

**Step 1: Check Business Rules**
- Go to Laybys → Business Rules
- View deposit percentage rules for your business
- Example: Clothing stores require 20-80%

**Step 2: Adjust to Allowed Range**
- Set deposit within allowed range
- System enforces these rules strictly

**Cannot Change Rules?**
- Contact administrator
- Rules are set per business type
- Cannot be changed by individual users

---

### Problem: "Maximum Duration Exceeded" Error

**Symptoms:**
- Error when setting completion date
- Cannot set date more than X days away

**Cause:**
- Business rules limit layby duration

**Solutions:**

**Step 1: Check Maximum Duration**
- Go to Business Rules page
- Find maximum duration for your business
- Example: Clothing 90 days, Hardware 60 days

**Step 2: Set Earlier Completion Date**
- Choose date within allowed duration
- Count from today, not from first payment

**Step 3: Consider Different Payment Schedule**
- Increase installment amount
- More frequent payments
- Complete layby faster

---

### Problem: Layby Number Not Generated

**Symptoms:**
- Layby created but no layby number shown
- Error during creation

**Immediate Actions:**
1. Note error message exactly
2. Don't create duplicate
3. Check if layby actually created:
   - Go to layby list
   - Look for most recent entry
4. Contact technical support immediately

**For Support Team:**
- Check database for orphaned record
- Verify number generation function
- Check for unique constraint violations

---

## Payment Recording Issues

### Problem: Cannot Record Payment

**Symptoms:**
- "Record Payment" button disabled or missing
- Error when trying to record payment

**Possible Causes:**
1. Layby not in ACTIVE status
2. Layby on hold
3. Layby completed or cancelled
4. Permission issue

**Solutions:**

**Step 1: Check Layby Status**
- View layby detail page
- Check status badge
- If ON_HOLD: Reactivate first
- If COMPLETED/CANCELLED: Cannot add payments

**Step 2: Check Balance**
- If balance is $0.00, layby is complete
- No further payments needed

**Step 3: Refresh Page**
- Sometimes browser cache causes issues
- Refresh page (F5 or Ctrl+R)
- Try again

---

### Problem: "Payment Exceeds Balance" Error

**Symptoms:**
- Error: "Payment amount cannot exceed balance remaining"
- Cannot submit payment

**Cause:**
- Entered amount greater than balance

**Solutions:**

**Step 1: Check Current Balance**
- View "Balance Remaining" field
- Example: If balance is $150.25, max payment is $150.25

**Step 2: Adjust Payment Amount**
- Enter amount equal to or less than balance
- System prevents overpayment

**Customer Wants to Pay More?**
- Explain cannot overpay
- Take exact balance amount
- Refund excess if already received

---

### Problem: Wrong Payment Method Selected

**Symptoms:**
- Recorded CASH but should be EFTPOS
- Need to correct payment method

**Solutions:**

**Cannot Edit Payment:**
- Payment records are immutable for audit purposes
- Cannot change after recording

**Workaround:**
1. Add note in layby notes field
2. Document correct payment method
3. Inform manager/accountant
4. For serious issues, contact technical support

**Prevention:**
- Always verify payment method before submitting
- Double-check card vs cash vs transfer

---

### Problem: Receipt Number Not Showing

**Symptoms:**
- Payment recorded
- No receipt number displayed

**Immediate Actions:**
1. Refresh page
2. Check payment history section
3. Look for receipt number in format: RCP-XXX-YYYYMMDD-######

**If Still Missing:**
- Note payment details (amount, date, time)
- Contact technical support
- Provide layby number

---

### Problem: Balance Not Updating

**Symptoms:**
- Payment recorded
- Balance stays the same

**Solutions:**

**Step 1: Refresh Page**
- Hard refresh: Ctrl+F5
- Should update balance

**Step 2: Check Payment History**
- Verify payment appears in history
- Check payment amount

**Step 3: Clear Browser Cache**
```
Chrome: Settings → Privacy → Clear browsing data
Firefox: Settings → Privacy → Clear History
```

**Still Not Working:**
- Log out and log back in
- Try different browser
- Contact technical support if persists

---

## Completion and Cancellation Problems

### Problem: Cannot Complete Layby

**Symptoms:**
- "Complete Layby" button disabled
- Error: "Layby must be fully paid"

**Cause:**
- Balance remaining > $0.00

**Solutions:**

**Step 1: Check Balance**
- View "Balance Remaining" field
- If > $0.00, not fully paid

**Step 2: Record Final Payment**
- Calculate remaining balance
- Record final payment
- System auto-completes when balance reaches $0

**Step 3: Verify All Payments**
- Review payment history
- Check all payments recorded
- Look for missed payments

---

### Problem: Order Not Created on Completion

**Symptoms:**
- Layby completed successfully
- No order generated
- No order number shown

**Possible Causes:**
1. "Create Order" option unchecked
2. Order integration error
3. Insufficient inventory

**Solutions:**

**Step 1: Check Order Creation Setting**
- When completing, verify "Create Order" checkbox selected
- If unchecked, order not created

**Step 2: Manually Complete with Order**
- If already completed without order
- Contact administrator
- May need to manually create order in order system

**Step 3: Check Error Logs**
- Administrator checks logs for errors
- May indicate inventory or system issue

---

### Problem: Cannot Cancel Layby

**Symptoms:**
- "Cancel Layby" button missing or disabled
- Error when trying to cancel

**Possible Causes:**
1. Layby already cancelled or completed
2. Permission issue
3. System error

**Solutions:**

**Step 1: Check Status**
- If COMPLETED or CANCELLED already, cannot cancel
- Only ACTIVE or ON_HOLD laybys can be cancelled

**Step 2: Check Permission**
- Verify you have permission to cancel
- May need manager approval

**Step 3: Contact Manager**
- If need to cancel completed layby
- Special refund process required

---

### Problem: Incorrect Refund Amount

**Symptoms:**
- System calculates wrong refund
- Refund doesn't match expectations

**Understanding Refund Calculation:**
```
Refund = Total Paid - Cancellation Fee
Cancellation Fee = Total Paid × Cancellation Fee %
```

**Example (Clothing Store with 10% cancellation fee):**
- Total Paid: $300
- Cancellation Fee: $300 × 10% = $30
- Refund: $300 - $30 = $270

**Solutions:**

**Step 1: Check Business Rules**
- Go to Business Rules page
- Find cancellation fee percentage
- Varies by business type

**Step 2: Manual Calculation**
- Verify calculation matches rules
- Use calculator to confirm

**Step 3: Override if Needed**
- Refund amount is editable
- Manager can adjust based on circumstances
- Document reason in cancellation notes

---

## Display and Data Issues

### Problem: Layby Not Appearing in List

**Symptoms:**
- Created layby
- Doesn't show in list

**Solutions:**

**Step 1: Check Filters**
- Clear all filters
- Verify not filtering by wrong status
- Select "All" or "ACTIVE"

**Step 2: Check Business Selection**
- Verify correct business selected
- Laybys tied to specific business

**Step 3: Refresh Page**
- F5 or Ctrl+R
- Hard refresh: Ctrl+F5

**Step 4: Check Creation Success**
- Did you see success message?
- Note layby number if given
- Search by layby number

---

### Problem: Wrong Customer Name Showing

**Symptoms:**
- Layby shows wrong customer
- Customer details incorrect

**Cause:**
- Selected wrong customer during creation

**Solutions:**

**Cannot Change Customer:**
- Customer cannot be changed after creation
- Audit trail requirement

**Workaround:**
1. Add note explaining situation
2. Cancel current layby
3. Create new layby with correct customer

**Prevention:**
- Always verify customer before submitting
- Double-check customer name and number

---

### Problem: Items Missing or Wrong

**Symptoms:**
- Items list shows wrong products
- Quantities incorrect

**Cause:**
- Error during creation

**Cannot Edit Items:**
- Items cannot be changed after creation
- Audit and inventory tracking requirement

**Solutions:**

**Option 1: Cancel and Recreate**
1. Cancel current layby
2. Process refund for deposit
3. Create new layby with correct items

**Option 2: Adjust via Payments**
- If price difference small
- Adjust final payment amount
- Document in notes

---

### Problem: Balance Calculation Seems Wrong

**Symptoms:**
- Balance doesn't match your calculation
- Numbers don't add up

**Verify Calculation:**
```
Balance Remaining = (Total Amount + Total Fees) - Total Paid

Example:
Total Amount: $500
Service Fee: $0
Late Fee: $5
Admin Fee: $0
Total Fees: $5
Total Paid: $200
Balance: ($500 + $5) - $200 = $305
```

**Common Issues:**
1. Forgetting to include fees
2. Not accounting for late fees
3. Missing a recorded payment

**Solutions:**

**Step 1: Review Payment History**
- Add up all payments manually
- Include deposits

**Step 2: Check All Fees**
- Service fee
- Administration fee
- Late fee (if applied)

**Step 3: Use Calculator**
- (Total + Fees) - Payments = Balance
- Should match system

**Still Wrong?**
- Contact administrator
- May be database issue requiring correction

---

## Performance Issues

### Problem: Pages Loading Slowly

**Symptoms:**
- Long wait times
- Spinning/loading indicators
- Timeout errors

**Solutions:**

**Step 1: Check Internet Connection**
- Test other websites
- Check WiFi/network connection
- Try cellular if available

**Step 2: Reduce Filters**
- Clear date range filters
- Limit results (e.g., show only ACTIVE)
- Don't load all history at once

**Step 3: Clear Browser Cache**
- Settings → Clear cache and cookies
- Restart browser

**Step 4: Try Different Browser**
- Chrome, Firefox, Edge, Safari
- Some browsers faster than others

**Still Slow?**
- Contact technical support
- May be server performance issue
- Check if affects other users

---

### Problem: System Freezes or Crashes

**Symptoms:**
- Browser becomes unresponsive
- Page crashes
- Error messages

**Immediate Actions:**
1. Don't click anything repeatedly
2. Wait 30 seconds
3. If no response, close tab/browser
4. Reopen and try again

**Solutions:**

**Step 1: Restart Browser**
- Close all tabs
- Restart browser
- Clear cache if needed

**Step 2: Check Browser Compatibility**
- Use latest version of:
  - Chrome (recommended)
  - Firefox
  - Edge
  - Safari

**Step 3: Check Device Resources**
- Close unnecessary programs
- Free up memory (RAM)
- Restart computer if needed

**Step 4: Report Issue**
- Note what you were doing
- Note error messages
- Report to technical support

---

## Notification Problems

### Problem: Customer Not Receiving Reminders

**Symptoms:**
- Payment reminder not sent
- Customer complains of no notification

**Possible Causes:**
1. No email or phone number
2. Incorrect contact information
3. Notifications not sent yet
4. Notification system issue

**Solutions:**

**Step 1: Verify Contact Information**
- Check customer profile
- Verify email address correct
- Verify phone number correct (with country code)

**Step 2: Check Reminder Schedule**
- Reminders sent 3 days before, 1 day before, on due date
- May not have reached those intervals yet

**Step 3: Check Spam Folder**
- Ask customer to check spam/junk
- Add sender to safe list

**Step 4: Administrator Check**
- Verify automation running
- Check notification logs
- Verify SMS/email provider configured

---

### Problem: Wrong Information in Notifications

**Symptoms:**
- Reminder shows wrong amount
- Incorrect due date in message

**Report to Administrator:**
- Notification template may need correction
- Provide screenshot if possible
- Note exact discrepancy

---

## Automation Issues

### Problem: Late Fees Not Applied

**Symptoms:**
- Payment overdue
- No late fee added

**Possible Causes:**
1. Automation not run yet
2. Late fee already applied
3. Automation disabled

**Solutions:**

**Step 1: Check When Due**
- Late fee applies 1 day after due date
- May not be triggered yet

**Step 2: Check Existing Fees**
- View layby details
- Look at "Late Fee" field
- May already be applied

**Step 3: Administrator Check**
- Go to Automation page
- Check last run time
- Check for errors

**Step 4: Manual Trigger**
- Administrator can manually run automation
- Laybys → Automation → Run Now

---

### Problem: Automation History Empty

**Symptoms:**
- No jobs showing in history
- Automation page empty

**Possible Causes:**
1. Automation never run
2. Not scheduled
3. System error

**Administrator Actions:**
1. Verify cron job configured
2. Check automation schedule
3. Trigger manual run to test
4. Review technical setup

---

## Error Messages

### "Unauthorized" or "401 Error"

**Meaning:** Not logged in or session expired

**Solutions:**
1. Log out completely
2. Log back in
3. Try operation again

---

### "Forbidden" or "403 Error"

**Meaning:** Logged in but don't have permission

**Solutions:**
1. Contact manager
2. Request appropriate permission
3. Verify you're member of correct business

---

### "Not Found" or "404 Error"

**Meaning:** Layby or resource doesn't exist

**Solutions:**
1. Verify layby number correct
2. Check if layby was deleted/cancelled
3. Try navigating from layby list instead
4. Refresh page

---

### "Server Error" or "500 Error"

**Meaning:** System error on server

**Immediate Actions:**
1. Wait a few moments
2. Try again
3. If persists, contact technical support

**Don't:**
- Don't repeatedly retry
- Don't create duplicates
- Don't enter data multiple times

---

### "Bad Request" or "400 Error"

**Meaning:** Invalid data sent to server

**Solutions:**
1. Check all required fields filled
2. Verify amounts are valid numbers
3. Check dates in correct format
4. Remove any special characters
5. Try again

---

### "Database Error"

**Meaning:** Problem connecting to or querying database

**User Actions:**
- Wait and try again in 5 minutes
- Contact support if persists

**Administrator Actions:**
- Check database server status
- Check connection pool
- Review database logs
- May need to restart database service

---

## Emergency Procedures

### Accidentally Cancelled Wrong Layby

**Cannot Undo:**
- Cancellation is permanent
- Cannot reactivate cancelled layby

**Actions:**
1. Note layby number immediately
2. Note all details (customer, amounts, items)
3. Contact manager immediately
4. Create new layby with same details
5. Reverse refund if already processed
6. Document incident

---

### Recorded Payment on Wrong Layby

**Cannot Delete Payment:**
- Payments cannot be deleted
- Audit trail requirement

**Actions:**
1. Note both layby numbers
2. Note payment amount and time
3. Contact manager/administrator immediately
4. May require database correction
5. Document incident thoroughly

---

### System Down During Critical Operation

**Immediate Actions:**
1. Note exactly what you were doing
2. Note any error messages
3. Check if operation completed:
   - Check layby list
   - Check customer account
4. Don't retry until system confirmed working
5. Contact technical support

**For Payments:**
- If cash received, secure it
- Document amount and layby number
- Record payment when system returns

**Communication:**
- Inform customers of technical issue
- Provide timeline for resolution if known
- Collect contact info for follow-up

---

### Lost Receipt Number

**Actions:**
1. Go to layby detail page
2. Find payment in payment history
3. Receipt number shown there
4. If not there, contact technical support with:
   - Layby number
   - Payment amount
   - Approximate date/time
   - Customer name

---

### Suspect Fraudulent Activity

**Immediate Actions:**
1. Do not complete transaction
2. Do not confront customer
3. Note details discretely
4. Contact manager immediately
5. Follow store security procedures

---

## Getting Help

### Support Escalation Path

**Level 1: Self-Help**
- Check this troubleshooting guide
- Check user manual
- Check FAQ

**Level 2: Colleague/Supervisor**
- Ask team members
- Contact direct supervisor
- Check with manager

**Level 3: Technical Support**
- Contact support desk
- Provide detailed information
- Follow support instructions

**Level 4: Emergency Support**
- After hours only
- Critical issues only
- Use emergency contact

### Information to Provide to Support

When reporting issues, include:
1. **Your Details:**
   - Your name
   - Your user ID/email
   - Business name

2. **Problem Details:**
   - What were you trying to do?
   - What happened instead?
   - Exact error message (screenshot if possible)
   - When did it happen? (date/time)

3. **Layby Details (if applicable):**
   - Layby number
   - Customer name
   - Status

4. **Steps to Reproduce:**
   - Can you make it happen again?
   - What are the exact steps?

5. **Impact:**
   - Is it affecting customers?
   - Is it affecting multiple users?
   - Is it blocking business operations?

### Contact Information

**Support Desk:**
- Email: [support-email]
- Phone: [support-phone]
- Hours: [business-hours]
- Response Time: [expected-time]

**Emergency Support:**
- Phone: [emergency-phone]
- Available: [hours]
- For: Critical issues only

**Manager:**
- Name: [manager-name]
- Email: [email]
- Phone: [phone]

---

## Preventive Measures

### Best Practices to Avoid Issues

**Before Creating Layby:**
- [ ] Verify customer details correct
- [ ] Check stock availability
- [ ] Confirm pricing accurate
- [ ] Review business rules
- [ ] Double-check all entries

**Before Recording Payment:**
- [ ] Verify layby number
- [ ] Confirm payment amount
- [ ] Select correct payment method
- [ ] Check balance will be correct
- [ ] Have receipt ready for customer

**Before Completing:**
- [ ] Verify balance is $0.00
- [ ] Check all items available
- [ ] Confirm customer ready to collect
- [ ] Select create order option
- [ ] Have collection form ready

**Regular Maintenance:**
- [ ] Clear browser cache weekly
- [ ] Update browser regularly
- [ ] Check announcements for updates
- [ ] Review guides for changes
- [ ] Report issues promptly

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**For System Version**: 1.0
