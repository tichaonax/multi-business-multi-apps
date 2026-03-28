-- Migration 00016: Consulting new domains
-- Source: Consulting-Business-Domains.md
-- Keeps existing 3 domains (domain_cst_admin, domain_cst_professional, domain_cst_training).
-- Adds 11 new canonical domains + 33 categories + 165 subcategories.

-- ─────────────────────────────────────────
-- STEP 1: New consulting domains (11)
-- ─────────────────────────────────────────
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('ctgdom_biz',       'Business Consulting',              '💼', 'Strategy, operations, and management consulting',            'consulting', true, true, NOW()),
  ('ctgdom_fin',       'Financial Consulting',             '📈', 'Accounting, financial planning, and tax compliance',         'consulting', true, true, NOW()),
  ('ctgdom_it',        'IT Consulting',                    '🧠', 'Systems, software, and cybersecurity consulting',            'consulting', true, true, NOW()),
  ('ctgdom_mktg',      'Marketing Consulting',             '📣', 'Branding, digital marketing, and sales enablement',         'consulting', true, true, NOW()),
  ('ctgdom_training',  'Training and Coaching',            '🧑‍🏫','Professional coaching, workshops, and group programs',      'consulting', true, true, NOW()),
  ('ctgdom_legal',     'Legal and Compliance Consulting',  '⚖️', 'Regulatory, contracts, and corporate compliance',           'consulting', true, true, NOW()),
  ('ctgdom_pm',        'Project and Program Consulting',   '🏗️', 'Project planning, delivery support, program management',    'consulting', true, true, NOW()),
  ('ctgdom_health',    'Healthcare Consulting',            '🏥', 'Healthcare operations, administration, quality compliance',  'consulting', true, true, NOW()),
  ('ctgdom_retail',    'Retail Consulting',                '🛒', 'Store operations, sales reporting, and systems process',    'consulting', true, true, NOW()),
  ('ctgdom_hr',        'HR and Staffing Consulting',       '🏢', 'Recruitment, employee relations, and performance programs', 'consulting', true, true, NOW()),
  ('ctgdom_realestate','Real Estate Consulting',           '🏠', 'Commercial, residential, and development consulting',       'consulting', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 2: Categories (33)
-- ─────────────────────────────────────────
INSERT INTO business_categories (id, name, emoji, "businessType", "domainId", "businessId", "updatedAt", "createdAt")
VALUES
  -- Business Consulting (3)
  ('ctgcat_biz_strat', 'Strategy',   '📊', 'consulting', 'ctgdom_biz', NULL, NOW(), NOW()),
  ('ctgcat_biz_ops',   'Operations', '🏢', 'consulting', 'ctgdom_biz', NULL, NOW(), NOW()),
  ('ctgcat_biz_mgmt',  'Management', '💰', 'consulting', 'ctgdom_biz', NULL, NOW(), NOW()),
  -- Financial Consulting (3)
  ('ctgcat_fin_acct',  'Accounting and Bookkeeping','💵', 'consulting', 'ctgdom_fin', NULL, NOW(), NOW()),
  ('ctgcat_fin_plan',  'Financial Planning',        '📊', 'consulting', 'ctgdom_fin', NULL, NOW(), NOW()),
  ('ctgcat_fin_tax',   'Tax and Compliance',        '🧮', 'consulting', 'ctgdom_fin', NULL, NOW(), NOW()),
  -- IT Consulting (3)
  ('ctgcat_it_sys',    'Systems',     '💻', 'consulting', 'ctgdom_it', NULL, NOW(), NOW()),
  ('ctgcat_it_sw',     'Software',    '🧪', 'consulting', 'ctgdom_it', NULL, NOW(), NOW()),
  ('ctgcat_it_cyber',  'Cybersecurity','🛡️','consulting', 'ctgdom_it', NULL, NOW(), NOW()),
  -- Marketing Consulting (3)
  ('ctgcat_mkt_brand', 'Branding',         '📢', 'consulting', 'ctgdom_mktg', NULL, NOW(), NOW()),
  ('ctgcat_mkt_dig',   'Digital Marketing','📲', 'consulting', 'ctgdom_mktg', NULL, NOW(), NOW()),
  ('ctgcat_mkt_sales', 'Sales Enablement', '🛍️','consulting', 'ctgdom_mktg', NULL, NOW(), NOW()),
  -- Training and Coaching (3)
  ('ctgcat_trn_coach', 'Professional Coaching','🧠', 'consulting', 'ctgdom_training', NULL, NOW(), NOW()),
  ('ctgcat_trn_wkshp', 'Workshops',           '📚', 'consulting', 'ctgdom_training', NULL, NOW(), NOW()),
  ('ctgcat_trn_grp',   'Group Programs',      '👥', 'consulting', 'ctgdom_training', NULL, NOW(), NOW()),
  -- Legal and Compliance (3)
  ('ctgcat_leg_reg',   'Regulatory','📄', 'consulting', 'ctgdom_legal', NULL, NOW(), NOW()),
  ('ctgcat_leg_cont',  'Contracts', '🤝', 'consulting', 'ctgdom_legal', NULL, NOW(), NOW()),
  ('ctgcat_leg_corp',  'Corporate', '🧾', 'consulting', 'ctgdom_legal', NULL, NOW(), NOW()),
  -- Project and Program (3)
  ('ctgcat_pm_plan',   'Project Planning',  '📅', 'consulting', 'ctgdom_pm', NULL, NOW(), NOW()),
  ('ctgcat_pm_del',    'Delivery Support',  '🧪', 'consulting', 'ctgdom_pm', NULL, NOW(), NOW()),
  ('ctgcat_pm_prog',   'Program Management','👥', 'consulting', 'ctgdom_pm', NULL, NOW(), NOW()),
  -- Healthcare (3)
  ('ctgcat_hc_ops',    'Operations',          '🏨', 'consulting', 'ctgdom_health', NULL, NOW(), NOW()),
  ('ctgcat_hc_admin',  'Administration',      '💊', 'consulting', 'ctgdom_health', NULL, NOW(), NOW()),
  ('ctgcat_hc_qual',   'Quality and Compliance','🛡️','consulting','ctgdom_health', NULL, NOW(), NOW()),
  -- Retail Consulting (3)
  ('ctgcat_rtl_ops',   'Store Operations',    '🏬', 'consulting', 'ctgdom_retail', NULL, NOW(), NOW()),
  ('ctgcat_rtl_sales', 'Sales and Reporting', '📊', 'consulting', 'ctgdom_retail', NULL, NOW(), NOW()),
  ('ctgcat_rtl_sys',   'Systems and Process', '🔄', 'consulting', 'ctgdom_retail', NULL, NOW(), NOW()),
  -- HR and Staffing (3)
  ('ctgcat_hr_rec',    'Recruitment',      '👥', 'consulting', 'ctgdom_hr', NULL, NOW(), NOW()),
  ('ctgcat_hr_emp',    'Employee Relations','🧑‍🤝‍🧑','consulting','ctgdom_hr', NULL, NOW(), NOW()),
  ('ctgcat_hr_perf',   'Performance',      '📈', 'consulting', 'ctgdom_hr', NULL, NOW(), NOW()),
  -- Real Estate (3)
  ('ctgcat_re_comm',   'Commercial', '🏢', 'consulting', 'ctgdom_realestate', NULL, NOW(), NOW()),
  ('ctgcat_re_res',    'Residential','🏡', 'consulting', 'ctgdom_realestate', NULL, NOW(), NOW()),
  ('ctgcat_re_dev',    'Development','🏗️','consulting', 'ctgdom_realestate', NULL, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 3: Subcategories (165)
-- ─────────────────────────────────────────
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Strategy (5)
  ('ctgsc_bs1','ctgcat_biz_strat','Strategic planning',   '🧭',false,false,1,NOW()),
  ('ctgsc_bs2','ctgcat_biz_strat','Growth strategy',      '📈',false,false,2,NOW()),
  ('ctgsc_bs3','ctgcat_biz_strat','Organizational planning','🧱',false,false,3,NOW()),
  ('ctgsc_bs4','ctgcat_biz_strat','Goal setting',         '🎯',false,false,4,NOW()),
  ('ctgsc_bs5','ctgcat_biz_strat','Market positioning',   '🏁',false,false,5,NOW()),
  -- Operations (5)
  ('ctgsc_bo1','ctgcat_biz_ops','Process improvement',  '⚙️',false,false,1,NOW()),
  ('ctgsc_bo2','ctgcat_biz_ops','Workflow analysis',    '🧾',false,false,2,NOW()),
  ('ctgsc_bo3','ctgcat_biz_ops','Supply chain consulting','📦',false,false,3,NOW()),
  ('ctgsc_bo4','ctgcat_biz_ops','Resource planning',    '🗂️',false,false,4,NOW()),
  ('ctgsc_bo5','ctgcat_biz_ops','Process optimization', '🔁',false,false,5,NOW()),
  -- Management (5)
  ('ctgsc_bm1','ctgcat_biz_mgmt','Leadership advisory','👥',false,false,1,NOW()),
  ('ctgsc_bm2','ctgcat_biz_mgmt','Change management',  '📋',false,false,2,NOW()),
  ('ctgsc_bm3','ctgcat_biz_mgmt','Executive coaching', '🧑‍💼',false,false,3,NOW()),
  ('ctgsc_bm4','ctgcat_biz_mgmt','Decision support',   '🧠',false,false,4,NOW()),
  ('ctgsc_bm5','ctgcat_biz_mgmt','Team development',   '🧑‍🤝‍🧑',false,false,5,NOW()),
  -- Accounting and Bookkeeping (5)
  ('ctgsc_fa1','ctgcat_fin_acct','Bookkeeping',        '🧾',false,false,1,NOW()),
  ('ctgsc_fa2','ctgcat_fin_acct','General ledger support','📒',false,false,2,NOW()),
  ('ctgsc_fa3','ctgcat_fin_acct','Reconciliation',     '🧮',false,false,3,NOW()),
  ('ctgsc_fa4','ctgcat_fin_acct','Financial reporting','📑',false,false,4,NOW()),
  ('ctgsc_fa5','ctgcat_fin_acct','Expense tracking',   '🧾',false,false,5,NOW()),
  -- Financial Planning (5)
  ('ctgsc_fp1','ctgcat_fin_plan','Budgeting',        '💸',false,false,1,NOW()),
  ('ctgsc_fp2','ctgcat_fin_plan','Forecasting',      '📈',false,false,2,NOW()),
  ('ctgsc_fp3','ctgcat_fin_plan','Cash flow planning','🏦',false,false,3,NOW()),
  ('ctgsc_fp4','ctgcat_fin_plan','Profit analysis',  '🪙',false,false,4,NOW()),
  ('ctgsc_fp5','ctgcat_fin_plan','Financial goals',  '🎯',false,false,5,NOW()),
  -- Tax and Compliance (5)
  ('ctgsc_ft1','ctgcat_fin_tax','Tax planning',      '🧾',false,false,1,NOW()),
  ('ctgsc_ft2','ctgcat_fin_tax','Compliance review', '📋',false,false,2,NOW()),
  ('ctgsc_ft3','ctgcat_fin_tax','Audit preparation', '🛡️',false,false,3,NOW()),
  ('ctgsc_ft4','ctgcat_fin_tax','Regulatory support','📑',false,false,4,NOW()),
  ('ctgsc_ft5','ctgcat_fin_tax','Record retention',  '🧷',false,false,5,NOW()),
  -- Systems (5)
  ('ctgsc_is1','ctgcat_it_sys','Infrastructure planning','🖥️',false,false,1,NOW()),
  ('ctgsc_is2','ctgcat_it_sys','Network setup',         '🌐',false,false,2,NOW()),
  ('ctgsc_is3','ctgcat_it_sys','Cloud migration',       '☁️',false,false,3,NOW()),
  ('ctgsc_is4','ctgcat_it_sys','Security hardening',    '🔐',false,false,4,NOW()),
  ('ctgsc_is5','ctgcat_it_sys','Device management',     '🧰',false,false,5,NOW()),
  -- Software (5)
  ('ctgsc_iw1','ctgcat_it_sw','Application design',  '🧱',false,false,1,NOW()),
  ('ctgsc_iw2','ctgcat_it_sw','Software implementation','🛠️',false,false,2,NOW()),
  ('ctgsc_iw3','ctgcat_it_sw','Testing support',     '🧪',false,false,3,NOW()),
  ('ctgsc_iw4','ctgcat_it_sw','System integration',  '🔄',false,false,4,NOW()),
  ('ctgsc_iw5','ctgcat_it_sw','Development advisory','🧑‍💻',false,false,5,NOW()),
  -- Cybersecurity (5)
  ('ctgsc_ic1','ctgcat_it_cyber','Risk assessments',   '🔐',false,false,1,NOW()),
  ('ctgsc_ic2','ctgcat_it_cyber','Incident response',  '🧯',false,false,2,NOW()),
  ('ctgsc_ic3','ctgcat_it_cyber','Access control',     '🛑',false,false,3,NOW()),
  ('ctgsc_ic4','ctgcat_it_cyber','Vulnerability review','🔍',false,false,4,NOW()),
  ('ctgsc_ic5','ctgcat_it_cyber','Policy creation',    '🧩',false,false,5,NOW()),
  -- Branding (5)
  ('ctgsc_mb1','ctgcat_mkt_brand','Brand identity',  '🖼️',false,false,1,NOW()),
  ('ctgsc_mb2','ctgcat_mkt_brand','Positioning',     '🧭',false,false,2,NOW()),
  ('ctgsc_mb3','ctgcat_mkt_brand','Messaging',       '✍️',false,false,3,NOW()),
  ('ctgsc_mb4','ctgcat_mkt_brand','Visual direction','🎨',false,false,4,NOW()),
  ('ctgsc_mb5','ctgcat_mkt_brand','Style guides',    '📘',false,false,5,NOW()),
  -- Digital Marketing (5)
  ('ctgsc_md1','ctgcat_mkt_dig','SEO',            '🌐',false,false,1,NOW()),
  ('ctgsc_md2','ctgcat_mkt_dig','Social media',   '📱',false,false,2,NOW()),
  ('ctgsc_md3','ctgcat_mkt_dig','Email campaigns','📧',false,false,3,NOW()),
  ('ctgsc_md4','ctgcat_mkt_dig','Paid ads',       '💳',false,false,4,NOW()),
  ('ctgsc_md5','ctgcat_mkt_dig','Analytics',      '📊',false,false,5,NOW()),
  -- Sales Enablement (5)
  ('ctgsc_ms1','ctgcat_mkt_sales','Lead generation',        '🤝',false,false,1,NOW()),
  ('ctgsc_ms2','ctgcat_mkt_sales','Funnel strategy',        '🧲',false,false,2,NOW()),
  ('ctgsc_ms3','ctgcat_mkt_sales','Sales scripts',          '🗣️',false,false,3,NOW()),
  ('ctgsc_ms4','ctgcat_mkt_sales','Conversion optimization','📈',false,false,4,NOW()),
  ('ctgsc_ms5','ctgcat_mkt_sales','Campaign planning',      '🧾',false,false,5,NOW()),
  -- Professional Coaching (5)
  ('ctgsc_tc1','ctgcat_trn_coach','Executive coaching',    '👔',false,false,1,NOW()),
  ('ctgsc_tc2','ctgcat_trn_coach','Career coaching',       '🧑‍💼',false,false,2,NOW()),
  ('ctgsc_tc3','ctgcat_trn_coach','Communication coaching','🗣️',false,false,3,NOW()),
  ('ctgsc_tc4','ctgcat_trn_coach','Performance coaching',  '🎯',false,false,4,NOW()),
  ('ctgsc_tc5','ctgcat_trn_coach','Leadership development','🧭',false,false,5,NOW()),
  -- Workshops (5)
  ('ctgsc_tw1','ctgcat_trn_wkshp','Skill training',          '📝',false,false,1,NOW()),
  ('ctgsc_tw2','ctgcat_trn_wkshp','Team workshops',          '🧩',false,false,2,NOW()),
  ('ctgsc_tw3','ctgcat_trn_wkshp','Problem-solving sessions','🧠',false,false,3,NOW()),
  ('ctgsc_tw4','ctgcat_trn_wkshp','Process training',        '🗂️',false,false,4,NOW()),
  ('ctgsc_tw5','ctgcat_trn_wkshp','Certification prep',      '🎓',false,false,5,NOW()),
  -- Group Programs (5)
  ('ctgsc_tg1','ctgcat_trn_grp','Team building',  '🧑‍🤝‍🧑',false,false,1,NOW()),
  ('ctgsc_tg2','ctgcat_trn_grp','Group mentoring','📅',false,false,2,NOW()),
  ('ctgsc_tg3','ctgcat_trn_grp','Live seminars',  '🎤',false,false,3,NOW()),
  ('ctgsc_tg4','ctgcat_trn_grp','Interactive labs','🧪',false,false,4,NOW()),
  ('ctgsc_tg5','ctgcat_trn_grp','Practice sessions','🛠️',false,false,5,NOW()),
  -- Regulatory (5)
  ('ctgsc_lr1','ctgcat_leg_reg','Policy review',      '🧾',false,false,1,NOW()),
  ('ctgsc_lr2','ctgcat_leg_reg','Compliance checks',  '📋',false,false,2,NOW()),
  ('ctgsc_lr3','ctgcat_leg_reg','Risk mitigation',    '🛡️',false,false,3,NOW()),
  ('ctgsc_lr4','ctgcat_leg_reg','Licensing guidance', '🏛️',false,false,4,NOW()),
  ('ctgsc_lr5','ctgcat_leg_reg','Audit readiness',    '🔍',false,false,5,NOW()),
  -- Contracts (5)
  ('ctgsc_lc1','ctgcat_leg_cont','Contract review',     '✍️',false,false,1,NOW()),
  ('ctgsc_lc2','ctgcat_leg_cont','Agreement drafting',  '📑',false,false,2,NOW()),
  ('ctgsc_lc3','ctgcat_leg_cont','Negotiation support', '⚖️',false,false,3,NOW()),
  ('ctgsc_lc4','ctgcat_leg_cont','Terms analysis',      '🧷',false,false,4,NOW()),
  ('ctgsc_lc5','ctgcat_leg_cont','Document management', '📁',false,false,5,NOW()),
  -- Corporate (5)
  ('ctgsc_lcp1','ctgcat_leg_corp','Business formation',  '🏢',false,false,1,NOW()),
  ('ctgsc_lcp2','ctgcat_leg_corp','Governance support',  '📜',false,false,2,NOW()),
  ('ctgsc_lcp3','ctgcat_leg_corp','Entity structuring',  '🧑‍⚖️',false,false,3,NOW()),
  ('ctgsc_lcp4','ctgcat_leg_corp','Ownership review',    '🧩',false,false,4,NOW()),
  ('ctgsc_lcp5','ctgcat_leg_corp','Record compliance',   '🗂️',false,false,5,NOW()),
  -- Project Planning (5)
  ('ctgsc_pp1','ctgcat_pm_plan','Scope definition',    '🗺️',false,false,1,NOW()),
  ('ctgsc_pp2','ctgcat_pm_plan','Milestone setup',     '🧭',false,false,2,NOW()),
  ('ctgsc_pp3','ctgcat_pm_plan','Work breakdown',      '🧱',false,false,3,NOW()),
  ('ctgsc_pp4','ctgcat_pm_plan','Timeline management', '🗓️',false,false,4,NOW()),
  ('ctgsc_pp5','ctgcat_pm_plan','Priority setting',    '📌',false,false,5,NOW()),
  -- Delivery Support (5)
  ('ctgsc_pd1','ctgcat_pm_del','Project tracking', '🧰',false,false,1,NOW()),
  ('ctgsc_pd2','ctgcat_pm_del','Status reporting', '📋',false,false,2,NOW()),
  ('ctgsc_pd3','ctgcat_pm_del','Risk management',  '🚦',false,false,3,NOW()),
  ('ctgsc_pd4','ctgcat_pm_del','Change tracking',  '🔁',false,false,4,NOW()),
  ('ctgsc_pd5','ctgcat_pm_del','Release coordination','📦',false,false,5,NOW()),
  -- Program Management (5)
  ('ctgsc_pg1','ctgcat_pm_prog','Portfolio oversight',    '🧑‍💼',false,false,1,NOW()),
  ('ctgsc_pg2','ctgcat_pm_prog','Cross-team coordination','🧱',false,false,2,NOW()),
  ('ctgsc_pg3','ctgcat_pm_prog','KPI monitoring',         '📊',false,false,3,NOW()),
  ('ctgsc_pg4','ctgcat_pm_prog','Resource allocation',    '🧭',false,false,4,NOW()),
  ('ctgsc_pg5','ctgcat_pm_prog','Executive reporting',    '📈',false,false,5,NOW()),
  -- Healthcare Operations (5)
  ('ctgsc_ho1','ctgcat_hc_ops','Workflow design',          '🧾',false,false,1,NOW()),
  ('ctgsc_ho2','ctgcat_hc_ops','Patient flow optimization','🗂️',false,false,2,NOW()),
  ('ctgsc_ho3','ctgcat_hc_ops','Scheduling support',       '📋',false,false,3,NOW()),
  ('ctgsc_ho4','ctgcat_hc_ops','Compliance review',        '🧰',false,false,4,NOW()),
  ('ctgsc_ho5','ctgcat_hc_ops','Facility efficiency',      '🏥',false,false,5,NOW()),
  -- Healthcare Administration (5)
  ('ctgsc_ha1','ctgcat_hc_admin','Billing process review','📑',false,false,1,NOW()),
  ('ctgsc_ha2','ctgcat_hc_admin','Coding support',        '🏷️',false,false,2,NOW()),
  ('ctgsc_ha3','ctgcat_hc_admin','Documentation review',  '📋',false,false,3,NOW()),
  ('ctgsc_ha4','ctgcat_hc_admin','Claims optimization',   '🧾',false,false,4,NOW()),
  ('ctgsc_ha5','ctgcat_hc_admin','Policy setup',          '🧷',false,false,5,NOW()),
  -- Quality and Compliance (5)
  ('ctgsc_hq1','ctgcat_hc_qual','Audit preparation',   '🔍',false,false,1,NOW()),
  ('ctgsc_hq2','ctgcat_hc_qual','Quality improvement', '📈',false,false,2,NOW()),
  ('ctgsc_hq3','ctgcat_hc_qual','Safety reviews',      '🧪',false,false,3,NOW()),
  ('ctgsc_hq4','ctgcat_hc_qual','Risk reduction',      '🛑',false,false,4,NOW()),
  ('ctgsc_hq5','ctgcat_hc_qual','Process standardization','🧭',false,false,5,NOW()),
  -- Store Operations (5)
  ('ctgsc_ro1','ctgcat_rtl_ops','Store layout',        '🧭',false,false,1,NOW()),
  ('ctgsc_ro2','ctgcat_rtl_ops','Merchandising',       '🛍️',false,false,2,NOW()),
  ('ctgsc_ro3','ctgcat_rtl_ops','Inventory control',   '📦',false,false,3,NOW()),
  ('ctgsc_ro4','ctgcat_rtl_ops','POS configuration',   '💳',false,false,4,NOW()),
  ('ctgsc_ro5','ctgcat_rtl_ops','Checkout optimization','🧾',false,false,5,NOW()),
  -- Sales and Reporting (5)
  ('ctgsc_rs1','ctgcat_rtl_sales','Sales analysis',    '📈',false,false,1,NOW()),
  ('ctgsc_rs2','ctgcat_rtl_sales','KPI setup',         '🧾',false,false,2,NOW()),
  ('ctgsc_rs3','ctgcat_rtl_sales','Staff performance', '👥',false,false,3,NOW()),
  ('ctgsc_rs4','ctgcat_rtl_sales','Commission tracking','🧮',false,false,4,NOW()),
  ('ctgsc_rs5','ctgcat_rtl_sales','Report structure',  '🧾',false,false,5,NOW()),
  -- Systems and Process (5)
  ('ctgsc_rp1','ctgcat_rtl_sys','Software setup',       '🖥️',false,false,1,NOW()),
  ('ctgsc_rp2','ctgcat_rtl_sys','Device support',       '🧰',false,false,2,NOW()),
  ('ctgsc_rp3','ctgcat_rtl_sys','Workflow improvement', '🔁',false,false,3,NOW()),
  ('ctgsc_rp4','ctgcat_rtl_sys','Data cleanup',         '🧾',false,false,4,NOW()),
  ('ctgsc_rp5','ctgcat_rtl_sys','Technical support',    '🛠️',false,false,5,NOW()),
  -- Recruitment (5)
  ('ctgsc_hr1','ctgcat_hr_rec','Job posting',       '📣',false,false,1,NOW()),
  ('ctgsc_hr2','ctgcat_hr_rec','Candidate screening','🧑‍💼',false,false,2,NOW()),
  ('ctgsc_hr3','ctgcat_hr_rec','Interview support',  '🗂️',false,false,3,NOW()),
  ('ctgsc_hr4','ctgcat_hr_rec','Hiring process',     '🤝',false,false,4,NOW()),
  ('ctgsc_hr5','ctgcat_hr_rec','Onboarding setup',   '🧾',false,false,5,NOW()),
  -- Employee Relations (5)
  ('ctgsc_he1','ctgcat_hr_emp','Conflict resolution','🗣️',false,false,1,NOW()),
  ('ctgsc_he2','ctgcat_hr_emp','Policy enforcement', '📋',false,false,2,NOW()),
  ('ctgsc_he3','ctgcat_hr_emp','Workplace guidance', '🧭',false,false,3,NOW()),
  ('ctgsc_he4','ctgcat_hr_emp','Compliance support', '🛡️',false,false,4,NOW()),
  ('ctgsc_he5','ctgcat_hr_emp','Handbook creation',  '📘',false,false,5,NOW()),
  -- Performance (5)
  ('ctgsc_hp1','ctgcat_hr_perf','Goal setting',     '🎯',false,false,1,NOW()),
  ('ctgsc_hp2','ctgcat_hr_perf','Review systems',   '📊',false,false,2,NOW()),
  ('ctgsc_hp3','ctgcat_hr_perf','Coaching plans',   '🧠',false,false,3,NOW()),
  ('ctgsc_hp4','ctgcat_hr_perf','Team development', '🧩',false,false,4,NOW()),
  ('ctgsc_hp5','ctgcat_hr_perf','Workforce planning','🗓️',false,false,5,NOW()),
  -- Real Estate Commercial (5)
  ('ctgsc_rc1','ctgcat_re_comm','Site selection',   '🧭',false,false,1,NOW()),
  ('ctgsc_rc2','ctgcat_re_comm','Market analysis',  '📊',false,false,2,NOW()),
  ('ctgsc_rc3','ctgcat_re_comm','Lease review',     '🧾',false,false,3,NOW()),
  ('ctgsc_rc4','ctgcat_re_comm','Property strategy','🏬',false,false,4,NOW()),
  ('ctgsc_rc5','ctgcat_re_comm','Tenant advisory',  '💼',false,false,5,NOW()),
  -- Residential (5)
  ('ctgsc_rr1','ctgcat_re_res','Home buying support','🏠',false,false,1,NOW()),
  ('ctgsc_rr2','ctgcat_re_res','Property valuation','📈',false,false,2,NOW()),
  ('ctgsc_rr3','ctgcat_re_res','Listing strategy',  '🗂️',false,false,3,NOW()),
  ('ctgsc_rr4','ctgcat_re_res','Investment analysis','🧾',false,false,4,NOW()),
  ('ctgsc_rr5','ctgcat_re_res','Due diligence',     '🔍',false,false,5,NOW()),
  -- Development (5)
  ('ctgsc_rd1','ctgcat_re_dev','Project feasibility','🧱',false,false,1,NOW()),
  ('ctgsc_rd2','ctgcat_re_dev','Land use planning',  '🗺️',false,false,2,NOW()),
  ('ctgsc_rd3','ctgcat_re_dev','Zoning support',     '📐',false,false,3,NOW()),
  ('ctgsc_rd4','ctgcat_re_dev','Development strategy','🧭',false,false,4,NOW()),
  ('ctgsc_rd5','ctgcat_re_dev','Budget review',       '📊',false,false,5,NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
