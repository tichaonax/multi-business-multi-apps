# Backup Validation Guide

## How to Know Backup and Restore Match

The backup validation system provides a comprehensive way to verify that your backup file matches what's currently in the database after a restore.

---

## ✅ Validation Features

### 1. **Automatic Categorization**
The validation system automatically categorizes differences into three types:

#### **✅ Exact Matches**
- **What it means**: The backup and database have exactly the same number of records
- **Status**: Perfect! No action needed
- **Example**: `users: 45 records in backup = 45 in database`

#### **⚠️ Expected Differences**
- **What it means**: Differences that are normal and expected
- **Common causes**:
  - Foreign key constraints (record references missing data)
  - Business-specific backups (intentionally partial data)
  - Demo data filtering
- **Status**: Normal behavior, usually safe to ignore
- **Example**: `productVariants: 1000 in backup, 850 in database (150 skipped due to foreign keys)`

#### **❌ Unexpected Mismatches**
- **What it means**: Differences that shouldn't happen
- **Common causes**:
  - Database was modified during/after restore
  - Backup file corrupted
  - Critical restore errors
- **Status**: Requires investigation
- **Action**: Check error logs and re-run restore

---

## 📊 How to Use Validation

### **Step 1: Select Backup File**
1. Go to **Admin → Data Management → Backup & Restore**
2. Select or drag-and-drop your backup file (`.json` or `.json.gz`)
3. You'll see the file name and size displayed

### **Step 2: Validate Before Restore (Recommended)**
1. Click **"Validate Backup"** button
2. Wait for validation to complete (usually 5-30 seconds)
3. Review the validation results

### **Step 3: Interpret Results**

**Success Status (✅):**
```
Total Tables: 116
✅ Exact Matches: 116
⚠️ Expected Diff: 0
❌ Mismatches: 0
```
**Meaning**: Perfect match! Safe to restore.

---

**Warning Status (⚠️):**
```
Total Tables: 116
✅ Exact Matches: 95
⚠️ Expected Diff: 21
❌ Mismatches: 0
```
**Meaning**: Some expected differences (foreign keys, validation errors). Generally safe.
**Action**: Review "Top Results" to see which tables have differences.

---

**Error Status (❌):**
```
Total Tables: 116
✅ Exact Matches: 80
⚠️ Expected Diff: 15
❌ Mismatches: 21
```
**Meaning**: Unexpected mismatches detected.
**Action**: Click "View Detailed Report" to see specific issues.

---

### **Step 4: Review Detailed Report**

Click **"View Detailed Report"** to see:

```
Backup Validation Report
========================

Overall Status: ⚠️ WARNING

Total Tables: 116
✅ Exact Matches: 95
⚠️ Expected Differences: 21
❌ Unexpected Mismatches: 0

⚠️ EXPECTED DIFFERENCES:
========================

productVariants:
  Backup: 1000 records
  Database: 850 records
  Difference: 150
  Notes: 150 records skipped during restore (foreign key constraints or validation errors)

businessOrders:
  Backup: 500 records
  Database: 475 records
  Difference: 25
  Notes: 25 records skipped during restore (foreign key constraints or validation errors)
```

---

## 🎯 Common Scenarios

### **Scenario 1: First-Time Restore to Empty Database**
**Expected Results:**
- Most tables should be **Exact Matches**
- Some tables may show **Expected Differences** due to foreign keys
- No **Unexpected Mismatches**

**Example:**
```
✅ users: 45 = 45 (Exact Match)
✅ businesses: 12 = 12 (Exact Match)
⚠️ productVariants: 1000 → 975 (25 skipped - missing products)
```

---

### **Scenario 2: Restore to Existing Database**
**Expected Results:**
- More **Exact Matches** if data hasn't changed
- More **Expected Differences** if database has been modified
- Possible **Unexpected Mismatches** if database was actively used

**Recommendation**: Create a fresh backup before restoring to preserve current state.

---

### **Scenario 3: Business-Specific Backup**
**Expected Results:**
- **Expected Differences** for shared resources (users, categories)
- **Exact Matches** for business-specific data (products, orders)

**Example:**
```
⚠️ users: 100 in backup → 5 in database (only business members)
✅ businessProducts: 1234 = 1234 (Exact Match)
✅ businessOrders: 567 = 567 (Exact Match)
```

---

## 🔍 Understanding the "Top Results" View

The validation shows up to 20 most important results:

**Green Background (✅)**: Exact matches
```
users ✅
Backup: 45 | Database: 45
```

**Amber Background (⚠️)**: Expected differences
```
productVariants ⚠️
Backup: 1000 | Database: 850 | Diff: 150
Difference matches skipped count (150 skipped)
```

**Red Background (❌)**: Unexpected mismatches
```
businesses ❌
Backup: 12 | Database: 8 | Diff: 4
Unexpected difference: backup=12, database=8, skipped=0
```

