-- Remove duplicate global "Maintenance & Repairs" category (🔧)
-- Keeping 'cat-vehicle-maintenance-repairs', removing 'exp_flat_maintenance_repairs'
-- Both have domainId = null and zero payment references
DELETE FROM "expense_categories" WHERE id = 'exp_flat_maintenance_repairs';
