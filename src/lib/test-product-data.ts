/**
 * Word banks and random product generators for the Admin Test Barcode Generator.
 * All generated names are prefixed with [TEST] for easy identification and bulk deletion.
 * Products are generated domain-aware: a random domain is picked first, then a
 * domain-appropriate name and category are selected.
 */

import { randomBytes } from 'crypto'

export type SupportedBusinessType = 'restaurant' | 'grocery' | 'hardware' | 'clothing'

export interface ProductRefs {
  categoryIds: string[]
  supplierIds: string[]
  baleCategoryIds: string[]
  categoriesByDomain: { domainId: string; categoryIds: string[] }[]
}

export interface GeneratedProduct {
  name: string
  description: string
  sku: string
  barcode: string
  categoryId?: string
  domainId?: string
  supplierId?: string
  sellingPrice: number
  costPrice: number
  quantity: number
  size?: string
  color?: string
}

export interface GeneratedCustomBulk {
  name: string
  barcode: string
  batchNumber: string
  categoryId?: string
  domainId?: string
  itemCount: number
  unitPrice: number
  costPrice: number
  notes: string
}

export interface GeneratedBale {
  name: string
  barcode: string
  batchNumber: string
  categoryId: string | undefined
  itemCount: number
  unitPrice: number
  costPrice: number
  notes: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined
  return arr[Math.floor(Math.random() * arr.length)]
}

function randBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randHex(bytes: number): string {
  return randomBytes(bytes).toString('hex').toUpperCase()
}

function randCode(prefix: string): string {
  return `${prefix}-${randHex(5)}`
}

// ── Domain-keyed name banks ───────────────────────────────────────────────────
// Keys match inventory_domains.id exactly.

