-- Seed Emoji Lookup Database
-- This migration populates the emoji_lookup table with popular business emojis
-- for immediate use in the category creation system

-- Insert popular business expense emojis with multiple keywords for better search

-- Money & Finance
INSERT INTO emoji_lookup (id, emoji, description, name, url, source, "fetchedAt", "usageCount") VALUES
(gen_random_uuid(), '💰', 'money', 'Money Bag - money', null, 'local', NOW(), 5),
(gen_random_uuid(), '💰', 'finance', 'Money Bag - finance', null, 'local', NOW(), 4),
(gen_random_uuid(), '💰', 'cash', 'Money Bag - cash', null, 'local', NOW(), 3),
(gen_random_uuid(), '💳', 'card', 'Credit Card - card', null, 'local', NOW(), 5),
(gen_random_uuid(), '💳', 'payment', 'Credit Card - payment', null, 'local', NOW(), 4),
(gen_random_uuid(), '💳', 'credit', 'Credit Card - credit', null, 'local', NOW(), 3),
(gen_random_uuid(), '🏦', 'bank', 'Bank - bank', null, 'local', NOW(), 5),
(gen_random_uuid(), '🏦', 'finance', 'Bank - finance', null, 'local', NOW(), 3),
(gen_random_uuid(), '💸', 'expense', 'Money with Wings - expense', null, 'local', NOW(), 6),
(gen_random_uuid(), '💸', 'spend', 'Money with Wings - spend', null, 'local', NOW(), 4),
(gen_random_uuid(), '💵', 'dollar', 'Dollar Bill - dollar', null, 'local', NOW(), 4),
(gen_random_uuid(), '💵', 'bill', 'Dollar Bill - bill', null, 'local', NOW(), 3),

-- Food & Dining
(gen_random_uuid(), '🍽️', 'food', 'Fork and Knife - food', null, 'local', NOW(), 6),
(gen_random_uuid(), '🍽️', 'restaurant', 'Fork and Knife - restaurant', null, 'local', NOW(), 5),
(gen_random_uuid(), '🍽️', 'dining', 'Fork and Knife - dining', null, 'local', NOW(), 4),
(gen_random_uuid(), '🍽️', 'meal', 'Fork and Knife - meal', null, 'local', NOW(), 4),
(gen_random_uuid(), '🍕', 'pizza', 'Pizza - pizza', null, 'local', NOW(), 3),
(gen_random_uuid(), '🍕', 'food', 'Pizza - food', null, 'local', NOW(), 2),
(gen_random_uuid(), '☕', 'coffee', 'Coffee - coffee', null, 'local', NOW(), 5),
(gen_random_uuid(), '☕', 'drink', 'Coffee - drink', null, 'local', NOW(), 3),
(gen_random_uuid(), '☕', 'cafe', 'Coffee - cafe', null, 'local', NOW(), 3),
(gen_random_uuid(), '🛒', 'shopping', 'Shopping Cart - shopping', null, 'local', NOW(), 4),
(gen_random_uuid(), '🛒', 'grocery', 'Shopping Cart - grocery', null, 'local', NOW(), 4),
(gen_random_uuid(), '🛒', 'supplies', 'Shopping Cart - supplies', null, 'local', NOW(), 3),

-- Business & Office
(gen_random_uuid(), '💼', 'business', 'Briefcase - business', null, 'local', NOW(), 6),
(gen_random_uuid(), '💼', 'work', 'Briefcase - work', null, 'local', NOW(), 4),
(gen_random_uuid(), '💼', 'office', 'Briefcase - office', null, 'local', NOW(), 4),
(gen_random_uuid(), '🏢', 'office', 'Office Building - office', null, 'local', NOW(), 5),
(gen_random_uuid(), '🏢', 'building', 'Office Building - building', null, 'local', NOW(), 3),
(gen_random_uuid(), '🏢', 'business', 'Office Building - business', null, 'local', NOW(), 3),
(gen_random_uuid(), '📦', 'package', 'Package - package', null, 'local', NOW(), 4),
(gen_random_uuid(), '📦', 'shipping', 'Package - shipping', null, 'local', NOW(), 4),
(gen_random_uuid(), '📦', 'supplies', 'Package - supplies', null, 'local', NOW(), 3),
(gen_random_uuid(), '📦', 'delivery', 'Package - delivery', null, 'local', NOW(), 3),

-- Technology
(gen_random_uuid(), '💻', 'computer', 'Laptop - computer', null, 'local', NOW(), 5),
(gen_random_uuid(), '💻', 'laptop', 'Laptop - laptop', null, 'local', NOW(), 4),
(gen_random_uuid(), '💻', 'technology', 'Laptop - technology', null, 'local', NOW(), 4),
(gen_random_uuid(), '💻', 'tech', 'Laptop - tech', null, 'local', NOW(), 3),
(gen_random_uuid(), '📞', 'phone', 'Telephone - phone', null, 'local', NOW(), 4),
(gen_random_uuid(), '📞', 'call', 'Telephone - call', null, 'local', NOW(), 3),
(gen_random_uuid(), '📞', 'communication', 'Telephone - communication', null, 'local', NOW(), 3),
(gen_random_uuid(), '📧', 'email', 'Email - email', null, 'local', NOW(), 4),
(gen_random_uuid(), '📧', 'mail', 'Email - mail', null, 'local', NOW(), 3),
(gen_random_uuid(), '📧', 'communication', 'Email - communication', null, 'local', NOW(), 2),

