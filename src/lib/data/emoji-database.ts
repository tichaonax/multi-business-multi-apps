/**
 * Embedded Emoji Database for Offline Search
 * Categorized emoji data for expense category selection
 */

export interface EmojiData {
  emoji: string;
  name: string;
  keywords: string[];
  category: string;
}

export const EMOJI_DATABASE: EmojiData[] = [
  // Money & Finance
  { emoji: '💰', name: 'Money Bag', keywords: ['money', 'cash', 'dollar', 'finance', 'payment'], category: 'finance' },
  { emoji: '💵', name: 'Dollar Bill', keywords: ['money', 'cash', 'dollar', 'bill', 'payment'], category: 'finance' },
  { emoji: '💳', name: 'Credit Card', keywords: ['card', 'credit', 'payment', 'bank', 'transaction'], category: 'finance' },
  { emoji: '🏦', name: 'Bank', keywords: ['bank', 'finance', 'money', 'building', 'atm'], category: 'finance' },
  { emoji: '💸', name: 'Money with Wings', keywords: ['money', 'spend', 'expense', 'payment', 'loss'], category: 'finance' },
  { emoji: '💲', name: 'Dollar Sign', keywords: ['dollar', 'money', 'currency', 'price'], category: 'finance' },
  { emoji: '💱', name: 'Currency Exchange', keywords: ['exchange', 'currency', 'money', 'forex'], category: 'finance' },
  { emoji: '🪙', name: 'Coin', keywords: ['coin', 'money', 'currency', 'payment'], category: 'finance' },
  { emoji: '💹', name: 'Chart Increasing', keywords: ['chart', 'growth', 'stocks', 'investment'], category: 'finance' },
  { emoji: '📈', name: 'Chart Rising', keywords: ['chart', 'growth', 'increase', 'stocks'], category: 'finance' },
  { emoji: '📊', name: 'Bar Chart', keywords: ['chart', 'graph', 'data', 'statistics'], category: 'finance' },

  // Food & Dining
  { emoji: '🍽️', name: 'Fork and Knife', keywords: ['restaurant', 'dining', 'food', 'meal'], category: 'food' },
  { emoji: '🍕', name: 'Pizza', keywords: ['pizza', 'food', 'fast food', 'meal'], category: 'food' },
  { emoji: '🍔', name: 'Hamburger', keywords: ['burger', 'food', 'fast food', 'meal'], category: 'food' },
  { emoji: '🥘', name: 'Shallow Pan of Food', keywords: ['food', 'meal', 'business meal', 'dining'], category: 'food' },
  { emoji: '🛒', name: 'Shopping Cart', keywords: ['grocery', 'shopping', 'food', 'market'], category: 'food' },
  { emoji: '🥡', name: 'Takeout Box', keywords: ['takeout', 'food', 'delivery', 'meal'], category: 'food' },
  { emoji: '🍱', name: 'Bento Box', keywords: ['food', 'meal', 'prepared', 'lunch'], category: 'food' },
  { emoji: '☕', name: 'Coffee', keywords: ['coffee', 'tea', 'cafe', 'drink'], category: 'food' },

  // Office & Business
  { emoji: '💼', name: 'Briefcase', keywords: ['business', 'work', 'office', 'professional'], category: 'business' },
  { emoji: '📠', name: 'Fax Machine', keywords: ['office', 'supplies', 'equipment', 'business'], category: 'business' },
  { emoji: '🖨️', name: 'Printer', keywords: ['printer', 'office', 'printing', 'equipment'], category: 'business' },
  { emoji: '📞', name: 'Telephone', keywords: ['phone', 'call', 'telephone', 'communication'], category: 'business' },
  { emoji: '📋', name: 'Clipboard', keywords: ['document', 'office', 'paper', 'notes'], category: 'business' },
  { emoji: '📦', name: 'Package', keywords: ['shipping', 'postage', 'package', 'delivery'], category: 'business' },
  { emoji: '🪧', name: 'Placard', keywords: ['advertising', 'sign', 'marketing', 'promotion'], category: 'business' },
  { emoji: '🎯', name: 'Direct Hit', keywords: ['target', 'marketing', 'goal', 'advertising'], category: 'business' },

  // Technology
  { emoji: '💻', name: 'Laptop', keywords: ['computer', 'laptop', 'technology', 'work'], category: 'technology' },
  { emoji: '🖥️', name: 'Desktop Computer', keywords: ['computer', 'desktop', 'monitor', 'technology'], category: 'technology' },
  { emoji: '⌨️', name: 'Keyboard', keywords: ['keyboard', 'computer', 'typing', 'office'], category: 'technology' },
  { emoji: '🖱️', name: 'Computer Mouse', keywords: ['mouse', 'computer', 'technology', 'office'], category: 'technology' },
  { emoji: '📱', name: 'Mobile Phone', keywords: ['phone', 'mobile', 'smartphone', 'technology'], category: 'technology' },
  { emoji: '👨‍💻', name: 'Man Technologist', keywords: ['software', 'developer', 'technology', 'coding'], category: 'technology' },
  { emoji: '🛜', name: 'Wireless', keywords: ['internet', 'wifi', 'network', 'connectivity'], category: 'technology' },
  { emoji: '📡', name: 'Satellite Antenna', keywords: ['internet', 'network', 'communication', 'technology'], category: 'technology' },

  // Vehicle & Transportation
  { emoji: '🚗', name: 'Automobile', keywords: ['car', 'vehicle', 'automobile', 'transportation'], category: 'vehicle' },
  { emoji: '⛽', name: 'Fuel Pump', keywords: ['fuel', 'gas', 'gasoline', 'vehicle'], category: 'vehicle' },
  { emoji: '🚙', name: 'Sport Utility Vehicle', keywords: ['suv', 'vehicle', 'car', 'registration'], category: 'vehicle' },
  { emoji: '🚕', name: 'Taxi', keywords: ['taxi', 'cab', 'vehicle', 'insurance'], category: 'vehicle' },
  { emoji: '🚌', name: 'Bus', keywords: ['bus', 'travel', 'transportation', 'public transit'], category: 'vehicle' },
  { emoji: '🚃', name: 'Railway Car', keywords: ['train', 'moving', 'travel', 'transportation'], category: 'vehicle' },
  { emoji: '⚙️', name: 'Gear', keywords: ['maintenance', 'repair', 'mechanical', 'service'], category: 'vehicle' },
  { emoji: '🔧', name: 'Wrench', keywords: ['tool', 'repair', 'maintenance', 'fix'], category: 'vehicle' },
  { emoji: '🛞', name: 'Wheel', keywords: ['tire', 'wheel', 'vehicle', 'replacement'], category: 'vehicle' },

  // Construction & Hardware
  { emoji: '🏗️', name: 'Building Construction', keywords: ['construction', 'building', 'project', 'development'], category: 'construction' },
  { emoji: '🔨', name: 'Hammer', keywords: ['tool', 'hammer', 'construction', 'repair'], category: 'construction' },
  { emoji: '🪛', name: 'Screwdriver', keywords: ['tool', 'screwdriver', 'repair', 'hardware'], category: 'construction' },
  { emoji: '🧰', name: 'Toolbox', keywords: ['tools', 'equipment', 'repair', 'maintenance'], category: 'construction' },
  { emoji: '🗜️', name: 'Clamp', keywords: ['equipment', 'tool', 'construction', 'hardware'], category: 'construction' },
  { emoji: '📏', name: 'Straight Ruler', keywords: ['measuring', 'tool', 'construction', 'precision'], category: 'construction' },
  { emoji: '🦺', name: 'Safety Vest', keywords: ['safety', 'equipment', 'construction', 'work'], category: 'construction' },
  { emoji: '🛠️', name: 'Hammer and Wrench', keywords: ['tools', 'repair', 'maintenance', 'construction'], category: 'construction' },

  // Clothing & Apparel
  { emoji: '👔', name: 'Necktie', keywords: ['clothing', 'formal', 'business', 'tie'], category: 'clothing' },
  { emoji: '👕', name: 'T-Shirt', keywords: ['clothing', 'shirt', 'casual', 'apparel'], category: 'clothing' },
  { emoji: '👗', name: 'Dress', keywords: ['dress', 'clothing', 'formal', 'apparel'], category: 'clothing' },
  { emoji: '👖', name: 'Jeans', keywords: ['pants', 'jeans', 'clothing', 'casual'], category: 'clothing' },
  { emoji: '👞', name: 'Shoe', keywords: ['shoe', 'footwear', 'clothing', 'formal'], category: 'clothing' },
  { emoji: '🥾', name: 'Hiking Boot', keywords: ['boots', 'work boots', 'footwear', 'safety'], category: 'clothing' },
  { emoji: '🧥', name: 'Coat', keywords: ['coat', 'jacket', 'clothing', 'outerwear'], category: 'clothing' },
  { emoji: '👜', name: 'Handbag', keywords: ['bag', 'purse', 'accessory', 'fashion'], category: 'clothing' },

  // Home & Property
  { emoji: '🏠', name: 'House', keywords: ['house', 'home', 'rent', 'mortgage'], category: 'property' },
  { emoji: '⚡', name: 'Lightning', keywords: ['electricity', 'utility', 'power', 'energy'], category: 'property' },
  { emoji: '💧', name: 'Droplet', keywords: ['water', 'utility', 'bill', 'service'], category: 'property' },
  { emoji: '🔥', name: 'Fire', keywords: ['gas', 'heating', 'utility', 'energy'], category: 'property' },
  { emoji: '🔑', name: 'Key', keywords: ['property', 'management', 'access', 'security'], category: 'property' },
  { emoji: '🧹', name: 'Broom', keywords: ['cleaning', 'supplies', 'maintenance', 'janitorial'], category: 'property' },
  { emoji: '🚪', name: 'Door', keywords: ['security', 'home', 'property', 'access'], category: 'property' },

  // Insurance & Legal
  { emoji: '🛡️', name: 'Shield', keywords: ['insurance', 'protection', 'security', 'coverage'], category: 'legal' },
  { emoji: '👮', name: 'Police Officer', keywords: ['security', 'services', 'protection', 'safety'], category: 'legal' },
  { emoji: '🌐', name: 'Globe with Meridians', keywords: ['legal', 'professional', 'global', 'services'], category: 'legal' },
  { emoji: '🐧', name: 'Penguin', keywords: ['licenses', 'permits', 'official', 'legal'], category: 'legal' },
  { emoji: '⚖️', name: 'Balance Scale', keywords: ['legal', 'law', 'justice', 'compliance'], category: 'legal' },

  // Employee & HR
  { emoji: '🤑', name: 'Money Face', keywords: ['salary', 'compensation', 'payment', 'wages'], category: 'hr' },
  { emoji: '🍯', name: 'Honey Pot', keywords: ['benefits', 'employee', 'perks', 'rewards'], category: 'hr' },
  { emoji: '🪪', name: 'ID Card', keywords: ['employee', 'identification', 'badge', 'hr'], category: 'hr' },
  { emoji: '🤺', name: 'Person Fencing', keywords: ['training', 'development', 'education', 'skills'], category: 'hr' },
  { emoji: '🎓', name: 'Graduation Cap', keywords: ['education', 'training', 'learning', 'certification'], category: 'hr' },

  // Miscellaneous
  { emoji: '🙉', name: 'Hear-No-Evil Monkey', keywords: ['other', 'miscellaneous', 'various', 'expenses'], category: 'misc' },
  { emoji: '🦜', name: 'Parrot', keywords: ['transfer', 'communication', 'relay', 'move'], category: 'misc' },
  { emoji: '🎀', name: 'Ribbon', keywords: ['charitable', 'contribution', 'donation', 'gift'], category: 'misc' },
  { emoji: '❓', name: 'Question Mark', keywords: ['unknown', 'uncategorized', 'question', 'unclear'], category: 'misc' },
  { emoji: '📮', name: 'Postbox', keywords: ['mail', 'postage', 'depreciation', 'postal'], category: 'misc' },
  { emoji: '🦉', name: 'Owl', keywords: ['real estate', 'taxes', 'property', 'wise'], category: 'misc' },
  { emoji: '🚀', name: 'Rocket', keywords: ['restocking', 'inventory', 'fast', 'growth'], category: 'misc' },
  { emoji: '🎁', name: 'Wrapped Gift', keywords: ['gift', 'present', 'donation', 'bonus'], category: 'misc' },
  { emoji: '💐', name: 'Bouquet', keywords: ['flowers', 'gift', 'celebration', 'decoration'], category: 'misc' },
  { emoji: '🐕', name: 'Dog', keywords: ['pet', 'care', 'animal', 'veterinary'], category: 'misc' },

  // Healthcare
  { emoji: '🏥', name: 'Hospital', keywords: ['medical', 'healthcare', 'hospital', 'doctor'], category: 'healthcare' },
  { emoji: '💊', name: 'Pill', keywords: ['medication', 'medicine', 'prescription', 'pharmacy'], category: 'healthcare' },
  { emoji: '💇', name: 'Person Getting Haircut', keywords: ['hair', 'beauty', 'salon', 'grooming'], category: 'healthcare' },
  { emoji: '🧴', name: 'Lotion Bottle', keywords: ['personal care', 'hygiene', 'cosmetics', 'beauty'], category: 'healthcare' },
  { emoji: '🦷', name: 'Tooth', keywords: ['dental', 'dentist', 'teeth', 'healthcare'], category: 'healthcare' },
  { emoji: '👓', name: 'Glasses', keywords: ['vision', 'eyewear', 'optical', 'healthcare'], category: 'healthcare' },

  // Entertainment
  { emoji: '🎮', name: 'Video Game', keywords: ['gaming', 'entertainment', 'game', 'fun'], category: 'entertainment' },
  { emoji: '📚', name: 'Books', keywords: ['books', 'reading', 'education', 'literature'], category: 'entertainment' },
  { emoji: '🎬', name: 'Clapper Board', keywords: ['movies', 'entertainment', 'film', 'cinema'], category: 'entertainment' },
  { emoji: '🎵', name: 'Musical Note', keywords: ['music', 'entertainment', 'audio', 'song'], category: 'entertainment' },
  { emoji: '🎪', name: 'Circus Tent', keywords: ['events', 'concert', 'entertainment', 'show'], category: 'entertainment' },
  { emoji: '🏋️', name: 'Person Lifting Weights', keywords: ['gym', 'fitness', 'exercise', 'workout'], category: 'entertainment' },
  { emoji: '🏖️', name: 'Beach with Umbrella', keywords: ['vacation', 'travel', 'holiday', 'leisure'], category: 'entertainment' },
];

