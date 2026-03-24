-- Add full set of hardware inventory departments

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_hardware_plumbing',      'Plumbing & Pipes',          '🚿', 'Pipes, fittings, valves and plumbing supplies',      'hardware', true, false, NOW()),
  ('domain_hardware_electrical',    'Electrical & Wiring',       '💡', 'Cables, wiring, switches and electrical components', 'hardware', true, false, NOW()),
  ('domain_hardware_fasteners',     'Fasteners & Fixings',       '🔩', 'Screws, bolts, nails, anchors and fixings',          'hardware', true, false, NOW()),
  ('domain_hardware_paint',         'Paint & Coatings',          '🎨', 'Paints, primers, varnishes and surface coatings',    'hardware', true, false, NOW()),
  ('domain_hardware_timber',        'Timber & Wood',             '🪵', 'Timber, lumber, boards and wood products',           'hardware', true, false, NOW()),
  ('domain_hardware_roofing',       'Roofing & Cladding',        '🏠', 'Roofing sheets, tiles, cladding and guttering',      'hardware', true, false, NOW()),
  ('domain_hardware_flooring',      'Flooring & Tiles',          '🪟', 'Floor tiles, vinyl, carpets and flooring materials', 'hardware', true, false, NOW()),
  ('domain_hardware_doors',         'Doors & Windows',           '🚪', 'Doors, windows, frames and glass',                   'hardware', true, false, NOW()),
  ('domain_hardware_adhesives',     'Adhesives & Sealants',      '🫙', 'Glues, sealants, caulks and bonding agents',         'hardware', true, false, NOW()),
  ('domain_hardware_safety',        'Safety & Protective Gear',  '🦺', 'PPE, helmets, gloves and safety equipment',          'hardware', true, false, NOW()),
  ('domain_hardware_locks',         'Locks & Security',          '🔐', 'Locks, padlocks, hinges and security hardware',      'hardware', true, false, NOW()),
  ('domain_hardware_garden',        'Garden & Outdoor',          '🌿', 'Garden tools, pots, soil and outdoor supplies',      'hardware', true, false, NOW()),
  ('domain_hardware_irrigation',    'Irrigation & Water Systems','💧', 'Hoses, sprinklers, pumps and irrigation fittings',   'hardware', true, false, NOW()),
  ('domain_hardware_welding',       'Welding & Metalwork',       '🔥', 'Welding equipment, rods, grinders and metalwork',    'hardware', true, false, NOW()),
  ('domain_hardware_concrete',      'Concrete & Masonry',        '🧱', 'Cement, concrete, blocks and masonry supplies',      'hardware', true, false, NOW()),
  ('domain_hardware_insulation',    'Insulation & Waterproofing','🛡️', 'Insulation, damp proofing and waterproofing',        'hardware', true, false, NOW()),
  ('domain_hardware_cleaning',      'Cleaning Equipment',        '🧹', 'Brooms, mops, brushes and cleaning equipment',       'hardware', true, false, NOW()),
  ('domain_hardware_storage',       'Storage & Shelving',        '📦', 'Shelving, racking, bins and storage solutions',      'hardware', true, false, NOW()),
  ('domain_hardware_ladders',       'Ladders & Scaffolding',     '🪜', 'Ladders, steps, scaffolding and access equipment',   'hardware', true, false, NOW()),
  ('domain_hardware_generators',    'Generators & Power',        '⚡', 'Generators, inverters, batteries and power units',   'hardware', true, false, NOW()),
  ('domain_hardware_pumps',         'Pumps & Motors',            '⚙️', 'Water pumps, electric motors and mechanical drives', 'hardware', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
