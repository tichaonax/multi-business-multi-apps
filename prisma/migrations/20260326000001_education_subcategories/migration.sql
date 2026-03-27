-- Add subcategories to category-education (currently empty)
-- and fill gaps in cat-personal-education

-- ─────────────────────────────────────────────────────────────
-- category-education  (full set)
-- ─────────────────────────────────────────────────────────────
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-education-tuition-fees',            'Tuition Fees',                 '💳', 'School or university tuition payments',                   'category-education', true,  false, NOW()),
  ('subcat-education-school-fees-levies',      'School Fees & Levies',          '🏫', 'Development levies, admin fees, and other school charges', 'category-education', true,  false, NOW()),
  ('subcat-education-school-uniform',          'School Uniform',                '👕', 'School uniform and dress code clothing',                   'category-education', true,  false, NOW()),
  ('subcat-education-textbooks-books',         'Textbooks & Books',             '📖', 'Required reading, textbooks, and study guides',            'category-education', true,  false, NOW()),
  ('subcat-education-supplies-stationery',     'School Supplies & Stationery',  '✏️', 'Pens, notebooks, calculators, and other supplies',         'category-education', true,  false, NOW()),
  ('subcat-education-exam-fees',               'Exam Fees',                    '📝', 'ZIMSEC, Cambridge, and other examination fees',            'category-education', true,  false, NOW()),
  ('subcat-education-school-transport',        'School Transport',              '🚌', 'Bus fees, commuting costs to school',                      'category-education', true,  false, NOW()),
  ('subcat-education-boarding-fees',           'Boarding Fees',                '🛏️', 'Boarding school accommodation and meals',                   'category-education', true,  false, NOW()),
  ('subcat-education-university-fees',         'University / College Fees',     '🎓', 'Higher education tuition and registration',                'category-education', true,  false, NOW()),
  ('subcat-education-private-tutoring',        'Private Tutoring',             '👨‍🏫', 'One-on-one or small group tutoring sessions',              'category-education', true,  false, NOW()),
  ('subcat-education-online-courses',          'Online Courses',               '💻', 'E-learning platforms and online training',                 'category-education', true,  false, NOW()),
  ('subcat-education-professional-cert',       'Professional Certification',    '🏆', 'Professional exams, certifications, and licenses',         'category-education', true,  false, NOW()),
  ('subcat-education-extracurricular',         'Extracurricular Activities',    '⚽', 'Sports, clubs, music lessons, and school activities',      'category-education', true,  false, NOW()),
  ('subcat-education-study-abroad',            'Study Abroad',                 '✈️', 'International study programmes and exchanges',             'category-education', true,  false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- cat-personal-education  (add the missing ones only)
-- Already has: Education, Textbooks, School Supplies, Tuition Fees,
--              Online Courses, Training Materials, Language Classes, Private Tutoring
-- ─────────────────────────────────────────────────────────────
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-personal-education-school-fees-levies', 'School Fees & Levies',        '🏫', 'Development levies, admin fees, and other school charges', 'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-school-uniform',     'School Uniform',               '👕', 'School uniform and dress code clothing',                   'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-exam-fees',          'Exam Fees',                   '📝', 'ZIMSEC, Cambridge, and other examination fees',            'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-school-transport',   'School Transport',             '🚌', 'Bus fees, commuting costs to school',                      'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-boarding-fees',      'Boarding Fees',               '🛏️', 'Boarding school accommodation and meals',                   'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-university-fees',    'University / College Fees',    '🎓', 'Higher education tuition and registration',                'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-professional-cert',  'Professional Certification',   '🏆', 'Professional exams, certifications, and licenses',         'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-extracurricular',    'Extracurricular Activities',   '⚽', 'Sports, clubs, music lessons, and school activities',      'cat-personal-education', true, false, NOW()),
  ('subcat-personal-education-study-abroad',       'Study Abroad',                '✈️', 'International study programmes and exchanges',             'cat-personal-education', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
