import { defineConfig } from '@playwright/test'
import { assertSafeTestDatabase } from './e2e/support/db-guard.js'

// ---- App-specific knobs (the only block to edit when adapting to another app) ----
const PORT = Number(process.env.E2E_PORT || 3100) // never the dev port, so a dev server is never reused
const START_COMMAND = 'npm run build && node server/index.js'
const HEALTH_PATH = '/' // must NOT touch the DB: the server boots before global-setup creates the schema
// -----------------------------------------------------------------------------------

// Fails fast (before any server/browser starts) unless E2E_DATABASE_URL is a dedicated test DB.
const testDatabaseUrl = assertSafeTestDatabase(process.env.E2E_DATABASE_URL)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  globalSetup: './e2e/support/global-setup.js',
  fullyParallel: true,
  workers: Number(process.env.E2E_WORKERS || 2),
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL,
    headless: false, // ALWAYS headed - never switch this to true
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: START_COMMAND,
    url: `${baseURL}${HEALTH_PATH}`,
    reuseExistingServer: false, // always boot our own server so it is guaranteed to use the test DB
    timeout: 180_000,
    env: {
      // process.env values win over .env (dotenv never overrides), so the app's real DB is never used
      DATABASE_URL: testDatabaseUrl,
      TIDB_HOST: 'unused.invalid',
      TIDB_PORT: '4000',
      TIDB_USER: 'unused',
      TIDB_PASSWORD: 'unused',
      TIDB_DATABASE: 'unused',
      BETTER_AUTH_SECRET: 'e2e-only-secret-e2e-only-secret-0123456789',
      BETTER_AUTH_URL: baseURL,
      PORT: String(PORT),
    },
  },
})
