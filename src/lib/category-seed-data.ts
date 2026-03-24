export interface SeedCategory {
  name: string
  emoji: string
  color: string
  domainId: string
}

const GROCERY_CATEGORIES: SeedCategory[] = [
  // Bakery
  { name: 'Bread & Rolls', emoji: '🍞', color: '#F59E0B', domainId: 'domain_grocery_bakery' },
  { name: 'Pastries & Croissants', emoji: '🥐', color: '#F59E0B', domainId: 'domain_grocery_bakery' },
  { name: 'Cakes & Muffins', emoji: '🧁', color: '#F59E0B', domainId: 'domain_grocery_bakery' },
  { name: 'Pies & Savoury Bakes', emoji: '🥧', color: '#F59E0B', domainId: 'domain_grocery_bakery' },
  { name: 'Biscuits & Crackers', emoji: '🍪', color: '#F59E0B', domainId: 'domain_grocery_bakery' },

  // Beverages
  { name: 'Sodas & Fizzy Drinks', emoji: '🥤', color: '#06B6D4', domainId: 'domain_grocery_beverages' },
  { name: 'Bottled Water', emoji: '💧', color: '#06B6D4', domainId: 'domain_grocery_beverages' },
  { name: 'Energy Drinks', emoji: '⚡', color: '#06B6D4', domainId: 'domain_grocery_beverages' },
  { name: 'Cordials & Squash', emoji: '🍹', color: '#06B6D4', domainId: 'domain_grocery_beverages' },
  { name: 'Iced Tea', emoji: '🧋', color: '#06B6D4', domainId: 'domain_grocery_beverages' },

  // Frozen
  { name: 'Frozen Vegetables', emoji: '🧊', color: '#0EA5E9', domainId: 'domain_grocery_frozen' },
  { name: 'Frozen Meals', emoji: '🍱', color: '#0EA5E9', domainId: 'domain_grocery_frozen' },
  { name: 'Frozen Meat', emoji: '🥩', color: '#0EA5E9', domainId: 'domain_grocery_frozen' },
  { name: 'Frozen Fish & Seafood', emoji: '🐟', color: '#0EA5E9', domainId: 'domain_grocery_frozen' },
  { name: 'Ice Cream & Sorbet', emoji: '🍦', color: '#0EA5E9', domainId: 'domain_grocery_frozen' },
  { name: 'Frozen Chips & Fries', emoji: '🍟', color: '#0EA5E9', domainId: 'domain_grocery_frozen' },

  // Canned
  { name: 'Tinned Beans & Legumes', emoji: '🫘', color: '#8B5CF6', domainId: 'domain_grocery_canned' },
  { name: 'Tinned Tomatoes', emoji: '🍅', color: '#8B5CF6', domainId: 'domain_grocery_canned' },
  { name: 'Tinned Fish', emoji: '🐟', color: '#8B5CF6', domainId: 'domain_grocery_canned' },
  { name: 'Tinned Vegetables', emoji: '🥫', color: '#8B5CF6', domainId: 'domain_grocery_canned' },
  { name: 'Tinned Soup', emoji: '🍲', color: '#8B5CF6', domainId: 'domain_grocery_canned' },
  { name: 'Tinned Fruit', emoji: '🍑', color: '#8B5CF6', domainId: 'domain_grocery_canned' },

  // Grains
  { name: 'Rice', emoji: '🍚', color: '#D97706', domainId: 'domain_grocery_grains' },
  { name: 'Pasta & Noodles', emoji: '🍝', color: '#D97706', domainId: 'domain_grocery_grains' },
  { name: 'Flour', emoji: '🌾', color: '#D97706', domainId: 'domain_grocery_grains' },
  { name: 'Maize Meal & Sadza', emoji: '🌽', color: '#D97706', domainId: 'domain_grocery_grains' },
  { name: 'Oats & Porridge', emoji: '🥣', color: '#D97706', domainId: 'domain_grocery_grains' },
  { name: 'Breakfast Cereals', emoji: '🥣', color: '#D97706', domainId: 'domain_grocery_grains' },

  // Oils
  { name: 'Cooking Oil', emoji: '🫙', color: '#EAB308', domainId: 'domain_grocery_oils' },
  { name: 'Olive Oil', emoji: '🫒', color: '#EAB308', domainId: 'domain_grocery_oils' },
  { name: 'Butter & Margarine', emoji: '🧈', color: '#EAB308', domainId: 'domain_grocery_oils' },
  { name: 'Tomato Sauce & Ketchup', emoji: '🍅', color: '#EAB308', domainId: 'domain_grocery_oils' },
  { name: 'Vinegar & Dressings', emoji: '🍶', color: '#EAB308', domainId: 'domain_grocery_oils' },
  { name: 'Mayonnaise & Spreads', emoji: '🥄', color: '#EAB308', domainId: 'domain_grocery_oils' },

  // Snacks
  { name: 'Chips & Crisps', emoji: '🍿', color: '#F97316', domainId: 'domain_grocery_snacks' },
  { name: 'Chocolate & Sweets', emoji: '🍫', color: '#F97316', domainId: 'domain_grocery_snacks' },
  { name: 'Nuts & Dried Fruit', emoji: '🥜', color: '#F97316', domainId: 'domain_grocery_snacks' },
  { name: 'Biscuits', emoji: '🍪', color: '#F97316', domainId: 'domain_grocery_snacks' },
  { name: 'Energy & Protein Bars', emoji: '🍫', color: '#F97316', domainId: 'domain_grocery_snacks' },

  // Breakfast
  { name: 'Breakfast Cereal', emoji: '🥣', color: '#FBBF24', domainId: 'domain_grocery_breakfast' },
  { name: 'Oats & Muesli', emoji: '🌾', color: '#FBBF24', domainId: 'domain_grocery_breakfast' },
  { name: 'Granola', emoji: '🥗', color: '#FBBF24', domainId: 'domain_grocery_breakfast' },
  { name: 'Pancake Mix', emoji: '🥞', color: '#FBBF24', domainId: 'domain_grocery_breakfast' },

  // Spices
  { name: 'Salt & Pepper', emoji: '🧂', color: '#6B7280', domainId: 'domain_grocery_spices' },
  { name: 'Curry & Masala Blends', emoji: '🌶️', color: '#6B7280', domainId: 'domain_grocery_spices' },
  { name: 'Herbs (Dried)', emoji: '🌿', color: '#6B7280', domainId: 'domain_grocery_spices' },
  { name: 'Garlic & Onion Powder', emoji: '🧄', color: '#6B7280', domainId: 'domain_grocery_spices' },
  { name: 'Chilli Products', emoji: '🌶️', color: '#6B7280', domainId: 'domain_grocery_spices' },
  { name: 'Mixed Spices & Seasoning', emoji: '✨', color: '#6B7280', domainId: 'domain_grocery_spices' },

  // Baby
  { name: 'Baby Formula', emoji: '🍼', color: '#EC4899', domainId: 'domain_grocery_baby' },
  { name: 'Baby Cereal & Porridge', emoji: '🥣', color: '#EC4899', domainId: 'domain_grocery_baby' },
  { name: 'Baby Purees & Jars', emoji: '🥄', color: '#EC4899', domainId: 'domain_grocery_baby' },
  { name: 'Baby Snacks & Biscuits', emoji: '🍪', color: '#EC4899', domainId: 'domain_grocery_baby' },
  { name: 'Nappies & Wipes', emoji: '🧻', color: '#EC4899', domainId: 'domain_grocery_baby' },

  // Health
  { name: 'Vitamins & Minerals', emoji: '💊', color: '#10B981', domainId: 'domain_grocery_health' },
  { name: 'Protein Supplements', emoji: '💪', color: '#10B981', domainId: 'domain_grocery_health' },
  { name: 'Health Drinks & Tonics', emoji: '🌿', color: '#10B981', domainId: 'domain_grocery_health' },
  { name: 'Herbal Remedies', emoji: '🌱', color: '#10B981', domainId: 'domain_grocery_health' },

  // Cleaning
  { name: 'Laundry Detergent', emoji: '🧺', color: '#3B82F6', domainId: 'domain_grocery_cleaning' },
  { name: 'Dishwashing Liquid', emoji: '🫧', color: '#3B82F6', domainId: 'domain_grocery_cleaning' },
  { name: 'Household Cleaners', emoji: '🧹', color: '#3B82F6', domainId: 'domain_grocery_cleaning' },
  { name: 'Bleach & Disinfectant', emoji: '🧴', color: '#3B82F6', domainId: 'domain_grocery_cleaning' },
  { name: 'Toilet & Bathroom', emoji: '🚽', color: '#3B82F6', domainId: 'domain_grocery_cleaning' },
  { name: 'Mops & Brooms', emoji: '🧹', color: '#3B82F6', domainId: 'domain_grocery_cleaning' },

  // Personal Care
  { name: 'Deodorant & Antiperspirant', emoji: '🌸', color: '#A855F7', domainId: 'domain_grocery_personalcare' },
  { name: 'Skincare & Moisturisers', emoji: '🧴', color: '#A855F7', domainId: 'domain_grocery_personalcare' },
  { name: 'Shaving Products', emoji: '🪒', color: '#A855F7', domainId: 'domain_grocery_personalcare' },
  { name: 'Feminine Hygiene', emoji: '🌺', color: '#A855F7', domainId: 'domain_grocery_personalcare' },

  // Toiletries
  { name: 'Soap & Body Wash', emoji: '🧼', color: '#14B8A6', domainId: 'domain_grocery_toiletries' },
  { name: 'Shampoo & Conditioner', emoji: '💆', color: '#14B8A6', domainId: 'domain_grocery_toiletries' },
  { name: 'Toothpaste & Toothbrush', emoji: '🦷', color: '#14B8A6', domainId: 'domain_grocery_toiletries' },
  { name: 'Toilet Paper & Tissues', emoji: '🧻', color: '#14B8A6', domainId: 'domain_grocery_toiletries' },
  { name: 'Lotion & Body Cream', emoji: '🧴', color: '#14B8A6', domainId: 'domain_grocery_toiletries' },

  // Pet Food
  { name: 'Dog Food', emoji: '🐕', color: '#92400E', domainId: 'domain_grocery_petfood' },
  { name: 'Cat Food', emoji: '🐈', color: '#92400E', domainId: 'domain_grocery_petfood' },
  { name: 'Bird & Small Animal Feed', emoji: '🐦', color: '#92400E', domainId: 'domain_grocery_petfood' },
  { name: 'Pet Treats & Snacks', emoji: '🦴', color: '#92400E', domainId: 'domain_grocery_petfood' },
  { name: 'Pet Accessories', emoji: '🐾', color: '#92400E', domainId: 'domain_grocery_petfood' },

  // Alcohol
  { name: 'Beer & Cider', emoji: '🍺', color: '#B45309', domainId: 'domain_grocery_alcohol' },
  { name: 'Wine', emoji: '🍷', color: '#B45309', domainId: 'domain_grocery_alcohol' },
  { name: 'Spirits & Whisky', emoji: '🥃', color: '#B45309', domainId: 'domain_grocery_alcohol' },
  { name: 'Brandy & Cognac', emoji: '🥂', color: '#B45309', domainId: 'domain_grocery_alcohol' },
  { name: 'Coolers & RTD', emoji: '🍹', color: '#B45309', domainId: 'domain_grocery_alcohol' },

  // Tobacco
  { name: 'Cigarettes', emoji: '🚬', color: '#6B7280', domainId: 'domain_grocery_tobacco' },
  { name: 'Rolling Tobacco', emoji: '🌿', color: '#6B7280', domainId: 'domain_grocery_tobacco' },
  { name: 'Cigars', emoji: '🚬', color: '#6B7280', domainId: 'domain_grocery_tobacco' },
  { name: 'Lighters & Matches', emoji: '🔥', color: '#6B7280', domainId: 'domain_grocery_tobacco' },

  // Stationery
  { name: 'Notebooks & Pens', emoji: '📝', color: '#6366F1', domainId: 'domain_grocery_stationery' },
  { name: 'Magazines & Newspapers', emoji: '📰', color: '#6366F1', domainId: 'domain_grocery_stationery' },
  { name: 'Greeting Cards', emoji: '💌', color: '#6366F1', domainId: 'domain_grocery_stationery' },
  { name: 'Envelopes & Stamps', emoji: '✉️', color: '#6366F1', domainId: 'domain_grocery_stationery' },

  // Dairy
  { name: 'Full Cream Milk', emoji: '🥛', color: '#3B82F6', domainId: 'domain_grocery_dairy' },
  { name: 'Low Fat Milk', emoji: '🥛', color: '#3B82F6', domainId: 'domain_grocery_dairy' },
  { name: 'Cheese', emoji: '🧀', color: '#3B82F6', domainId: 'domain_grocery_dairy' },
  { name: 'Yoghurt', emoji: '🫙', color: '#3B82F6', domainId: 'domain_grocery_dairy' },
  { name: 'Butter & Cream', emoji: '🧈', color: '#3B82F6', domainId: 'domain_grocery_dairy' },
  { name: 'Eggs', emoji: '🥚', color: '#3B82F6', domainId: 'domain_grocery_dairy' },

  // Produce
  { name: 'Fresh Vegetables', emoji: '🥦', color: '#10B981', domainId: 'domain_grocery_produce' },
  { name: 'Fresh Fruit', emoji: '🍎', color: '#10B981', domainId: 'domain_grocery_produce' },
  { name: 'Fresh Herbs', emoji: '🌿', color: '#10B981', domainId: 'domain_grocery_produce' },
  { name: 'Salad Leaves & Greens', emoji: '🥗', color: '#10B981', domainId: 'domain_grocery_produce' },
  { name: 'Root Vegetables', emoji: '🥕', color: '#10B981', domainId: 'domain_grocery_produce' },

  // Meat
  { name: 'Fresh Beef', emoji: '🥩', color: '#EF4444', domainId: 'domain_grocery_meat' },
  { name: 'Fresh Chicken', emoji: '🍗', color: '#EF4444', domainId: 'domain_grocery_meat' },
  { name: 'Fresh Pork', emoji: '🥓', color: '#EF4444', domainId: 'domain_grocery_meat' },
  { name: 'Lamb & Mutton', emoji: '🐑', color: '#EF4444', domainId: 'domain_grocery_meat' },
  { name: 'Processed Meats', emoji: '🌭', color: '#EF4444', domainId: 'domain_grocery_meat' },
  { name: 'Fresh Fish', emoji: '🐟', color: '#EF4444', domainId: 'domain_grocery_meat' },
  { name: 'Seafood', emoji: '🦐', color: '#EF4444', domainId: 'domain_grocery_meat' },
]

