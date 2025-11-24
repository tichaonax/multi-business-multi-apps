# Reports Enhancement Project Plan
**Project**: Visual Analytics Dashboard with Charts & Graphs
**Date Created**: November 23, 2025
**Status**: Planning Phase

## 📋 Project Overview

Transform the current basic reports into rich, visual analytics dashboards matching the Excel examples provided (trends-01.jpg, trends-02.jpg, trends-03.jpg).

### Current State
- ❌ No actual charts (pie charts, bar charts, line graphs)
- ❌ Reports only accessible at `/restaurant/reports` URL
- ❌ No report links on business home pages
- ❌ Grocery/Clothing/Hardware businesses have no reports access
- ⚠️ Basic emojis and progress bars added (not visible due to no data)

### Target State
- ✅ Interactive pie charts for Income/Expense breakdown
- ✅ Multi-series bar charts for daily trends
- ✅ Report badges on all business home pages
- ✅ Reports accessible for ALL business types
- ✅ Professional dashboard with emojis matching Excel examples

---

## 🎯 Phase 1: Foundation & Setup
**Estimated Time**: 30 minutes

### Task 1.1: Install Charting Library
- [x] Install `recharts` (React charting library)
- [x] Test basic chart rendering
- **Files**: `package.json`

### Task 1.2: Create Report Dashboard Layout Component
- [x] Integrated into dashboard page (no separate layout component)
- [x] Responsive grid layout (2 pie charts top, bar chart bottom)
- [x] Dark mode support
- [x] Print-friendly styles
- **Files**: `/src/app/restaurant/reports/dashboard/page.tsx`

### Task 1.3: Create Chart Components
- [x] Create `/src/components/reports/income-pie-chart.tsx`
- [x] Create `/src/components/reports/expense-pie-chart.tsx`
- [x] Create `/src/components/reports/daily-trends-chart.tsx`
- [x] Match Excel color schemes
- **Files**: 3 new chart components

---

## 🎨 Phase 2: Visual Charts Implementation
**Estimated Time**: 2 hours

### Task 2.1: Top Income Sources Pie Chart
**Reference**: trends-01.jpg (left side)

Features:
- [x] Interactive pie chart with category breakdown
- [x] **COMBO EMOJIS**: Items with "&" show BOTH emojis (e.g., "Sadza & Chicken" = 🍚 🍗)
- [x] Emojis for each income category matching Excel exactly
- [x] Percentage labels on slices
- [x] Legend with emoji icons (both emojis for combo items)
- [x] Hover tooltips showing exact amounts
- [x] Top 8 categories, "Other" for rest

**Emoji Examples**:
- Sadza & Chicken → 🍚 🍗
- Rice & Chicken → 🍚 🍗
- Sadza & Fish → 🍚 🐟
- Fish & Chips → 🐟 🍟
- Beverages → 🥤
- Transfer In → 📥
- Loan → 💰

**Data Source**: `dailySales.categoryBreakdown`
**Colors**: Match Excel pastel palette

### Task 2.2: Top Expense Sources Pie Chart
**Reference**: trends-01.jpg (right side)

Features:
- [x] Interactive pie chart for expenses
- [x] **COMBO EMOJIS**: Expense combos show BOTH emojis (e.g., "Salaries & Compensation" = 💰 👥)
- [x] Emojis for expense types matching Excel exactly
- [x] Percentage labels on slices
- [x] Legend with emoji icons
- [x] Hover tooltips showing exact amounts
- [x] Top 8 expenses, "Other" for rest

**Emoji Examples**:
- Broiler → 🔥
- Rent → 🏠
- Salaries & Compensation → 💰 👥
- Cooking Gas → 🔥
- Transfer Out → 📤
- Fish → 🐟
- Loan Repayment → 💵
- Beverages → 🥤
- Roller Meal → 🌾

**Data Source**: Need to create expense tracking API
**Note**: Currently only income is tracked

### Task 2.3: Daily Income, Expenses & Savings Chart
**Reference**: trends-01.jpg (bottom)

