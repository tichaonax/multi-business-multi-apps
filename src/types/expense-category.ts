/**
 * Type definitions for expense category system
 */

export interface ExpenseDomain {
  id: string;
  name: string;
  emoji: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  expense_categories?: ExpenseCategory[];
}

export interface ExpenseCategory {
  id: string;
  domainId?: string | null;
  name: string;
  emoji: string;
  color: string;
  description?: string | null;
  isDefault: boolean;
  isUserCreated: boolean;
  createdAt: Date | string;
  createdBy?: string | null;
  domain?: ExpenseDomain | null;
  expense_subcategories?: ExpenseSubcategory[];
}

export interface ExpenseSubcategory {
  id: string;
  categoryId: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
  isDefault: boolean;
  isUserCreated: boolean;
  createdAt: Date | string;
  createdBy?: string | null;
  category?: ExpenseCategory | null;
  users?: {
    id: string;
    name: string;
  } | null;
}

export interface ExpenseCategoryHierarchy {
  domains: ExpenseDomain[];
  count: {
    domains: number;
    categories: number;
    subcategories: number;
  };
}

export interface CreateSubcategoryRequest {
  categoryId: string;
  name: string;
  emoji?: string;
  description?: string;
}

export interface CreateSubcategoryResponse {
  message: string;
  subcategory: ExpenseSubcategory;
}

export interface EmojiSearchResult {
  query: string;
  results: Array<{
    emoji: string;
    name: string;
    keywords: string[];
    category: string;
  }>;
  count: number;
  categories: string[];
}

/**
 * Request types for category editing
 */
export interface CategoryEditRequest {
  id?: string;  // Optional for create, required for update
  domainId?: string | null;
  name: string;
  emoji: string;
  color: string;
  description?: string | null;
}

/**
 * Request types for subcategory editing
 */
export interface SubcategoryEditRequest {
  id?: string;  // Optional for create, required for update
  categoryId: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
}

/**
 * Emoji lookup result from enhanced emoji picker
 */
export interface EmojiLookupResult {
  emoji: string;
  name: string;
  description?: string | null;
  usageCount?: number;
  source: 'local' | 'github';
  url?: string;  // For GitHub emoji URLs
}