const HARDWARE_CATEGORIES: SeedCategory[] = [
  // Plumbing
  { name: 'PVC Pipes & Fittings', emoji: '🔧', color: '#06B6D4', domainId: 'domain_hardware_plumbing' },
  { name: 'Copper Pipes', emoji: '🔩', color: '#06B6D4', domainId: 'domain_hardware_plumbing' },
  { name: 'Gate & Ball Valves', emoji: '🚰', color: '#06B6D4', domainId: 'domain_hardware_plumbing' },
  { name: 'Tap Fittings & Mixers', emoji: '🚿', color: '#06B6D4', domainId: 'domain_hardware_plumbing' },
  { name: 'Drainage & Sewage', emoji: '⬇️', color: '#06B6D4', domainId: 'domain_hardware_plumbing' },
  { name: 'Geysers & Water Heaters', emoji: '♨️', color: '#06B6D4', domainId: 'domain_hardware_plumbing' },

  // Electrical
  { name: 'PVC Conduit & Fittings', emoji: '💡', color: '#FBBF24', domainId: 'domain_hardware_electrical' },
  { name: 'Electric Cable & Wire', emoji: '🔌', color: '#FBBF24', domainId: 'domain_hardware_electrical' },
  { name: 'Wall Sockets & Switches', emoji: '🔋', color: '#FBBF24', domainId: 'domain_hardware_electrical' },
  { name: 'Circuit Breakers & DB', emoji: '⚡', color: '#FBBF24', domainId: 'domain_hardware_electrical' },
  { name: 'Extension Leads & Plugs', emoji: '🔌', color: '#FBBF24', domainId: 'domain_hardware_electrical' },
  { name: 'Light Fittings & Bulbs', emoji: '💡', color: '#FBBF24', domainId: 'domain_hardware_electrical' },

  // Fasteners
  { name: 'Wood Screws', emoji: '🔩', color: '#92400E', domainId: 'domain_hardware_fasteners' },
  { name: 'Machine Bolts & Nuts', emoji: '⚙️', color: '#92400E', domainId: 'domain_hardware_fasteners' },
  { name: 'Nails & Staples', emoji: '📌', color: '#92400E', domainId: 'domain_hardware_fasteners' },
  { name: 'Wall Anchors & Plugs', emoji: '🔩', color: '#92400E', domainId: 'domain_hardware_fasteners' },
  { name: 'Rivets & Pop Rivets', emoji: '🔩', color: '#92400E', domainId: 'domain_hardware_fasteners' },
  { name: 'Washers & Spacers', emoji: '⭕', color: '#92400E', domainId: 'domain_hardware_fasteners' },

  // Paint
  { name: 'Interior Emulsion Paint', emoji: '🎨', color: '#F97316', domainId: 'domain_hardware_paint' },
  { name: 'Exterior Paint', emoji: '🏠', color: '#F97316', domainId: 'domain_hardware_paint' },
  { name: 'Primer & Undercoat', emoji: '🖌️', color: '#F97316', domainId: 'domain_hardware_paint' },
  { name: 'Varnish & Lacquer', emoji: '✨', color: '#F97316', domainId: 'domain_hardware_paint' },
  { name: 'Paint Rollers & Brushes', emoji: '🖌️', color: '#F97316', domainId: 'domain_hardware_paint' },
  { name: 'Paint Thinners & Removers', emoji: '🧴', color: '#F97316', domainId: 'domain_hardware_paint' },

  // Timber
  { name: 'Pine Timber', emoji: '🪵', color: '#92400E', domainId: 'domain_hardware_timber' },
  { name: 'Hardwood & Meranti', emoji: '🌳', color: '#92400E', domainId: 'domain_hardware_timber' },
  { name: 'Plywood Boards', emoji: '🟫', color: '#92400E', domainId: 'domain_hardware_timber' },
  { name: 'OSB & Chipboard', emoji: '🟫', color: '#92400E', domainId: 'domain_hardware_timber' },
  { name: 'Skirting & Architrave', emoji: '🪚', color: '#92400E', domainId: 'domain_hardware_timber' },
  { name: 'Dowels & Mouldings', emoji: '🔵', color: '#92400E', domainId: 'domain_hardware_timber' },

  // Roofing
  { name: 'IBR Roofing Sheets', emoji: '🏠', color: '#6B7280', domainId: 'domain_hardware_roofing' },
  { name: 'Corrugated Sheets', emoji: '〰️', color: '#6B7280', domainId: 'domain_hardware_roofing' },
  { name: 'Ridge Caps & Flashings', emoji: '🔺', color: '#6B7280', domainId: 'domain_hardware_roofing' },
  { name: 'Gutters & Downpipes', emoji: '🌧️', color: '#6B7280', domainId: 'domain_hardware_roofing' },
  { name: 'Roof Screws & Bolts', emoji: '🔩', color: '#6B7280', domainId: 'domain_hardware_roofing' },

  // Flooring
  { name: 'Ceramic Floor Tiles', emoji: '🟨', color: '#D97706', domainId: 'domain_hardware_flooring' },
  { name: 'Porcelain Tiles', emoji: '⬜', color: '#D97706', domainId: 'domain_hardware_flooring' },
  { name: 'Vinyl & Laminate Flooring', emoji: '🟩', color: '#D97706', domainId: 'domain_hardware_flooring' },
  { name: 'Carpet Tiles & Underlay', emoji: '🟫', color: '#D97706', domainId: 'domain_hardware_flooring' },
  { name: 'Floor Adhesive & Grout', emoji: '🪣', color: '#D97706', domainId: 'domain_hardware_flooring' },

  // Doors
  { name: 'Interior Doors', emoji: '🚪', color: '#7C3AED', domainId: 'domain_hardware_doors' },
  { name: 'Exterior Doors', emoji: '🚪', color: '#7C3AED', domainId: 'domain_hardware_doors' },
  { name: 'Windows & Frames', emoji: '🪟', color: '#7C3AED', domainId: 'domain_hardware_doors' },
  { name: 'Sliding Doors & Track', emoji: '↔️', color: '#7C3AED', domainId: 'domain_hardware_doors' },
  { name: 'Security Gates & Burglar Bars', emoji: '🔐', color: '#7C3AED', domainId: 'domain_hardware_doors' },

  // Adhesives
  { name: 'PVA & Wood Glue', emoji: '🫙', color: '#A16207', domainId: 'domain_hardware_adhesives' },
  { name: 'Silicone Sealant', emoji: '🔫', color: '#A16207', domainId: 'domain_hardware_adhesives' },
  { name: 'Epoxy Adhesive', emoji: '⚗️', color: '#A16207', domainId: 'domain_hardware_adhesives' },
  { name: 'Contact Cement', emoji: '🧪', color: '#A16207', domainId: 'domain_hardware_adhesives' },
  { name: 'Gap Filler & Putty', emoji: '🔧', color: '#A16207', domainId: 'domain_hardware_adhesives' },

  // Safety
  { name: 'Safety Helmets & Hats', emoji: '⛑️', color: '#F97316', domainId: 'domain_hardware_safety' },
  { name: 'Work Gloves', emoji: '🧤', color: '#F97316', domainId: 'domain_hardware_safety' },
  { name: 'Safety Boots & Shoes', emoji: '👢', color: '#F97316', domainId: 'domain_hardware_safety' },
  { name: 'High-Vis Vests', emoji: '🦺', color: '#F97316', domainId: 'domain_hardware_safety' },
  { name: 'Safety Goggles & Glasses', emoji: '🥽', color: '#F97316', domainId: 'domain_hardware_safety' },
  { name: 'Dust Masks & Respirators', emoji: '😷', color: '#F97316', domainId: 'domain_hardware_safety' },

  // Locks
  { name: 'Padlocks', emoji: '🔒', color: '#6366F1', domainId: 'domain_hardware_locks' },
  { name: 'Deadbolt Door Locks', emoji: '🔐', color: '#6366F1', domainId: 'domain_hardware_locks' },
  { name: 'Door Handles & Knobs', emoji: '🚪', color: '#6366F1', domainId: 'domain_hardware_locks' },
  { name: 'Door Hinges', emoji: '🔩', color: '#6366F1', domainId: 'domain_hardware_locks' },
  { name: 'Gate Locks & Chains', emoji: '⛓️', color: '#6366F1', domainId: 'domain_hardware_locks' },
  { name: 'Alarm & Security Systems', emoji: '🚨', color: '#6366F1', domainId: 'domain_hardware_locks' },

  // Garden
  { name: 'Spades & Forks', emoji: '⛏️', color: '#16A34A', domainId: 'domain_hardware_garden' },
  { name: 'Rakes & Hoes', emoji: '🌿', color: '#16A34A', domainId: 'domain_hardware_garden' },
  { name: 'Garden Hose & Fittings', emoji: '🌊', color: '#16A34A', domainId: 'domain_hardware_garden' },
  { name: 'Pots & Planters', emoji: '🪴', color: '#16A34A', domainId: 'domain_hardware_garden' },
  { name: 'Garden Soil & Compost', emoji: '🌱', color: '#16A34A', domainId: 'domain_hardware_garden' },
  { name: 'Lawn Mowers & Trimmers', emoji: '🌿', color: '#16A34A', domainId: 'domain_hardware_garden' },

  // Irrigation
  { name: 'Garden Hose Pipe', emoji: '💧', color: '#0EA5E9', domainId: 'domain_hardware_irrigation' },
  { name: 'Sprinkler Heads', emoji: '💦', color: '#0EA5E9', domainId: 'domain_hardware_irrigation' },
  { name: 'Drip Irrigation Kits', emoji: '🌧️', color: '#0EA5E9', domainId: 'domain_hardware_irrigation' },
  { name: 'Water Timers & Controllers', emoji: '⏱️', color: '#0EA5E9', domainId: 'domain_hardware_irrigation' },
  { name: 'Irrigation Fittings', emoji: '🔧', color: '#0EA5E9', domainId: 'domain_hardware_irrigation' },

  // Welding
  { name: 'Welding Rods & Electrodes', emoji: '🔥', color: '#EF4444', domainId: 'domain_hardware_welding' },
  { name: 'Welding Wire (MIG/TIG)', emoji: '🌀', color: '#EF4444', domainId: 'domain_hardware_welding' },
  { name: 'Angle Grinders', emoji: '⚙️', color: '#EF4444', domainId: 'domain_hardware_welding' },
  { name: 'Grinding & Cutting Discs', emoji: '⭕', color: '#EF4444', domainId: 'domain_hardware_welding' },
  { name: 'Welding Helmets & Shields', emoji: '🛡️', color: '#EF4444', domainId: 'domain_hardware_welding' },

  // Concrete
  { name: 'Portland Cement', emoji: '🧱', color: '#78716C', domainId: 'domain_hardware_concrete' },
  { name: 'River Sand & Aggregate', emoji: '🏖️', color: '#78716C', domainId: 'domain_hardware_concrete' },
  { name: 'Concrete Blocks & Bricks', emoji: '🧱', color: '#78716C', domainId: 'domain_hardware_concrete' },
  { name: 'Reinforcing Steel Bar', emoji: '🔩', color: '#78716C', domainId: 'domain_hardware_concrete' },
  { name: 'Steel Mesh & BRC', emoji: '⬛', color: '#78716C', domainId: 'domain_hardware_concrete' },
  { name: 'Pre-mix Concrete', emoji: '🪣', color: '#78716C', domainId: 'domain_hardware_concrete' },

  // Insulation
  { name: 'Ceiling Insulation', emoji: '🛡️', color: '#84CC16', domainId: 'domain_hardware_insulation' },
  { name: 'Damp Proof Course', emoji: '💧', color: '#84CC16', domainId: 'domain_hardware_insulation' },
  { name: 'Bitumen Waterproofing', emoji: '⬛', color: '#84CC16', domainId: 'domain_hardware_insulation' },
  { name: 'Expanding Foam', emoji: '🫧', color: '#84CC16', domainId: 'domain_hardware_insulation' },

  // Cleaning
  { name: 'Brooms & Dustpans', emoji: '🧹', color: '#14B8A6', domainId: 'domain_hardware_cleaning' },
  { name: 'Mops & Buckets', emoji: '🪣', color: '#14B8A6', domainId: 'domain_hardware_cleaning' },
  { name: 'Scrubbing Brushes', emoji: '🪥', color: '#14B8A6', domainId: 'domain_hardware_cleaning' },
  { name: 'Squeegees & Cloths', emoji: '🧽', color: '#14B8A6', domainId: 'domain_hardware_cleaning' },

  // Storage
  { name: 'Metal Shelving & Racking', emoji: '📦', color: '#8B5CF6', domainId: 'domain_hardware_storage' },
  { name: 'Plastic Storage Bins', emoji: '🗑️', color: '#8B5CF6', domainId: 'domain_hardware_storage' },
  { name: 'Tool Cabinets & Chests', emoji: '🗄️', color: '#8B5CF6', domainId: 'domain_hardware_storage' },
  { name: 'Wall-Mounted Hooks & Rails', emoji: '🪝', color: '#8B5CF6', domainId: 'domain_hardware_storage' },

  // Ladders
  { name: 'Step Ladders', emoji: '🪜', color: '#F59E0B', domainId: 'domain_hardware_ladders' },
  { name: 'Extension Ladders', emoji: '📏', color: '#F59E0B', domainId: 'domain_hardware_ladders' },
  { name: 'Scaffolding & Trestle', emoji: '🏗️', color: '#F59E0B', domainId: 'domain_hardware_ladders' },
  { name: 'Platform Steps', emoji: '🔼', color: '#F59E0B', domainId: 'domain_hardware_ladders' },

  // Generators
  { name: 'Petrol Generators', emoji: '⚡', color: '#EAB308', domainId: 'domain_hardware_generators' },
  { name: 'Diesel Generators', emoji: '🔌', color: '#EAB308', domainId: 'domain_hardware_generators' },
  { name: 'Inverters & UPS Systems', emoji: '🔋', color: '#EAB308', domainId: 'domain_hardware_generators' },
  { name: 'Deep Cycle Batteries', emoji: '🔋', color: '#EAB308', domainId: 'domain_hardware_generators' },

  // Pumps
  { name: 'Submersible Pumps', emoji: '⚙️', color: '#3B82F6', domainId: 'domain_hardware_pumps' },
  { name: 'Surface & Centrifugal Pumps', emoji: '💧', color: '#3B82F6', domainId: 'domain_hardware_pumps' },
  { name: 'Pressure Booster Pumps', emoji: '💦', color: '#3B82F6', domainId: 'domain_hardware_pumps' },
  { name: 'Pool & Fountain Pumps', emoji: '🏊', color: '#3B82F6', domainId: 'domain_hardware_pumps' },

  // Hand Tools
  { name: 'Hammers & Mallets', emoji: '🔨', color: '#EF4444', domainId: 'domain_hardware_hand_tools' },
  { name: 'Screwdrivers', emoji: '🪛', color: '#EF4444', domainId: 'domain_hardware_hand_tools' },
  { name: 'Pliers & Spanners', emoji: '🔧', color: '#EF4444', domainId: 'domain_hardware_hand_tools' },
  { name: 'Chisels & Cold Chisels', emoji: '⚒️', color: '#EF4444', domainId: 'domain_hardware_hand_tools' },
  { name: 'Hand Saws', emoji: '🪚', color: '#EF4444', domainId: 'domain_hardware_hand_tools' },
  { name: 'Tape Measures & Levels', emoji: '📏', color: '#EF4444', domainId: 'domain_hardware_hand_tools' },

  // Power Tools
  { name: 'Power Drills & Drivers', emoji: '🔩', color: '#F97316', domainId: 'domain_hardware_power_tools' },
  { name: 'Circular Saws', emoji: '⭕', color: '#F97316', domainId: 'domain_hardware_power_tools' },
  { name: 'Jigsaws & Reciprocating Saws', emoji: '🔪', color: '#F97316', domainId: 'domain_hardware_power_tools' },
  { name: 'Sanders & Polishers', emoji: '🔄', color: '#F97316', domainId: 'domain_hardware_power_tools' },
  { name: 'Rotary Tools', emoji: '⚙️', color: '#F97316', domainId: 'domain_hardware_power_tools' },

  // Building
  { name: 'Bricks & Face Bricks', emoji: '🧱', color: '#78716C', domainId: 'domain_hardware_building' },
  { name: 'Steel Profiles & Angles', emoji: '📐', color: '#78716C', domainId: 'domain_hardware_building' },
  { name: 'Steel Pipes & Tubes', emoji: '⬛', color: '#78716C', domainId: 'domain_hardware_building' },
  { name: 'Structural Timber', emoji: '🪵', color: '#78716C', domainId: 'domain_hardware_building' },
  { name: 'Pre-cast Lintels', emoji: '━', color: '#78716C', domainId: 'domain_hardware_building' },
]