const DOMAIN_NAMES: Record<SupportedBusinessType, Record<string, string[]>> = {
  grocery: {
    domain_grocery_bakery:      ['Bread Loaf', 'Brown Rolls 6pk', 'Croissants 4pk', 'Muffins 6pk', 'Pies 2pk', 'Baguette', 'Hot Cross Buns', 'Seed Loaf'],
    domain_grocery_beverages:   ['Coca Cola 2L', 'Orange Juice 1L', 'Mineral Water 500ml', 'Energy Drink 250ml', 'Apple Juice 2L', 'Grape Juice 1L', 'Iced Tea 1L', 'Cordial 750ml'],
    domain_grocery_breakfast:   ['Cornflakes 500g', 'Oats 1kg', 'Muesli 500g', 'Granola 750g', 'Bran Flakes 500g', 'Honey Loops 400g'],
    domain_grocery_canned:      ['Baked Beans 400g', 'Canned Tomatoes 400g', 'Sardines in Oil', 'Cream of Mushroom Soup', 'Canned Sweetcorn', 'Peas & Carrots 400g', 'Lentil Soup', 'Canned Tuna 170g'],
    domain_grocery_cleaning:    ['Dishwashing Liquid 750ml', 'Bleach 1L', 'Laundry Powder 1kg', 'Fabric Softener 1L', 'Toilet Cleaner 500ml', 'Multi-Purpose Spray', 'Mop Head', 'Scouring Pad 5pk'],
    domain_grocery_oils:        ['Sunflower Oil 2L', 'Canola Oil 750ml', 'Olive Oil 500ml', 'White Vinegar 750ml', 'Apple Cider Vinegar', 'Mayonnaise 440g', 'Tomato Sauce 500ml', 'Chilli Sauce 350g'],
    domain_grocery_dairy:       ['Full Cream Milk 2L', 'Yoghurt 500g', 'Cheddar Cheese 400g', 'Butter 250g', 'Eggs 30pk', 'Cream 250ml', 'Mozzarella 200g', 'Sour Cream 250ml'],
    domain_grocery_produce:     ['Tomatoes 500g', 'Onions 1kg', 'Potatoes 2kg', 'Cabbage 1kg', 'Carrots 500g', 'Green Pepper 500g', 'Spinach 250g', 'Garlic Bulb 250g'],
    domain_grocery_frozen:      ['Frozen Peas 500g', 'Ice Cream 2L', 'Frozen Chips 1kg', 'Frozen Mixed Veg', 'Chicken Nuggets 500g', 'Fish Fingers 400g', 'Frozen Corn 500g'],
    domain_grocery_grains:      ['Basmati Rice 2kg', 'Maize Meal 5kg', 'Spaghetti 500g', 'Cake Flour 2kg', 'Brown Rice 1kg', 'Penne Pasta 500g', 'Bread Flour 2.5kg', 'Whole Wheat Flour 1kg'],
    domain_grocery_health:      ['Vitamin C 60s', 'Multivitamin 30s', 'Omega-3 30s', 'Protein Bar 50g', 'Collagen Powder 200g', 'Probiotics 30s'],
    domain_grocery_meat:        ['Beef Mince 500g', 'Chicken Breast 1kg', 'Pork Chops 500g', 'Beef Steak 400g', 'Sausages 500g', 'Chicken Drumsticks 1kg', 'Lamb Chops 500g', 'Bacon 250g'],
    domain_grocery_personalcare:['Bath Soap 3pk', 'Shampoo 400ml', 'Toothpaste 100ml', 'Deodorant Spray', 'Body Lotion 400ml', 'Hand Sanitizer 500ml', 'Face Wash 150ml'],
    domain_grocery_petfood:     ['Dog Food 1kg', 'Cat Food 500g', 'Dog Treats 200g', 'Cat Treats 100g', 'Bird Seed 1kg'],
    domain_grocery_snacks:      ['Potato Chips 120g', 'Dark Chocolate 100g', 'Mixed Nuts 200g', 'Biscuits 200g', 'Popcorn 100g', 'Jelly Sweets 200g', 'Milk Chocolate 100g', 'Crackers 200g'],
    domain_grocery_spices:      ['Salt 1kg', 'Black Pepper 100g', 'Curry Powder 100g', 'Paprika 50g', 'Mixed Herbs 20g', 'Cumin 50g', 'Cinnamon 50g', 'Garlic Powder 50g'],
    domain_grocery_alcohol:     ['Castle Lager 6pk', 'House Red Wine 750ml', 'Savanna Cider 6pk', 'Whisky 750ml', 'Brandy 750ml', 'White Wine 750ml', 'Gin 750ml'],
    domain_grocery_baby:        ['Baby Formula Stage 1 400g', 'Baby Puree Mango 110g', 'Baby Rice Cereal 200g', 'Baby Snack Puffs 35g'],
    domain_grocery_toiletries:  ['Toilet Paper 9pk', 'Facial Tissues 200s', 'Sanitary Pads 10s', 'Wet Wipes 80s', 'Cotton Buds 100s'],
    domain_grocery_tobacco:     ['Cigarettes 20s', 'Cigarettes 10s', 'Rolling Tobacco 50g'],
    domain_grocery_stationery:  ['Exercise Book A4', 'Ballpoint Pens 5pk', 'Pencil HB 10pk', 'Ruler 30cm', 'Scotch Tape'],
  },

  hardware: {
    domain_hardware_hand_tools:  ['Claw Hammer 500g', 'Screwdriver Set 6pc', 'Combination Pliers', 'Adjustable Spanner', 'Cold Chisel 25mm', 'Hacksaw Frame', 'Tape Measure 5m', 'Spirit Level 60cm'],
    domain_hardware_power_tools: ['Drill 13mm 550W', 'Angle Grinder 115mm', 'Circular Saw 185mm', 'Orbital Sander', 'Jigsaw 500W', 'Rotary Hammer', 'Bench Grinder', 'Impact Driver'],
    domain_hardware_plumbing:    ['PVC Pipe 20mm 2m', 'Gate Valve 15mm', 'Ball Valve 20mm', 'Tap 3/4"', 'Geyser Element 3kW', 'Pipe Cutter', 'PVC Elbow 20mm', 'Compression Fitting 15mm'],
    domain_hardware_electrical:  ['Cable 2.5mm 10m', 'Single Switch', 'Double Socket', 'LED Bulb 9W', 'Circuit Breaker 20A', 'Electrical Tape', 'Extension Lead 5m', 'Earth Leakage 25A'],
    domain_hardware_paint:       ['Wall Paint 5L White', 'Primer Sealer 5L', 'Exterior Paint 5L', 'Varnish 1L', 'Paint Roller Set', 'Paint Brush 50mm', 'Masking Tape 25mm', 'Turpentine 1L'],
    domain_hardware_building:    ['Clay Brick Each', 'Hollow Block 190mm', 'Steel Y10 Bar 6m', 'Flat Bar 25x3 6m', 'Angle Iron 25x25 6m', 'Builder Lime 50kg'],
    domain_hardware_timber:      ['Pine Plank 25x100 2.4m', 'Hardboard 2440x1220', 'Plywood 12mm 2440x1220', 'Treated Pole 3m', 'Balau Decking 68x22', 'Dowel Rod 12mm 1.8m'],
    domain_hardware_fasteners:   ['Screws 4x40 200pk', 'Common Nails 100mm 1kg', 'Coach Bolts M8x80', 'Anchor Bolts 10x60 10pk', 'Nut & Bolt M10 10pk', 'Cable Ties 100pk', 'Rawl Bolts 8mm 10pk'],
    domain_hardware_safety:      ['Safety Gloves Latex', 'Hard Hat White', 'Safety Goggles', 'Reflective Vest', 'Dust Mask 10pk', 'Ear Plugs 5pk', 'Safety Boot Size 9', 'Knee Pads'],
    domain_hardware_garden:      ['Vegetable Seedlings 6pk', 'Lawn Fertilizer 1kg', 'Garden Hose 20m', 'Hand Trowel', 'Pruning Shears', 'Weedkiller 500ml', 'Potting Soil 10L', 'Watering Can 9L'],
    domain_hardware_roofing:     ['IBR Sheet 3m', 'Ridge Cap 3m', 'PVC Gutter 3m', 'Downpipe 3m', 'Gutter Bracket', 'Roofing Screw 70mm 100pk', 'Valley Iron 3m'],
    domain_hardware_concrete:    ['Cement Bag 50kg', 'River Sand 50kg', 'Stone Aggregate 40kg', 'Readymix 40kg', 'Portland Cement 25kg'],
    domain_hardware_flooring:    ['Ceramic Floor Tile 300x300', 'Floor Grout Grey 5kg', 'Tile Adhesive 20kg', 'Laminate Floor Pack 2.5m²', 'Tile Spacer 4mm 200pk'],
    domain_hardware_doors:       ['Flush Door 813x2032', 'Window Frame Aluminium', 'Door Handle Set', 'Door Hinge 100mm 2pk', 'Sliding Door Track 2.4m'],
    domain_hardware_storage:     ['Metal Shelf 900x300', 'Plastic Toolbox 16"', 'Stackable Bin 35L', 'Wall-Mount Tool Rack', 'Cable Drum Holder'],
    domain_hardware_cleaning:    ['Industrial Broom', 'Mop & Bucket Set', 'Squeegee 60cm', 'Pressure Washer 1400W', 'Scrub Brush'],
    domain_hardware_insulation:  ['Damp Proof Course 110mm 20m', 'Waterproofing Paint 5L', 'Cavity Wall Tie 250mm 50pk', 'Slab Insulation 50mm'],
    domain_hardware_locks:       ['Padlock 50mm', 'Deadbolt Lock', 'Hasp & Staple', 'Chain 6mm 1m', 'Combination Padlock'],
    domain_hardware_adhesives:   ['Silicone Sealant Clear', 'Super Glue 3g', 'Epoxy Adhesive 5min', 'Contact Cement 500ml', 'Putty 500g'],
    domain_hardware_ladders:     ['Step Ladder 4-Step', 'Extension Ladder 4.8m', 'Scaffold Tower 1.8m'],
    domain_hardware_welding:     ['Welding Rod 2.5mm 5kg', 'Welding Helmet Auto', 'Welding Gloves', 'Chipping Hammer', 'Wire Brush'],
    domain_hardware_generators:  ['Petrol Generator 2.2kVA', 'Inverter Generator 1kVA', 'Generator Cover', 'Generator Oil 1L'],
    domain_hardware_pumps:       ['Water Pump 0.5HP', 'Submersible Pump 0.37kW', 'Centrifugal Pump 1HP', 'Pump Pressure Tank 24L'],
    domain_hardware_irrigation:  ['Drip Kit 25-Plant', 'Sprinkler Head', 'Irrigation Timer', 'Poly Pipe 13mm 25m', 'Drip Emitter 4L/h 10pk'],
  },

  restaurant: {
    domain_restaurant_mains:       ['Beef Stew', 'Grilled Chicken', 'Pork Chops', 'Bream Fish Fillet', 'Lamb Shank', 'Roast Beef', 'Chicken Casserole', 'Oxtail'],
    domain_restaurant_appetizers:  ['Garden Salad', 'Garlic Bread', 'Spring Rolls 3pk', 'Bruschetta', 'Stuffed Mushrooms', 'Calamari Starter'],
    domain_restaurant_desserts:    ['Chocolate Lava Cake', 'Vanilla Ice Cream', 'Malva Pudding', 'Cheesecake Slice', 'Crème Brûlée', 'Tiramisu'],
    domain_restaurant_beverages:   ['Still Water 500ml', 'Sparkling Water 500ml', 'Orange Juice 300ml', 'Coke 500ml', 'Sprite 500ml', 'Fanta 500ml'],
    domain_restaurant_breakfast:   ['Full English Breakfast', 'Eggs Benedict', 'French Toast', 'Pancake Stack', 'Cheese Omelette', 'Avocado Toast'],
    domain_restaurant_burgers:     ['Beef Burger', 'Chicken Burger', 'Double Patty Burger', 'Veggie Burger', 'BBQ Bacon Burger', 'Mushroom Swiss Burger'],
    domain_restaurant_pizza:       ['Margherita Pizza', 'BBQ Chicken Pizza', 'Pepperoni Pizza', 'Veggie Pizza', 'Four Cheese Pizza', 'Hawaiian Pizza'],
    domain_restaurant_chicken:     ['Fried Chicken Portion', 'Peri Peri Chicken', 'Grilled Chicken Breast', 'Chicken Wings 6pk', 'Chicken Strips', 'Roast Chicken Half'],
    domain_restaurant_grills:      ['T-Bone Steak 400g', 'Beef Ribs Half Rack', 'Mixed Grill Platter', 'Lamb Chops 2pc', 'Pork Ribs Full Rack', 'Sirloin Steak 300g'],
    domain_restaurant_sides:       ['Chips Large', 'Steamed Rice', 'Coleslaw', 'Onion Rings', 'Garlic Bread 2pc', 'Side Salad', 'Sweet Potato Fries', 'Mashed Potato'],
    domain_restaurant_soups:       ['Tomato Soup', 'Oxtail Soup', 'Vegetable Soup', 'Cream of Mushroom', 'Chicken Noodle Soup'],
    domain_restaurant_alcohol:     ['Castle Lager Pint', 'Savanna Cider', 'House Red Wine Glass', 'House White Wine Glass', 'Whisky Shot', 'Gin & Tonic'],
    domain_restaurant_kids:        ['Kids Burger & Chips', 'Mini Pizza', 'Chicken Strips & Chips', 'Kids Pasta', 'Fish Fingers & Chips'],
    domain_restaurant_vegetarian:  ['Vegetable Curry', 'Mushroom Risotto', 'Veggie Stir Fry', 'Lentil Soup', 'Falafel Wrap', 'Veggie Burger'],
    domain_restaurant_seafood:     ['Grilled Bream', 'Prawn Skewer', 'Calamari & Chips', 'Fish & Chips', 'Seafood Basket'],
    domain_restaurant_sandwiches:  ['Club Sandwich', 'BLT Toastie', 'Grilled Cheese', 'Chicken Mayo Wrap', 'Tuna Melt'],
    domain_restaurant_sauces:      ['Peri Peri Sauce', 'BBQ Sauce', 'Garlic Mayo', 'Tzatziki Dip', 'Cheese Sauce'],
    domain_restaurant_rice:        ['Egg Fried Rice', 'Jollof Rice', 'Chicken Fried Rice', 'Noodle Stir Fry', 'Vegetable Fried Rice'],
    domain_restaurant_hot:         ['Espresso', 'Cappuccino', 'Latte', 'Americano', 'Rooibos Tea', 'Hot Chocolate'],
    domain_restaurant_juices:      ['Orange Juice Fresh', 'Mango Smoothie', 'Mixed Berry Smoothie', 'Watermelon Juice', 'Green Smoothie'],
    domain_restaurant_softdrinks:  ['Coke 330ml Can', 'Sprite 330ml Can', 'Fanta Orange 330ml', 'Ginger Beer 330ml', 'Cream Soda 330ml'],
    domain_restaurant_packaging:   ['Takeaway Box Large', 'Takeaway Box Small', 'Brown Paper Bag', 'Cup 12oz with Lid', 'Straw 50pk', 'Serviettes 100pk'],
    domain_restaurant_salads:      ['Greek Salad', 'Caesar Salad', 'Nicoise Salad', 'Coleslaw Bowl', 'Mixed Green Salad'],
    domain_restaurant_produce:     ['Tomatoes 500g', 'Onions 1kg', 'Lettuce Head', 'Bell Peppers 500g', 'Mushrooms 250g', 'Cucumber'],
    domain_restaurant_meat:        ['Beef Mince 1kg', 'Chicken Breast 1kg', 'Pork Belly 500g', 'Lamb Mince 500g', 'Chicken Thighs 1kg'],
    domain_restaurant_drygoods:    ['Cake Flour 2kg', 'White Sugar 1kg', 'Cooking Oil 2L', 'Spaghetti 500g', 'Rice 2kg', 'Breadcrumbs 500g'],
    domain_restaurant_dairy:       ['Fresh Milk 2L', 'Eggs 30pk', 'Cream 250ml', 'Cheddar Cheese 400g', 'Butter 500g'],
    domain_restaurant_spices:      ['Mixed Spice 100g', 'Paprika 50g', 'Cumin 50g', 'Garlic Powder 100g', 'Chilli Flakes 50g', 'Italian Herbs 20g'],
    domain_restaurant_breakfast:   ['Full English Breakfast', 'Eggs Benedict', 'French Toast', 'Pancake Stack', 'Cheese Omelette'],
  },

  clothing: {
    domain_clothing_mens:         ["Men's T-Shirt", "Chino Pants", "Formal Dress Shirt", "Slim Jeans", "Blazer", "Polo Shirt", "Cargo Shorts", "Linen Shirt"],
    domain_clothing_womens:       ["Ladies Maxi Dress", "Floral Blouse", "High-Waist Leggings", "Wrap Skirt", "Jumpsuit", "Sleeveless Top", "Midi Dress", "Wide Leg Trousers"],
    domain_clothing_kids:         ["Boys Shorts", "Girls Dress", "Kids T-Shirt", "School Shirt", "Kids Track Pants", "Girls Leggings", "Boys Jeans", "Kids Pyjamas"],
    domain_clothing_footwear:     ["Sneakers", "Sandals", "Formal Oxford Shoes", "Ankle Boots", "Block Heels", "Slip-On Shoes", "Wedge Sandals", "Running Shoes"],
    domain_clothing_accessories:  ["Leather Belt", "Silk Scarf", "Snapback Cap", "Polarised Sunglasses", "Neck Tie", "Beanie Hat", "Gloves", "Fabric Headband"],
    domain_clothing_sportswear:   ["Track Pants", "Sports Bra", "Running Shorts", "Gym Leggings", "Performance T-Shirt", "Track Jacket", "Compression Top", "Athletic Shorts"],
    domain_clothing_underwear:    ["Boxers 3pk", "Briefs 5pk", "T-Shirt Bra", "Socks 6pk", "Seamless Underwear", "Sports Socks 3pk", "Thermal Undershirt"],
    domain_clothing_outerwear:    ["Denim Jacket", "Puffer Coat", "Zip-Up Hoodie", "Trench Coat", "Fleece Jacket", "Rain Jacket", "Padded Gilet"],
    domain_clothing_workwear:     ["Overalls", "Safety Boots", "Work Shirt Long Sleeve", "Reflective Vest", "Boiler Suit", "Chef Jacket", "Work Trousers"],
    domain_clothing_schoolwear:   ["School Shirt White", "School Grey Trousers", "School Skirt Navy", "School Bag", "School Socks 3pk", "School Tie"],
    domain_clothing_beauty:       ["Face Cream 50ml", "Hair Relaxer Kit", "Lipstick", "Foundation", "Mascara", "Moisturiser 150ml", "Serum 30ml"],
    domain_clothing_jewellery:    ["Gold-Tone Chain", "Silver Bracelet", "Stud Earrings", "Fashion Ring", "Analog Watch", "Pearl Necklace", "Bangle Set 3pk"],
    domain_clothing_bags:         ["Tote Handbag", "Backpack 20L", "Clutch Purse", "Gym Duffel Bag", "Crossbody Bag", "Mini Backpack"],
    domain_clothing_maternity:    ["Maternity Dress", "Maternity Jeans", "Nursing Top", "Maternity Leggings"],
    domain_clothing_swimwear:     ["One-Piece Swimsuit", "Bikini Set", "Board Shorts", "Swim Shorts", "Rash Guard"],
    domain_clothing_nightwear:    ["Pyjama Set", "Nightgown", "Boxer Shorts Nightwear", "Sleep Shirt", "Robe"],
    domain_clothing_plussize:     ["Plus Size Dress", "Plus Size Jeans", "Plus Size Top", "Plus Size Leggings", "Plus Size Blazer"],
    domain_clothing_vintage:      ["Vintage Denim Jacket", "Retro Floral Dress", "Vintage Band Tee", "Retro Windbreaker"],
    domain_clothing_seasonal:     ["Christmas Sweater", "Halloween Costume", "Formal Evening Gown", "Cocktail Dress", "Festive Skirt"],
    domain_clothing_hats:         ["Bucket Hat", "Flat Cap", "Beanie", "Baseball Cap", "Fedora", "Sun Hat Wide Brim"],
    domain_clothing_scarves:      ["Wool Scarf", "Silk Neck Scarf", "Pashmina", "Bandana", "Winter Wrap Scarf"],
    domain_clothing_belts:        ["Leather Belt Black", "Canvas Belt", "Elastic Belt", "Studded Belt"],
    domain_clothing_eyewear:      ["Aviator Sunglasses", "Wayfarer Sunglasses", "Reading Glasses", "Blue-Light Glasses"],
    domain_clothing_home_textiles:["Bed Sheet Set Queen", "Pillow Case 2pk", "Bath Towel", "Hand Towel 2pk", "Duvet Cover King"],
    domain_clothing_personalcare: ["Deodorant Roll-On", "Body Lotion 400ml", "Perfume 50ml", "Shower Gel 300ml"],
    domain_clothing_cosmetics:    ["Eye Shadow Palette", "Blush Compact", "Contour Kit", "Highlighter Powder", "Setting Spray"],
    domain_clothing_boys:         ["Boys Jeans", "Boys Polo Shirt", "Boys Shorts", "Boys Hoodie", "Boys School Shoes"],
    domain_clothing_girls:        ["Girls Dress", "Girls Leggings", "Girls Hair Accessories", "Girls Skirt", "Girls Blouse"],
    domain_clothing_baby:         ["Baby Onesie 0-3m", "Baby Socks 3pk", "Baby Beanie", "Baby Booties", "Baby Romper"],
    domain_clothing_general_merch:["Branded Cap", "Logo T-Shirt", "Souvenir Mug", "Tote Bag Printed", "Branded Pen"],
    domain_clothing_toys:         ["Building Blocks Set", "Soft Plush Toy", "Puzzle 100pc", "Colouring Book Set", "Toy Car"],
  },
}

