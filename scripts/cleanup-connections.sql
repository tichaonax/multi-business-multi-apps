-- Cleanup stuck database connections
-- Run this if you're experiencing connection pool exhaustion

-- 1. Check current connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE datname = 'multi_business_db'
ORDER BY state_change DESC;

-- 2. Terminate idle connections (except current)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'multi_business_db'
  AND pid <> pg_backend_pid()
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';

-- 3. Check remaining connections
SELECT
  count(*) as total_connections,
  state,
  application_name
FROM pg_stat_activity
WHERE datname = 'multi_business_db'
GROUP BY state, application_name
ORDER BY count(*) DESC;

-- 4. Show max connections limit
SHOW max_connections;
