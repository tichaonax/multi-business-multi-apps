# POS Standardization Plan

## Goal
Make all POS systems (Grocery, Hardware, Clothing) work exactly like the Restaurant POS with full functionality.

## Current State Assessment

### ✅ Restaurant POS (1066 lines) - **FULLY WORKING**
**Features:**
- ✅ Product grid with categories
- ✅ Search/filter products
- ✅ Barcode scanner integration
- ✅ Shopping cart with add/remove
- ✅ Payment processing (CASH/CARD)
- ✅ Cash drawer calculation (change)
- ✅ Receipt printing (browser print)
- ✅ Order completion workflow
- ✅ Daily sales tracking widget
- ✅ Payment modal with proper validation
- ✅ Dark mode support
- ✅ Zimbabwe date/currency formatting
- ✅ Links to reports and history

### ⚠️ Grocery POS (963 lines) - **PARTIALLY WORKING**
**Status:** Custom implementation, older codebase
**Has:**
- Product grid
- Cart management
- Some payment logic
**Missing:**
- Modern payment modal
- Daily sales widget
- Proper receipt printing
- Report links

### ⚠️ Hardware POS (255 lines) - **BASIC/INCOMPLETE**
**Status:** Uses UniversalPOS component (minimal)
**Missing:**
- Most restaurant POS features
- Payment processing
- Receipt printing
- Daily sales tracking

### ⚠️ Clothing POS (340 lines) - **BASIC/INCOMPLETE**
**Status:** Uses UniversalPOS component with advanced option
**Missing:**
- Similar to Hardware POS
- Needs full restaurant-like functionality

## Restaurant POS Key Components

### Core Functionality
1. **Product Loading**
   - Fetch from `/api/universal/products?businessType=restaurant`
   - Filter by category
   - Search by name/barcode

2. **Cart Management**
   - Add items with quantity
   - Remove items
   - Calculate subtotal/tax/total

3. **Payment Modal**
   - Select payment method (CASH/CARD)
   - Cash: Enter amount received, calculate change
   - Card: Direct amount
   - Validation before completing

4. **Order Creation**
   - POST to `/api/restaurant/orders`
   - Save order to database
   - Generate receipt number

5. **Receipt Printing**
   - Show receipt modal
   - Browser print functionality
   - Auto-close after print

6. **Daily Sales Widget**
   - Fetch from `/api/restaurant/daily-sales`
   - Show today's totals
   - Collapsible details

7. **Navigation Links**
   - Link to POS
   - Link to end-of-day report
   - Link to report history

## Standardization Approach

### Option 1: Clone Restaurant POS (Recommended)
**Pros:**
- Proven working code
- All features included
- Fastest implementation

**Cons:**
- Some code duplication
- Need to adapt business-specific logic

**Steps:**
1. Copy restaurant POS structure
2. Change API endpoints (restaurant → grocery/hardware/clothing)
3. Adjust business-specific fields
4. Update styling/labels as needed

### Option 2: Create Universal POS Component
**Pros:**
- Single source of truth
- Easier maintenance
- No duplication

**Cons:**
- More complex to build
- Need to handle all business types
- More testing required

**Defer for now** - Can refactor later once all working

## Implementation Plan

### Phase 1: Grocery POS (Update existing)
1. Check current grocery API endpoints
2. Add missing features from restaurant POS:
   - Payment modal
   - Daily sales widget
   - Receipt printing
   - Report links
3. Test order completion flow

### Phase 2: Hardware POS (Replace with full POS)
1. Create new hardware POS based on restaurant template
2. Implement hardware-specific features
3. Connect to hardware APIs
4. Test end-to-end

### Phase 3: Clothing POS (Replace with full POS)
1. Create new clothing POS based on restaurant template
2. Implement clothing-specific features (sizes, colors)
3. Connect to clothing APIs
4. Test end-to-end

### Phase 4: Testing & Polish
1. Test each POS system
2. Verify order creation
3. Test receipt printing
4. Check daily sales
5. Verify reports

## API Endpoints Needed

Each business type needs these endpoints (same pattern as restaurant):

### Orders API
- `POST /api/{businessType}/orders` - Create order
- `GET /api/{businessType}/orders` - List orders

### Daily Sales API
- `GET /api/{businessType}/daily-sales` - Get today's sales

### Products API (Already exists - Universal)
- `GET /api/universal/products?businessType={type}` - Get products

### Reports API (Future)
- `GET /api/{businessType}/reports/history` - Historical reports
- `GET /api/{businessType}/reports/end-of-day` - End of day report

## Business-Specific Considerations

### Grocery
- Weight-based items (produce)
- PLU codes
- SNAP/EBT support
- Loyalty points
- Age restrictions (alcohol/tobacco)

### Hardware
- Model numbers
- Serial numbers
- Warranty info
- Bulk discounts
- Special orders

### Clothing
- Sizes (S/M/L/XL, etc.)
- Colors
- SKU variations
- Returns/exchanges
- Seasonal inventory

## Success Criteria

Each POS must have:
- ✅ Product grid with categories
- ✅ Barcode scanner
- ✅ Shopping cart
- ✅ Payment processing (CASH/CARD)
- ✅ Cash change calculation
- ✅ Receipt printing
- ✅ Order completion
- ✅ Daily sales widget
- ✅ Report links
- ✅ Dark mode support
- ✅ Zimbabwe formatting

## Timeline Estimate

- **Grocery POS:** 2-3 hours (update existing)
- **Hardware POS:** 3-4 hours (rebuild from template)
- **Clothing POS:** 3-4 hours (rebuild from template)
- **Testing:** 1-2 hours

**Total:** 9-13 hours

## Next Steps

1. Start with Grocery POS (has most existing code)
2. Move to Hardware POS
3. Finish with Clothing POS
4. Test all systems together
5. Document differences and special features

---

Ready to begin with Grocery POS? ✅
