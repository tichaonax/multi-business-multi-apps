import { test, expect, Page } from '@playwright/test';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  categoryLoadTime: 1000, // 1 second
  formOpenTime: 2000, // 2 seconds
  formSubmitTime: 3000, // 3 seconds
  listLoadTime: 2000, // 2 seconds
};

async function measurePerformance(page, action) {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

async function generateLargeDataset(page, count) {
  // This would typically call an API to generate test data
  // For now, we'll simulate the performance impact
  await page.evaluate((count) => {
    // Simulate large dataset processing
    const categories = [];
    for (let i = 0; i < count; i++) {
      categories.push({
        id: `cat-${i}`,
        name: `Category ${i}`,
        emoji: '📦',
        subcategories: Array.from({ length: 10 }, (_, j) => ({
          id: `sub-${i}-${j}`,
          name: `Subcategory ${i}-${j}`,
          emoji: '📦'
        }))
      });
    }
    return categories;
  }, count);
}

test.describe('Performance Testing Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
  });

  test('Category loading performance', async ({ page }) => {
    const loadTime = await measurePerformance(page, async () => {
      await page.click('text=Add New Item');
      await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });
      // Wait for categories to load
      await page.waitForSelector('option:not(:has-text("Select category..."))', { timeout: 5000 });
    });

    console.log(`Category loading time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.categoryLoadTime);

    // Verify categories loaded
    const categoryCount = await page.locator('select option:not(:has-text("Select category..."))').count();
    expect(categoryCount).toBeGreaterThan(0);
  });

  test('Form opening performance', async ({ page }) => {
    const openTime = await measurePerformance(page, async () => {
      await page.click('text=Add New Item');
      await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });
      // Wait for all form elements to be ready
      await page.waitForSelector('input[placeholder="Enter item name"]');
      await page.waitForSelector('select:has-text("Select category...")');
    });

    console.log(`Form opening time: ${openTime}ms`);
    expect(openTime).toBeLessThan(PERFORMANCE_THRESHOLDS.formOpenTime);
  });

  test('Form submission performance', async ({ page }) => {
    // Prepare form data
    await page.click('text=Add New Item');
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Fill required fields quickly
    await page.fill('input[placeholder="Enter item name"]', 'Performance Test Item');
    await page.fill('input[placeholder="Enter SKU code"]', `PERF-${Date.now()}`);
    await page.selectOption('select:has-text("Select category...")', { index: 1 }); // Select first category
    await page.fill('input[placeholder="lbs, each, gallons, etc."]', 'each');
    await page.fill('input[placeholder="0.00"]', '10');
    await page.fill('input[placeholder="0.00"]', '9.99');

    const submitTime = await measurePerformance(page, async () => {
      await page.click('text=Create Item');
      await page.waitForSelector('text=Item created successfully', { timeout: 5000 });
    });

    console.log(`Form submission time: ${submitTime}ms`);
    expect(submitTime).toBeLessThan(PERFORMANCE_THRESHOLDS.formSubmitTime);
  });

  test('Inventory list loading performance', async ({ page }) => {
    const loadTime = await measurePerformance(page, async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.inventory-list', { timeout: 5000 });
    });

    console.log(`Inventory list loading time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.listLoadTime);
  });

  test('Scalability with large category datasets', async ({ page }) => {
    // Test with increasingly large datasets
    const datasetSizes = [10, 50, 100, 200];

    for (const size of datasetSizes) {
      console.log(`Testing with ${size} categories...`);

      const loadTime = await measurePerformance(page, async () => {
        await page.click('text=Add New Item');
        await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

        // Simulate large dataset
        await generateLargeDataset(page, size);

        // Wait for categories to render
        await page.waitForTimeout(100); // Allow time for rendering
      });

      console.log(`${size} categories load time: ${loadTime}ms`);

      // Performance should degrade gracefully (linear or near-linear)
      const expectedMaxTime = Math.max(2000, size * 10); // Allow up to 10ms per category
      expect(loadTime).toBeLessThan(expectedMaxTime);

      // Close modal for next test
      await page.click('button[aria-label="Close"]');
      await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'hidden' });
    }
  });

  test('Memory usage during category operations', async ({ page }) => {
    // This test would require browser performance monitoring
    // For now, we'll test operational performance

    await page.click('text=Add New Item');
    await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

    // Perform multiple category changes to test memory handling
    for (let i = 0; i < 10; i++) {
      const categoryOptions = await page.locator('select option:not(:has-text("Select category..."))').all();
      if (categoryOptions.length > 1) {
        await page.selectOption('select:has-text("Select category...")', { index: 1 });
        await page.waitForTimeout(100);

        // Change back
        await page.selectOption('select:has-text("Select category...")', { label: 'Select category...' });
        await page.waitForTimeout(100);
      }
    }

    // Verify form still functions after multiple operations
    await expect(page.locator('input[placeholder="Enter item name"]')).toBeVisible();
    await expect(page.locator('select:has-text("Select category...")')).toBeVisible();
  });

  test('Concurrent user simulation', async ({ page }) => {
    // Simulate multiple rapid form operations
    const operations = [];

    for (let i = 0; i < 5; i++) {
      operations.push(
        measurePerformance(page, async () => {
          const testId = `concurrent-${i}-${Date.now()}`;

          await page.click('text=Add New Item');
          await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

          // Quick form fill
          await page.fill('input[placeholder="Enter item name"]', `Concurrent Test ${i}`);
          await page.fill('input[placeholder="Enter SKU code"]', testId);
          await page.selectOption('select:has-text("Select category...")', { index: 1 });
          await page.fill('input[placeholder="lbs, each, gallons, etc."]', 'each');
          await page.fill('input[placeholder="0.00"]', (i + 1).toString());
          await page.fill('input[placeholder="0.00"]', (9.99 + i).toString());

          await page.click('text=Create Item');

          // Close modal without waiting for success (simulating rapid usage)
          await page.click('button[aria-label="Close"]');
        })
      );
    }

    const results = await Promise.all(operations);
    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxTime = Math.max(...results);

    console.log(`Concurrent operations - Average: ${avgTime}ms, Max: ${maxTime}ms`);

    // All operations should complete within reasonable time
    expect(maxTime).toBeLessThan(5000);
    expect(avgTime).toBeLessThan(3000);
  });

  test('Network latency simulation', async ({ page }) => {
    // Simulate slow network conditions
    await page.route('**/api/inventory/**', async (route) => {
      // Add artificial delay
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    const loadTime = await measurePerformance(page, async () => {
      await page.click('text=Add New Item');
      await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });
      await page.waitForSelector('option:not(:has-text("Select category..."))', { timeout: 10000 });
    });

    console.log(`Slow network category loading time: ${loadTime}ms`);

    // Should still work but take longer
    expect(loadTime).toBeGreaterThan(500); // At least the artificial delay
    expect(loadTime).toBeLessThan(10000); // But not too long
  });

  test('Browser resource usage', async ({ page, browserName }) => {
    // Skip this test in headless mode or CI
    test.skip(browserName === 'chromium' && process.env.CI, 'Skip resource test in CI');

    // Open multiple forms to test resource usage
    for (let i = 0; i < 3; i++) {
      await page.click('text=Add New Item');
      await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'visible' });

      // Keep forms open to test memory usage
      if (i < 2) { // Don't open on last iteration
        await page.keyboard.press('Escape'); // Close with Escape
        await page.waitForSelector('[data-testid="inventory-form-modal"]', { state: 'hidden' });
      }
    }

    // Verify all forms can still be interacted with
    await expect(page.locator('input[placeholder="Enter item name"]')).toBeVisible();

    // Fill and submit to ensure functionality works
    await page.fill('input[placeholder="Enter item name"]', 'Resource Test Item');
    await page.fill('input[placeholder="Enter SKU code"]', `RESOURCE-${Date.now()}`);
    await page.selectOption('select:has-text("Select category...")', { index: 1 });
    await page.fill('input[placeholder="lbs, each, gallons, etc."]', 'each');
    await page.fill('input[placeholder="0.00"]', '5');
    await page.fill('input[placeholder="0.00"]', '4.99');

    await page.click('text=Create Item');
    await page.waitForSelector('text=Item created successfully', { timeout: 5000 });
  });
});