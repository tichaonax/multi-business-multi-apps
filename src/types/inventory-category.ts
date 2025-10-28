/**
 * Type definitions for inventory category system
 */

export interface InventoryDomain {
  id: string;
  name: string;
  emoji: string;
  description?: string | null;
  businessType: string;
  isActive: boolean;
  isSystemTemplate: boolean;
  createdAt: Date | string;
  business_categories?: InventoryCategory[];
}

export interface InventoryCategory {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder: number;
  isActive: boolean;
  businessType: string;
  attributes?: any;
  emoji: string;
  color: string;
  domainId?: string | null;
  isUserCreated: boolean;
  createdBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  domain?: InventoryDomain | null;
  business_categories?: InventoryCategory | null;
  other_business_categories?: InventoryCategory[];
  inventory_subcategories?: InventorySubcategory[];
  _count?: {
    business_products?: number;
    inventory_subcategories?: number;
  };
}

export interface InventorySubcategory {
  id: string;
  categoryId: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
  isDefault: boolean;
  isUserCreated: boolean;
  displayOrder: number;
  createdAt: Date | string;
  createdBy?: string | null;
  category?: InventoryCategory | null;
  users?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    business_products?: number;
  };
}

export interface InventoryCategoryHierarchy {
  domains: InventoryDomain[];
  categories: InventoryCategory[];
  subcategories: InventorySubcategory[];
  count: {
    domains: number;
    categories: number;
    subcategories: number;
  };
}

/**
 * Request types for domain management
 */
export interface CreateDomainRequest {
  name: string;
  emoji: string;
  description?: string;
  businessType: string;
  isSystemTemplate?: boolean;
}

export interface CreateDomainResponse {
  message: string;
  domain: InventoryDomain;
}

/**
 * Request types for category management
 */
export interface CreateCategoryRequest {
  businessId: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
  domainId?: string;
  parentId?: string;
  displayOrder?: number;
  businessType: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  emoji?: string;
  color?: string;
  description?: string;
  domainId?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateCategoryResponse {
  message: string;
  category: InventoryCategory;
}

/**
 * Request types for subcategory management
 */
export interface CreateSubcategoryRequest {
  categoryId: string;
  name: string;
  emoji?: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateSubcategoryRequest {
  name?: string;
  emoji?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateSubcategoryResponse {
  message: string;
  subcategory: InventorySubcategory;
}

/**
 * Request types for category editing (UI)
 */
export interface CategoryEditRequest {
  id?: string; // Optional for create, required for update
  businessId: string;
  domainId?: string | null;
  name: string;
  emoji: string;
  color: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder?: number;
}

/**
 * Request types for subcategory editing (UI)
 */
export interface SubcategoryEditRequest {
  id?: string; // Optional for create, required for update
  categoryId: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
  displayOrder?: number;
}

/**
 * Query parameters for fetching categories
 */
export interface CategoryQueryParams {
  businessId?: string;
  domainId?: string;
  parentId?: string;
  businessType?: string;
  isActive?: boolean;
  includeSubcategories?: boolean;
  includeProducts?: boolean;
}

/**
 * Domain template selection
 */
export interface DomainTemplate {
  domain: InventoryDomain;
  categories: Array<{
    name: string;
    emoji: string;
    color: string;
    description?: string;
    subcategories?: Array<{
      name: string;
      emoji?: string;
      description?: string;
    }>;
  }>;
}

/**
 * Category with full hierarchy
 */
export interface CategoryWithHierarchy extends InventoryCategory {
  subcategories: InventorySubcategory[];
  productCount: number;
  subcategoryCount: number;
}

/**
 * Response for category list endpoint
 */
export interface CategoryListResponse {
  categories: InventoryCategory[];
  total: number;
  hasMore: boolean;
}

/**
 * Response for domain list endpoint
 */
export interface DomainListResponse {
  domains: InventoryDomain[];
  total: number;
}
