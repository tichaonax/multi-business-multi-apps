# Enhanced Barcode Scanner Implementation Plan

## Changes Needed

### 1. Business Selection Modal Updates
- [x] Add ProductData interface with business-specific fields
- [ ] Add state variables for business-specific fields
- [ ] Add clothing-specific fields: Size, Color
- [ ] Add grocery-specific fields: Expiry Date, Batch Number
- [ ] Add restaurant-specific fields: Allergens, Storage Temperature
- [ ] Conditional rendering based on inventoryType
- [ ] Reset fields when business type changes

### 2. Global Barcode Modal Updates  
- [ ] Make "View" button clickable (navigate to product detail page)
- [ ] Add "Add to Cart" button (navigate to POS with product)
- [ ] Pass business context for POS navigation

### 3. API Updates
- [ ] Update inventory-add API to store attributes
- [ ] Store business-specific data in product attributes JSON field

### 4. Business-Specific Field Definitions

**Clothing:**
- Size: Dropdown (XS, S, M, L, XL, XXL, XXXL, One Size)
- Color: Text input

**Hardware:**
- No specific fields (use generic)

**Grocery:**
- Expiry Date: Date picker
- Batch Number: Text input
- Storage Temp: Dropdown (Room Temperature, Refrigerated, Frozen)

**Restaurant:**
- Allergens: Multi-select (Gluten, Dairy, Eggs, Nuts, Soy, Shellfish, Fish)
- Storage Temp: Dropdown (Room Temperature, Refrigerated, Frozen)