Features:
- [x] Multi-series grouped bar chart
- [x] Three bars per day: Income (green), Expense (red), Savings (blue)
- [x] X-axis: Last 30 days with dates
- [x] Y-axis: Amount with proper scaling
- [x] Grid lines for readability
- [x] Legend with color coding
- [x] Hover tooltips showing exact values

**Data Source**: Historical daily sales data
**Note**: Need to add expense tracking to calculate savings

---

## 🏪 Phase 3: Business Type Integration
**Estimated Time**: 1 hour

### Task 3.1: Create Business Home Page Report Cards
- [ ] Add report summary card to `/restaurant/pos/page.tsx`
- [ ] Add report summary card to `/grocery/pos/page.tsx`
- [ ] Add report summary card to `/clothing/pos/page.tsx`
- [ ] Add report summary card to `/hardware/pos/page.tsx`

**Card Content**:
- 📊 Icon badge
- "View Sales Reports"
- Today's sales summary (total, orders)
- Click → navigates to reports

### Task 3.2: Create Universal Reports Route
- [x] Created `/restaurant/reports/*` routes
- [x] Created `/grocery/reports/*` routes
- [x] Created `/hardware/reports/*` routes
- [x] Created `/clothing/reports/*` routes
- [x] All business types use same report page logic
- [x] Dynamic business type detection via context
- [x] Dashboard accessible at `/{businessType}/reports/dashboard`

---

## 📊 Phase 4: Enhanced Report Pages
**Estimated Time**: 2 hours

### Task 4.1: Dashboard Overview Page
**New Page**: `/restaurant/reports/dashboard`

Features:
- [x] Side-by-side pie charts (Income & Expenses)
- [x] Daily trends bar chart below
- [x] Summary cards at bottom (Total Income, Total Expenses, Net Profit)
- [ ] Date range selector (Last 7/30/90 days) - TODO
- [ ] Export to PDF button - TODO
- [x] Print-optimized layout

### Task 4.2: Enhanced End-of-Day Report
**Update**: `/restaurant/reports/end-of-day/page.tsx`

Add:
- [ ] Income pie chart section
- [ ] Payment methods pie chart
- [ ] Category performance bar chart
- [ ] Employee sales comparison chart
- [ ] Keep existing tables below charts

### Task 4.3: Income Breakdown Detail Page
**New Page**: `/restaurant/reports/income-breakdown`

Features:
- [ ] Large income pie chart
- [ ] Detailed table with rankings (🥇🥈🥉)
- [ ] Trend sparklines for each category
- [ ] Category drill-down (click to see products)
- [ ] Export functionality

---

## 💾 Phase 5: Data Enhancement
**Estimated Time**: 1.5 hours

### Task 5.1: Create Expense Tracking API
**New API**: `/api/restaurant/expenses/route.ts`

Features:
- [ ] Record daily expenses by category
- [ ] Categories: Rent, Salaries, Supplies, Utilities, etc.
- [ ] Link expenses to business and date
- [ ] Calculate expense totals

### Task 5.2: Create Daily Summary API
**New API**: `/api/restaurant/daily-summary/route.ts`

Returns:
- [ ] Daily income (from orders)
- [ ] Daily expenses (from expense records)
- [ ] Net profit/loss (income - expenses)
- [ ] Savings calculation
- [ ] Last 30 days historical data

### Task 5.3: Update Existing APIs
- [ ] Add expense data to daily sales API
- [ ] Add profit calculations
- [ ] Add trend data (vs previous period)

---

## 🎨 Phase 6: UI/UX Polish
**Estimated Time**: 1 hour

### Task 6.1: Visual Consistency
- [ ] Match Excel color palette exactly
- [ ] Consistent emoji usage across all reports
- [ ] Unified card/section styling
- [ ] Responsive design (mobile-friendly charts)

### Task 6.2: Navigation Improvements
- [ ] Add breadcrumbs to all report pages
- [ ] Quick links between report types
- [ ] "Reports" section in sidebar (already added)
- [ ] Back buttons on all pages

### Task 6.3: Print & Export
- [ ] Print-optimized chart layouts
- [ ] PDF export with charts
- [ ] CSV data export
- [ ] Date range in exports

---

## 📝 Phase 7: Documentation
**Estimated Time**: 30 minutes