/**
 * Search emoji database by query string
 */
export function searchEmojis(query: string, limit: number = 20): EmojiData[] {
  if (!query || query.trim().length === 0) {
    return EMOJI_DATABASE.slice(0, limit);
  }

  const searchTerm = query.toLowerCase().trim();
  const results: Array<{ emoji: EmojiData; score: number }> = [];

  for (const emoji of EMOJI_DATABASE) {
    let score = 0;

    // Exact name match
    if (emoji.name.toLowerCase() === searchTerm) {
      score += 100;
    }
    // Name contains search term
    else if (emoji.name.toLowerCase().includes(searchTerm)) {
      score += 50;
    }

    // Keyword matches
    for (const keyword of emoji.keywords) {
      if (keyword === searchTerm) {
        score += 80;
      } else if (keyword.includes(searchTerm)) {
        score += 30;
      }
    }

    // Category match
    if (emoji.category.toLowerCase().includes(searchTerm)) {
      score += 20;
    }

    if (score > 0) {
      results.push({ emoji, score });
    }
  }

  // Sort by score (highest first) and return
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.emoji);
}

/**
 * Get emojis by category
 */
export function getEmojisByCategory(category: string): EmojiData[] {
  return EMOJI_DATABASE.filter((e) => e.category === category);
}

/**
 * Get all unique categories
 */
export function getEmojiCategories(): string[] {
  const categories = new Set(EMOJI_DATABASE.map((e) => e.category));
  return Array.from(categories).sort();
}