// Fallback flat names (used when no domain match)
const NAMES: Record<SupportedBusinessType, string[]> = {
  restaurant: [
    'Grilled Chicken', 'Beef Stir-Fry', 'Vegetable Curry', 'Tilapia Fillet',
    'Sadza & Relish', 'Chips & Chicken', 'Mazondo', 'Roasted Pork',
    'Mango Juice', 'Mixed Grill Platter', 'Beef Stew', 'Peri Peri Wings',
    'Creamy Pasta', 'Cheese Burger', 'Vegetable Soup', 'Fried Rice',
  ],
  grocery: [
    'Brown Sugar 1kg', 'Cooking Oil 2L', 'Maize Meal 5kg', 'Tomatoes 500g',
    'Fresh Bread Loaf', 'Butter 250g', 'Long Life Milk 1L', 'Washing Powder 1kg',
    'Canned Beans 400g', 'Basmati Rice 2kg', 'Sunflower Oil 750ml', 'Dishwashing Liquid',
  ],
  hardware: [
    '3mm Drill Bit', 'Paint Brush Set', 'PVC Pipe 2m', 'Claw Hammer',
    'Wire Mesh 1m²', 'Cement Bag 50kg', 'Wood Screws 100pc', 'Spirit Level 60cm',
    'Angle Grinder Disc', 'Extension Cable 5m', 'Sandpaper 120 Grit', 'Pliers Set',
  ],
  clothing: [
    'Slim Fit Jeans', 'Cotton T-Shirt', 'Ladies Blouse', 'Denim Shorts',
    'Polo Neck Sweater', 'Track Pants', 'Formal Trousers', 'Summer Dress',
    'Zip-Up Hoodie', 'Cargo Shorts', 'Floral Skirt', 'Striped Polo Shirt',
  ],
}

