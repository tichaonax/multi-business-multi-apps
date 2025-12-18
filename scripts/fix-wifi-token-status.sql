-- Fix WiFi tokens that were incorrectly created with status='ACTIVE'
-- These should be 'UNUSED' if they haven't been redeemed yet (no firstUsedAt)

-- First, let's see what we're fixing
SELECT
  'Tokens to fix' as action,
  COUNT(*) as count,
  t.status,
  COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) as has_sale_records
FROM "WifiTokens" t
LEFT JOIN "wifi_token_sales" s ON t.id = s."wifiTokenId"
WHERE t.status = 'ACTIVE'
  AND t."firstUsedAt" IS NULL -- Never actually used
GROUP BY t.status;

-- Fix the tokens: Change ACTIVE to UNUSED if never actually used
UPDATE "WifiTokens"
SET status = 'UNUSED'
WHERE status = 'ACTIVE'
  AND "firstUsedAt" IS NULL -- Token was never actually redeemed/used
  AND "usageCount" = 0;      -- No usage recorded

-- Verify the fix
SELECT
  'After fix' as action,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN "firstUsedAt" IS NOT NULL THEN 1 END) as has_been_used
FROM "WifiTokens"
WHERE "businessId" = 'a3f37582-5ca7-48ac-94c3-6613452bb871' -- Replace with your business ID
GROUP BY status
ORDER BY status;

-- Check if any tokens still have erroneous sale records
SELECT
  'Sale records check' as action,
  COUNT(DISTINCT t.id) as tokens_with_sales,
  COUNT(s.id) as total_sale_records
FROM "WifiTokens" t
INNER JOIN "wifi_token_sales" s ON t.id = s."wifiTokenId"
WHERE t."businessId" = 'a3f37582-5ca7-48ac-94c3-6613452bb871';
