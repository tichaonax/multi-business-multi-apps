/**
 * Emoji mappings for categories and common items
 * Based on Excel report styling
 */

// Category name to emoji mapping
// IMPORTANT: Combo items show BOTH emojis together (e.g., Sadza & Chicken = 🍚🍗)
export const CATEGORY_EMOJIS: Record<string, string> = {
  // Restaurant food items - Combo meals with BOTH emojis
  'Sadza & Chicken': '🍚 🍗',
  'Sadza & Chic': '🍚 🍗',  // Shortened version
  'Rice & Chicken': '🍚 🍗',
  'Sadza & Beef': '🍚 🥩',
  'Rice & Beef': '🍚 🥩',
  'Sadza & Fish': '🍚 🐟',
  'Sadza & Fish (L)': '🍚 🐟',  // Large size
  'Rice & Fish': '🍚 🐟',
  'Rice & Fish (L)': '🍚 🐟',
  'Sadza & Gango': '🍚 🍖',
  'Sadza & Guru': '🍚 🥘',
  'Fish & Chips': '🐟 🍟',
  'Chicken & Chips': '🍗 🍟',
  'Russain & Chips': '🌭 🍟',
  'Beverages': '🥤',
  'Bottled Water': '💧',
  'Rice': '🍚',
  'Sadza': '🍚',
  'Salad': '🥗',
  'Plain Chips': '🍟',
  'Vegetables': '🥬',
  'Tomatoes': '🍅',
  'Onions': '🧅',
  'Potatoes': '🥔',
  'Carrots': '🥕',
  'Cabbage': '🥬',
  'Greens': '🥬',

  // Expenses (some may have combos too)
  'Broiler': '🔥',
  'Rent': '🏠',
  'Salaries & Compensation': '💰 👥',
  'Salaries & Com': '💰 👥',  // Shortened
  'Salaries': '💰',
  'Loan Repayment': '💵',
  'Loan': '💰',
  'Transfer Out': '📤',
  'Transfer In': '📥',
  'Cooking Gas': '🔥',
  'Roller Meal': '🌾',
  'Fuel & Vehicle Expenses': '⛽ 🚗',
  'Licenses & Permits': '📋',
  'Electricity': '⚡',
  'Cooking Oil': '🛢️',
  'Security Services': '🔐',
  'Portable Water': '💧',
  'Spices': '🌶️',
  'Flour': '🌾',
  'Salt': '🧂',
  'Bread': '🍞',
  'Milk': '🥛',
  'Dish Washer': '🧽',
  'Mayonnaise': '🥫',
  'Takeout Box': '📦',
  'Spoons': '🥄',
  'Other Expenses': '💸',

  // Grocery items
  'Dairy': '🥛',
  'Meat': '🥩',
  'Produce': '🥬',
  'Bakery': '🍞',
  'Snacks': '🍿',
  'Frozen': '🧊',
  'Canned Goods': '🥫',

  // Clothing
  'Mens Wear': '👔',
  'Womens Wear': '👗',
  'Kids Wear': '👶',
  'Shoes': '👟',
  'Accessories': '👜',

  // Hardware
  'Tools': '🔧',
  'Paint': '🎨',
  'Electrical': '💡',
  'Plumbing': '🚿',
  'Building Materials': '🧱',
  'Garden': '🌱',
}

// Payment method emojis
export const PAYMENT_METHOD_EMOJIS: Record<string, string> = {
  'CASH': '💵',
  'CARD': '💳',
  'MOBILE': '📱',
  'ECOCASH': '📱',
  'ZIPIT': '📱',
  'CREDIT': '💳',
  'DEBIT': '💳',
  'VISA': '💳',
  'MASTERCARD': '💳',
  'TRANSFER': '🔄',
}

/**
 * Get emoji for a category name
 */
export function getCategoryEmoji(categoryName: string): string {
  if (!categoryName) return '📦'

  // Direct match
  if (CATEGORY_EMOJIS[categoryName]) {
    return CATEGORY_EMOJIS[categoryName]
  }

  // Partial match (case insensitive)
  const lowerName = categoryName.toLowerCase()
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return emoji
    }
  }

  // Fallback based on common keywords
  if (lowerName.includes('chicken')) return '🍗'
  if (lowerName.includes('fish')) return '🐟'
  if (lowerName.includes('beef') || lowerName.includes('meat')) return '🥩'
  if (lowerName.includes('rice') || lowerName.includes('sadza')) return '🍚'
  if (lowerName.includes('drink') || lowerName.includes('beverage')) return '🥤'
  if (lowerName.includes('water')) return '💧'
  if (lowerName.includes('chip')) return '🍟'
  if (lowerName.includes('bread')) return '🍞'
  if (lowerName.includes('tea') || lowerName.includes('coffee')) return '☕'
  if (lowerName.includes('vegetable') || lowerName.includes('salad')) return '🥗'
  if (lowerName.includes('loan')) return '💰'
  if (lowerName.includes('rent')) return '🏠'
  if (lowerName.includes('salary') || lowerName.includes('wage')) return '💰'
  if (lowerName.includes('fuel') || lowerName.includes('gas')) return '⛽'
  if (lowerName.includes('electric')) return '⚡'

  // Default
  return '📦'
}

/**
 * Get emoji for a payment method
 */
export function getPaymentMethodEmoji(method: string): string {
  if (!method) return '💰'

  const upperMethod = method.toUpperCase()
  return PAYMENT_METHOD_EMOJIS[upperMethod] || '💰'
}

/**
 * Get color for a category based on performance
 */
export function getCategoryColor(index: number): string {
  const colors = [
    'bg-green-100 dark:bg-green-900/30',
    'bg-blue-100 dark:bg-blue-900/30',
    'bg-purple-100 dark:bg-purple-900/30',
    'bg-yellow-100 dark:bg-yellow-900/30',
    'bg-pink-100 dark:bg-pink-900/30',
    'bg-indigo-100 dark:bg-indigo-900/30',
    'bg-orange-100 dark:bg-orange-900/30',
    'bg-teal-100 dark:bg-teal-900/30',
  ]
  return colors[index % colors.length]
}
