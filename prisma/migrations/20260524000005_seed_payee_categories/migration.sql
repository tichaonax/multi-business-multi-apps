-- Seed Payee Category Groups (Level 1) and Payee Categories (Level 2)

-- ============================================================
-- GROUPS
-- ============================================================
INSERT INTO "public"."payee_category_groups" ("id", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pcg_repair',       'Repair & Maintenance',       '🛠️', 1, true, NOW()),
  ('pcg_construction', 'Construction & Trades',      '🏗️', 2, true, NOW()),
  ('pcg_property',     'Property & Outdoor Services','🌿', 3, true, NOW()),
  ('pcg_personal',     'Personal Care Services',     '💇', 4, true, NOW()),
  ('pcg_professional', 'Professional Services',      '📚', 5, true, NOW()),
  ('pcg_event',        'Event & Creative Services',  '🎉', 6, true, NOW()),
  ('pcg_delivery',     'Delivery & Moving',          '🚚', 7, true, NOW()),
  ('pcg_health',       'Health & Wellness',          '🩺', 8, true, NOW()),
  ('pcg_tech',         'Tech & Digital Services',    '💻', 9, true, NOW());

-- ============================================================
-- CATEGORIES — Repair & Maintenance
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_rep_handyman',    'pcg_repair', 'Handyman',                      '🔧', 1,  true, NOW()),
  ('pc_rep_general',     'pcg_repair', 'General Repair Person',         '🪛', 2,  true, NOW()),
  ('pc_rep_plumber',     'pcg_repair', 'Plumber',                       '🚰', 3,  true, NOW()),
  ('pc_rep_electrician', 'pcg_repair', 'Electrician',                   '⚡', 4,  true, NOW()),
  ('pc_rep_appliance',   'pcg_repair', 'Appliance Repair Technician',   '🧰', 5,  true, NOW()),
  ('pc_rep_computer',    'pcg_repair', 'Computer Repair Technician',    '🖥️', 6,  true, NOW()),
  ('pc_rep_mechanic',    'pcg_repair', 'Mechanic',                      '🚗', 7,  true, NOW()),
  ('pc_rep_smallengine', 'pcg_repair', 'Small Engine Repair Technician','🛴', 8,  true, NOW()),
  ('pc_rep_masonry',     'pcg_repair', 'Masonry Repair Specialist',     '🧱', 9,  true, NOW()),
  ('pc_rep_carpentry',   'pcg_repair', 'Carpentry Repair Specialist',   '🪵', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Construction & Trades
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_con_contractor', 'pcg_construction', 'General Contractor', '👷', 1,  true, NOW()),
  ('pc_con_builder',    'pcg_construction', 'Home Builder',       '🏠', 2,  true, NOW()),
  ('pc_con_carpenter',  'pcg_construction', 'Carpenter',          '🪚', 3,  true, NOW()),
  ('pc_con_mason',      'pcg_construction', 'Mason',              '🧱', 4,  true, NOW()),
  ('pc_con_doorinstall','pcg_construction', 'Door Installer',     '🚪', 5,  true, NOW()),
  ('pc_con_wininstall', 'pcg_construction', 'Window Installer',   '🪟', 6,  true, NOW()),
  ('pc_con_roofer',     'pcg_construction', 'Roofer',             '🪜', 7,  true, NOW()),
  ('pc_con_painter',    'pcg_construction', 'Painter',            '🎨', 8,  true, NOW()),
  ('pc_con_drywall',    'pcg_construction', 'Drywall Installer',  '🧱', 9,  true, NOW()),
  ('pc_con_installer',  'pcg_construction', 'Installer',          '🧰', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Property & Outdoor Services
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_prop_landscaper', 'pcg_property', 'Landscaper',            '🌿', 1,  true, NOW()),
  ('pc_prop_lawn',       'pcg_property', 'Lawn Care Specialist',  '🌳', 2,  true, NOW()),
  ('pc_prop_cleaner',    'pcg_property', 'Cleaner',               '🧹', 3,  true, NOW()),
  ('pc_prop_janitor',    'pcg_property', 'Janitor',               '🧽', 4,  true, NOW()),
  ('pc_prop_pressure',   'pcg_property', 'Pressure Washer',       '🪣', 5,  true, NOW()),
  ('pc_prop_grounds',    'pcg_property', 'Groundskeeper',         '🚜', 6,  true, NOW()),
  ('pc_prop_tree',       'pcg_property', 'Tree Trimmer',          '🌲', 7,  true, NOW()),
  ('pc_prop_fence',      'pcg_property', 'Fence Builder',         '🚧', 8,  true, NOW()),
  ('pc_prop_shed',       'pcg_property', 'Shed Builder',          '🛖', 9,  true, NOW()),
  ('pc_prop_trash',      'pcg_property', 'Trash Removal Worker',  '🧹', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Personal Care Services
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_pc_barber',     'pcg_personal', 'Barber',              '💇', 1,  true, NOW()),
  ('pc_pc_nail',       'pcg_personal', 'Nail Technician',     '💅', 2,  true, NOW()),
  ('pc_pc_massage',    'pcg_personal', 'Massage Therapist',   '💆', 3,  true, NOW()),
  ('pc_pc_hairstylist','pcg_personal', 'Hair Stylist',        '🪮', 4,  true, NOW()),
  ('pc_pc_beautician', 'pcg_personal', 'Beautician',          '✂️', 5,  true, NOW()),
  ('pc_pc_esthetics',  'pcg_personal', 'Esthetician',         '🧖', 6,  true, NOW()),
  ('pc_pc_groomer',    'pcg_personal', 'Groomer',             '🪒', 7,  true, NOW()),
  ('pc_pc_skincare',   'pcg_personal', 'Skincare Specialist', '🧴', 8,  true, NOW()),
  ('pc_pc_eyebrow',    'pcg_personal', 'Eyebrow Specialist',  '👁️', 9,  true, NOW()),
  ('pc_pc_makeup',     'pcg_personal', 'Makeup Artist',       '👄', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Professional Services
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_pro_tutor',       'pcg_professional', 'Tutor',            '👨‍🏫', 1,  true, NOW()),
  ('pc_pro_teacher',     'pcg_professional', 'Teacher',          '🧑‍🏫', 2,  true, NOW()),
  ('pc_pro_consultant',  'pcg_professional', 'Consultant',       '👨‍💼', 3,  true, NOW()),
  ('pc_pro_accountant',  'pcg_professional', 'Accountant',       '🧾', 4,  true, NOW()),
  ('pc_pro_bookkeeper',  'pcg_professional', 'Bookkeeper',       '📊', 5,  true, NOW()),
  ('pc_pro_lawyer',      'pcg_professional', 'Lawyer',           '🧑‍⚖️', 6,  true, NOW()),
  ('pc_pro_notary',      'pcg_professional', 'Notary',           '🧑‍💼', 7,  true, NOW()),
  ('pc_pro_advisor',     'pcg_professional', 'Business Advisor', '💼', 8,  true, NOW()),
  ('pc_pro_writer',      'pcg_professional', 'Writer',           '📝', 9,  true, NOW()),
  ('pc_pro_coach',       'pcg_professional', 'Coach',            '🧠', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Event & Creative Services
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_ev_dj',         'pcg_event', 'DJ',               '🎤', 1,  true, NOW()),
  ('pc_ev_photo',      'pcg_event', 'Photographer',     '📸', 2,  true, NOW()),
  ('pc_ev_video',      'pcg_event', 'Videographer',     '🎥', 3,  true, NOW()),
  ('pc_ev_host',       'pcg_event', 'Event Host',       '🎭', 4,  true, NOW()),
  ('pc_ev_entertainer','pcg_event', 'Entertainer',      '🎪', 5,  true, NOW()),
  ('pc_ev_musician',   'pcg_event', 'Musician',         '🎶', 6,  true, NOW()),
  ('pc_ev_dancer',     'pcg_event', 'Dancer',           '💃', 7,  true, NOW()),
  ('pc_ev_designer',   'pcg_event', 'Graphic Designer', '🎨', 8,  true, NOW()),
  ('pc_ev_artist',     'pcg_event', 'Artist',           '🖌️', 9,  true, NOW()),
  ('pc_ev_tailor',     'pcg_event', 'Tailor',           '🧵', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Delivery & Moving
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_del_driver',    'pcg_delivery', 'Delivery Driver',        '🚚', 1, true, NOW()),
  ('pc_del_courier',   'pcg_delivery', 'Courier',                '📦', 2, true, NOW()),
  ('pc_del_mover',     'pcg_delivery', 'Mover',                  '🏠', 3, true, NOW()),
  ('pc_del_packship',  'pcg_delivery', 'Pack-and-Ship Worker',   '🧳', 4, true, NOW()),
  ('pc_del_freight',   'pcg_delivery', 'Freight Handler',        '🚛', 5, true, NOW()),
  ('pc_del_transport', 'pcg_delivery', 'Transport Driver',       '🛻', 6, true, NOW()),
  ('pc_del_messenger', 'pcg_delivery', 'Messenger',              '📬', 7, true, NOW()),
  ('pc_del_pickup',    'pcg_delivery', 'Pickup & Drop-off Helper','🧺', 8, true, NOW());

-- ============================================================
-- CATEGORIES — Health & Wellness
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_hth_nurse',      'pcg_health', 'Nurse',              '🩺', 1,  true, NOW()),
  ('pc_hth_caregiver',  'pcg_health', 'Caregiver',          '👩‍⚕️', 2,  true, NOW()),
  ('pc_hth_medical',    'pcg_health', 'Medical Assistant',  '🧑‍⚕️', 3,  true, NOW()),
  ('pc_hth_yoga',       'pcg_health', 'Yoga Instructor',    '🧘', 4,  true, NOW()),
  ('pc_hth_trainer',    'pcg_health', 'Personal Trainer',   '🏃', 5,  true, NOW()),
  ('pc_hth_nutrition',  'pcg_health', 'Nutrition Coach',    '🍎', 6,  true, NOW()),
  ('pc_hth_therapist',  'pcg_health', 'Therapist',          '🧠', 7,  true, NOW()),
  ('pc_hth_homehealth', 'pcg_health', 'Home Health Aide',   '🧓', 8,  true, NOW()),
  ('pc_hth_babysitter', 'pcg_health', 'Babysitter',         '👶', 9,  true, NOW()),
  ('pc_hth_nanny',      'pcg_health', 'Nanny',              '🧒', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Tech & Digital Services
-- ============================================================
INSERT INTO "public"."payee_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('pc_tech_it',        'pcg_tech', 'IT Support',                '💻', 1,  true, NOW()),
  ('pc_tech_webdev',    'pcg_tech', 'Web Developer',             '🖱️', 2,  true, NOW()),
  ('pc_tech_appdev',    'pcg_tech', 'App Developer',             '📱', 3,  true, NOW()),
  ('pc_tech_security',  'pcg_tech', 'Cybersecurity Specialist',  '🔐', 4,  true, NOW()),
  ('pc_tech_dataentry', 'pcg_tech', 'Data Entry Clerk',          '🧑‍💻', 5,  true, NOW()),
  ('pc_tech_printer',   'pcg_tech', 'Printer Technician',        '🖨️', 6,  true, NOW()),
  ('pc_tech_av',        'pcg_tech', 'AV Technician',             '🎛️', 7,  true, NOW()),
  ('pc_tech_network',   'pcg_tech', 'Network Technician',        '🛰️', 8,  true, NOW()),
  ('pc_tech_design',    'pcg_tech', 'UI/UX Designer',            '🧑‍🎨', 9,  true, NOW()),
  ('pc_tech_marketing', 'pcg_tech', 'Digital Marketer',          '📈', 10, true, NOW());
