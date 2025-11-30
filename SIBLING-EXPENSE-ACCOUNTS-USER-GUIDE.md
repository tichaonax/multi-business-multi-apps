# Sibling Expense Accounts - User Guide

## Overview

Sibling expense accounts allow you to create temporary "child" accounts for capturing historical expense data. This feature is particularly useful when you need to enter past expenses chronologically while keeping your main expense accounts clean and current.

## Key Concepts

### Parent vs Sibling Accounts
- **Parent Account**: Your main expense account (e.g., "Office Supplies")
- **Sibling Account**: A temporary account for historical data entry (e.g., "Office Supplies-01", "Office Supplies-02")

### When to Use Sibling Accounts
- Entering historical expenses from previous months/quarters
- Importing data from old systems
- Capturing expenses that occurred before your current accounting period
- Organizing large data entry projects

## Creating a Sibling Account

1. Navigate to the Expense Accounts page
2. Find the parent account you want to create a sibling for
3. Click the "Create Sibling" button (📋 icon)
4. Fill in the sibling account details:
   - **Name**: Descriptive name (e.g., "Q4 2024 Historical Data")
   - **Description**: Purpose of this sibling account
5. Click "Create Sibling Account"

The sibling account will be created with an auto-generated number (e.g., "EXP-001-01").

## Using Sibling Accounts

### Entering Historical Payments
1. Click on the sibling account in the expense accounts list
2. Click "Add Payment"
3. Fill in payment details as normal
4. **Important**: Set the payment date to the actual date the expense occurred
5. Select appropriate payee and categories
6. Save the payment

### Visual Indicators
- Sibling accounts appear with a different color scheme (typically muted)
- They show "(Sibling)" indicator in account lists
- Balance displays show sibling account status

## Merging Sibling Accounts

Once you've entered all historical data and the sibling account has a zero balance, you can merge it back into the parent account.

### Requirements for Merging
- Sibling account must have zero balance
- No pending transactions
- You must have merge permissions (or be an admin)

### How to Merge
1. Find the sibling account in the expense accounts list
2. Click the "Merge" button
3. Review the confirmation dialog showing:
   - Which accounts will be merged
   - Balance transfer amount
   - Number of transactions to be transferred
4. Click "Confirm Merge"

### What Happens During Merge
- All transactions are transferred to the parent account
- The sibling account is permanently deleted
- Parent account balance is updated
- **This action cannot be undone**

## Permission Requirements

### Basic User
- ✅ View sibling accounts
- ✅ Create payments in sibling accounts
- ❌ Create sibling accounts
- ❌ Merge sibling accounts

### Accountant
- ✅ All Basic User permissions
- ✅ Create sibling accounts
- ❌ Merge sibling accounts (except zero-balance with admin approval)

### Manager
- ✅ All Accountant permissions
- ❌ Merge sibling accounts

### Admin
- ✅ All permissions
- ✅ Merge any sibling account (including non-zero balance)
- ✅ Emergency access to all sibling operations

## Best Practices

### Data Entry Workflow
1. Create sibling account for specific time period
2. Enter all expenses chronologically with correct dates
3. Verify all transactions are entered correctly
4. Ensure zero balance (expenses = payments)
5. Merge back into parent account
6. Delete sibling account (automatic)

### Organization Tips
- Use descriptive names: "Q1 2024 Backlog", "Legacy System Import"
- Group related expenses in single siblings
- Document the purpose in the description field
- Keep sibling accounts for short periods to avoid confusion

### Safety Measures
- Always verify zero balance before merging
- Double-check transaction dates are historical
- Keep records of what was merged (automatic audit trail)
- Test with small batches first

## Troubleshooting

### Cannot Create Sibling Account
- Check if you have "Create Expense Account" permission
- Ensure the parent account exists and is active
- Verify you're not trying to create a sibling from another sibling

### Cannot Merge Sibling Account
- Check account balance (must be zero)
- Verify no pending transactions
- Confirm you have merge permissions
- For non-zero balance: requires admin permission

### Sibling Not Appearing in Lists
- Refresh the page
- Check if account is active
- Verify business context is correct

### Payment Date Issues
- Sibling accounts allow past dates (unlike regular accounts)
- Ensure date format matches your system settings
- Check for any date validation errors

## FAQ

**Q: Can I create multiple siblings for one parent account?**
A: Yes, siblings are numbered automatically (-01, -02, etc.)

**Q: What happens if I delete a sibling account with data?**
A: You cannot delete siblings with transactions. Use merge instead.

**Q: Can I transfer money between sibling and parent accounts?**
A: No, siblings are for data entry only. Use regular transfers for money movement.

**Q: Do sibling accounts affect reports?**
A: Yes, transactions in siblings appear in reports with their historical dates.

**Q: Can I undo a merge?**
A: No, merging is permanent. Always backup data before merging.

**Q: Are sibling accounts visible to all users?**
A: Yes, but permission controls limit who can create/modify them.

## Support

If you encounter issues with sibling accounts:
1. Check this guide first
2. Verify your permissions
3. Contact your administrator
4. Check system logs for error details

---

*Last updated: November 29, 2025*