const RESTAURANT_CATEGORIES: SeedCategory[] = [
  // Soups
  { name: 'Beef & Oxtail Broth', emoji: '🍖', color: '#DC2626', domainId: 'domain_restaurant_soups' },
  { name: 'Chicken Soup', emoji: '🐔', color: '#DC2626', domainId: 'domain_restaurant_soups' },
  { name: 'Vegetable Soup', emoji: '🥕', color: '#DC2626', domainId: 'domain_restaurant_soups' },
  { name: 'Cream Soups', emoji: '🥣', color: '#DC2626', domainId: 'domain_restaurant_soups' },
  { name: 'Cold Starters & Antipasti', emoji: '🥗', color: '#DC2626', domainId: 'domain_restaurant_soups' },

  // Salads
  { name: 'Garden Salad', emoji: '🥗', color: '#16A34A', domainId: 'domain_restaurant_salads' },
  { name: 'Caesar Salad', emoji: '🥬', color: '#16A34A', domainId: 'domain_restaurant_salads' },
  { name: 'Greek Salad', emoji: '🫒', color: '#16A34A', domainId: 'domain_restaurant_salads' },
  { name: 'Coleslaw', emoji: '🥦', color: '#16A34A', domainId: 'domain_restaurant_salads' },
  { name: 'Pasta Salad', emoji: '🍝', color: '#16A34A', domainId: 'domain_restaurant_salads' },

  // Grills
  { name: 'Grilled Steak', emoji: '🥩', color: '#B91C1C', domainId: 'domain_restaurant_grills' },
  { name: 'BBQ Ribs', emoji: '🍖', color: '#B91C1C', domainId: 'domain_restaurant_grills' },
  { name: 'Mixed Grill Platter', emoji: '🔥', color: '#B91C1C', domainId: 'domain_restaurant_grills' },
  { name: 'Grilled Sausages', emoji: '🌭', color: '#B91C1C', domainId: 'domain_restaurant_grills' },
  { name: 'Braaied Meats', emoji: '🔥', color: '#B91C1C', domainId: 'domain_restaurant_grills' },

  // Chicken
  { name: 'Grilled Chicken', emoji: '🍗', color: '#F59E0B', domainId: 'domain_restaurant_chicken' },
  { name: 'Fried Chicken', emoji: '🍗', color: '#F59E0B', domainId: 'domain_restaurant_chicken' },
  { name: 'Chicken Wings', emoji: '🍗', color: '#F59E0B', domainId: 'domain_restaurant_chicken' },
  { name: 'Chicken Strips & Tenders', emoji: '🍗', color: '#F59E0B', domainId: 'domain_restaurant_chicken' },
  { name: 'Whole Rotisserie Chicken', emoji: '🐔', color: '#F59E0B', domainId: 'domain_restaurant_chicken' },

  // Seafood
  { name: 'Grilled Fish', emoji: '🐟', color: '#0EA5E9', domainId: 'domain_restaurant_seafood' },
  { name: 'Calamari', emoji: '🦑', color: '#0EA5E9', domainId: 'domain_restaurant_seafood' },
  { name: 'Prawns & Shrimp', emoji: '🦐', color: '#0EA5E9', domainId: 'domain_restaurant_seafood' },
  { name: 'Seafood Platter', emoji: '🦞', color: '#0EA5E9', domainId: 'domain_restaurant_seafood' },
  { name: 'Fish & Chips', emoji: '🐠', color: '#0EA5E9', domainId: 'domain_restaurant_seafood' },

  // Vegetarian
  { name: 'Veggie Burger', emoji: '🥦', color: '#16A34A', domainId: 'domain_restaurant_vegetarian' },
  { name: 'Vegetable Stir Fry', emoji: '🥢', color: '#16A34A', domainId: 'domain_restaurant_vegetarian' },
  { name: 'Mushroom Dishes', emoji: '🍄', color: '#16A34A', domainId: 'domain_restaurant_vegetarian' },
  { name: 'Tofu & Legume Dishes', emoji: '🫘', color: '#16A34A', domainId: 'domain_restaurant_vegetarian' },
  { name: 'Vegan Options', emoji: '🌱', color: '#16A34A', domainId: 'domain_restaurant_vegetarian' },

  // Sides
  { name: 'Chips & Fries', emoji: '🍟', color: '#EAB308', domainId: 'domain_restaurant_sides' },
  { name: 'Rice (Steamed/Fried)', emoji: '🍚', color: '#EAB308', domainId: 'domain_restaurant_sides' },
  { name: 'Pap & Sadza', emoji: '🌽', color: '#EAB308', domainId: 'domain_restaurant_sides' },
  { name: 'Garlic Bread', emoji: '🍞', color: '#EAB308', domainId: 'domain_restaurant_sides' },
  { name: 'Coleslaw & Side Salads', emoji: '🥗', color: '#EAB308', domainId: 'domain_restaurant_sides' },
  { name: 'Roasted Vegetables', emoji: '🥕', color: '#EAB308', domainId: 'domain_restaurant_sides' },

  // Desserts
  { name: 'Ice Cream & Gelato', emoji: '🍦', color: '#EC4899', domainId: 'domain_restaurant_desserts' },
  { name: 'Chocolate Cake', emoji: '🎂', color: '#EC4899', domainId: 'domain_restaurant_desserts' },
  { name: 'Cheesecake', emoji: '🍰', color: '#EC4899', domainId: 'domain_restaurant_desserts' },
  { name: 'Malva Pudding', emoji: '🍮', color: '#EC4899', domainId: 'domain_restaurant_desserts' },
  { name: 'Fruit Salad', emoji: '🍓', color: '#EC4899', domainId: 'domain_restaurant_desserts' },

  // Kids
  { name: 'Kids Burger & Chips', emoji: '🍔', color: '#F97316', domainId: 'domain_restaurant_kids' },
  { name: 'Kids Chicken Strips', emoji: '🍗', color: '#F97316', domainId: 'domain_restaurant_kids' },
  { name: 'Kids Pasta', emoji: '🍝', color: '#F97316', domainId: 'domain_restaurant_kids' },
  { name: 'Kids Fish Fingers', emoji: '🐟', color: '#F97316', domainId: 'domain_restaurant_kids' },
  { name: 'Kids Juice & Drinks', emoji: '🧃', color: '#F97316', domainId: 'domain_restaurant_kids' },

  // Breakfast
  { name: 'Full English Breakfast', emoji: '🍳', color: '#D97706', domainId: 'domain_restaurant_breakfast' },
  { name: 'Omelettes & Eggs', emoji: '🥚', color: '#D97706', domainId: 'domain_restaurant_breakfast' },
  { name: 'French Toast & Waffles', emoji: '🧇', color: '#D97706', domainId: 'domain_restaurant_breakfast' },
  { name: 'Pancakes', emoji: '🥞', color: '#D97706', domainId: 'domain_restaurant_breakfast' },
  { name: 'Granola & Yoghurt', emoji: '🥣', color: '#D97706', domainId: 'domain_restaurant_breakfast' },

  // Sandwiches
  { name: 'Club Sandwich', emoji: '🥪', color: '#78716C', domainId: 'domain_restaurant_sandwiches' },
  { name: 'BLT & Toasted Sandwiches', emoji: '🥓', color: '#78716C', domainId: 'domain_restaurant_sandwiches' },
  { name: 'Wraps & Pitas', emoji: '🌯', color: '#78716C', domainId: 'domain_restaurant_sandwiches' },
  { name: 'Rolls & Sub Sandwiches', emoji: '🥖', color: '#78716C', domainId: 'domain_restaurant_sandwiches' },

  // Pizza
  { name: 'Margherita Pizza', emoji: '🍕', color: '#EF4444', domainId: 'domain_restaurant_pizza' },
  { name: 'Pepperoni Pizza', emoji: '🍕', color: '#EF4444', domainId: 'domain_restaurant_pizza' },
  { name: 'BBQ Chicken Pizza', emoji: '🍕', color: '#EF4444', domainId: 'domain_restaurant_pizza' },
  { name: 'Vegetarian Pizza', emoji: '🥦', color: '#EF4444', domainId: 'domain_restaurant_pizza' },
  { name: 'Custom Pizza', emoji: '🍕', color: '#EF4444', domainId: 'domain_restaurant_pizza' },

  // Burgers
  { name: 'Classic Beef Burger', emoji: '🍔', color: '#B45309', domainId: 'domain_restaurant_burgers' },
  { name: 'Cheeseburger', emoji: '🍔', color: '#B45309', domainId: 'domain_restaurant_burgers' },
  { name: 'Double Patty Burger', emoji: '🍔', color: '#B45309', domainId: 'domain_restaurant_burgers' },
  { name: 'Chicken Burger', emoji: '🐔', color: '#B45309', domainId: 'domain_restaurant_burgers' },
  { name: 'Veggie Burger', emoji: '🥦', color: '#B45309', domainId: 'domain_restaurant_burgers' },

  // Rice
  { name: 'Fried Rice', emoji: '🍳', color: '#D97706', domainId: 'domain_restaurant_rice' },
  { name: 'Steamed Rice', emoji: '🍚', color: '#D97706', domainId: 'domain_restaurant_rice' },
  { name: 'Noodle Dishes', emoji: '🍜', color: '#D97706', domainId: 'domain_restaurant_rice' },
  { name: 'Pasta Dishes', emoji: '🍝', color: '#D97706', domainId: 'domain_restaurant_rice' },
  { name: 'Risotto', emoji: '🍚', color: '#D97706', domainId: 'domain_restaurant_rice' },

  // Sauces
  { name: 'Tomato Sauce', emoji: '🍅', color: '#DC2626', domainId: 'domain_restaurant_sauces' },
  { name: 'Peri-Peri Sauce', emoji: '🌶️', color: '#DC2626', domainId: 'domain_restaurant_sauces' },
  { name: 'BBQ Sauce', emoji: '🔥', color: '#DC2626', domainId: 'domain_restaurant_sauces' },
  { name: 'Garlic Sauce & Aioli', emoji: '🧄', color: '#DC2626', domainId: 'domain_restaurant_sauces' },
  { name: 'Gravy', emoji: '🍖', color: '#DC2626', domainId: 'domain_restaurant_sauces' },
  { name: 'Dips & Hummus', emoji: '🫙', color: '#DC2626', domainId: 'domain_restaurant_sauces' },

  // Soft Drinks
  { name: 'Coca-Cola Products', emoji: '🥤', color: '#EF4444', domainId: 'domain_restaurant_softdrinks' },
  { name: 'Fanta & Fruit Sodas', emoji: '🧡', color: '#EF4444', domainId: 'domain_restaurant_softdrinks' },
  { name: 'Sprite & Clear Sodas', emoji: '💚', color: '#EF4444', domainId: 'domain_restaurant_softdrinks' },
  { name: 'Sparkling Water', emoji: '💧', color: '#EF4444', domainId: 'domain_restaurant_softdrinks' },
  { name: 'Still Water', emoji: '💧', color: '#EF4444', domainId: 'domain_restaurant_softdrinks' },

  // Hot Drinks
  { name: 'Coffee', emoji: '☕', color: '#78350F', domainId: 'domain_restaurant_hot' },
  { name: 'Cappuccino & Latte', emoji: '☕', color: '#78350F', domainId: 'domain_restaurant_hot' },
  { name: 'Tea & Herbal', emoji: '🍵', color: '#78350F', domainId: 'domain_restaurant_hot' },
  { name: 'Hot Chocolate', emoji: '🍫', color: '#78350F', domainId: 'domain_restaurant_hot' },
  { name: 'Espresso', emoji: '☕', color: '#78350F', domainId: 'domain_restaurant_hot' },

  // Juices
  { name: 'Orange Juice', emoji: '🍊', color: '#F97316', domainId: 'domain_restaurant_juices' },
  { name: 'Apple Juice', emoji: '🍎', color: '#F97316', domainId: 'domain_restaurant_juices' },
  { name: 'Mango Juice', emoji: '🥭', color: '#F97316', domainId: 'domain_restaurant_juices' },
  { name: 'Smoothies', emoji: '🥤', color: '#F97316', domainId: 'domain_restaurant_juices' },
  { name: 'Freshly Squeezed Juices', emoji: '🍋', color: '#F97316', domainId: 'domain_restaurant_juices' },

  // Alcohol
  { name: 'Draught Beer', emoji: '🍺', color: '#B45309', domainId: 'domain_restaurant_alcohol' },
  { name: 'Bottled Beer', emoji: '🍻', color: '#B45309', domainId: 'domain_restaurant_alcohol' },
  { name: 'House Wine', emoji: '🍷', color: '#B45309', domainId: 'domain_restaurant_alcohol' },
  { name: 'Spirits & Shooters', emoji: '🥃', color: '#B45309', domainId: 'domain_restaurant_alcohol' },
  { name: 'Cocktails', emoji: '🍹', color: '#B45309', domainId: 'domain_restaurant_alcohol' },

  // Produce (Kitchen)
  { name: 'Tomatoes', emoji: '🍅', color: '#16A34A', domainId: 'domain_restaurant_produce' },
  { name: 'Onions & Garlic', emoji: '🧅', color: '#16A34A', domainId: 'domain_restaurant_produce' },
  { name: 'Peppers', emoji: '🌶️', color: '#16A34A', domainId: 'domain_restaurant_produce' },
  { name: 'Leafy Greens', emoji: '🥬', color: '#16A34A', domainId: 'domain_restaurant_produce' },
  { name: 'Root Vegetables', emoji: '🥕', color: '#16A34A', domainId: 'domain_restaurant_produce' },

  // Dairy (Kitchen)
  { name: 'Fresh Milk', emoji: '🥛', color: '#3B82F6', domainId: 'domain_restaurant_dairy' },
  { name: 'Cheese (Kitchen)', emoji: '🧀', color: '#3B82F6', domainId: 'domain_restaurant_dairy' },
  { name: 'Butter & Cream', emoji: '🧈', color: '#3B82F6', domainId: 'domain_restaurant_dairy' },
  { name: 'Eggs (Kitchen)', emoji: '🥚', color: '#3B82F6', domainId: 'domain_restaurant_dairy' },

  // Meat (Kitchen)
  { name: 'Beef Cuts', emoji: '🥩', color: '#B91C1C', domainId: 'domain_restaurant_meat' },
  { name: 'Pork Cuts', emoji: '🥓', color: '#B91C1C', domainId: 'domain_restaurant_meat' },
  { name: 'Lamb & Mutton', emoji: '🐑', color: '#B91C1C', domainId: 'domain_restaurant_meat' },
  { name: 'Beef Mince', emoji: '🍖', color: '#B91C1C', domainId: 'domain_restaurant_meat' },
  { name: 'Offal & Organs', emoji: '🫀', color: '#B91C1C', domainId: 'domain_restaurant_meat' },

  // Spices (Kitchen)
  { name: 'Salt & Pepper', emoji: '🧂', color: '#6B7280', domainId: 'domain_restaurant_spices' },
  { name: 'Mixed Spice & Curry', emoji: '🌶️', color: '#6B7280', domainId: 'domain_restaurant_spices' },
  { name: 'Fresh & Dried Herbs', emoji: '🌿', color: '#6B7280', domainId: 'domain_restaurant_spices' },
  { name: 'Garlic & Onion Powder', emoji: '🧄', color: '#6B7280', domainId: 'domain_restaurant_spices' },
  { name: 'Chilli & Peri-Peri', emoji: '🌶️', color: '#6B7280', domainId: 'domain_restaurant_spices' },

  // Dry Goods (Kitchen)
  { name: 'Flour (Kitchen)', emoji: '🌾', color: '#D97706', domainId: 'domain_restaurant_drygoods' },
  { name: 'Sugar & Sweeteners', emoji: '🍯', color: '#D97706', domainId: 'domain_restaurant_drygoods' },
  { name: 'Bread Crumbs & Coating', emoji: '🥖', color: '#D97706', domainId: 'domain_restaurant_drygoods' },
  { name: 'Rice & Pasta (Kitchen)', emoji: '🍝', color: '#D97706', domainId: 'domain_restaurant_drygoods' },
  { name: 'Tinned Goods (Kitchen)', emoji: '🥫', color: '#D97706', domainId: 'domain_restaurant_drygoods' },
  { name: 'Cooking Oils (Kitchen)', emoji: '🫙', color: '#D97706', domainId: 'domain_restaurant_drygoods' },

  // Packaging
  { name: 'Takeaway Boxes & Containers', emoji: '📦', color: '#6B7280', domainId: 'domain_restaurant_packaging' },
  { name: 'Paper Bags & Wrapping', emoji: '🛍️', color: '#6B7280', domainId: 'domain_restaurant_packaging' },
  { name: 'Cups & Lids', emoji: '☕', color: '#6B7280', domainId: 'domain_restaurant_packaging' },
  { name: 'Straws & Cutlery', emoji: '🥄', color: '#6B7280', domainId: 'domain_restaurant_packaging' },
  { name: 'Serviettes & Napkins', emoji: '🧻', color: '#6B7280', domainId: 'domain_restaurant_packaging' },
  { name: 'Cling Wrap & Foil', emoji: '📋', color: '#6B7280', domainId: 'domain_restaurant_packaging' },
]

