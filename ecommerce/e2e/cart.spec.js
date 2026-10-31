import { test, expect } from './support/fixtures.js'
import { addToCartFromDetail } from './support/helpers.js'
import { products } from '../server/db/seed-data.js'

const [a, b] = products
const money = (n) => `$${n.toFixed(2)}`

test.describe('shopping cart', () => {
  test('empty cart shows empty state', async ({ page }) => {
    await page.goto('/cart')
    await expect(page.getByText('Your cart is empty.')).toBeVisible()
    await expect(page.locator('.header__cart-badge')).toHaveCount(0)
  })

  test('adding with a quantity updates badge, line subtotal and total', async ({ page }) => {
    await addToCartFromDetail(page, a.id, 3)
    await expect(page.locator('.header__cart-badge')).toHaveText('3')
    await page.getByRole('link', { name: 'View cart' }).click()
    const row = page.locator('.cart__item', { hasText: a.name })
    await expect(row.locator('input')).toHaveValue('3')
    await expect(row.locator('.cart__item-subtotal')).toHaveText(money(3 * a.price))
    await expect(page.locator('.cart__total')).toHaveText(money(3 * a.price))
  })

  test('adding the same product twice merges into one line', async ({ page }) => {
    await addToCartFromDetail(page, a.id, 1)
    await addToCartFromDetail(page, a.id, 2)
    await page.goto('/cart')
    await expect(page.locator('.cart__item')).toHaveCount(1)
    await expect(page.locator('.cart__item input')).toHaveValue('3')
  })

  test('total sums multiple products; changing quantity recalculates', async ({ page }) => {
    await addToCartFromDetail(page, a.id, 1)
    await addToCartFromDetail(page, b.id, 1)
    await page.goto('/cart')
    await expect(page.locator('.cart__total')).toHaveText(money(a.price + b.price))
    await page.locator('.cart__item', { hasText: b.name }).locator('input').fill('4')
    await expect(page.locator('.cart__total')).toHaveText(money(a.price + 4 * b.price))
    await expect(page.locator('.header__cart-badge')).toHaveText('5')
  })

  test('quantity cannot drop below 1', async ({ page }) => {
    await addToCartFromDetail(page, a.id, 2)
    await page.goto('/cart')
    const input = page.locator('.cart__item input')
    await input.fill('0')
    await expect(input).toHaveValue('1')
  })

  test('remove deletes the line and returns to empty state', async ({ page }) => {
    await addToCartFromDetail(page, a.id, 1)
    await page.goto('/cart')
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText('Your cart is empty.')).toBeVisible()
  })

  test('cart persists across a full page reload (localStorage)', async ({ page }) => {
    await addToCartFromDetail(page, a.id, 2)
    await page.goto('/cart')
    await page.reload()
    await expect(page.locator('.cart__item', { hasText: a.name }).locator('input')).toHaveValue('2')
    await expect(page.locator('.header__cart-badge')).toHaveText('2')
  })
})
