import { test, expect, uniqueUser } from './support/fixtures.js'
import { uiSignUp, uiSignIn, apiSignUp } from './support/helpers.js'

test.describe('authentication', () => {
  test('anonymous header offers Sign in / Sign up only', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('.header__nav')
    await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Sign up' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'My Orders' })).toHaveCount(0)
  })

  test('register creates an account, signs in, and sign-out reverses it', async ({ page, newUser, db }) => {
    await uiSignUp(page, newUser)
    await expect(page).toHaveURL('/')
    await expect(page.locator('.header__user')).toHaveText(newUser.email)
    await expect(page.getByRole('link', { name: 'My Orders' })).toBeVisible()

    const rows = await db.query('SELECT name FROM "user" WHERE email = $1', [newUser.email])
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe(newUser.name)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.locator('.header__nav').getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(page.locator('.header__user')).toHaveCount(0)
  })

  test('session survives a reload', async ({ signedIn }) => {
    const { page, user } = signedIn
    await page.goto('/')
    await expect(page.locator('.header__user')).toHaveText(user.email)
    await page.reload()
    await expect(page.locator('.header__user')).toHaveText(user.email)
  })

  test('existing user can sign in with email + password', async ({ page, request, baseURL }) => {
    const user = uniqueUser('login')
    await apiSignUp(request, baseURL, user)
    await uiSignIn(page, user)
    await expect(page).toHaveURL('/')
    await expect(page.locator('.header__user')).toHaveText(user.email)
  })

  test('wrong password shows an error and stays signed out', async ({ page, request, baseURL }) => {
    const user = uniqueUser('badpw')
    await apiSignUp(request, baseURL, user)
    await uiSignIn(page, { ...user, password: 'definitely-wrong-1' })
    await expect(page.getByText('Invalid email or password.')).toBeVisible()
    await expect(page).toHaveURL('/login')
    await expect(page.locator('.header__user')).toHaveCount(0)
  })

  test('registering a duplicate email is rejected with an error', async ({ page, request, baseURL }) => {
    const user = uniqueUser('dup')
    await apiSignUp(request, baseURL, user)
    await uiSignUp(page, user)
    await expect(page.locator('.auth__error')).toBeVisible()
    await expect(page).toHaveURL('/register')
  })

  test('password shorter than 8 characters is blocked by the form', async ({ page, newUser }) => {
    await uiSignUp(page, { ...newUser, password: 'short' })
    await expect(page).toHaveURL('/register')
    await expect(page.locator('.header__user')).toHaveCount(0)
  })

  for (const route of ['/checkout', '/orders']) {
    test(`anonymous visit to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL('/login')
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    })
  }

  test('after login, user is returned to the page they were guarded from', async ({ page, request, baseURL }) => {
    const user = uniqueUser('return')
    await apiSignUp(request, baseURL, user)
    await page.goto('/orders')
    await expect(page).toHaveURL('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/orders')
  })
})
