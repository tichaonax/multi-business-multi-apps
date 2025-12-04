/**
 * Seed Data Template Types
 * 
 * These types define the structure for seed data templates that can be exported
 * from existing businesses and imported into new installations.
 */

// Main template structure
export interface SeedDataTemplate {
  version: string
  businessType: string
  metadata: SeedDataMetadata
  
  // Department structure (clothing specific, optional)
  departments?: Record<string, DepartmentData>
  
  // Flat product list (universal)
  products: ProductSeedItem[]
  
  // Category definitions
  categories: CategorySeedItem[]
  subcategories: SubcategorySeedItem[]
  
  // Domain definitions (if new ones introduced)
  domains?: DomainSeedItem[]
}

// Metadata about the template
export interface SeedDataMetadata {
  name: string
  description?: string
  exportedAt: string
  exportedBy: string
  exportedFrom?: string // business name
  totalProducts: number
  totalCategories: number
  totalSubcategories: number
  departments?: string[]
}

// Department data (clothing specific)
export interface DepartmentData {
  emoji: string
  name: string
  description: string
  domainId: string
  items: ProductSeedItem[]
}

// Product seed item with all possible metadata
export interface ProductSeedItem {
  // Core fields
  sku: string
  name: string
  description?: string
  
  // Categorization
  categoryName: string
  subcategoryName?: string
  department?: string // clothing specific
  domainId?: string
  
  // Pricing (optional - can be null for zero-price templates)
  basePrice?: number
  costPrice?: number
  originalPrice?: number
  discountPercent?: number
  
  // Basic attributes
  unit?: string
  attributes?: Record<string, any>
  
  // Enhanced metadata (the goal of this system!)
  brandName?: string
  tags?: string[]
  seasonality?: string
  targetAudience?: string
  materials?: string[]
  careInstructions?: string
  sustainability?: string
  dietaryInfo?: string[]
  allergens?: string[]
  
  // Business type specific fields
  // Restaurant
  preparationTime?: number
  spiceLevel?: number
  calories?: number
  recipeYield?: number
  
  // Grocery
  pluCode?: string
  organic?: boolean
  locallySourced?: boolean
  
  // Clothing
  sizes?: string[]
  colors?: string[]
  gender?: string
  
  // Hardware
  manufacturer?: string
  model?: string
  warranty?: string
  specifications?: Record<string, any>
}

// Category seed item
export interface CategorySeedItem {
  name: string
  emoji?: string
  color?: string
  description?: string
  domainId?: string
  displayOrder?: number
  businessType?: string
}

// Subcategory seed item
export interface SubcategorySeedItem {
  name: string
  categoryName: string
  emoji?: string
  displayOrder?: number
}

// Domain seed item
export interface DomainSeedItem {
  id: string
  name: string
  emoji: string
  description: string
  businessType: string
  isActive: boolean
}

// Export options when creating a template
export interface ExportTemplateOptions {
  sourceBusinessId: string
  name: string
  version: string
  description?: string
  exportNotes?: string
  
  // Options for what to include
  includeCategories?: boolean
  includeDomains?: boolean
  includeSubcategories?: boolean
  
  // Data transformation options
  zeroPrices?: boolean // Set all prices to 0
  zeroQuantities?: boolean // Set all quantities to 0 (always true for seed)
  stripBusinessSpecificData?: boolean // Remove business IDs, etc.
  
  // Filters
  onlyActive?: boolean // Only include active products
  onlyWithImages?: boolean // Only include products with images
  updatedAfter?: Date // Only include products updated after this date
  excludeSkuPattern?: string // Regex pattern to exclude SKUs
  categoryFilter?: string[] // Only include specific categories
  departmentFilter?: string[] // Only include specific departments
}

// Import options when applying a template
export interface ImportTemplateOptions {
  targetBusinessId: string
  template?: SeedDataTemplate // Template data to import
  templateId?: string // From database
  templateFile?: File // Uploaded JSON file
  mode?: 'skip' | 'update' | 'new-only' // Import mode
  saveToDatabase?: boolean // Save template to database
  
  // Legacy support
  importMode?: 'skip' | 'update' | 'new-only'
  // - skip: Skip products with existing SKUs
  // - update: Update existing products, create new ones
  // - new-only: Only create products that don't exist
  
  // Options
  setAsDefault?: boolean // Mark this template as system default
  preserveCategories?: boolean // Don't create new categories if they exist
}

// Result of export operation
export interface ExportTemplateResult {
  success: boolean
  templateId?: string
  template?: SeedDataTemplate
  downloadUrl?: string
  stats: {
    products: number
    categories: number
    subcategories: number
    domains: number
    fileSize?: number
  }
  message?: string
  error?: string
}

// Result of import operation
export interface ImportTemplateResult {
  success: boolean
  templateId?: string
  stats: {
    productsCreated: number
    productsUpdated: number
    productsSkipped: number
    categoriesCreated: number
    categoriesSkipped?: number
    subcategoriesCreated: number
    subcategoriesSkipped?: number
    errors: string[] | number // Can be array or count
  }
  errorLog?: Array<{
    sku: string
    product: string
    error: string
  }>
  message?: string
  error?: string
}

// Template list item for UI
export interface TemplateListItem {
  id: string
  name: string
  businessType: string
  version: string
  description?: string
  isSystemDefault: boolean
  isActive: boolean
  productCount: number
  categoryCount: number
  createdAt: Date
  createdBy: string
  createdByName?: string
  sourceBusinessName?: string
}
