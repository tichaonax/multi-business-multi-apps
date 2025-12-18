-- Check tokens from ESP32 and their sale status
-- Replace 'a3f37582-5ca7-48ac-94c3-6613452bb871' with your business ID

-- First, let's see if these specific tokens exist in the database
SELECT
  'Token Existence Check' as query_type,
  t.token,
  t.status,
  t."tokenConfigId",
  t."createdAt",
  COUNT(s.id) as sale_count
FROM "WifiTokens" t
LEFT JOIN "wifi_token_sales" s ON t.id = s."wifiTokenId"
WHERE t."businessId" = 'a3f37582-5ca7-48ac-94c3-6613452bb871'
  AND t.token IN ('XBZ9MN4R', '5KGK6GZY', 'HV25YDLJ', 'KL6PRJT8', 'DWKCRNRT')
GROUP BY t.token, t.status, t."tokenConfigId", t."createdAt"
ORDER BY t."createdAt" DESC;

-- Check all UNUSED tokens for this business
SELECT
  'All UNUSED Tokens' as query_type,
  t.token,
  t.status,
  COUNT(s.id) as sale_count,
  MAX(s."soldAt") as last_sold_at,
  MAX(s."saleChannel") as sale_channel
FROM "WifiTokens" t
LEFT JOIN "wifi_token_sales" s ON t.id = s."wifiTokenId"
WHERE t."businessId" = 'a3f37582-5ca7-48ac-94c3-6613452bb871'
  AND t.status = 'UNUSED'
GROUP BY t.token, t.status
ORDER BY sale_count DESC, t."createdAt" DESC
LIMIT 20;

-- Check sale records for these tokens
SELECT
  'Sale Records' as query_type,
  s.id as sale_id,
  t.token,
  s."saleAmount",
  s."paymentMethod",
  s."saleChannel",
  s."soldAt",
  s."soldBy",
  u.name as seller_name,
  u.email as seller_email
FROM "wifi_token_sales" s
JOIN "WifiTokens" t ON s."wifiTokenId" = t.id
LEFT JOIN "Users" u ON s."soldBy" = u.id
WHERE t."businessId" = 'a3f37582-5ca7-48ac-94c3-6613452bb871"
  AND t.token IN ('XBZ9MN4R', '5KGK6GZY', 'HV25YDLJ', 'KL6PRJT8', 'DWKCRNRT')
ORDER BY s."soldAt" DESC;

-- Summary: How many UNUSED tokens are unsold?
SELECT
  'Summary' as query_type,
  COUNT(*) as total_unused,
  COUNT(CASE WHEN s.id IS NULL THEN 1 END) as unsold_count,
  COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) as sold_count
FROM "WifiTokens" t
LEFT JOIN "wifi_token_sales" s ON t.id = s."wifiTokenId"
WHERE t."businessId" = 'a3f37582-5ca7-48ac-94c3-6613452bb871'
  AND t.status = 'UNUSED';