const BALE_NAMES = [
  'Mixed Tops', 'Denim', 'Kids Clothing', 'Ladies Fashion',
  'Menswear', 'School Uniform', 'Winter', 'Summer',
  'Sportswear', 'Formal Wear', 'Casual Mix', 'Plus Size',
  'Shoes Mixed', 'Accessories Bale', 'Baby Clothing', 'Underwear Mix',
]

// Names for custom bulk products (box/bag of items sold individually)
const BULK_NAMES: Record<SupportedBusinessType, string[]> = {
  grocery: [
    'Sweets Box 200pc', 'Lollipops Bag 100pc', 'Chewing Gum 50pc',
    'Sugar Sachets Box 200pc', 'Plastic Bags 100pc', 'Matches 10pk Box',
    'Biscuits Assorted 50pc', 'Snack Chips 24pc', 'Lighters Box 50pc',
    'Mints Tin 100pc', 'Chocolate Bars 24pc', 'Instant Noodles 30pc',
  ],
  hardware: [
    'Nails Box 200pc', 'Screws Assorted 100pc', 'Cable Ties Bag 100pc',
    'Rawl Bolts Bag 50pc', 'Nuts & Bolts 50pc', 'Wire Connectors 50pc',
    'Sandpaper Sheets 20pc', 'Paint Brushes Box 12pc', 'Drill Bits Set 10pc',
    'Wall Plugs 100pc', 'Washers 100pc', 'Fuses Assorted 50pc',
  ],
  restaurant: [
    'Sugar Sachets Box 200pc', 'Salt Sachets Box 200pc', 'Straws Box 500pc',
    'Serviettes Pack 100pc', 'Toothpicks Box 500pc', 'Sauce Sachets 100pc',
    'Butter Portions 100pc', 'Creamer Sachets 100pc', 'Teabags Box 100pc',
    'Coffee Sachets 50pc', 'Tissue Packs 50pc', 'Gloves Box 100pc',
  ],
  clothing: [
    'Socks Bulk 24pk', 'Underwear Box 12pk', 'T-Shirts Bulk 12pc',
    'Caps Box 10pc', 'Belts Box 10pc', 'Hair Ties 50pc',
    'Earrings Assorted 20pk', 'Bangles Set 12pc', 'Headbands 24pc',
    'Handkerchiefs 12pc', 'Shoelaces 24pc', 'Scarves 10pc',
  ],
}

