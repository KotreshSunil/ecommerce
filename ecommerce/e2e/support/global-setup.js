import { spawnSync } from 'node:child_process'
import pg from 'pg'
import { assertSafeTestDatabase } from './db-guard.js'

// ---- App-specific: commands that build schema + seed data, in order ----
const SCHEMA_COMMANDS = ['npm run db:auth:migrate', 'npm run db:seed']
// ------------------------------------------------------------------------

export default async function globalSetup() {
  const url = assertSafeTestDatabase(process.env.E2E_DATABASE_URL)

  // Guard passed: this is a throwaway DB. Start every run from a blank schema so runs are repeatable.
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  } finally {
    await client.end()
  }

  // Reuse the app's own scripts so tests exercise the real schema, with DATABASE_URL pointed at the test DB.
  const env = { ...process.env, DATABASE_URL: url }
  for (const command of SCHEMA_COMMANDS) {
    console.log(`[e2e] ${command}`)
    const r = spawnSync(command, { env, shell: true, stdio: 'inherit' })
    if (r.status !== 0) throw new Error(`[e2e] "${command}" failed (exit ${r.status})`)
  }
}
