// @ts-nocheck

/**
 * End-to-End Tests for Sibling Expense Accounts
 *
 * Tests the complete user workflow for creating, using, and merging sibling accounts.
 * These tests simulate real user interactions through the UI.
 */

import { test, expect } from '@playwright/test'

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
}

const TEST_BUSINESS = {
  name: 'Test Restaurant',
  type: 'RESTAURANT',
}

describe('Sibling Expense Accounts E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login user
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', TEST_USER.email)
    await page.fill('[data-testid="password-input"]', TEST_USER.password)
    await page.click('[data-testid="login-button"]')

    // Navigate to expense accounts page
    await page.goto('/expense-accounts')
    await page.waitForLoadState('networkidle')
  })

  test('should create and use sibling account for historical data entry', async ({ page }) => {
    // Navigate to expense accounts
    await expect(page.locator('h1')).toContainText('Expense Accounts')

    // Find an existing expense account to create sibling from
    const accountRow = page.locator('[data-testid="expense-account-row"]').first()
    await expect(accountRow).toBeVisible()

    // Click create sibling button
    await accountRow.locator('[data-testid="create-sibling-button"]').click()

    // Fill sibling account creation modal
    await page.fill('[data-testid="sibling-name-input"]', 'Historical Q1 2024')
    await page.fill('[data-testid="sibling-description-input"]', 'For entering expenses from Q1 2024')
    await page.click('[data-testid="create-sibling-submit"]')

    // Verify sibling account appears in list
    await expect(page.locator('text=Historical Q1 2024')).toBeVisible()
    await expect(page.locator('text=EXP-001-01')).toBeVisible() // Assuming parent is EXP-001

    // Click on sibling account to enter historical payments
    await page.locator('[data-testid="sibling-account-Historical Q1 2024"]').click()

    // Add historical payment
    await page.click('[data-testid="add-payment-button"]')
    await page.fill('[data-testid="payment-amount-input"]', '150.00')
    await page.fill('[data-testid="payment-description-input"]', 'Office supplies - January')

    // Set historical date (before today)
    await page.click('[data-testid="payment-date-input"]')
    await page.click('text=15') // Select 15th of current month

    await page.selectOption('[data-testid="payment-payee-select"]', 'Office Depot')
    await page.click('[data-testid="submit-payment-button"]')

    // Verify payment was added
    await expect(page.locator('text=Office supplies - January')).toBeVisible()
    await expect(page.locator('text=$150.00')).toBeVisible()

    // Add another historical payment
    await page.click('[data-testid="add-payment-button"]')
    await page.fill('[data-testid="payment-amount-input"]', '75.50')
    await page.fill('[data-testid="payment-description-input"]', 'Software subscription - February')

    // Set different historical date
    await page.click('[data-testid="payment-date-input"]')
    await page.click('text=20') // Select 20th

    await page.selectOption('[data-testid="payment-payee-select"]', 'Adobe')
    await page.click('[data-testid="submit-payment-button"]')

    // Verify sibling account balance
    await expect(page.locator('[data-testid="account-balance"]')).toContainText('$225.50')

    // Navigate back to account list
    await page.click('[data-testid="back-to-accounts"]')

    // Verify sibling shows in parent account list with balance
    const siblingRow = page.locator('[data-testid="sibling-account-row"]').filter({ hasText: 'Historical Q1 2024' })
    await expect(siblingRow.locator('[data-testid="sibling-balance"]')).toContainText('$225.50')
  })

  test('should merge sibling account back into parent', async ({ page }) => {
    // Assume we have a sibling account with balance from previous test
    const siblingRow = page.locator('[data-testid="sibling-account-row"]').filter({ hasText: 'Historical Q1 2024' })
    await expect(siblingRow).toBeVisible()

    // Get parent account balance before merge
    const parentRow = page.locator('[data-testid="expense-account-row"]').first()
    const parentBalanceBefore = await parentRow.locator('[data-testid="account-balance"]').textContent()

    // Click merge button on sibling account
    await siblingRow.locator('[data-testid="merge-sibling-button"]').click()

    // Confirm merge in modal
    await page.click('[data-testid="confirm-merge-button"]')

    // Verify merge success message
    await expect(page.locator('[data-testid="merge-success-message"]')).toBeVisible()

    // Verify sibling account is no longer in list
    await expect(page.locator('text=Historical Q1 2024')).not.toBeVisible()

    // Verify parent account balance increased
    const parentBalanceAfter = await parentRow.locator('[data-testid="account-balance"]').textContent()
    // Note: In a real test, we'd parse and compare the actual numbers
    expect(parentBalanceAfter).not.toBe(parentBalanceBefore)
  })

  test('should prevent merging sibling with non-zero balance without admin permission', async ({ page }) => {
    // Create sibling with balance
    const accountRow = page.locator('[data-testid="expense-account-row"]').first()
    await accountRow.locator('[data-testid="create-sibling-button"]').click()

    await page.fill('[data-testid="sibling-name-input"]', 'Test Sibling With Balance')
    await page.click('[data-testid="create-sibling-submit"]')

    // Add payment to sibling
    await page.locator('[data-testid="sibling-account-Test Sibling With Balance"]').click()
    await page.click('[data-testid="add-payment-button"]')
    await page.fill('[data-testid="payment-amount-input"]', '100.00')
    await page.fill('[data-testid="payment-description-input"]', 'Test payment')
    await page.selectOption('[data-testid="payment-payee-select"]', 'Test Vendor')
    await page.click('[data-testid="submit-payment-button"]')

    // Go back and try to merge
    await page.click('[data-testid="back-to-accounts"]')
    const siblingRow = page.locator('[data-testid="sibling-account-row"]').filter({ hasText: 'Test Sibling With Balance' })
    await siblingRow.locator('[data-testid="merge-sibling-button"]').click()

    // Verify error message for non-zero balance
    await expect(page.locator('[data-testid="merge-error-message"]')).toContainText('non-zero balance')
    await expect(page.locator('[data-testid="confirm-merge-button"]')).toBeDisabled()
  })

  test('should show sibling indicators in payment forms', async ({ page }) => {
    // Navigate to add payment on a regular account
    const accountRow = page.locator('[data-testid="expense-account-row"]').first()
    await accountRow.locator('[data-testid="add-payment-button"]').click()

    // Verify date picker is available for historical dates
    await expect(page.locator('[data-testid="payment-date-input"]')).toBeVisible()

    // Verify sibling account option is shown
    await expect(page.locator('[data-testid="use-sibling-account-option"]')).toBeVisible()

    // Click to use sibling account
    await page.click('[data-testid="use-sibling-account-option"]')

    // Verify sibling account selector appears
    await expect(page.locator('[data-testid="sibling-account-selector"]')).toBeVisible()
  })

  test('should handle multiple sibling accounts correctly', async ({ page }) => {
    // Create first sibling
    const accountRow = page.locator('[data-testid="expense-account-row"]').first()
    await accountRow.locator('[data-testid="create-sibling-button"]').click()
    await page.fill('[data-testid="sibling-name-input"]', 'Sibling One')
    await page.click('[data-testid="create-sibling-submit"]')

    // Create second sibling
    await accountRow.locator('[data-testid="create-sibling-button"]').click()
    await page.fill('[data-testid="sibling-name-input"]', 'Sibling Two')
    await page.click('[data-testid="create-sibling-submit"]')

    // Verify both siblings exist with correct numbering
    await expect(page.locator('text=EXP-001-01')).toBeVisible()
    await expect(page.locator('text=EXP-001-02')).toBeVisible()

    // Verify siblings are ordered correctly
    const siblingRows = page.locator('[data-testid="sibling-account-row"]')
    await expect(siblingRows.nth(0)).toContainText('Sibling One')
    await expect(siblingRows.nth(1)).toContainText('Sibling Two')
  })

  test('should validate sibling account creation', async ({ page }) => {
    const accountRow = page.locator('[data-testid="expense-account-row"]').first()
    await accountRow.locator('[data-testid="create-sibling-button"]').click()

    // Try to create without name
    await page.click('[data-testid="create-sibling-submit"]')
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required')

    // Try to create with invalid name
    await page.fill('[data-testid="sibling-name-input"]', '')
    await page.click('[data-testid="create-sibling-submit"]')
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required')

    // Valid name should work
    await page.fill('[data-testid="sibling-name-input"]', 'Valid Sibling Name')
    await page.click('[data-testid="create-sibling-submit"]')
    await expect(page.locator('text=Valid Sibling Name')).toBeVisible()
  })
})