const CLOTHING_CATEGORIES: SeedCategory[] = [
  // Men's Fashion
  { name: "T-Shirts & Polos", emoji: "👕", color: "#3B82F6", domainId: "domain_clothing_mens" },
  { name: "Shirts & Dress Shirts", emoji: "👔", color: "#3B82F6", domainId: "domain_clothing_mens" },
  { name: "Trousers & Chinos", emoji: "👖", color: "#3B82F6", domainId: "domain_clothing_mens" },
  { name: "Jeans", emoji: "👖", color: "#3B82F6", domainId: "domain_clothing_mens" },
  { name: "Suits & Blazers", emoji: "🤵", color: "#3B82F6", domainId: "domain_clothing_mens" },
  { name: "Shorts", emoji: "🩳", color: "#3B82F6", domainId: "domain_clothing_mens" },
  // Women's Fashion
  { name: "Dresses", emoji: "👗", color: "#EC4899", domainId: "domain_clothing_womens" },
  { name: "Tops & Blouses", emoji: "👚", color: "#EC4899", domainId: "domain_clothing_womens" },
  { name: "Skirts", emoji: "👗", color: "#EC4899", domainId: "domain_clothing_womens" },
  { name: "Trousers & Leggings", emoji: "👖", color: "#EC4899", domainId: "domain_clothing_womens" },
  { name: "Jumpsuits & Playsuits", emoji: "👗", color: "#EC4899", domainId: "domain_clothing_womens" },
  // Kids
  { name: "Boys Clothing", emoji: "👦", color: "#10B981", domainId: "domain_clothing_kids" },
  { name: "Girls Clothing", emoji: "👧", color: "#10B981", domainId: "domain_clothing_kids" },
  { name: "Baby & Toddler", emoji: "👶", color: "#10B981", domainId: "domain_clothing_kids" },
  // Footwear
  { name: "Sneakers & Trainers", emoji: "👟", color: "#F59E0B", domainId: "domain_clothing_footwear" },
  { name: "Formal Shoes", emoji: "👞", color: "#F59E0B", domainId: "domain_clothing_footwear" },
  { name: "Sandals & Flip Flops", emoji: "🩴", color: "#F59E0B", domainId: "domain_clothing_footwear" },
  { name: "Boots", emoji: "👢", color: "#F59E0B", domainId: "domain_clothing_footwear" },
  { name: "Heels & Wedges", emoji: "👠", color: "#F59E0B", domainId: "domain_clothing_footwear" },
  // Accessories
  { name: "Belts", emoji: "👛", color: "#8B5CF6", domainId: "domain_clothing_accessories" },
  { name: "Ties & Bow Ties", emoji: "👔", color: "#8B5CF6", domainId: "domain_clothing_accessories" },
  { name: "Scarves & Wraps", emoji: "🧣", color: "#8B5CF6", domainId: "domain_clothing_accessories" },
  { name: "Caps & Hats", emoji: "🎩", color: "#8B5CF6", domainId: "domain_clothing_accessories" },
  // Sportswear
  { name: "Track Suits", emoji: "🏃", color: "#14B8A6", domainId: "domain_clothing_sportswear" },
  { name: "Gym Wear", emoji: "💪", color: "#14B8A6", domainId: "domain_clothing_sportswear" },
  { name: "Sports Shorts", emoji: "🩳", color: "#14B8A6", domainId: "domain_clothing_sportswear" },
  // Underwear
  { name: "Boxers & Briefs", emoji: "🩲", color: "#6B7280", domainId: "domain_clothing_underwear" },
  { name: "Bras & Underwear", emoji: "👙", color: "#6B7280", domainId: "domain_clothing_underwear" },
  { name: "Socks", emoji: "🧦", color: "#6B7280", domainId: "domain_clothing_underwear" },
  // Outerwear
  { name: "Jackets & Coats", emoji: "🧥", color: "#64748B", domainId: "domain_clothing_outerwear" },
  { name: "Hoodies & Sweaters", emoji: "🧶", color: "#64748B", domainId: "domain_clothing_outerwear" },
  // Workwear
  { name: "Overalls & Boiler Suits", emoji: "👷", color: "#D97706", domainId: "domain_clothing_workwear" },
  { name: "Work Shirts & Trousers", emoji: "👔", color: "#D97706", domainId: "domain_clothing_workwear" },
  { name: "Safety Boots", emoji: "👢", color: "#D97706", domainId: "domain_clothing_workwear" },
  // School Uniforms
  { name: "School Shirts", emoji: "👕", color: "#0EA5E9", domainId: "domain_clothing_schoolwear" },
  { name: "School Trousers & Skirts", emoji: "👖", color: "#0EA5E9", domainId: "domain_clothing_schoolwear" },
  { name: "School Bags", emoji: "🎒", color: "#0EA5E9", domainId: "domain_clothing_schoolwear" },
  // Beauty
  { name: "Skincare", emoji: "🧴", color: "#F472B6", domainId: "domain_clothing_beauty" },
  { name: "Hair Care", emoji: "💇", color: "#F472B6", domainId: "domain_clothing_beauty" },
  { name: "Makeup & Cosmetics", emoji: "💄", color: "#F472B6", domainId: "domain_clothing_beauty" },
  // Jewellery
  { name: "Necklaces & Chains", emoji: "📿", color: "#FBBF24", domainId: "domain_clothing_jewellery" },
  { name: "Earrings", emoji: "💎", color: "#FBBF24", domainId: "domain_clothing_jewellery" },
  { name: "Bracelets & Bangles", emoji: "⌚", color: "#FBBF24", domainId: "domain_clothing_jewellery" },
  { name: "Rings", emoji: "💍", color: "#FBBF24", domainId: "domain_clothing_jewellery" },
  { name: "Watches", emoji: "⌚", color: "#FBBF24", domainId: "domain_clothing_jewellery" },
  // Bags
  { name: "Handbags & Purses", emoji: "👜", color: "#A78BFA", domainId: "domain_clothing_bags" },
  { name: "Backpacks", emoji: "🎒", color: "#A78BFA", domainId: "domain_clothing_bags" },
  { name: "Luggage & Travel Bags", emoji: "🧳", color: "#A78BFA", domainId: "domain_clothing_bags" },
  // Maternity
  { name: "Maternity Wear", emoji: "🤰", color: "#EC4899", domainId: "domain_clothing_maternity" },
  // Swimwear
  { name: "Swimwear", emoji: "🩱", color: "#06B6D4", domainId: "domain_clothing_swimwear" },
  // Nightwear
  { name: "Pyjamas & Nightgowns", emoji: "😴", color: "#8B5CF6", domainId: "domain_clothing_nightwear" },
]

export function getSeedCategories(businessType: string): SeedCategory[] {
  switch (businessType) {
    case 'grocery':
      return GROCERY_CATEGORIES
    case 'hardware':
      return HARDWARE_CATEGORIES
    case 'restaurant':
      return RESTAURANT_CATEGORIES
    case 'clothing':
      return CLOTHING_CATEGORIES
    default:
      return []
  }
}
