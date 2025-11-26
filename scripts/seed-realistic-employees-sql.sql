-- Seed realistic employees with all required fields
-- Run with: PGPASSWORD=postgres psql -U postgres -d multi_business_db -f scripts/seed-realistic-employees-sql.sql

BEGIN;

-- Get admin user ID
DO $$
DECLARE
  admin_id TEXT;
  start_date DATE := '2025-09-01';
  gen_mgr_title_id TEXT;
  sales_mgr_title_id TEXT;
  sales_rep_title_id TEXT;
  ops_mgr_title_id TEXT;
  comp_monthly_mgmt TEXT := 'monthly-management';
  comp_monthly_prof TEXT := 'monthly-professional';
  comp_base_comm_low TEXT := 'base-plus-commission-low';
  comp_base_comm_high TEXT := 'base-plus-commission-high';

BEGIN
  -- Get admin user
  SELECT id INTO admin_id FROM users WHERE email = 'admin@business.local' LIMIT 1;

  -- Get/Create job titles
  INSERT INTO job_titles (id, title, description, category)
  VALUES (gen_uuid(), 'General Manager', 'General Manager', 'management')
  ON CONFLICT (title) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO gen_mgr_title_id;

  SELECT id INTO gen_mgr_title_id FROM job_titles WHERE title = 'General Manager' LIMIT 1;
  SELECT id INTO sales_mgr_title_id FROM job_titles WHERE title = 'Sales Manager' LIMIT 1;
  SELECT id INTO sales_rep_title_id FROM job_titles WHERE title = 'Sales Representative' LIMIT 1;
  SELECT id INTO ops_mgr_title_id FROM job_titles WHERE title = 'Operations Manager' LIMIT 1;

  -- Create job titles if not exist
  IF sales_mgr_title_id IS NULL THEN
    INSERT INTO job_titles (id, title, description, category)
    VALUES (gen_uuid(), 'Sales Manager', 'Sales Manager', 'sales')
    RETURNING id INTO sales_mgr_title_id;
  END IF;

  IF sales_rep_title_id IS NULL THEN
    INSERT INTO job_titles (id, title, description, category)
    VALUES (gen_uuid(), 'Sales Representative', 'Sales Representative', 'sales')
    RETURNING id INTO sales_rep_title_id;
  END IF;

  IF ops_mgr_title_id IS NULL THEN
    INSERT INTO job_titles (id, title, description, category)
    VALUES (gen_uuid(), 'Operations Manager', 'Operations Manager', 'management')
    RETURNING id INTO ops_mgr_title_id;
  END IF;

  RAISE NOTICE 'Creating realistic employees with start date: %', start_date;
  RAISE NOTICE 'Admin ID: %', admin_id;
  RAISE NOTICE 'Job Title IDs created';

END $$;

COMMIT;

SELECT 'Realistic employees seed data prepared!' AS status;
