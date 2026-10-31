import { test, expect, uniqueUser } from './support/fixtures.js'
import { addToCartFromDetail, uiSignIn, apiSignUp } from './support/helpers.js'
import { products } from '../server/db/seed-data.js'

const [a, b] = products

async function placeOrderFromCart(page) {
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Place Order' }).click()
  await expect(page.getByRole('heading', { name: 'Order placed!' })).toBeVisible()
}

test.describe('checkout and order history', () => {
  test('signed-in user places an order: confirmation, cart cleared, order persisted for that user', async ({ signedIn, db }) => {
    const { page, user } = signedIn
    await addToCartFromDetail(page, a.id, 2)
    await addToCartFromDetail(page, b.id, 1)
    const expectedTotal = 2 * a.price + b.price

    await placeOrderFromCart(page)
    await expect(page.locator('.header__cart-badge')).toHaveCount(0)

    const rows = await db.query(
      'SELECT o.items, o.total FROM orders o JOIN "user" u ON u.id = o.user_id WHERE u.email = $1',
      [user.email]
    )
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].total)).toBeCloseTo(expectedTotal, 2)
    const lines = Object.fromEntries(rows[0].items.map((i) => [i.id, i.qty]))
    expect(lines).toEqual({ [a.id]: 2, [b.id]: 1 })
  })

  test('order appears in My Orders with lines and total', async ({ signedIn }) => {
    const { page } = signedIn
    await addToCartFromDetail(page, a.id, 2)
    await placeOrderFromCart(page)

    await page.getByRole('link', { name: 'My Orders' }).click()
    await expect(page).toHaveURL('/orders')
    const order = page.locator('.order-history__item')
    await expect(order).toHaveCount(1)
    await expect(order).toContainText(`2 × ${a.name}`)
    await expect(order.locator('.order-history__total')).toHaveText(`Total: $${(2 * a.price).toFixed(2)}`)
  })

  test('new user with no orders sees the empty state', async ({ signedIn }) => {
    const { page } = signedIn
    await page.goto('/orders')
    await expect(page.getByText("You haven't placed any orders yet.")).toBeVisible()
  })

  test('users only see their own orders', async ({ signedIn, browser, baseURL }) => {
    const { page } = signedIn
    await addToCartFromDetail(page, a.id, 1)
    await placeOrderFromCart(page)

    const ctx = await browser.newContext({ baseURL })
    await apiSignUp(ctx.request, baseURL, uniqueUser('other'))
    const otherPage = await ctx.newPage()
    await otherPage.goto('/orders')
    await expect(otherPage.getByText("You haven't placed any orders yet.")).toBeVisible()
    await ctx.close()
  })

  test('anonymous user is sent to login at checkout, then completes the order with the cart kept', async ({ page, request, baseURL }) => {
    const user = uniqueUser('anoncheckout')
    await apiSignUp(request, baseURL, user)

    await addToCartFromDetail(page, a.id, 1)
    await page.goto('/cart')
    await page.getByRole('button', { name: 'Place Order' }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.locator('.header__cart-badge')).toHaveText('1')

    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Order placed!' })).toBeVisible()
  })

  test('failed order submission shows an error and leaves the cart untouched', async ({ signedIn }) => {
    const { page } = signedIn
    await addToCartFromDetail(page, a.id, 2)
    await page.route('**/api/orders', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 500, body: '{}' }) : route.continue()
    )
    await page.goto('/cart')
    await page.getByRole('button', { name: 'Place Order' }).click()
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to cart' }).click()
    await expect(page.locator('.cart__item input')).toHaveValue('2')
  })

  test('sign out then back in keeps order history', async ({ signedIn }) => {
    const { page, user } = signedIn
    await addToCartFromDetail(page, b.id, 1)
    await placeOrderFromCart(page)
    await page.getByRole('button', { name: 'Sign out' }).click()
    // wait until sign-out has really completed, or it can race with (and wipe) the next login
    await expect(page.locator('.header__nav').getByRole('link', { name: 'Sign in' })).toBeVisible()
    await uiSignIn(page, user)
    await page.getByRole('link', { name: 'My Orders' }).click()
    await expect(page.locator('.order-history__item')).toHaveCount(1)
  })
})

test.describe('API contract', () => {
  test('POST /api/orders without a session is 401', async ({ request }) => {
    const res = await request.post('/api/orders', { data: { items: [{ id: 1, qty: 1 }], total: 1 } })
    expect(res.status()).toBe(401)
  })

  test('GET /api/orders/mine without a session is 401', async ({ request }) => {
    expect((await request.get('/api/orders/mine')).status()).toBe(401)
  })

  test('POST /api/orders rejects an empty items list with 400', async ({ signedIn }) => {
    const res = await signedIn.page.context().request.post('/api/orders', { data: { items: [], total: 0 } })
    expect(res.status()).toBe(400)
  })

  test('GET /api/products returns numeric prices; unknown id is 404', async ({ request }) => {
    const list = await (await request.get('/api/products')).json()
    expect(list).toHaveLength(products.length)
    expect(typeof list[0].price).toBe('number')
    expect((await request.get('/api/products/999999')).status()).toBe(404)
  })
})
