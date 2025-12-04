# Seed Templates - User Guide 📦

**Quick Start Guide for Business Seed Data Management**

---

## 🎯 What Are Seed Templates?

Seed templates are reusable packages containing:
- **Categories** (e.g., Electronics, Clothing, Food)
- **Subcategories** (e.g., Laptops, Smartphones, Tablets)
- **Products** (e.g., iPhone 15 Pro, $999)

Use them to quickly set up new businesses with pre-configured product catalogs.

---

## 📍 How to Access

### From Admin Dashboard

**Path:** `/admin` → **Seed Templates** card

The Seed Templates card has 4 quick links:
- **Manage Templates** - View all saved templates
- **Export** - Create a new template from a business
- **Import** - Apply a template to a business
- **Bulk Export** - Export multiple businesses at once

---

## 🎬 Getting Started

### Step 1: Create Your First Template (Export)

**You need an existing business with data to export from.**

1. **Navigate to Export**
   - Go to `/admin/seed-templates`
   - Click **"Export New Template"** button (green)

2. **Select Source Business**
   - Choose which business to export from
   - Example: "Clothing Store Demo"

3. **Configure Export Options**
   ```
   Template Name: Clothing Store Template v1.0
   Version: 1.0.0
   Description: Complete clothing inventory with categories
   
   ☐ Zero out all prices (optional)
   ☑ Only export active products (recommended)
   ```

4. **Click "Export Template"**
   - System creates a JSON file
   - Saves to database
   - Shows success message with stats

**Result:** You now have a reusable template! 🎉

---

### Step 2: Apply Template to New Business (Import)

**Now you can apply this template to any compatible business.**

1. **Navigate to Import**
   - Go to `/admin/seed-templates`
   - Click **"Import Template"** button (blue)

2. **Upload Template**
   - Option A: Select from saved templates (dropdown)
   - Option B: Upload JSON file from computer

3. **Select Target Business**
   - Choose which business receives the data
   - Must match business type (e.g., clothing → clothing)

4. **Choose Import Mode**
   ```
   ◉ Skip existing items (safe - no overwrites)
   ○ Update existing items (overwrites matching items)
   ○ New items only (only create new, skip all existing)
   ```

5. **IMPORTANT: Preview First! 👁️**
   - Click **"Preview Changes"** button
   - See what will happen:
     - ✅ X items to create (green)
     - 🔄 Y items to update (yellow)
     - ⏭️ Z items to skip (gray)
   - Review first 50 items
   - Close or proceed

6. **Optional: Compare Differences 🔍**
   - Click **"Compare with Existing"** button
   - See detailed diff:
     - ➕ Added items
     - ➖ Removed items
     - 📝 Modified items (field-by-field)
   - Filter by change type

7. **Import Template**
   - If preview looks good, click **"Import Template"**
   - System applies changes
   - Shows success with stats

**Result:** Business now has all the products! 🎊

---

## 🚀 Advanced: Bulk Export

**Export multiple businesses at once to save time.**

1. **Navigate to Bulk Export**
   - Go to `/admin/seed-templates`
   - Click **"Bulk Export"** button (purple)
   - Or direct: `/admin/seed-templates/bulk-export`

2. **Select Businesses**
   ```
   ☑ Clothing Store Demo
   ☑ Hardware Store Demo
   ☑ Grocery Store Demo
   ☐ Restaurant Demo
   ☐ Service Business Demo
   ```
   - Use **"Select All"** button
   - Use **"Deselect All"** button

3. **Configure Bulk Settings**
   ```
   Base Version: 1.0.0
   (Applied to all exports)
   
   Name Template: {businessName} Template v{version}
   (Creates unique names using placeholders)
   
   ☐ Zero out all prices
   ☑ Only export active products
   ```

4. **Placeholder Variables**
   - `{businessName}` → Replaced with actual business name
   - `{version}` → Replaced with base version
   - Example output: "Clothing Store Demo Template v1.0.0"

5. **Click "Export X Templates"**
   - System processes each business
   - Shows progress
   - Displays results:
     - ✅ Successful exports
     - ❌ Failed exports (with errors)

6. **Review Results**
   ```
   Total: 5
   Successful: 4
   Failed: 1
   
   ✓ Clothing Store Demo - 1067 products, 15 categories
   ✓ Hardware Store Demo - 320 products, 8 categories
   ✓ Grocery Store Demo - 450 products, 12 categories
   ✗ Restaurant Demo - Error: Permission denied
   ```

**Result:** Multiple templates created at once! ⚡

---

## 📋 Complete Workflow Examples

### Example 1: Clone a Business

**Scenario:** You have a successful hardware store and want to create another.

1. **Export from existing store**
   - Go to Export page
   - Select "Hardware Store A"
   - Name: "Hardware Store Template v1.0"
   - Export with active products only

2. **Create new business**
   - Go to Business Management
   - Create "Hardware Store B"
   - Same business type (hardware)

3. **Import template**
   - Go to Import page
   - Select "Hardware Store Template v1.0"
   - Target: "Hardware Store B"
   - Mode: "Skip existing" (safe)
   - Preview changes
   - Import

