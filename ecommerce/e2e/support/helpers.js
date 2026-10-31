import { expect } from './fixtures.js'

export async function addToCartFromDetail(page, productId, qty = 1) {
  await page.goto(`/product/${productId}`)
  if (qty !== 1) await page.getByLabel('Quantity').fill(String(qty))
  await page.getByRole('button', { name: 'Add to Cart' }).click()
  await expect(page.getByText('Added to cart!')).toBeVisible()
}

export async function uiSignUp(page, user) {
  await page.goto('/register')
  await page.getByLabel('Name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).click()
}

export async function uiSignIn(page, user) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

// Registers a user through the API on the page's own browser context (no UI), leaving that context signed out.
export async function apiSignUp(request, baseURL, user) {
  const res = await request.post('/api/auth/sign-up/email', { data: user, headers: { origin: baseURL } })
  expect(res.ok(), `sign-up API failed: ${res.status()}`).toBeTruthy()
}