### Task 7.1: User Guide
- [ ] How to access reports
- [ ] How to read charts
- [ ] How to export data
- [ ] Understanding metrics

### Task 7.2: Admin Guide
- [ ] How to track expenses
- [ ] Customizing report categories
- [ ] Setting up business-specific reports

---

## 🧪 Phase 8: Testing & Data Seeding
**Estimated Time**: 1 hour

### Task 8.1: Create Test Data
- [x] Seed script for 30 days of sales data
- [x] Script created: `scripts/seed-sales-orders-all-businesses.js`
- [x] Multiple categories with varying amounts
- [x] Realistic data distribution
- [x] 1500+ orders created across all business types

### Task 8.2: Test All Business Types
- [x] Restaurant reports accessible at `/restaurant/reports`
- [x] Grocery reports accessible at `/grocery/reports`
- [x] Clothing reports accessible at `/clothing/reports`
- [x] Hardware reports accessible at `/hardware/reports`
- [ ] Test with zero data (empty states) - TODO

---

## 📊 Success Metrics

- [ ] All 4 business types can access reports
- [ ] Pie charts visible and interactive (matching Excel examples)
- [ ] Bar charts showing 30-day trends
- [ ] **Combo items show BOTH emojis** (e.g., Sadza & Chicken = 🍚 🍗)
- [ ] All category emojis match Excel examples exactly
- [ ] Reports load in < 2 seconds
- [ ] Charts responsive on mobile
- [ ] Print/PDF export working
- [ ] Emojis display correctly everywhere (including in chart legends)
- [ ] Dark mode charts readable

---

## 🗂️ File Structure

```
src/
├── components/
│   └── reports/
│       ├── dashboard-layout.tsx          [NEW]
│       ├── income-pie-chart.tsx          [NEW]
│       ├── expense-pie-chart.tsx         [NEW]
│       ├── daily-trends-chart.tsx        [NEW]
│       ├── summary-cards.tsx             [NEW]
│       ├── percentage-bar.tsx            [EXISTS]
│       └── report-card.tsx               [NEW]
├── app/
│   └── restaurant/
│       └── reports/
│           ├── page.tsx                  [UPDATE]
│           ├── dashboard/
│           │   └── page.tsx              [NEW]
│           ├── end-of-day/
│           │   └── page.tsx              [UPDATE]
│           ├── income-breakdown/
│           │   └── page.tsx              [NEW]
│           └── expenses/
│               └── page.tsx              [NEW]
├── app/api/
│   └── restaurant/
│       ├── daily-sales/route.ts          [UPDATE]
│       ├── expenses/route.ts             [NEW]
│       └── daily-summary/route.ts        [NEW]
└── lib/
    └── category-emojis.ts                [EXISTS]
```

---

## 📅 Timeline

- **Phase 1-2**: Charts Implementation (2.5 hours)
- **Phase 3-4**: Integration & Pages (3 hours)
- **Phase 5**: Data APIs (1.5 hours)
- **Phase 6-7**: Polish & Docs (1.5 hours)
- **Phase 8**: Testing (1 hour)

**Total Estimated Time**: ~9.5 hours
**Recommended Approach**: Incremental delivery in 3 sessions

---

## 🚀 Immediate Next Steps (Session 1)

1. Install recharts library
2. Create Income Pie Chart component
3. Create Expense Pie Chart component
4. Create Daily Trends Bar Chart component
5. Update end-of-day report page to show charts
6. Test with existing data

**Deliverable**: Working pie charts and bar chart on end-of-day report page

---

## ✅ Approval Checklist

Before proceeding, please confirm:
- [ ] Pie charts matching Excel examples are required
- [ ] Bar charts for daily trends are required
- [ ] **Combo items MUST show BOTH emojis** (Sadza & Chicken = 🍚 🍗, not just 🍗)
- [ ] All emojis must match Excel examples exactly
- [ ] Expense tracking should be added
- [ ] All 4 business types should have reports
- [ ] Report cards should appear on business home pages
- [ ] You approve the phased approach above

---

**Status**: ✅ Phase 1-2 Complete, Phase 3 Partial, Phase 8 Complete
**Next Action**: Test charts with real seed data, then implement remaining phases