**Result:** Hardware Store B has same products as A! 🎯

---

### Example 2: Update Multiple Stores

**Scenario:** You want to add new winter products to all clothing stores.

1. **Create winter template**
   - Manually add winter products to one store
   - Export as "Winter Collection 2025 v1.0"
   - Include only new winter items

2. **Import to each store**
   - Go to Import page
   - Select template
   - For each clothing store:
     - Select target store
     - Mode: "New items only"
     - Preview (should show all creates, no updates)
     - Import

**Alternative: Use Bulk Import (future feature)**

---

### Example 3: Migrate Demo to Production

**Scenario:** You tested products in a demo store, now want in production.

1. **Export from demo**
   - Source: "Clothing Store Demo"
   - Name: "Production Clothing v2.0"
   - Zero prices: YES (production will set real prices)
   - Active only: YES

2. **Preview before import**
   - Target: "Production Clothing Store"
   - Mode: "Update existing"
   - Click "Compare with Existing"
   - Review all differences
   - Verify changes are intentional

3. **Import carefully**
   - If preview looks good → Import
   - If not → Cancel and adjust template

**Result:** Safe migration with verification! ✅

---

## 🎨 Understanding Import Modes

### Mode 1: Skip Existing (Safest)

```
✅ Creates new items
⏭️ Skips items that already exist
❌ Never overwrites existing data
```

**Use when:**
- Adding new products to existing catalog
- Unsure about conflicts
- Want to be safe

**Example:**
- Template has 100 products
- Business has 50 products
- 30 overlap with template
- **Result:** 20 new creates, 30 skipped, 50 kept = 70 total

---

### Mode 2: Update Existing

```
✅ Creates new items
🔄 Updates items that exist (overwrites)
```

**Use when:**
- Updating prices
- Refreshing descriptions
- Syncing changes
- Want template to override existing

**Example:**
- Template has 100 products
- Business has 50 products
- 30 overlap
- **Result:** 20 creates, 30 updates = 70 total (50 originals modified)

---

### Mode 3: New Items Only

```
✅ Creates items that don't exist
⏭️ Skips ALL items that exist (even if different)
```

**Use when:**
- Only want to add new products
- Never modify existing
- Conservative approach

**Example:**
- Template has 100 products
- Business has 50 products
- 30 overlap
- **Result:** 20 creates, 80 skipped = 70 total (50 untouched)

---

## 🔍 Preview vs Diff: What's the Difference?

### Preview Changes 👁️

**Shows what WILL happen during import**

```
Summary:
✅ 50 items will be created
🔄 20 items will be updated
⏭️ 30 items will be skipped

Item List:
📦 Laptop Computer - CREATE
📦 Desktop Monitor - UPDATE
📦 Keyboard - SKIP
```

**Use when:** You want to know the import outcome

---

### Compare with Existing 🔍

**Shows differences between template and current data**

```
Summary:
➕ 50 items added
➖ 10 items removed
📝 20 items modified
⚪ 30 items unchanged

Detailed Changes:
📦 Laptop Computer
  basePrice:
    - $999.00
    + $1,099.00
  description:
    - "Old description"
    + "New description"
```

**Use when:** You want to see field-level differences

---

## 🎯 Best Practices

### ✅ DO

- **Preview before importing** - Always click preview first
- **Use descriptive names** - "Clothing Winter 2025 v1.0" not "template1"
- **Version templates** - v1.0, v1.1, v2.0 for tracking changes
- **Export active only** - Skip discontinued products
- **Compare differences** - Use diff viewer for major updates
- **Test on demo first** - Try import on test business before production
- **Document templates** - Add descriptions explaining what's included

### ❌ DON'T

- **Don't skip preview** - Always check what will happen
- **Don't blindly update** - Review diffs for unintended changes
- **Don't mix business types** - Can't import clothing template to grocery store
- **Don't lose original data** - Backup before major imports
- **Don't reuse generic names** - "Template 1" isn't helpful later

---

## 🆘 Troubleshooting

### Problem: "Business type mismatch"

**Error:** Can't import clothing template to grocery business

**Solution:** 
- Templates are business-type specific
- Export template from same business type
- Or create new template for target type

---

### Problem: "No changes in preview"

**Symptom:** Preview shows 0 creates, 0 updates, all skipped

**Causes:**
1. **All items already exist** (correct if intentional)
2. **Import mode is "Skip existing"** and everything matches
3. **Template is empty** or filtered to zero items

**Solution:**
- Check import mode (try "Update existing" if you want to overwrite)
- Verify template has items (download and inspect JSON)
- Check filters (active only may exclude everything)

---

### Problem: Preview shows unexpected updates

**Symptom:** Preview says it will update items you didn't change

**Causes:**
1. **Template has different values** for existing items
2. **SKU matching** found items with same SKU but different names
3. **Data was modified** in business since template was created

**Solution:**
- Click "Compare with Existing" to see exact differences
- Review field-by-field changes in diff viewer
- If unintended, switch to "Skip existing" or "New items only"

---

