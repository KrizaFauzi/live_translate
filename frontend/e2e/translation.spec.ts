import { test, expect } from '@playwright/test'

test.describe('Voice Translator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display the app title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Voice Translator')
  })

  test('should have language toggle buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("ID → EN")')).toBeVisible()
    await expect(page.locator('button:has-text("EN → ID")')).toBeVisible()
  })

  test('should toggle between language modes', async ({ page }) => {
    const idEnButton = page.locator('button:has-text("ID → EN")')
    const enIdButton = page.locator('button:has-text("EN → ID")')

    await expect(idEnButton).toHaveClass(/bg-primary/)
    await enIdButton.click()
    await expect(enIdButton).toHaveClass(/bg-primary/)
  })

  test('should have record button', async ({ page }) => {
    const recordButton = page.locator('button[aria-label*="record"]')
    await expect(recordButton).toBeVisible()
  })

  test('should have theme toggle', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="dark mode"], button[aria-label*="light mode"]')
    await expect(themeToggle).toBeVisible()
  })

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('h1')).toBeVisible()

    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('h1')).toBeVisible()

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    const recordButton = page.locator('button[aria-label*="record"]')
    await expect(recordButton).toHaveAttribute('aria-pressed', 'false')
    await expect(recordButton).toHaveAttribute('aria-busy', 'false')
  })
})