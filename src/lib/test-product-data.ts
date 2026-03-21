/**
 * Word banks and random product generators for the Admin Test Barcode Generator.
 * All generated names are prefixed with [TEST] for easy identification and bulk deletion.
 */

export type SupportedBusinessType = 'restaurant' | 'grocery' | 'hardware' | 'clothing'

export interface ProductRefs {
  categoryIds: string[]
  supplierIds: string[]
  baleCategoryIds: string[]
}

export interface GeneratedProduct {
  name: string
  description: string
  sku: string
  barcode: string
  categoryId?: string
  supplierId?: string
  sellingPrice: number
  costPrice: number
  quantity: number
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

function randCode(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
}

// ── Word Banks ────────────────────────────────────────────────────────────────

const NAMES: Record<SupportedBusinessType, string[]> = {
  restaurant: [
    'Grilled Chicken', 'Beef Stir-Fry', 'Vegetable Curry', 'Tilapia Fillet',
    'Sadza & Relish', 'Chips & Chicken', 'Mazondo', 'Roasted Pork',
    'Mango Juice', 'Mixed Grill Platter', 'Beef Stew', 'Peri Peri Wings',
    'Creamy Pasta', 'Cheese Burger', 'Vegetable Soup', 'Fried Rice',
    'Spaghetti Bolognese', 'Pork Chops', 'Garden Salad', 'Oxtail Stew',
    'Chicken Livers', 'T-Bone Steak', 'Beef Burger', 'Egg Fried Rice',
    'Prawn Stir-Fry', 'Lamb Chops', 'Potato Wedges', 'Coleslaw Side',
  ],
  grocery: [
    'Brown Sugar 1kg', 'Cooking Oil 2L', 'Maize Meal 5kg', 'Tomatoes 500g',
    'Fresh Bread Loaf', 'Butter 250g', 'Long Life Milk 1L', 'Washing Powder 1kg',
    'Canned Beans 400g', 'Basmati Rice 2kg', 'Sunflower Oil 750ml', 'Dishwashing Liquid',
    'Toilet Paper 6pk', 'Instant Coffee 200g', 'Cornflakes 500g', 'Spaghetti 500g',
    'Cheddar Cheese 200g', 'Frozen Peas 500g', 'Tomato Sauce 500ml', 'Salt 1kg',
    'Canola Oil 1L', 'Apple Juice 1L', 'Margarine 500g', 'Pasta Shells 500g',
    'Green Tea 50pk', 'Onions 1kg', 'Garlic 250g', 'Potatoes 2kg',
  ],
  hardware: [
    '3mm Drill Bit', 'Paint Brush Set', 'PVC Pipe 2m', 'Claw Hammer',
    'Wire Mesh 1m²', 'Cement Bag 50kg', 'Wood Screws 100pc', 'Spirit Level 60cm',
    'Angle Grinder Disc', 'Extension Cable 5m', 'Sandpaper 120 Grit', 'Pliers Set',
    'Measuring Tape 5m', 'Builder Sand 50kg', 'Electrical Tape', 'Padlock 40mm',
    'Galvanised Nails 1kg', 'Water Pipe Fitting', 'Safety Goggles', 'Spade Shovel',
    'Paint Roller Set', 'Silicon Sealant', 'Hacksaw Blade', 'Socket Wrench Set',
    'Cable Ties 100pk', 'Corner Bracket', 'Rawl Bolts 20pk', 'Drop Cloth 2mx3m',
  ],
  clothing: [
    'Slim Fit Jeans', 'Cotton T-Shirt', 'Ladies Blouse', 'Denim Shorts',
    'Polo Neck Sweater', 'Track Pants', 'Formal Trousers', 'Summer Dress',
    'Zip-Up Hoodie', 'Cargo Shorts', 'Floral Skirt', 'Striped Polo Shirt',
    'Denim Jacket', 'Leggings', 'Button-Up Shirt', 'Mini Dress',
    'V-Neck T-Shirt', 'Chino Pants', 'Sports Top', 'Evening Blouse',
    'Blazer Jacket', 'Wrap Dress', 'Knit Cardigan', 'Bermuda Shorts',
    'Linen Shirt', 'High Waist Jeans', 'Crop Top', 'Pleated Skirt',
  ],
}

const BALE_NAMES = [
  'Mixed Tops', 'Denim', 'Kids Clothing', 'Ladies Fashion',
  'Menswear', 'School Uniform', 'Winter', 'Summer',
  'Sportswear', 'Formal Wear', 'Casual Mix', 'Plus Size',
  'Shoes Mixed', 'Accessories Bale', 'Baby Clothing', 'Underwear Mix',
]

const DESCRIPTIONS: Record<SupportedBusinessType, string[]> = {
  restaurant: [
    'Freshly prepared daily', "Chef's special recipe", 'Served with rice and vegetables',
    'Grilled to perfection', 'House seasoning blend', 'Slow cooked for tenderness',
    'Comes with a side salad', 'Family favourite dish',
  ],
  grocery: [
    'Premium quality product', 'Farm fresh selection', 'Locally sourced',
    'Best value family pack', 'No artificial preservatives', 'Long shelf life',
    'Bulk saving pack', 'Everyday essential',
  ],
  hardware: [
    'Professional grade tool', 'Heavy duty construction', 'Suitable for indoor use',
    'All-purpose application', 'Standard quality finish', 'Corrosion resistant',
    'Easy to use design', 'Compatible with most brands',
  ],
  clothing: [
    'Comfortable everyday fit', 'Premium cotton blend', 'Stylish modern design',
    'Easy care machine washable', 'Breathable fabric', 'Durable stitching',
    'Versatile wardrobe essential', 'Season-appropriate weight',
  ],
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const COLORS = ['Black', 'White', 'Navy', 'Grey', 'Red', 'Green', 'Blue', 'Brown', 'Beige', 'Yellow', 'Maroon', 'Khaki']

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
  refs: Pick<ProductRefs, 'categoryIds' | 'supplierIds'>,
  index: number
): GeneratedProduct {
  const prefix = TYPE_PREFIX[type]
  const wordList = NAMES[type]
  const baseName = wordList[index % wordList.length]
  const priceRange = PRICE_RANGES[type]
  const qtyRange = QTY_RANGES[type]
  const sellingPrice = randBetween(priceRange.min, priceRange.max)
  const costPrice = Math.round(sellingPrice * (0.58 + Math.random() * 0.22) * 100) / 100
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()

  return {
    name: `[TEST] ${baseName}`,
    description: pick(DESCRIPTIONS[type]) ?? '',
    sku: `${prefix}-SKU-${suffix}`,
    barcode: randCode(prefix),
    categoryId: pick(refs.categoryIds),
    supplierId: pick(refs.supplierIds),
    sellingPrice,
    costPrice,
    quantity: randInt(qtyRange.min, qtyRange.max),
  }
}

export function generateBale(
  refs: Pick<ProductRefs, 'baleCategoryIds'>,
  index: number
): GeneratedBale {
  const baseName = BALE_NAMES[index % BALE_NAMES.length]
  const unitPrice = randBetween(20, 200)
  const costPrice = Math.round(unitPrice * (0.58 + Math.random() * 0.22) * 100) / 100
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()

  return {
    name: `[TEST] ${baseName} Bale`,
    barcode: randCode('BAL'),
    batchNumber: `BAL-BATCH-${suffix}`,
    categoryId: pick(refs.baleCategoryIds),
    itemCount: randInt(10, 100),
    unitPrice,
    costPrice,
    notes: '[TEST] auto-generated bale',
  }
}
