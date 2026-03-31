-- Seed all sub-subcategories for Consulting business domain
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_biz TEXT; cat_fin TEXT; cat_it TEXT; cat_mkt TEXT;
  cat_train TEXT; cat_legal TEXT; cat_project TEXT; cat_health TEXT;
  cat_retail TEXT; cat_hr TEXT; cat_realestate TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Consulting';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_biz        FROM expense_categories WHERE "domainId" = d_id AND name = 'Business Consulting';
  SELECT id INTO cat_fin        FROM expense_categories WHERE "domainId" = d_id AND name = 'Financial Consulting';
  SELECT id INTO cat_it         FROM expense_categories WHERE "domainId" = d_id AND name = 'IT Consulting';
  SELECT id INTO cat_mkt        FROM expense_categories WHERE "domainId" = d_id AND name = 'Marketing Consulting';
  SELECT id INTO cat_train      FROM expense_categories WHERE "domainId" = d_id AND name = 'Training and Coaching';
  SELECT id INTO cat_legal      FROM expense_categories WHERE "domainId" = d_id AND name = 'Legal and Compliance Consulting';
  SELECT id INTO cat_project    FROM expense_categories WHERE "domainId" = d_id AND name = 'Project and Program Consulting';
  SELECT id INTO cat_health     FROM expense_categories WHERE "domainId" = d_id AND name = 'Healthcare Consulting';
  SELECT id INTO cat_retail     FROM expense_categories WHERE "domainId" = d_id AND name = 'Retail Consulting';
  SELECT id INTO cat_hr         FROM expense_categories WHERE "domainId" = d_id AND name = 'HR and Staffing Consulting';
  SELECT id INTO cat_realestate FROM expense_categories WHERE "domainId" = d_id AND name = 'Real Estate Consulting';

  -- ── Business Consulting ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_biz AND name = 'Strategy';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Strategic planning',    '🧭', false),
      (s_id, 'Growth strategy',       '📈', false),
      (s_id, 'Organizational planning','🧱', false),
      (s_id, 'Goal setting',          '🎯', false),
      (s_id, 'Market positioning',    '🏁', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_biz AND name = 'Operations';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Process improvement',   '⚙️', false),
      (s_id, 'Workflow analysis',     '🧾', false),
      (s_id, 'Supply chain consulting','📦', false),
      (s_id, 'Resource planning',     '🗂️', false),
      (s_id, 'Process optimization',  '🔁', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_biz AND name = 'Management';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Leadership advisory', '👥', false),
      (s_id, 'Change management',   '📋', false),
      (s_id, 'Executive coaching',  '🧑‍💼', false),
      (s_id, 'Decision support',    '🧠', false),
      (s_id, 'Team development',    '🧑‍🤝‍🧑', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Financial Consulting ──────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fin AND name = 'Accounting and Bookkeeping';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Bookkeeping',        '🧾', false),
      (s_id, 'General ledger support','📒', false),
      (s_id, 'Reconciliation',     '🧮', false),
      (s_id, 'Financial reporting','📑', false),
      (s_id, 'Expense tracking',   '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fin AND name = 'Financial Planning';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Budgeting',       '💸', false),
      (s_id, 'Forecasting',     '📈', false),
      (s_id, 'Cash flow planning','🏦', false),
      (s_id, 'Profit analysis', '🪙', false),
      (s_id, 'Financial goals', '🎯', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fin AND name = 'Tax and Compliance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tax planning',        '🧾', false),
      (s_id, 'Compliance review',   '📋', false),
      (s_id, 'Audit preparation',   '🛡️', false),
      (s_id, 'Regulatory support',  '📑', false),
      (s_id, 'Record retention',    '🧷', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── IT Consulting ─────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_it AND name = 'Systems';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Infrastructure planning','🖥️', false),
      (s_id, 'Network setup',          '🌐', false),
      (s_id, 'Cloud migration',        '☁️', false),
      (s_id, 'Security hardening',     '🔐', false),
      (s_id, 'Device management',      '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_it AND name = 'Software';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Application design',    '🧱', false),
      (s_id, 'Software implementation','🛠️', false),
      (s_id, 'Testing support',       '🧪', false),
      (s_id, 'System integration',    '🔄', false),
      (s_id, 'Development advisory',  '🧑‍💻', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_it AND name = 'Cybersecurity';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Risk assessments',  '🔐', false),
      (s_id, 'Incident response', '🧯', false),
      (s_id, 'Access control',    '🛑', false),
      (s_id, 'Vulnerability review','🔍', false),
      (s_id, 'Policy creation',   '🧩', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Marketing Consulting ──────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mkt AND name = 'Branding';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Brand identity',   '🖼️', false),
      (s_id, 'Positioning',      '🧭', false),
      (s_id, 'Messaging',        '✍️', false),
      (s_id, 'Visual direction', '🎨', false),
      (s_id, 'Style guides',     '📘', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mkt AND name = 'Digital Marketing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'SEO',            '🌐', false),
      (s_id, 'Social media',   '📱', false),
      (s_id, 'Email campaigns','📧', false),
      (s_id, 'Paid ads',       '💳', false),
      (s_id, 'Analytics',      '📊', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mkt AND name = 'Sales Enablement';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Lead generation',        '🤝', false),
      (s_id, 'Funnel strategy',        '🧲', false),
      (s_id, 'Sales scripts',          '🗣️', false),
      (s_id, 'Conversion optimization','📈', false),
      (s_id, 'Campaign planning',      '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Training and Coaching ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_train AND name = 'Professional Coaching';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Executive coaching',     '👔', false),
      (s_id, 'Career coaching',        '🧑‍💼', false),
      (s_id, 'Communication coaching', '🗣️', false),
      (s_id, 'Performance coaching',   '🎯', false),
      (s_id, 'Leadership development', '🧭', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_train AND name = 'Workshops';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Skill training',         '📝', false),
      (s_id, 'Team workshops',         '🧩', false),
      (s_id, 'Problem-solving sessions','🧠', false),
      (s_id, 'Process training',       '🗂️', false),
      (s_id, 'Certification prep',     '🎓', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_train AND name = 'Group Programs';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Team building',   '🧑‍🤝‍🧑', false),
      (s_id, 'Group mentoring', '📅', false),
      (s_id, 'Live seminars',   '🎤', false),
      (s_id, 'Interactive labs','🧪', false),
      (s_id, 'Practice sessions','🛠️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Legal and Compliance Consulting ───────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_legal AND name = 'Regulatory';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Policy review',      '🧾', false),
      (s_id, 'Compliance checks',  '📋', false),
      (s_id, 'Risk mitigation',    '🛡️', false),
      (s_id, 'Licensing guidance', '🏛️', false),
      (s_id, 'Audit readiness',    '🔍', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_legal AND name = 'Contracts';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Contract review',       '✍️', false),
      (s_id, 'Agreement drafting',    '📑', false),
      (s_id, 'Negotiation support',   '⚖️', false),
      (s_id, 'Terms analysis',        '🧷', false),
      (s_id, 'Document management',   '📁', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_legal AND name = 'Corporate';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Business formation',  '🏢', false),
      (s_id, 'Governance support',  '📜', false),
      (s_id, 'Entity structuring',  '🧑‍⚖️', false),
      (s_id, 'Ownership review',    '🧩', false),
      (s_id, 'Record compliance',   '🗂️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Project and Program Consulting ────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_project AND name = 'Project Planning';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Scope definition',   '🗺️', false),
      (s_id, 'Milestone setup',    '🧭', false),
      (s_id, 'Work breakdown',     '🧱', false),
      (s_id, 'Timeline management','🗓️', false),
      (s_id, 'Priority setting',   '📌', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_project AND name = 'Delivery Support';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Project tracking',   '🧰', false),
      (s_id, 'Status reporting',   '📋', false),
      (s_id, 'Risk management',    '🚦', false),
      (s_id, 'Change tracking',    '🔁', false),
      (s_id, 'Release coordination','📦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_project AND name = 'Program Management';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Portfolio oversight',    '🧑‍💼', false),
      (s_id, 'Cross-team coordination','🧱', false),
      (s_id, 'KPI monitoring',         '📊', false),
      (s_id, 'Resource allocation',    '🧭', false),
      (s_id, 'Executive reporting',    '📈', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Healthcare Consulting ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Operations';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Workflow design',          '🧾', false),
      (s_id, 'Patient flow optimization','🗂️', false),
      (s_id, 'Scheduling support',       '📋', false),
      (s_id, 'Compliance review',        '🧰', false),
      (s_id, 'Facility efficiency',      '🏥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Administration';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Billing process review','📑', false),
      (s_id, 'Coding support',        '🏷️', false),
      (s_id, 'Documentation review',  '📋', false),
      (s_id, 'Claims optimization',   '🧾', false),
      (s_id, 'Policy setup',          '🧷', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Quality and Compliance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Audit preparation',    '🔍', false),
      (s_id, 'Quality improvement',  '📈', false),
      (s_id, 'Safety reviews',       '🧪', false),
      (s_id, 'Risk reduction',       '🛑', false),
      (s_id, 'Process standardization','🧭', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Retail Consulting ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_retail AND name = 'Store Operations';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Store layout',        '🧭', false),
      (s_id, 'Merchandising',       '🛍️', false),
      (s_id, 'Inventory control',   '📦', false),
      (s_id, 'POS configuration',   '💳', false),
      (s_id, 'Checkout optimization','🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_retail AND name = 'Sales and Reporting';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Sales analysis',    '📈', false),
      (s_id, 'KPI setup',         '🧾', false),
      (s_id, 'Staff performance', '👥', false),
      (s_id, 'Commission tracking','🧮', false),
      (s_id, 'Report structure',  '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_retail AND name = 'Systems and Process';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Software setup',      '🖥️', false),
      (s_id, 'Device support',      '🧰', false),
      (s_id, 'Workflow improvement', '🔁', false),
      (s_id, 'Data cleanup',        '🧾', false),
      (s_id, 'Technical support',   '🛠️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── HR and Staffing Consulting ────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hr AND name = 'Recruitment';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Job posting',         '📣', false),
      (s_id, 'Candidate screening', '🧑‍💼', false),
      (s_id, 'Interview support',   '🗂️', false),
      (s_id, 'Hiring process',      '🤝', false),
      (s_id, 'Onboarding setup',    '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hr AND name = 'Employee Relations';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Conflict resolution',  '🗣️', false),
      (s_id, 'Policy enforcement',   '📋', false),
      (s_id, 'Workplace guidance',   '🧭', false),
      (s_id, 'Compliance support',   '🛡️', false),
      (s_id, 'Handbook creation',    '📘', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hr AND name = 'Performance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Goal setting',      '🎯', false),
      (s_id, 'Review systems',    '📊', false),
      (s_id, 'Coaching plans',    '🧠', false),
      (s_id, 'Team development',  '🧩', false),
      (s_id, 'Workforce planning','🗓️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Real Estate Consulting ────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_realestate AND name = 'Commercial';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Site selection',   '🧭', false),
      (s_id, 'Market analysis',  '📊', false),
      (s_id, 'Lease review',     '🧾', false),
      (s_id, 'Property strategy','🏬', false),
      (s_id, 'Tenant advisory',  '💼', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_realestate AND name = 'Residential';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Home buying support',  '🏠', false),
      (s_id, 'Property valuation',   '📈', false),
      (s_id, 'Listing strategy',     '🗂️', false),
      (s_id, 'Investment analysis',  '🧾', false),
      (s_id, 'Due diligence',        '🔍', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_realestate AND name = 'Development';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Project feasibility', '🧱', false),
      (s_id, 'Land use planning',   '🗺️', false),
      (s_id, 'Zoning support',      '📐', false),
      (s_id, 'Development strategy','🧭', false),
      (s_id, 'Budget review',       '📊', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
