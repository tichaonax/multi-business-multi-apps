-- Fix: Set emoji for "Employee Meal Program" expense category
-- This ensures the expense account transaction history shows 🍱 instead of ???
UPDATE "ExpenseCategories"
SET emoji = '🍱'
WHERE name = 'Employee Meal Program'
  AND (emoji IS NULL OR emoji = '' OR emoji = '???');

-- Verify the update
SELECT id, name, emoji, color
FROM "ExpenseCategories"
WHERE name = 'Employee Meal Program';