const DESCRIPTIONS: Record<SupportedBusinessType, string[]> = {
  restaurant: [
    'Freshly prepared daily', "Chef's special recipe", 'Served with rice and vegetables',
    'Grilled to perfection', 'House seasoning blend', 'Slow cooked for tenderness',
  ],
  grocery: [
    'Premium quality product', 'Farm fresh selection', 'Locally sourced',
    'Best value family pack', 'No artificial preservatives', 'Everyday essential',
  ],
  hardware: [
    'Professional grade tool', 'Heavy duty construction', 'Suitable for indoor use',
    'All-purpose application', 'Standard quality finish', 'Corrosion resistant',
  ],
  clothing: [
    'Comfortable everyday fit', 'Premium cotton blend', 'Stylish modern design',
    'Easy care machine washable', 'Breathable fabric', 'Durable stitching',
  ],
}

const SIZES: Record<SupportedBusinessType, string[]> = {
  clothing:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  restaurant: ['Small', 'Medium', 'Large', 'Full Portion', 'Half Portion'],
  hardware:   ['60cm', '1m', '2m', '5m', '10mm', '25mm', '50kg', '25kg'],
  grocery:    [],
}
const COLORS: Record<SupportedBusinessType, string[]> = {
  clothing:   ['Black', 'White', 'Navy', 'Grey', 'Red', 'Green', 'Blue', 'Brown', 'Beige', 'Yellow', 'Maroon', 'Khaki'],
  restaurant: [],
  hardware:   ['Silver', 'Black', 'Galvanised', 'Raw', 'Painted'],
  grocery:    [],
}

