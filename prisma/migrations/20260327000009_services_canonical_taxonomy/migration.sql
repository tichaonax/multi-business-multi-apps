-- Migration 00009: Services canonical taxonomy
-- 11 domains, 33 categories, 165 subcategories
-- Source: Services Business Domains.md

-- ============================================================
-- 1. INSERT DOMAINS
-- ============================================================
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('sdom_home_repair',     'Home and Repair Services',       '🛠️', 'General home repair and maintenance',          'services', true, true, NOW()),
  ('sdom_personal_care',   'Personal Care Services',         '💇', 'Hair, nails, spa and grooming services',        'services', true, true, NOW()),
  ('sdom_automotive',      'Automotive Services',            '🚗', 'Vehicle maintenance, repair and detailing',     'services', true, true, NOW()),
  ('sdom_education',       'Education and Training Services','🧑‍🏫', 'Tutoring, professional and child learning',  'services', true, true, NOW()),
  ('sdom_business_office', 'Business and Office Services',   '🧾', 'Admin support, consulting and digital services','services', true, true, NOW()),
  ('sdom_health_wellness', 'Health and Wellness Services',   '🏥', 'Medical support, wellness and fitness',         'services', true, true, NOW()),
  ('sdom_cleaning',        'Cleaning Services',              '🧹', 'Residential, commercial and specialty cleaning','services', true, true, NOW()),
  ('sdom_logistics',       'Logistics and Delivery Services','📦', 'Delivery, shipping and moving services',        'services', true, true, NOW()),
  ('sdom_creative',        'Creative Services',              '🧑‍🎨', 'Design, media and writing services',         'services', true, true, NOW()),
  ('sdom_retail_support',  'Retail Support Services',        '🛍️', 'Merchandising, sales and equipment support',   'services', true, true, NOW()),
  ('sdom_security',        'Security Services',              '🛡️', 'Guard and safety services',                   'services', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ============================================================
-- 2. INSERT CATEGORIES
-- ============================================================
INSERT INTO business_categories (id, name, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  -- Home and Repair Services
  ('scat_home_general_repairs', 'General Repairs',       '🔧', '#EF4444', 'services', 'sdom_home_repair',     NULL, true, false, 1, NOW(), NOW()),
  ('scat_home_maintenance',     'Maintenance Services',  '🏠', '#F97316', 'services', 'sdom_home_repair',     NULL, true, false, 2, NOW(), NOW()),
  ('scat_home_hvac',            'HVAC Services',         '🔥', '#EAB308', 'services', 'sdom_home_repair',     NULL, true, false, 3, NOW(), NOW()),
  -- Personal Care Services
  ('scat_care_hair',     'Hair Services',     '💇', '#EC4899', 'services', 'sdom_personal_care', NULL, true, false, 1, NOW(), NOW()),
  ('scat_care_nails',    'Nail Services',     '💅', '#F43F5E', 'services', 'sdom_personal_care', NULL, true, false, 2, NOW(), NOW()),
  ('scat_care_spa',      'Spa Services',      '💆', '#A855F7', 'services', 'sdom_personal_care', NULL, true, false, 3, NOW(), NOW()),
  ('scat_care_grooming', 'Grooming Services', '🪒', '#8B5CF6', 'services', 'sdom_personal_care', NULL, true, false, 4, NOW(), NOW()),
  -- Automotive Services
  ('scat_auto_maintenance', 'Maintenance',       '🛞', '#3B82F6', 'services', 'sdom_automotive', NULL, true, false, 1, NOW(), NOW()),
  ('scat_auto_repair',      'Repair Services',   '🧰', '#1D4ED8', 'services', 'sdom_automotive', NULL, true, false, 2, NOW(), NOW()),
  ('scat_auto_detailing',   'Detailing',         '🧼', '#06B6D4', 'services', 'sdom_automotive', NULL, true, false, 3, NOW(), NOW()),
  -- Education and Training Services
  ('scat_edu_tutoring',     'Tutoring',             '📚', '#10B981', 'services', 'sdom_education', NULL, true, false, 1, NOW(), NOW()),
  ('scat_edu_professional', 'Professional Training','🎓', '#059669', 'services', 'sdom_education', NULL, true, false, 2, NOW(), NOW()),
  ('scat_edu_child',        'Child Learning',       '🧒', '#34D399', 'services', 'sdom_education', NULL, true, false, 3, NOW(), NOW()),
  -- Business and Office Services
  ('scat_biz_admin',      'Administrative Support', '🗂️', '#6366F1', 'services', 'sdom_business_office', NULL, true, false, 1, NOW(), NOW()),
  ('scat_biz_consulting', 'Consulting',             '💼', '#4F46E5', 'services', 'sdom_business_office', NULL, true, false, 2, NOW(), NOW()),
  ('scat_biz_digital',    'Digital Services',       '🧑‍💻', '#7C3AED', 'services', 'sdom_business_office', NULL, true, false, 3, NOW(), NOW()),
  -- Health and Wellness Services
  ('scat_health_medical',  'Medical Support',   '🩺', '#EF4444', 'services', 'sdom_health_wellness', NULL, true, false, 1, NOW(), NOW()),
  ('scat_health_wellness', 'Wellness Services', '🧘', '#22C55E', 'services', 'sdom_health_wellness', NULL, true, false, 2, NOW(), NOW()),
  ('scat_health_fitness',  'Fitness Services',  '🏋️', '#16A34A', 'services', 'sdom_health_wellness', NULL, true, false, 3, NOW(), NOW()),
  -- Cleaning Services
  ('scat_clean_residential', 'Residential Cleaning', '🏠', '#60A5FA', 'services', 'sdom_cleaning', NULL, true, false, 1, NOW(), NOW()),
  ('scat_clean_commercial',  'Commercial Cleaning',  '🏢', '#3B82F6', 'services', 'sdom_cleaning', NULL, true, false, 2, NOW(), NOW()),
  ('scat_clean_specialty',   'Specialty Cleaning',   '🛋️', '#2563EB', 'services', 'sdom_cleaning', NULL, true, false, 3, NOW(), NOW()),
  -- Logistics and Delivery Services
  ('scat_log_delivery', 'Delivery',         '🚚', '#F59E0B', 'services', 'sdom_logistics', NULL, true, false, 1, NOW(), NOW()),
  ('scat_log_shipping',  'Shipping',         '🛫', '#D97706', 'services', 'sdom_logistics', NULL, true, false, 2, NOW(), NOW()),
  ('scat_log_moving',    'Moving Services',  '🧰', '#B45309', 'services', 'sdom_logistics', NULL, true, false, 3, NOW(), NOW()),
  -- Creative Services
  ('scat_creative_design',  'Design',            '🎨', '#F472B6', 'services', 'sdom_creative', NULL, true, false, 1, NOW(), NOW()),
  ('scat_creative_media',   'Media Services',    '📸', '#EC4899', 'services', 'sdom_creative', NULL, true, false, 2, NOW(), NOW()),
  ('scat_creative_writing', 'Writing Services',  '✍️', '#DB2777', 'services', 'sdom_creative', NULL, true, false, 3, NOW(), NOW()),
  -- Retail Support Services
  ('scat_retail_merch',     'Merchandising',       '🏷️', '#84CC16', 'services', 'sdom_retail_support', NULL, true, false, 1, NOW(), NOW()),
  ('scat_retail_sales',     'Sales Support',       '📊', '#65A30D', 'services', 'sdom_retail_support', NULL, true, false, 2, NOW(), NOW()),
  ('scat_retail_equipment', 'Equipment Support',   '🧰', '#4D7C0F', 'services', 'sdom_retail_support', NULL, true, false, 3, NOW(), NOW()),
  -- Security Services
  ('scat_sec_guard',  'Guard Services',   '👮', '#1E40AF', 'services', 'sdom_security', NULL, true, false, 1, NOW(), NOW()),
  ('scat_sec_safety', 'Safety Services',  '🔐', '#1D4ED8', 'services', 'sdom_security', NULL, true, false, 2, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ============================================================
-- 3. INSERT SUBCATEGORIES
-- ============================================================
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- General Repairs
  ('ssc_home_gr_1', 'scat_home_general_repairs', 'Door repair',          '🚪', false, false, 1, NOW()),
  ('ssc_home_gr_2', 'scat_home_general_repairs', 'Window repair',        '🪟', false, false, 2, NOW()),
  ('ssc_home_gr_3', 'scat_home_general_repairs', 'Minor fixes',          '🧰', false, false, 3, NOW()),
  ('ssc_home_gr_4', 'scat_home_general_repairs', 'Hardware replacement', '🪛', false, false, 4, NOW()),
  ('ssc_home_gr_5', 'scat_home_general_repairs', 'Assembly services',    '🔩', false, false, 5, NOW()),
  -- Maintenance Services
  ('ssc_home_ms_1', 'scat_home_maintenance', 'Routine maintenance', '🧼', false, false, 1, NOW()),
  ('ssc_home_ms_2', 'scat_home_maintenance', 'Cleaning and upkeep', '🧽', false, false, 2, NOW()),
  ('ssc_home_ms_3', 'scat_home_maintenance', 'Drain clearing',      '🪠', false, false, 3, NOW()),
  ('ssc_home_ms_4', 'scat_home_maintenance', 'Electrical checks',   '🔌', false, false, 4, NOW()),
  ('ssc_home_ms_5', 'scat_home_maintenance', 'Plumbing checks',     '🚰', false, false, 5, NOW()),
  -- HVAC Services
  ('ssc_home_hv_1', 'scat_home_hvac', 'AC repair',          '❄️', false, false, 1, NOW()),
  ('ssc_home_hv_2', 'scat_home_hvac', 'Heating repair',     '🔥', false, false, 2, NOW()),
  ('ssc_home_hv_3', 'scat_home_hvac', 'Vent cleaning',      '🌬️', false, false, 3, NOW()),
  ('ssc_home_hv_4', 'scat_home_hvac', 'System inspection',  '🧯', false, false, 4, NOW()),
  ('ssc_home_hv_5', 'scat_home_hvac', 'Filter replacement', '🛠️', false, false, 5, NOW()),
  -- Hair Services
  ('ssc_care_hr_1', 'scat_care_hair', 'Haircuts',      '✂️', false, false, 1, NOW()),
  ('ssc_care_hr_2', 'scat_care_hair', 'Hair coloring', '🎨', false, false, 2, NOW()),
  ('ssc_care_hr_3', 'scat_care_hair', 'Styling',       '💈', false, false, 3, NOW()),
  ('ssc_care_hr_4', 'scat_care_hair', 'Treatments',    '🧴', false, false, 4, NOW()),
  ('ssc_care_hr_5', 'scat_care_hair', 'Beard trimming','🪮', false, false, 5, NOW()),
  -- Nail Services
  ('ssc_care_nl_1', 'scat_care_nails', 'Manicures',      '💅', false, false, 1, NOW()),
  ('ssc_care_nl_2', 'scat_care_nails', 'Pedicures',      '💅', false, false, 2, NOW()),
  ('ssc_care_nl_3', 'scat_care_nails', 'Nail art',       '💅', false, false, 3, NOW()),
  ('ssc_care_nl_4', 'scat_care_nails', 'Nail treatment', '🧴', false, false, 4, NOW()),
  ('ssc_care_nl_5', 'scat_care_nails', 'Acrylic nails',  '✨', false, false, 5, NOW()),
  -- Spa Services
  ('ssc_care_sp_1', 'scat_care_spa', 'Facials',           '💆', false, false, 1, NOW()),
  ('ssc_care_sp_2', 'scat_care_spa', 'Massages',          '🧖', false, false, 2, NOW()),
  ('ssc_care_sp_3', 'scat_care_spa', 'Body treatments',   '🛁', false, false, 3, NOW()),
  ('ssc_care_sp_4', 'scat_care_spa', 'Aromatherapy',      '🌿', false, false, 4, NOW()),
  ('ssc_care_sp_5', 'scat_care_spa', 'Skin care sessions','🧴', false, false, 5, NOW()),
  -- Grooming Services
  ('ssc_care_gm_1', 'scat_care_grooming', 'Shaving',         '🪒', false, false, 1, NOW()),
  ('ssc_care_gm_2', 'scat_care_grooming', 'Eyebrow shaping', '✂️', false, false, 2, NOW()),
  ('ssc_care_gm_3', 'scat_care_grooming', 'Hair removal',    '💇', false, false, 3, NOW()),
  ('ssc_care_gm_4', 'scat_care_grooming', 'Beard grooming',  '🧴', false, false, 4, NOW()),
  ('ssc_care_gm_5', 'scat_care_grooming', 'Skin consultation','🧴', false, false, 5, NOW()),
  -- Auto Maintenance
  ('ssc_auto_mt_1', 'scat_auto_maintenance', 'Oil change',   '🛢️', false, false, 1, NOW()),
  ('ssc_auto_mt_2', 'scat_auto_maintenance', 'Tune-up',      '🔧', false, false, 2, NOW()),
  ('ssc_auto_mt_3', 'scat_auto_maintenance', 'Tire rotation','🛞', false, false, 3, NOW()),
  ('ssc_auto_mt_4', 'scat_auto_maintenance', 'Fluid top-up', '🚗', false, false, 4, NOW()),
  ('ssc_auto_mt_5', 'scat_auto_maintenance', 'Battery check','🔋', false, false, 5, NOW()),
  -- Auto Repair
  ('ssc_auto_rp_1', 'scat_auto_repair', 'Brake repair',         '🔩', false, false, 1, NOW()),
  ('ssc_auto_rp_2', 'scat_auto_repair', 'Engine repair',        '⚙️', false, false, 2, NOW()),
  ('ssc_auto_rp_3', 'scat_auto_repair', 'Transmission service', '🚘', false, false, 3, NOW()),
  ('ssc_auto_rp_4', 'scat_auto_repair', 'Light replacement',    '💡', false, false, 4, NOW()),
  ('ssc_auto_rp_5', 'scat_auto_repair', 'Suspension repair',    '🛞', false, false, 5, NOW()),
  -- Auto Detailing
  ('ssc_auto_dt_1', 'scat_auto_detailing', 'Car wash',         '🧽', false, false, 1, NOW()),
  ('ssc_auto_dt_2', 'scat_auto_detailing', 'Interior cleaning', '✨', false, false, 2, NOW()),
  ('ssc_auto_dt_3', 'scat_auto_detailing', 'Window cleaning',  '🪟', false, false, 3, NOW()),
  ('ssc_auto_dt_4', 'scat_auto_detailing', 'Tire shine',       '🛞', false, false, 4, NOW()),
  ('ssc_auto_dt_5', 'scat_auto_detailing', 'Waxing',           '🧴', false, false, 5, NOW()),
  -- Tutoring
  ('ssc_edu_tt_1', 'scat_edu_tutoring', 'Academic tutoring', '📝', false, false, 1, NOW()),
  ('ssc_edu_tt_2', 'scat_edu_tutoring', 'Reading support',   '📖', false, false, 2, NOW()),
  ('ssc_edu_tt_3', 'scat_edu_tutoring', 'Math tutoring',     '➗', false, false, 3, NOW()),
  ('ssc_edu_tt_4', 'scat_edu_tutoring', 'Science tutoring',  '🔬', false, false, 4, NOW()),
  ('ssc_edu_tt_5', 'scat_edu_tutoring', 'Computer tutoring', '💻', false, false, 5, NOW()),
  -- Professional Training
  ('ssc_edu_pt_1', 'scat_edu_professional', 'Workshops',            '🧠', false, false, 1, NOW()),
  ('ssc_edu_pt_2', 'scat_edu_professional', 'Career coaching',      '🧑‍💼', false, false, 2, NOW()),
  ('ssc_edu_pt_3', 'scat_edu_professional', 'Business training',    '📈', false, false, 3, NOW()),
  ('ssc_edu_pt_4', 'scat_edu_professional', 'Technical training',   '🛠️', false, false, 4, NOW()),
  ('ssc_edu_pt_5', 'scat_edu_professional', 'Communication skills', '🗣️', false, false, 5, NOW()),
  -- Child Learning
  ('ssc_edu_cl_1', 'scat_edu_child', 'Early learning',  '🧮', false, false, 1, NOW()),
  ('ssc_edu_cl_2', 'scat_edu_child', 'Creative classes', '🎨', false, false, 2, NOW()),
  ('ssc_edu_cl_3', 'scat_edu_child', 'Homework help',   '📚', false, false, 3, NOW()),
  ('ssc_edu_cl_4', 'scat_edu_child', 'Music lessons',   '🎼', false, false, 4, NOW()),
  ('ssc_edu_cl_5', 'scat_edu_child', 'Activity classes','🏃', false, false, 5, NOW()),
  -- Administrative Support
  ('ssc_biz_ad_1', 'scat_biz_admin', 'Document preparation', '📄', false, false, 1, NOW()),
  ('ssc_biz_ad_2', 'scat_biz_admin', 'Printing services',    '🖨️', false, false, 2, NOW()),
  ('ssc_biz_ad_3', 'scat_biz_admin', 'Mail handling',        '📨', false, false, 3, NOW()),
  ('ssc_biz_ad_4', 'scat_biz_admin', 'Virtual receptionist', '📞', false, false, 4, NOW()),
  ('ssc_biz_ad_5', 'scat_biz_admin', 'Filing support',       '🗃️', false, false, 5, NOW()),
  -- Consulting
  ('ssc_biz_co_1', 'scat_biz_consulting', 'Business consulting',  '📊', false, false, 1, NOW()),
  ('ssc_biz_co_2', 'scat_biz_consulting', 'Accounting support',   '🧾', false, false, 2, NOW()),
  ('ssc_biz_co_3', 'scat_biz_consulting', 'Strategy sessions',    '🧠', false, false, 3, NOW()),
  ('ssc_biz_co_4', 'scat_biz_consulting', 'IT consulting',        '💻', false, false, 4, NOW()),
  ('ssc_biz_co_5', 'scat_biz_consulting', 'Marketing consulting', '📈', false, false, 5, NOW()),
  -- Digital Services
  ('ssc_biz_dg_1', 'scat_biz_digital', 'Website setup',    '🌐', false, false, 1, NOW()),
  ('ssc_biz_dg_2', 'scat_biz_digital', 'Software support', '🧰', false, false, 2, NOW()),
  ('ssc_biz_dg_3', 'scat_biz_digital', 'Data entry',       '🖥️', false, false, 3, NOW()),
  ('ssc_biz_dg_4', 'scat_biz_digital', 'App management',   '📱', false, false, 4, NOW()),
  ('ssc_biz_dg_5', 'scat_biz_digital', 'Security setup',   '🔐', false, false, 5, NOW()),
  -- Medical Support
  ('ssc_hlth_md_1', 'scat_health_medical', 'Minor treatment',         '🩹', false, false, 1, NOW()),
  ('ssc_hlth_md_2', 'scat_health_medical', 'Lab services',            '🧪', false, false, 2, NOW()),
  ('ssc_hlth_md_3', 'scat_health_medical', 'Medication consultation', '💊', false, false, 3, NOW()),
  ('ssc_hlth_md_4', 'scat_health_medical', 'Health screening',        '🌡️', false, false, 4, NOW()),
  ('ssc_hlth_md_5', 'scat_health_medical', 'Nurse visits',            '🧑‍⚕️', false, false, 5, NOW()),
  -- Wellness Services
  ('ssc_hlth_wl_1', 'scat_health_wellness', 'Yoga classes',      '🧘', false, false, 1, NOW()),
  ('ssc_hlth_wl_2', 'scat_health_wellness', 'Massage therapy',   '💆', false, false, 2, NOW()),
  ('ssc_hlth_wl_3', 'scat_health_wellness', 'Nutrition coaching','🍏', false, false, 3, NOW()),
  ('ssc_hlth_wl_4', 'scat_health_wellness', 'Breathing sessions','🫁', false, false, 4, NOW()),
  ('ssc_hlth_wl_5', 'scat_health_wellness', 'Holistic therapy',  '🌿', false, false, 5, NOW()),
  -- Fitness Services
  ('ssc_hlth_ft_1', 'scat_health_fitness', 'Personal training',   '🏋️', false, false, 1, NOW()),
  ('ssc_hlth_ft_2', 'scat_health_fitness', 'Group fitness',       '🚴', false, false, 2, NOW()),
  ('ssc_hlth_ft_3', 'scat_health_fitness', 'Running coaching',    '🏃', false, false, 3, NOW()),
  ('ssc_hlth_ft_4', 'scat_health_fitness', 'Stretching sessions', '🤸', false, false, 4, NOW()),
  ('ssc_hlth_ft_5', 'scat_health_fitness', 'Movement therapy',    '🧍', false, false, 5, NOW()),
  -- Residential Cleaning
  ('ssc_cln_rs_1', 'scat_clean_residential', 'House cleaning',     '🧼', false, false, 1, NOW()),
  ('ssc_cln_rs_2', 'scat_clean_residential', 'Bedroom cleaning',   '🛏️', false, false, 2, NOW()),
  ('ssc_cln_rs_3', 'scat_clean_residential', 'Kitchen cleaning',   '🍽️', false, false, 3, NOW()),
  ('ssc_cln_rs_4', 'scat_clean_residential', 'Bathroom cleaning',  '🛁', false, false, 4, NOW()),
  ('ssc_cln_rs_5', 'scat_clean_residential', 'Deep cleaning',      '🧽', false, false, 5, NOW()),
  -- Commercial Cleaning
  ('ssc_cln_cm_1', 'scat_clean_commercial', 'Office cleaning',  '🧹', false, false, 1, NOW()),
  ('ssc_cln_cm_2', 'scat_clean_commercial', 'Window washing',   '🪟', false, false, 2, NOW()),
  ('ssc_cln_cm_3', 'scat_clean_commercial', 'Trash removal',    '🗑️', false, false, 3, NOW()),
  ('ssc_cln_cm_4', 'scat_clean_commercial', 'Sanitizing',       '🧴', false, false, 4, NOW()),
  ('ssc_cln_cm_5', 'scat_clean_commercial', 'Floor care',       '🧼', false, false, 5, NOW()),
  -- Specialty Cleaning
  ('ssc_cln_sp_1', 'scat_clean_specialty', 'Carpet cleaning',          '🧺', false, false, 1, NOW()),
  ('ssc_cln_sp_2', 'scat_clean_specialty', 'Upholstery cleaning',      '🪑', false, false, 2, NOW()),
  ('ssc_cln_sp_3', 'scat_clean_specialty', 'Upholstery treatment',     '🧴', false, false, 3, NOW()),
  ('ssc_cln_sp_4', 'scat_clean_specialty', 'Glass polishing',          '🪟', false, false, 4, NOW()),
  ('ssc_cln_sp_5', 'scat_clean_specialty', 'Post-construction cleanup','🧽', false, false, 5, NOW()),
  -- Delivery
  ('ssc_log_dv_1', 'scat_log_delivery', 'Package delivery', '📦', false, false, 1, NOW()),
  ('ssc_log_dv_2', 'scat_log_delivery', 'Food delivery',    '🥡', false, false, 2, NOW()),
  ('ssc_log_dv_3', 'scat_log_delivery', 'Retail delivery',  '🛍️', false, false, 3, NOW()),
  ('ssc_log_dv_4', 'scat_log_delivery', 'Same-day delivery','🧾', false, false, 4, NOW()),
  ('ssc_log_dv_5', 'scat_log_delivery', 'Bulk delivery',    '🚛', false, false, 5, NOW()),
  -- Shipping
  ('ssc_log_sh_1', 'scat_log_shipping', 'Parcel shipping',       '📮', false, false, 1, NOW()),
  ('ssc_log_sh_2', 'scat_log_shipping', 'Freight forwarding',    '📦', false, false, 2, NOW()),
  ('ssc_log_sh_3', 'scat_log_shipping', 'Label services',        '📑', false, false, 3, NOW()),
  ('ssc_log_sh_4', 'scat_log_shipping', 'Tracking services',     '🧭', false, false, 4, NOW()),
  ('ssc_log_sh_5', 'scat_log_shipping', 'International shipping','🧳', false, false, 5, NOW()),
  -- Moving Services
  ('ssc_log_mv_1', 'scat_log_moving', 'House moving',         '🏠', false, false, 1, NOW()),
  ('ssc_log_mv_2', 'scat_log_moving', 'Furniture moving',     '🪑', false, false, 2, NOW()),
  ('ssc_log_mv_3', 'scat_log_moving', 'Packing services',     '📦', false, false, 3, NOW()),
  ('ssc_log_mv_4', 'scat_log_moving', 'Unpacking services',   '🧹', false, false, 4, NOW()),
  ('ssc_log_mv_5', 'scat_log_moving', 'Loading and unloading','🚛', false, false, 5, NOW()),
  -- Design
  ('ssc_cre_ds_1', 'scat_creative_design', 'Graphic design', '🖼️', false, false, 1, NOW()),
  ('ssc_cre_ds_2', 'scat_creative_design', 'Sign design',    '🪧', false, false, 2, NOW()),
  ('ssc_cre_ds_3', 'scat_creative_design', 'UI design',      '📱', false, false, 3, NOW()),
  ('ssc_cre_ds_4', 'scat_creative_design', 'Print design',   '🧾', false, false, 4, NOW()),
  ('ssc_cre_ds_5', 'scat_creative_design', 'Brand design',   '🧠', false, false, 5, NOW()),
  -- Media Services
  ('ssc_cre_md_1', 'scat_creative_media', 'Photography',     '📷', false, false, 1, NOW()),
  ('ssc_cre_md_2', 'scat_creative_media', 'Videography',     '🎥', false, false, 2, NOW()),
  ('ssc_cre_md_3', 'scat_creative_media', 'Editing',         '🎬', false, false, 3, NOW()),
  ('ssc_cre_md_4', 'scat_creative_media', 'Audio recording', '🎙️', false, false, 4, NOW()),
  ('ssc_cre_md_5', 'scat_creative_media', 'Content creation','🧾', false, false, 5, NOW()),
  -- Writing Services
  ('ssc_cre_wr_1', 'scat_creative_writing', 'Copywriting',      '📝', false, false, 1, NOW()),
  ('ssc_cre_wr_2', 'scat_creative_writing', 'Editing',          '📄', false, false, 2, NOW()),
  ('ssc_cre_wr_3', 'scat_creative_writing', 'Proofreading',     '🧾', false, false, 3, NOW()),
  ('ssc_cre_wr_4', 'scat_creative_writing', 'Technical writing','📚', false, false, 4, NOW()),
  ('ssc_cre_wr_5', 'scat_creative_writing', 'Translation',      '🌐', false, false, 5, NOW()),
  -- Merchandising
  ('ssc_ret_mc_1', 'scat_retail_merch', 'Shelf setup',      '📦', false, false, 1, NOW()),
  ('ssc_ret_mc_2', 'scat_retail_merch', 'Product display',  '🛒', false, false, 2, NOW()),
  ('ssc_ret_mc_3', 'scat_retail_merch', 'Store arrangement','🏬', false, false, 3, NOW()),
  ('ssc_ret_mc_4', 'scat_retail_merch', 'Product labeling', '🧭', false, false, 4, NOW()),
  ('ssc_ret_mc_5', 'scat_retail_merch', 'Stock rotation',   '🔄', false, false, 5, NOW()),
  -- Sales Support
  ('ssc_ret_sl_1', 'scat_retail_sales', 'Customer assistance', '🤝', false, false, 1, NOW()),
  ('ssc_ret_sl_2', 'scat_retail_sales', 'Order processing',   '🧾', false, false, 2, NOW()),
  ('ssc_ret_sl_3', 'scat_retail_sales', 'Payment handling',   '💳', false, false, 3, NOW()),
  ('ssc_ret_sl_4', 'scat_retail_sales', 'Inventory assistance','📦', false, false, 4, NOW()),
  ('ssc_ret_sl_5', 'scat_retail_sales', 'Sales reporting',    '📈', false, false, 5, NOW()),
  -- Equipment Support
  ('ssc_ret_eq_1', 'scat_retail_equipment', 'Printer setup',  '🖨️', false, false, 1, NOW()),
  ('ssc_ret_eq_2', 'scat_retail_equipment', 'POS setup',      '💻', false, false, 2, NOW()),
  ('ssc_ret_eq_3', 'scat_retail_equipment', 'Device repair',  '🪛', false, false, 3, NOW()),
  ('ssc_ret_eq_4', 'scat_retail_equipment', 'Wiring support', '🔌', false, false, 4, NOW()),
  ('ssc_ret_eq_5', 'scat_retail_equipment', 'Network setup',  '🔐', false, false, 5, NOW()),
  -- Guard Services
  ('ssc_sec_gd_1', 'scat_sec_guard', 'Site guarding',    '🏢', false, false, 1, NOW()),
  ('ssc_sec_gd_2', 'scat_sec_guard', 'Access control',   '🚪', false, false, 2, NOW()),
  ('ssc_sec_gd_3', 'scat_sec_guard', 'Crowd monitoring', '🧍', false, false, 3, NOW()),
  ('ssc_sec_gd_4', 'scat_sec_guard', 'Incident response','🚨', false, false, 4, NOW()),
  ('ssc_sec_gd_5', 'scat_sec_guard', 'Patrol services',  '📹', false, false, 5, NOW()),
  -- Safety Services
  ('ssc_sec_sf_1', 'scat_sec_safety', 'Fire safety checks', '🧯', false, false, 1, NOW()),
  ('ssc_sec_sf_2', 'scat_sec_safety', 'Workplace safety',   '🪖', false, false, 2, NOW()),
  ('ssc_sec_sf_3', 'scat_sec_safety', 'Lock inspection',    '🚪', false, false, 3, NOW()),
  ('ssc_sec_sf_4', 'scat_sec_safety', 'Risk assessment',    '📋', false, false, 4, NOW()),
  ('ssc_sec_sf_5', 'scat_sec_safety', 'Compliance checks',  '🧪', false, false, 5, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
