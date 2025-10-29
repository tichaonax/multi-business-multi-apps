import { test, expect } from '@playwright/test';

test.describe('Inventory Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8080');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('Complete inventory creation workflow for clothing business', async ({ page }) => {
    // Assume we're logged in and on the inventory page for a clothing business
    // This would typically involve authentication and navigation

    // Click "Add New Item" button
    await page.click('text=Add New Item');

    // Wait for the modal to appear
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Verify form title
    await expect(page.locator('text=Add New Inventory Item')).toBeVisible();
    await expect(page.locator('text=Clothing inventory management')).toBeVisible();

    // Fill basic information
    await page.fill('input[placeholder="Enter item name"]', 'Premium Cotton T-Shirt');
    await page.fill('input[placeholder="Enter SKU code"]', 'TSHIRT-001');

    // Wait for categories to load and select one
    await page.waitForSelector('select:has-text("Select category...")');
    await page.selectOption('select:has-text("Select category...")', { label: '👕 T-Shirts' });

    // Wait for subcategories to load and select one
    await page.waitForSelector('select:has-text("No subcategory")');
    await page.selectOption('select:has-text("No subcategory")', { label: '👕 Cotton T-Shirts' });

    // Fill remaining required fields
    await page.fill('input[placeholder="lbs, each, gallons, etc."]', 'each');
    await page.fill('input[placeholder="0.00"]:nth-of-type(1)', '25'); // Current Stock
    await page.fill('input[placeholder="0.00"]:nth-of-type(2)', '19.99'); // Cost Price

    // Fill clothing-specific fields
    await page.fill('input[placeholder="Brand name"]', 'Premium Brand');
    await page.selectOption('select', { label: 'Summer' }); // Season
    await page.fill('input[placeholder="Cotton, Polyester, etc."]', '100% Cotton');
    await page.fill('input[placeholder="Comma-separated (e.g., XS, S, M, L, XL)"]', 'S, M, L, XL');
    await page.fill('input[placeholder="Comma-separated (e.g., Red, Blue, Black)"]', 'White, Black, Navy');

    // Submit the form
    await page.click('text=Create Item');

    // Wait for success message or redirect
    await page.waitForSelector('text=Item created successfully', { timeout: 5000 });

    // Verify the item appears in the inventory list
    await expect(page.locator('text=Premium Cotton T-Shirt')).toBeVisible();
    await expect(page.locator('text=TSHIRT-001')).toBeVisible();
  });

  test('Category and subcategory cascading behavior', async ({ page }) => {
    // Open inventory form
    await page.click('text=Add New Item');
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Select a category
    await page.waitForSelector('select:has-text("Select category...")');
    await page.selectOption('select:has-text("Select category...")', { label: '👕 T-Shirts' });

    // Verify subcategories appear
    await page.waitForSelector('option:has-text("👕 Cotton T-Shirts")');
    await expect(page.locator('option:has-text("👕 Cotton T-Shirts")')).toBeVisible();

    // Select subcategory
    await page.selectOption('select:has-text("No subcategory")', { label: '👕 Cotton T-Shirts' });

    // Change category
    await page.selectOption('select:has-text("👕 T-Shirts")', { label: '👖 Pants' });

    // Verify subcategory is reset
    await expect(page.locator('select:has-text("No subcategory")')).toHaveValue('');
  });

  test('Form validation prevents invalid submissions', async ({ page }) => {
    // Open inventory form
    await page.click('text=Add New Item');
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Try to submit without required fields
    await page.click('text=Create Item');

    // Verify validation errors appear
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=SKU is required')).toBeVisible();
    await expect(page.locator('text=Category is required')).toBeVisible();
    await expect(page.locator('text=Unit is required')).toBeVisible();

    // Fill some fields and verify errors clear
    await page.fill('input[placeholder="Enter item name"]', 'Test Item');
    await expect(page.locator('text=Name is required')).not.toBeVisible();

    // Try negative stock
    await page.fill('input[placeholder="0.00"]:nth-of-type(1)', '-5');
    await page.click('text=Create Item');
    await expect(page.locator('text=Stock cannot be negative')).toBeVisible();
  });

  test('SKU scanner functionality', async ({ page }) => {
    // Open inventory form
    await page.click('text=Add New Item');
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Click scan button
    await page.click('button[title="Scan SKU"]');

    // Verify scanner modal appears
    await expect(page.locator('text=📱 Scan SKU')).toBeVisible();

    // Enter SKU via scanner
    await page.fill('input[placeholder="Scan or enter SKU..."]', 'SCANNED-12345');

    // Apply the scanned value
    await page.click('text=Apply');

    // Verify SKU field is populated
    await expect(page.locator('input[value="SCANNED-12345"]')).toBeVisible();
  });

  test('Edit existing inventory item', async ({ page }) => {
    // Assume an item exists in the inventory
    // Click edit button on an existing item
    await page.click('button[aria-label="Edit item"]');

    // Wait for form to load with existing data
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Verify form is in edit mode
    await expect(page.locator('text=Edit Inventory Item')).toBeVisible();
    await expect(page.locator('text=Update Item')).toBeVisible();

    // Verify existing data is pre-populated
    await expect(page.locator('input[value="Premium Cotton T-Shirt"]')).toBeVisible();

    // Make changes
    await page.fill('input[placeholder="Brand name"]', 'Updated Brand');

    // Submit changes
    await page.click('text=Update Item');

    // Verify success
    await page.waitForSelector('text=Item updated successfully', { timeout: 5000 });
  });

  test('Business type specific fields - Restaurant', async ({ page }) => {
    // Navigate to restaurant business inventory
    // This would typically involve switching business context

    // Open inventory form
    await page.click('text=Add New Item');
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Verify restaurant-specific fields
    await expect(page.locator('text=Restaurant-Specific Fields')).toBeVisible();
    await expect(page.locator('text=Storage Temperature')).toBeVisible();
    await expect(page.locator('text=Expiration Days')).toBeVisible();
    await expect(page.locator('text=Preparation Time (minutes)')).toBeVisible();
    await expect(page.locator('text=Allergens')).toBeVisible();

    // Fill restaurant-specific data
    await page.selectOption('select', { label: 'Refrigerated' }); // Storage Temperature
    await page.fill('input[placeholder="Days until expiration"]', '7');
    await page.fill('input[placeholder="Prep time in minutes"]', '15');
    await page.fill('input[placeholder="Comma-separated list (e.g., Dairy, Gluten, Nuts)"]', 'Dairy, Gluten');

    // Fill basic required fields
    await page.fill('input[placeholder="Enter item name"]', 'Fresh Pizza Dough');
    await page.fill('input[placeholder="Enter SKU code"]', 'PIZZA-001');
    await page.selectOption('select:has-text("Select category...")', { label: '🍕 Pizza' });
    await page.fill('input[placeholder="lbs, each, gallons, etc."]', 'lbs');
    await page.fill('input[placeholder="0.00"]:nth-of-type(1)', '50');
    await page.fill('input[placeholder="0.00"]:nth-of-type(2)', '2.99');

    // Submit
    await page.click('text=Create Item');

    // Verify success
    await page.waitForSelector('text=Item created successfully', { timeout: 5000 });
  });

  test('Inventory list filtering and search', async ({ page }) => {
    // Verify inventory list loads
    await expect(page.locator('text=Inventory Items')).toBeVisible();

    // Test category filter
    await page.selectOption('select[aria-label="Filter by category"]', { label: '👕 T-Shirts' });

    // Verify only T-Shirt items are shown
    await expect(page.locator('text=Premium Cotton T-Shirt')).toBeVisible();
    await expect(page.locator('text=Fresh Pizza Dough')).not.toBeVisible();

    // Test search functionality
    await page.fill('input[placeholder="Search inventory..."]', 'Premium');

    // Verify search results
    await expect(page.locator('text=Premium Cotton T-Shirt')).toBeVisible();

    // Clear filters
    await page.click('text=Clear Filters');
    await expect(page.locator('text=Fresh Pizza Dough')).toBeVisible();
  });

  test('Bulk operations on inventory items', async ({ page }) => {
    // Select multiple items
    await page.check('input[type="checkbox"][aria-label="Select Premium Cotton T-Shirt"]');
    await page.check('input[type="checkbox"][aria-label="Select Fresh Pizza Dough"]');

    // Verify bulk actions appear
    await expect(page.locator('text=Bulk Actions')).toBeVisible();

    // Test bulk category update
    await page.click('text=Update Category');
    await page.selectOption('select', { label: '📦 General' });
    await page.click('text=Apply');

    // Verify success message
    await page.waitForSelector('text=2 items updated successfully', { timeout: 5000 });
  });

  test('Inventory reports and analytics', async ({ page }) => {
    // Navigate to reports section
    await page.click('text=Reports');

    // Verify category breakdown chart
    await expect(page.locator('text=Inventory by Category')).toBeVisible();

    // Verify emoji categories are displayed correctly
    await expect(page.locator('text=👕 T-Shirts')).toBeVisible();
    await expect(page.locator('text=🍕 Pizza')).toBeVisible();

    // Test date range filtering
    await page.fill('input[type="date"]', '2024-01-01');
    await page.click('text=Generate Report');

    // Verify report generates
    await page.waitForSelector('.report-content', { timeout: 10000 });
  });
});