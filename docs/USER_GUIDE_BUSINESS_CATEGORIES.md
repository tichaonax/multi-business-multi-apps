# Business Expense Categories - User Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-26
**Feature:** Business-wide expense category management

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing the System](#accessing-the-system)
3. [Required Permissions](#required-permissions)
4. [Managing Categories](#managing-categories)
5. [Managing Subcategories](#managing-subcategories)
6. [Using the Emoji Picker](#using-the-emoji-picker)
7. [Search and Filter](#search-and-filter)
8. [Common Tasks](#common-tasks)
9. [Error Messages](#error-messages)
10. [Tips and Best Practices](#tips-and-best-practices)

---

## Overview

The Business Expense Categories system allows you to create and manage a centralized hierarchy of expense categories and subcategories for your organization. This system replaces personal expense categories with business-wide categories that can be shared across all users.

### Key Features

- **Hierarchical Organization:** Organize expenses by Domain → Category → Subcategory
- **Visual Identification:** Use emojis and colors for quick recognition
- **Smart Emoji Picker:** Search local database or fetch from GitHub (3000+ emojis)
- **Usage Tracking:** Popular emojis are highlighted for quick access
- **Permission Control:** Granular permissions for create, edit, and delete operations
- **Duplicate Prevention:** Automatic detection of duplicate names
- **Usage Validation:** Prevents deletion of categories/subcategories in use

---

## Accessing the System

### Desktop Navigation
1. Click on **Business Hub** in the left sidebar
2. Scroll to the **Tools** section
3. Click on **📁 Business Categories**

### Mobile Navigation
1. Tap the menu icon (☰) in the top-left corner
2. Scroll to the **Tools** section
3. Tap **📁 Business Categories**

### Direct URL
Navigate to: `https://your-domain.com/business/categories`

---

## Required Permissions

To use this system, you need one or more of the following permissions (contact your administrator):

### Category Permissions
- **Create Categories** (`canCreateBusinessCategories`) - Add new expense categories
- **Edit Categories** (`canEditBusinessCategories`) - Modify existing categories
- **Delete Categories** (`canDeleteBusinessCategories`) - Remove categories (with validation)

### Subcategory Permissions
- **Create Subcategories** (`canCreateBusinessSubcategories`) - Add new subcategories
- **Edit Subcategories** (`canEditBusinessSubcategories`) - Modify existing subcategories
- **Delete Subcategories** (`canDeleteBusinessSubcategories`) - Remove subcategories (with validation)

> **Note:** Users without any of these permissions can still **view** all categories and subcategories but cannot make changes.

---

## Managing Categories

### Viewing Categories

The main page displays all categories organized by domain:

- **Business** - Company-related expenses
- **Personal** - Individual expenses
- **Mixed** - Combination of business and personal

Each category shows:
- Emoji icon for visual identification
- Category name
- Color indicator
- Number of subcategories
- Action buttons (if you have permissions)

### Creating a New Category

1. Click the **➕ Add Category** button (top-right)
2. Fill in the required fields:
   - **Domain:** Select Business, Personal, or Mixed
   - **Name:** Enter a unique category name
   - **Description:** (Optional) Add details about this category
   - **Emoji:** Search and select an emoji icon
   - **Color:** Choose a color for visual identification
3. Click **Create Category**

**Validation:**
- Category names must be unique within each domain
- Names are case-insensitive (e.g., "Office" and "OFFICE" are duplicates)

### Editing a Category

1. Find the category you want to edit
2. Click the **✏️ Edit** button next to the category
3. Modify the fields as needed
4. Click **Save Changes**

**Note:** You cannot change the category name to match an existing category in the same domain.

### Deleting a Category

1. Find the category you want to delete
2. Click the **🗑️ Delete** button
3. Confirm the deletion

**Restrictions:**
- Cannot delete a category that has subcategories (delete subcategories first)
- Cannot delete if any subcategories under it are used in expenses
- System will show how many subcategories need to be removed first

---

## Managing Subcategories

### Viewing Subcategories

- Click the **▶ expand** arrow next to a category to see its subcategories
- Each subcategory shows:
  - Emoji icon (or inherits from parent category)
  - Subcategory name
  - Description
  - Action buttons

### Creating a New Subcategory

1. Find the parent category
2. Click the **➕ Add Subcategory** button
3. Fill in the fields:
   - **Parent Category:** (Auto-filled, read-only)
   - **Name:** Enter a unique subcategory name
   - **Description:** (Optional) Add details
   - **Emoji:** (Optional) Select an emoji or leave empty to inherit from parent
4. Click **Create Subcategory**

**Validation:**
- Subcategory names must be unique within the parent category
- Same name can exist in different categories
- Names are case-insensitive

### Editing a Subcategory

1. Expand the parent category
2. Click the **✏️ Edit** button next to the subcategory
3. Modify the fields
4. Click **Save Changes**

### Deleting a Subcategory

1. Find the subcategory
2. Click the **🗑️ Delete** button
3. Confirm the deletion

**Restrictions:**
- Cannot delete if the subcategory is used in any expenses
- System will show how many expenses are using it

---

## Using the Emoji Picker

The enhanced emoji picker provides two sources for emojis:

### Local Database (Fast)

1. Type a description in the search box (e.g., "money", "food", "car")
2. Results appear instantly from your local database
3. Popular emojis (used 5+ times) show a ⭐ star badge
4. Local emojis show a 🏠 house badge

### GitHub Integration (Extensive)

If you need more options:

1. Search for an emoji in the search box
2. If few results appear, click **🔍 Find more on GitHub**
3. Additional emojis from GitHub's database (3000+) will appear
4. GitHub emojis show a 🐙 octopus badge
5. Selected GitHub emojis are automatically cached for future use

### Emoji Selection

- Click any emoji to select it
- Selected emoji appears in the "Selected" preview box
- Emojis are sorted by popularity (most-used first)

### Offline Mode

- If GitHub is unavailable, you'll see: "Unable to reach GitHub. Use local results..."
- All local emoji search continues to work normally
- Previously cached GitHub emojis are still available

---

## Search and Filter

### Searching Categories

1. Use the search box at the top of the page
2. Type any part of a category or subcategory name
3. Results update in real-time
4. Matching categories remain expanded

### Expanding/Collapsing

- Click **▼ Collapse All** to hide all subcategories
- Click **▶ Expand All** to show all subcategories
- Click individual arrows to expand/collapse specific categories

### Filtering by Domain

Currently, all domains are shown by default. Use the search feature to find specific categories.

---

## Common Tasks

### Task 1: Add a New Business Expense Type

**Example:** Adding "Office Supplies"

1. Click **➕ Add Category**
2. Select Domain: **Business**
3. Name: **Office Supplies**
4. Description: **Stationery, equipment, and office materials**
5. Search emoji: "pencil" → Select ✏️
6. Choose a color: Blue
7. Click **Create Category**

Then add subcategories:

1. Click **➕ Add Subcategory** under "Office Supplies"
2. Name: **Stationery**
3. Emoji: 📝
4. Click **Create Subcategory**

Repeat for: Pens, Paper, Binders, etc.

### Task 2: Reorganize Expenses

**Example:** Moving subcategories around

1. Create the new parent category
2. Create subcategories under the new parent
3. Re-assign expenses to the new subcategories (in expense management)
4. Delete old subcategories once empty

### Task 3: Update Category Colors

**Example:** Color-coding by department

1. Click **✏️ Edit** on each category
2. Choose a color:
   - **Blue** for Operations
   - **Green** for Finance
   - **Red** for HR
   - **Purple** for IT
3. Save changes

---

## Error Messages

### "A category with this name already exists in this domain"

**Cause:** You're trying to create a duplicate category name (case-insensitive)

**Solution:** Choose a different name or check if the category already exists

### "Cannot delete category: it has X subcategories"

**Cause:** The category still has subcategories under it

**Solution:** Delete or move all subcategories first, then delete the category

### "Cannot delete subcategory: it is used by X expense(s)"

**Cause:** Expenses are using this subcategory

**Solution:** Re-assign those expenses to a different subcategory, then delete

### "Unable to reach GitHub. Use local results..."

**Cause:** No internet connection or GitHub API is down

**Solution:** Use the local emoji search, which continues to work offline

### "Forbidden" or "403 Error"

**Cause:** You don't have permission for this action

**Solution:** Contact your administrator to request the appropriate permission

---

## Tips and Best Practices

### Naming Conventions

✅ **Do:**
- Use clear, descriptive names (e.g., "Office Supplies" not "Supplies")
- Be consistent with capitalization
- Use specific subcategories (e.g., "Printer Paper" not just "Paper")

❌ **Don't:**
- Use special characters or numbers in names
- Create overly generic categories (e.g., "Miscellaneous")
- Duplicate similar names (e.g., "Office Supply" and "Office Supplies")

### Organization Hierarchy

**Good Structure:**
```
📁 Office Expenses
  ├─ 📝 Stationery
  ├─ 🖥️ Computer Equipment
  ├─ 🪑 Furniture
  └─ ☕ Pantry Supplies
```

**Poor Structure:**
```
📁 Expenses
  ├─ Item 1
  ├─ Item 2
  └─ Other
```

### Emoji Selection

- Use emojis that visually represent the category
- Be consistent across similar categories
- Use popular emojis (⭐) for frequently used categories
- Don't worry about finding the "perfect" emoji - you can always change it later

### Color Coding

- Use colors strategically (by department, expense type, etc.)
- Limit your color palette to 5-7 colors for consistency
- Document your color scheme for other users

### Maintenance

- Review your category structure quarterly
- Consolidate rarely-used subcategories
- Archive old categories by creating a domain-specific "Archive" category
- Train new users on the existing structure

---

## Troubleshooting

### Problem: I can't see the "Add Category" button

**Solution:** You don't have `canCreateBusinessCategories` permission. Contact your administrator.

### Problem: Emoji picker is slow

**Solution:**
- Local search is instant - use more specific keywords
- GitHub search takes 1-2 seconds - this is normal
- Previously searched GitHub emojis are cached and load instantly

### Problem: I accidentally deleted a category

**Solution:**
- If it had subcategories, you couldn't have deleted it
- If it's truly deleted, you'll need to recreate it
- For future: Take notes before deleting important categories

### Problem: My changes aren't showing up

**Solution:**
- Refresh the page (F5 or Cmd+R)
- Clear your browser cache
- Check if you're looking at the correct domain

---

## Support

For additional help:

1. **Technical Issues:** Contact your IT administrator
2. **Permission Requests:** Contact your system administrator
3. **Training:** Request a demo session from your manager
4. **Feature Requests:** Submit through your organization's feedback channel

---

## Appendix: Permission Matrix

| Action | Required Permission |
|--------|-------------------|
| View categories | None (all users) |
| Create category | `canCreateBusinessCategories` |
| Edit category | `canEditBusinessCategories` |
| Delete category | `canDeleteBusinessCategories` |
| Create subcategory | `canCreateBusinessSubcategories` |
| Edit subcategory | `canEditBusinessSubcategories` |
| Delete subcategory | `canDeleteBusinessSubcategories` |
| System Admin | All permissions (automatic) |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-26 | Initial release |

---

**End of User Guide**