const PRICE_RANGES: Record<SupportedBusinessType, { min: number; max: number }> = {
  restaurant: { min: 3, max: 25 },
  grocery:    { min: 0.5, max: 50 },
  hardware:   { min: 1, max: 500 },
  clothing:   { min: 5, max: 150 },
}

const QTY_RANGES: Record<SupportedBusinessType, { min: number; max: number }> = {
  restaurant: { min: 1, max: 999 },
  grocery:    { min: 1, max: 500 },
  hardware:   { min: 1, max: 200 },
  clothing:   { min: 1, max: 100 },
}

const TYPE_PREFIX: Record<SupportedBusinessType, string> = {
  restaurant: 'RES',
  grocery:    'GRC',
  hardware:   'HRD',
  clothing:   'CLO',
}

// ── Generators ────────────────────────────────────────────────────────────────

export function generateProduct(
  type: SupportedBusinessType,
  refs: Pick<ProductRefs, 'categoryIds' | 'supplierIds' | 'categoriesByDomain'>,
  index: number
): GeneratedProduct {
  const prefix = TYPE_PREFIX[type]
  const priceRange = PRICE_RANGES[type]
  const qtyRange = QTY_RANGES[type]
  const sellingPrice = randBetween(priceRange.min, priceRange.max)
  const costPrice = Math.round(sellingPrice * (0.58 + Math.random() * 0.22) * 100) / 100

  // Pick a domain if available, then select a domain-appropriate name and category
  const domainEntry = refs.categoriesByDomain.length > 0 ? pick(refs.categoriesByDomain) : undefined
  const domainNames = domainEntry ? (DOMAIN_NAMES[type]?.[domainEntry.domainId] ?? NAMES[type]) : NAMES[type]
  const nameList = domainNames.length > 0 ? domainNames : NAMES[type]
  const baseName = nameList[index % nameList.length]

  const categoryId = domainEntry
    ? pick(domainEntry.categoryIds)
    : pick(refs.categoryIds)

  return {
    name:        `[TEST] ${baseName}`,
    description: pick(DESCRIPTIONS[type]) ?? '',
    sku:         `${prefix}-SKU-${randHex(3)}`,
    barcode:     randCode(prefix),
    categoryId,
    domainId:    domainEntry?.domainId,
    supplierId:  pick(refs.supplierIds),
    sellingPrice,
    costPrice,
    quantity:    randInt(qtyRange.min, qtyRange.max),
    size:        SIZES[type].length  ? pick(SIZES[type])  : undefined,
    color:       COLORS[type].length ? pick(COLORS[type]) : undefined,
  }
}

