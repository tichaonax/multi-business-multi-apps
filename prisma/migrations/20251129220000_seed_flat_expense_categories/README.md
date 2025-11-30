# Seed Global Flat Expense Categories

This migration seeds global expense categories that do not require subcategories. These are intended to be used as simple, flat categories for typical one-off expenses (e.g., Contractor Services, Utilities).

- Seeds rows into table: `expense_categories` with `domainId` = NULL
- Uses fixed IDs and `ON CONFLICT (id) DO NOTHING` for idempotence
- Requires `expense_categories` table to exist (schema migration adding the `requiresSubcategory` column runs earlier)
