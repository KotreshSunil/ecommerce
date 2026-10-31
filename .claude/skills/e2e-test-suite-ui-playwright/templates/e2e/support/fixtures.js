import { test as base, expect } from '@playwright/test'
import pg from 'pg'

export const PASSWORD = 'Passw0rd-e2e!'

let counter = 0
export function uniqueUser(prefix = 'user') {
  const id = `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return { name: `E2E ${prefix} ${id}`, email: `${prefix}-${id}@e2e.test`, password: PASSWORD }
}

export const test = base.extend({
  // Direct read access to the TEST database for asserting what the UI actually persisted.
  db: async ({}, use) => {
    const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL })
    await client.connect()
    await use({ query: (text, params) => client.query(text, params).then((r) => r.rows) })
    await client.end()
  },

  // A brand-new, unique user for this test (not yet registered).
  newUser: async ({}, use) => use(uniqueUser()),

  // A page already signed in as a freshly registered unique user (session cookie set via the auth API for speed).
  signedIn: async ({ page, baseURL }, use) => {
    const user = uniqueUser('signedin')
    const res = await page.context().request.post('/api/auth/sign-up/email', {
      data: user,
      headers: { origin: baseURL },
    })
    expect(res.ok(), `sign-up API failed: ${res.status()}`).toBeTruthy()
    await use({ page, user })
  },
})

export { expect }