export function generateCustomBulk(
  type: SupportedBusinessType,
  refs: Pick<ProductRefs, 'categoryIds' | 'categoriesByDomain'>,
  index: number,
  seqOffset: number = 0
): GeneratedCustomBulk {
  const names = BULK_NAMES[type]
  const baseName = names[index % names.length]

  // Pick domain-matched category if available
  const domainEntry = refs.categoriesByDomain.length > 0 ? pick(refs.categoriesByDomain) : undefined
  const categoryId = domainEntry ? pick(domainEntry.categoryIds) : pick(refs.categoryIds)

  const itemCount = randInt(20, 200)
  const unitPrice = randBetween(0.5, 15)
  const containerCost = Math.round(unitPrice * itemCount * (0.55 + Math.random() * 0.2) * 100) / 100
  const costPrice = Math.round((containerCost / itemCount) * 100) / 100

  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(seqOffset + index + 1).padStart(3, '0')
  const batchNumber = `CB-${yy}${mm}${dd}-${seq}`
  const barcode = randomBytes(4).toString('hex').toUpperCase()

  return {
    name:        `[TEST] ${baseName}`,
    barcode,
    batchNumber,
    categoryId,
    domainId:    domainEntry?.domainId,
    itemCount,
    unitPrice,
    costPrice,
    notes:       '[TEST] auto-generated custom bulk',
  }
}

export function generateBale(
  refs: Pick<ProductRefs, 'baleCategoryIds'>,
  index: number,
  seqOffset: number = 0
): GeneratedBale {
  const baseName = BALE_NAMES[index % BALE_NAMES.length]
  const unitPrice = randBetween(20, 200)
  const costPrice = Math.round(unitPrice * (0.58 + Math.random() * 0.22) * 100) / 100

  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(seqOffset + index + 1).padStart(3, '0')
  const batchNumber = `B-${yy}${mm}${dd}-${seq}`

  const scanCode = randomBytes(4).toString('hex').toUpperCase()

  return {
    name:       `[TEST] ${baseName} Bale`,
    barcode:    scanCode,
    batchNumber,
    categoryId: pick(refs.baleCategoryIds),
    itemCount:  randInt(10, 100),
    unitPrice,
    costPrice,
    notes:      '[TEST] auto-generated bale',
  }
}
