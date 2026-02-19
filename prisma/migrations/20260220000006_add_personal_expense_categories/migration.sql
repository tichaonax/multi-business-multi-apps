-- Migration: Add Personal expense domain and categories
-- Safe to run on production: uses INSERT ... WHERE NOT EXISTS / ON CONFLICT DO NOTHING

-- Step 1: Create the Personal domain if it doesn't exist
INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT
  'domain_personal',
  'Personal',
  '👤',
  'Personal expense categories for individual expense accounts',
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM expense_domains WHERE name = 'Personal'
);

-- Step 2: Insert personal categories (skip if already exists under the Personal domain)
INSERT INTO expense_categories (id, name, emoji, color, "isDefault", "isUserCreated", "requiresSubcategory", "domainId", "createdAt", "updatedAt")
SELECT id, name, emoji, color, "isDefault", "isUserCreated", "requiresSubcategory",
  (SELECT id FROM expense_domains WHERE name = 'Personal'),
  NOW(), NOW()
FROM (VALUES
  ('exp_personal_rent',          'Rent',          '🏡', '#6366F1', true, false, false),
  ('exp_personal_grocery',       'Grocery',       '🥝', '#22C55E', true, false, false),
  ('exp_personal_dining',        'Dining',        '🍔', '#F97316', true, false, false),
  ('exp_personal_transport',     'Transportation','🚘', '#06B6D4', true, false, false),
  ('exp_personal_shopping',      'Shopping',      '🛍', '#EC4899', true, false, false),
  ('exp_personal_loan',          'Loan',          '📚', '#EF4444', true, false, false),
  ('exp_personal_pet',           'Pet',           '🐶', '#84CC16', true, false, false),
  ('exp_personal_utility',       'Utility',       '⚡', '#EAB308', true, false, false),
  ('exp_personal_personal',      'Personal',      '💫', '#8B5CF6', true, false, false),
  ('exp_personal_insurance',     'Insurance',     '🧷', '#14B8A6', true, false, false),
  ('exp_personal_phone',         'Phone',         '📞', '#3B82F6', true, false, false),
  ('exp_personal_gym',           'Gym',           '💪', '#F59E0B', true, false, false),
  ('exp_personal_wellness',      'Wellness',      '🧘', '#10B981', true, false, false),
  ('exp_personal_travel',        'Travel',        '✈️', '#0EA5E9', true, false, false),
  ('exp_personal_homegoods',     'Home Goods',    '🏠', '#A855F7', true, false, false),
  ('exp_personal_medical',       'Medical',       '👩‍⚕️', '#F43F5E', true, false, false),
  ('exp_personal_giving',        'Giving',        '🎗', '#D946EF', true, false, false),
  ('exp_personal_entertainment', 'Entertainment', '🍿', '#FB923C', true, false, false),
  ('exp_personal_interest',      'Interest',      '💵', '#059669', true, false, false),
  ('exp_personal_other',         'Other',         '🙉', '#6B7280', true, false, false)
) AS v(id, name, emoji, color, "isDefault", "isUserCreated", "requiresSubcategory")
ON CONFLICT (id) DO NOTHING;