### Problem: Bulk export failed for some businesses

**Symptom:** "Total: 5, Successful: 3, Failed: 2"

**Causes:**
1. **Permission denied** - You don't have access to some businesses
2. **Business deleted** - Business was removed
3. **Empty business** - Business has no products/categories

**Solution:**
- Review error messages for each failed business
- Deselect businesses you can't access
- Verify businesses exist and have data
- Contact admin if permission issues

---

## 📊 Template Management

### View All Templates

**Path:** `/admin/seed-templates`

**Features:**
- Filter by business type
- Filter by active/inactive
- Search by name
- Sort by version, date
- View template details
- Download templates
- Delete templates
- Set default templates

### Template Actions

**Download** ⬇️
- Downloads JSON file to computer
- Can upload later or share with others

**Set as Default** ⭐
- Marks template as default for its business type
- Used for quick "create business with template" workflows

**Toggle Active** 🔘
- Active templates appear in import dropdown
- Inactive templates hidden (but not deleted)
- Use to archive old versions

**Delete** 🗑️
- Permanently removes template
- Cannot be undone
- Download first if you might need it later

---

## 🔮 Future Features (Coming Soon)

### Phase 3 Enhancements

- [ ] **Scheduled exports** - Auto-export daily/weekly
- [ ] **Email notifications** - Get notified when export completes
- [ ] **Template comparison** - Diff two templates (not template vs business)
- [ ] **Template merging** - Combine multiple templates
- [ ] **Partial import** - Select specific items from preview
- [ ] **Import rollback** - Undo recent import
- [ ] **Template validation** - Check for errors before import
- [ ] **Custom diff layouts** - Different visualization options
- [ ] **Export to CSV/Excel** - Alternative formats
- [ ] **Import history** - Track who imported what when

---

## 📚 FAQ

**Q: Can I export from one business type and import to another?**

A: No. Templates are business-type specific (clothing, grocery, hardware, etc.). You must export from and import to the same business type.

---

**Q: What happens if I import twice with the same template?**

A: Depends on import mode:
- **Skip existing:** Second import does nothing (all skipped)
- **Update existing:** Second import updates all items again
- **New items only:** Second import skips all items

---

**Q: Can I edit a template after exporting?**

A: Yes! Download the JSON file, edit in text editor, then upload during import. Be careful with JSON syntax.

---

**Q: Do templates include images?**

A: Currently, no. Templates only include text data (names, descriptions, prices, SKUs). Images must be added separately to each business.

---

**Q: Can I import the same template to multiple businesses?**

A: Yes! That's the whole point. Export once, import many times to different businesses of the same type.

---

**Q: What if I made a mistake during import?**

A: Currently, there's no automatic undo. Best practices:
1. Always preview first
2. Test on demo business
3. Backup before major imports
4. Future: Import rollback feature coming

---

**Q: How do I backup a business?**

A: Export a template with:
- All products (active + inactive)
- Descriptive name: "Backup YYYY-MM-DD"
- Current version number
- Download JSON file for safekeeping

---

**Q: Can I schedule automatic exports?**

A: Not yet. This is a planned Phase 3 feature. Current workaround: Use bulk export weekly and download JSON files.

---

## 🎓 Advanced Tips

### Tip 1: Use Versions Strategically

```
v1.0.0 - Initial release
v1.1.0 - Added winter products
v1.2.0 - Updated prices for Q2
v2.0.0 - Major restructure
```

Track changes in description field.

---

### Tip 2: Create Category Templates

Export templates with just categories/subcategories:
- Filter products to zero (custom export)
- Import structure to new businesses
- Add products later manually

---

### Tip 3: Price Templates Separately

Create two templates:
1. **Structure template** - Zero prices, full catalog
2. **Price update template** - Just price changes

Import structure first, prices second.

---

### Tip 4: Use Bulk Export for Backups

Weekly backup routine:
1. Bulk export all businesses
2. Version: "backup-YYYY-MM-DD"
3. Download all JSON files
4. Store in secure location

---

### Tip 5: Test on Demo First

Before major production import:
1. Create demo business (same type)
2. Import template to demo
3. Verify results
4. If good, import to production
5. If bad, delete demo and fix template

---

## 📞 Support

**Need help?**

1. Check this guide first
2. Review error messages carefully
3. Try preview/diff to understand issue
4. Contact system administrator
5. Check API logs for technical errors

---

## 🎉 Quick Reference Card

| Task | Path | Button |
|------|------|--------|
| **View all templates** | `/admin/seed-templates` | - |
| **Create template** | `/admin/seed-templates/export` | Export New Template |
| **Import template** | `/admin/seed-templates/import` | Import Template |
| **Preview import** | Import page | 👁️ Preview Changes |
| **Compare diff** | Import page | 🔍 Compare with Existing |
| **Bulk export** | `/admin/seed-templates/bulk-export` | Bulk Export |
| **Download template** | Template list | ⬇️ Download |
| **Delete template** | Template list | 🗑️ Delete |

---

**Last Updated:** December 2, 2025  
**Version:** 1.0.0  
**Status:** Complete ✅

