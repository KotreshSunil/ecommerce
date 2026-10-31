import { test, expect } from './support/fixtures.js'
import { products } from '../server/db/seed-data.js'

test.describe('product catalog', () => {
  test('lists every seeded product with name, category and price', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
    const cards = page.locator('.product-card')
    await expect(cards).toHaveCount(products.length)
    for (const p of products) {
      const card = cards.filter({ hasText: p.name })
      await expect(card).toHaveCount(1)
      await expect(card).toContainText(p.category)
      await expect(card).toContainText(`$${p.price.toFixed(2)}`)
    }
  })

  test('opens product detail from a card and shows its description', async ({ page }) => {
    const p = products[0]
    await page.goto('/')
    await page.locator('.product-card', { hasText: p.name }).click()
    await expect(page).toHaveURL(`/product/${p.id}`)
    await expect(page.getByRole('heading', { name: p.name })).toBeVisible()
    await expect(page.getByText(p.description)).toBeVisible()
    await expect(page.locator('.product-detail__price')).toHaveText(`$${p.price.toFixed(2)}`)
  })

  test('Back button returns to the list', async ({ page }) => {
    await page.goto('/')
    await page.locator('.product-card').first().click()
    await page.getByRole('button', { name: /Back/ }).click()
    await expect(page).toHaveURL('/')
    await expect(page.locator('.product-card')).toHaveCount(products.length)
  })

  test('unknown product id shows a not-found message', async ({ page }) => {
    await page.goto('/product/999999')
    await expect(page.getByText('Product not found.')).toBeVisible()
    await page.getByRole('link', { name: 'Back to products' }).click()
    await expect(page).toHaveURL('/')
  })

  test('shows an error state when the products API fails', async ({ page }) => {
    await page.route('**/api/products', (route) => route.fulfill({ status: 500, body: '{}' }))
    await page.goto('/')
    await expect(page.getByText("Couldn't load products. Please try again later.")).toBeVisible()
    await expect(page.locator('.product-card')).toHaveCount(0)
  })
})