-- Transportation & Travel
(gen_random_uuid(), '🚗', 'car', 'Car - car', null, 'local', NOW(), 5),
(gen_random_uuid(), '🚗', 'transport', 'Car - transport', null, 'local', NOW(), 4),
(gen_random_uuid(), '🚗', 'vehicle', 'Car - vehicle', null, 'local', NOW(), 4),
(gen_random_uuid(), '🚗', 'travel', 'Car - travel', null, 'local', NOW(), 3),
(gen_random_uuid(), '✈️', 'airplane', 'Airplane - airplane', null, 'local', NOW(), 4),
(gen_random_uuid(), '✈️', 'flight', 'Airplane - flight', null, 'local', NOW(), 4),
(gen_random_uuid(), '✈️', 'travel', 'Airplane - travel', null, 'local', NOW(), 5),
(gen_random_uuid(), '✈️', 'trip', 'Airplane - trip', null, 'local', NOW(), 3),

-- Utilities & Services
(gen_random_uuid(), '⚡', 'electric', 'Lightning - electric', null, 'local', NOW(), 4),
(gen_random_uuid(), '⚡', 'utilities', 'Lightning - utilities', null, 'local', NOW(), 4),
(gen_random_uuid(), '⚡', 'power', 'Lightning - power', null, 'local', NOW(), 3),
(gen_random_uuid(), '⚡', 'energy', 'Lightning - energy', null, 'local', NOW(), 3),
(gen_random_uuid(), '🏠', 'house', 'House - house', null, 'local', NOW(), 4),
(gen_random_uuid(), '🏠', 'home', 'House - home', null, 'local', NOW(), 4),
(gen_random_uuid(), '🏠', 'rent', 'House - rent', null, 'local', NOW(), 4),
(gen_random_uuid(), '🏠', 'property', 'House - property', null, 'local', NOW(), 3),

-- Marketing & Advertising
(gen_random_uuid(), '🎯', 'target', 'Direct Hit - target', null, 'local', NOW(), 3),
(gen_random_uuid(), '🎯', 'marketing', 'Direct Hit - marketing', null, 'local', NOW(), 4),
(gen_random_uuid(), '🎯', 'advertising', 'Direct Hit - advertising', null, 'local', NOW(), 4),
(gen_random_uuid(), '🎯', 'goal', 'Direct Hit - goal', null, 'local', NOW(), 2),
(gen_random_uuid(), '📈', 'chart', 'Chart Rising - chart', null, 'local', NOW(), 3),
(gen_random_uuid(), '📈', 'growth', 'Chart Rising - growth', null, 'local', NOW(), 3),
(gen_random_uuid(), '📈', 'analytics', 'Chart Rising - analytics', null, 'local', NOW(), 3),
(gen_random_uuid(), '📈', 'report', 'Chart Rising - report', null, 'local', NOW(), 2),

-- Tools & Maintenance
(gen_random_uuid(), '🔧', 'tools', 'Wrench - tools', null, 'local', NOW(), 4),
(gen_random_uuid(), '🔧', 'maintenance', 'Wrench - maintenance', null, 'local', NOW(), 4),
(gen_random_uuid(), '🔧', 'repair', 'Wrench - repair', null, 'local', NOW(), 3),
(gen_random_uuid(), '🔧', 'service', 'Wrench - service', null, 'local', NOW(), 3),
(gen_random_uuid(), '🔨', 'hammer', 'Hammer - hammer', null, 'local', NOW(), 2),
(gen_random_uuid(), '🔨', 'construction', 'Hammer - construction', null, 'local', NOW(), 3),
(gen_random_uuid(), '🔨', 'repair', 'Hammer - repair', null, 'local', NOW(), 2),

-- Miscellaneous Business
(gen_random_uuid(), '🎁', 'gift', 'Gift - gift', null, 'local', NOW(), 3),
(gen_random_uuid(), '🎁', 'present', 'Gift - present', null, 'local', NOW(), 2),
(gen_random_uuid(), '🎁', 'bonus', 'Gift - bonus', null, 'local', NOW(), 2),
(gen_random_uuid(), '💡', 'idea', 'Light Bulb - idea', null, 'local', NOW(), 2),
(gen_random_uuid(), '💡', 'innovation', 'Light Bulb - innovation', null, 'local', NOW(), 2),
(gen_random_uuid(), '💡', 'creative', 'Light Bulb - creative', null, 'local', NOW(), 2),
(gen_random_uuid(), '📚', 'books', 'Books - books', null, 'local', NOW(), 3),
(gen_random_uuid(), '📚', 'education', 'Books - education', null, 'local', NOW(), 3),
(gen_random_uuid(), '📚', 'training', 'Books - training', null, 'local', NOW(), 3),
(gen_random_uuid(), '📚', 'learning', 'Books - learning', null, 'local', NOW(), 2)

ON CONFLICT (emoji, description) DO UPDATE SET
  "usageCount" = emoji_lookup."usageCount" + 1,
  "fetchedAt" = NOW();

-- Update migration tracking
-- This ensures the migration is recorded properly