---

## 🛠️ Troubleshooting

### **Problem: All Tables Show Unexpected Mismatches**
**Possible Causes:**
- Validated against wrong database
- Database was modified after restore
- Backup file is corrupted

**Solution:**
1. Verify you're connected to the correct database
2. Re-run restore with a fresh database
3. Try downloading backup file again

---

### **Problem: Foreign Key Errors Cause Many Skips**
**Possible Causes:**
- Business-specific backup missing shared data
- Partial backup (specific tables only)
- Related data was filtered out

**Solution:**
This is **expected behavior** for partial backups. If you need complete data:
1. Use "Full Backup" instead of "Business-Specific"
2. Ensure `includeDemoData` is set correctly
3. Restore to empty database to avoid conflicts

---

### **Problem: Validation Shows Success but Data Looks Wrong**
**Possible Causes:**
- Multiple databases on system
- Backup is from different environment

**Solution:**
1. Check database connection string
2. Verify backup timestamp in metadata
3. Compare specific record IDs between backup and database

---

## 📝 Best Practices

### **Before Restore:**
1. ✅ **Validate the backup file first**
2. ✅ **Review validation results**
3. ✅ **Create backup of current database**
4. ✅ **Close all other applications using the database**

### **After Restore:**
1. ✅ **Run validation again to confirm**
2. ✅ **Check critical business data** (users, businesses, products)
3. ✅ **Test key workflows** (login, orders, reports)
4. ✅ **Review error logs** for any issues

### **For Production Environments:**
1. ✅ **Always validate backups before restoring**
2. ✅ **Keep multiple backup copies**
3. ✅ **Test restores on staging environment first**
4. ✅ **Document validation results**

---

## 🎓 Understanding Skip Reasons

### **Foreign Key Errors (Most Common)**
```
Skip reasons: Foreign Keys: 750
```
**What it means**: 750 records referenced data that wasn't in the backup.

**Example**: A product variant references a category that was filtered out.

**Is this bad?** Usually no - this is expected for partial backups.

---

### **Validation Errors**
```
Skip reasons: Validation: 25
```
**What it means**: 25 records failed database validation rules.

**Example**: Duplicate SKUs, invalid email formats.

**Is this bad?** May indicate data quality issues in source database.

---

### **Other Errors**
```
Skip reasons: Other: 5
```
**What it means**: 5 records failed for unexpected reasons.

**Is this bad?** Potentially - check detailed error logs.

---

## 📊 Validation Report Sections

### **1. Summary Statistics**
Quick overview of overall status:
- Total tables validated
- Exact matches vs differences
- Overall health indicator

### **2. Unexpected Mismatches**
Tables with problems requiring attention:
- Shows which tables don't match
- Displays record counts
- Includes diagnostic notes

### **3. Expected Differences**
Tables with known, acceptable differences:
- Foreign key skips
- Validation errors
- Filtered data

### **4. Exact Matches**
Top 10 tables with perfect matches:
- Sorted by record count
- Confirms critical data integrity

---

## 💡 Pro Tips

1. **Validate Immediately After Restore**: Run validation right after restore completes to catch issues early.

2. **Save Validation Reports**: Copy the detailed report for your records.

3. **Compare Multiple Restores**: If restoring same backup to multiple servers, validation results should be similar.

4. **Use for Migration Planning**: Validation shows which dependencies are needed for successful restore.

5. **Monitor Skip Rates**: If skip rates increase over time, investigate data quality issues.

---

## ❓ FAQ

**Q: What's an acceptable number of skipped records?**
A: Depends on backup type:
- Full backup: < 5% is normal
- Business-specific: 10-20% can be normal (missing shared data)
- Partial backup: Varies widely

**Q: Should I always have 0 unexpected mismatches?**
A: Yes, ideally. Any unexpected mismatch should be investigated.

**Q: How long does validation take?**
A: Usually 5-30 seconds, depending on database size.

**Q: Can I validate without restoring?**
A: No, validation compares backup vs current database state. You need to restore first, then validate.

**Q: What if validation fails?**
A: Don't restore! Check the detailed report, fix issues, or use a different backup file.

---

## 🔗 Related Documentation

- **Backup Creation**: See backup UI for options
- **Restore Process**: See restore workflow guide
- **Error Troubleshooting**: Check server logs for detailed errors
- **Database Schema**: Review Prisma schema for table relationships

---

## 📞 Support

If you encounter persistent validation issues:

1. **Check Console Logs**: Press F12 → Console tab
2. **Review Server Logs**: Check terminal output
3. **Export Validation Report**: Copy detailed report
4. **Document Error Messages**: Note specific error codes

---

**Last Updated**: 2026-01-02
**Version**: 3.0 (Backup Validation System)
