# Demo Data Backup Templates

This directory contains "golden" backup templates of demo data for quick restoration.

## 📦 What's in a Template?

A demo data template is a complete snapshot of all demo data including:
- ✅ 4 demo businesses (Restaurant, Grocery, Hardware, Clothing)
- ✅ 16 employees with login credentials
- ✅ 1,284 products with barcodes
- ✅ WiFi Portal data (ESP32 & R710 tokens)
- ✅ Printer configurations and print jobs
- ✅ Payroll accounts, periods, and entries
- ✅ HR features (benefits, loans, leave, salary increases)
- ✅ Construction projects and contractors

## 🎯 Purpose

Templates allow you to:
1. **Quickly reset demo data** to pristine state
2. **Distribute standard demo setups** across environments
3. **Version control demo data** configurations
4. **Backup known-good state** before major changes

## 📝 Available Templates

### `demo-data-template-v1.0`
- **Version**: 1.0
- **Created**: After Phase 7 completion (100% feature coverage)
- **Size**: ~5-10 MB (compressed)
- **Contents**: Complete demo data for all features

## 🚀 Usage

### Create a New Template

After seeding all demo data, create a new template:

```bash
node scripts/create-demo-template.js
```

This will generate:
- `demo-data-template-v1.0.json` - Uncompressed backup (for inspection)
- `demo-data-template-v1.0.json.gz` - Compressed backup (for distribution)
- `demo-data-template-v1.0.meta.json` - Metadata and statistics

### Restore from Template

To reset demo data to template state:

```bash
node scripts/restore-demo-template.js
```

This will:
1. Clean all existing demo data
2. Re-run all seeding scripts to restore fresh state
3. Verify restoration was successful

**⚠️ Warning**: This deletes all existing demo data!

## 🔄 When to Use Templates

### Use Template Restoration When:
- ✅ Testing corrupted demo data
- ✅ Need fast reset between test runs
- ✅ Setting up new environment with standard demo data
- ✅ Reverting after experimental changes

### Use Fresh Seeding When:
- ✅ Updating to new demo data structure
- ✅ Testing seeding scripts themselves
- ✅ Customizing demo data
- ✅ Initial setup

## 📊 Template vs Fresh Seeding

| Method | Speed | Use Case |
|--------|-------|----------|
| **Template Restore** | Fast (~1-2 min) | Reset to known state |
| **Fresh Seeding** | Slower (~5-10 min) | Update structure/data |

## 🗂️ File Structure

```
seed-data/templates/
├── README.md (this file)
├── demo-data-template-v1.0.json      # Uncompressed (for inspection)
├── demo-data-template-v1.0.json.gz   # Compressed (for distribution)
└── demo-data-template-v1.0.meta.json # Metadata
```

## 💡 Best Practices

1. **Create templates after major milestones** (e.g., after Phase 7 completion)
2. **Version your templates** (v1.0, v1.1, etc.)
3. **Include metadata** with creation date and contents
4. **Test restoration** before relying on template
5. **Keep templates in version control** (if size allows)
6. **Document template contents** in metadata

## 🔗 Related Scripts

- `scripts/create-demo-template.js` - Create new backup template
- `scripts/restore-demo-template.js` - Restore from template
- `scripts/seed-all-demo-data.js` - Fresh seeding (alternative)

## 📚 Documentation

See also:
- `DEMO-DATA-EXPANSION-PLAN.md` - Complete project plan
- `DEMO-TEST-CREDENTIALS.md` - Login credentials
- `DEMO-DATA-AUDIT-REPORT.md` - Data verification

---

**Note**: Templates are optional. You can always reseed fresh data using the master seeding script.
