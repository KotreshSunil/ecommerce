import fs from 'node:fs'
import path from 'node:path'

function fingerprint(url) {
  try {
    const u = new URL(url)
    return `${u.hostname.toLowerCase()}${u.port ? ':' + u.port : ''}${u.pathname}`
  } catch {
    return null
  }
}

// Every DATABASE_URL the app could be using for real: the shell env plus any .env* file in the app root.
function collectAppDatabaseUrls(root) {
  const urls = []
  if (process.env.DATABASE_URL) urls.push(process.env.DATABASE_URL)
  for (const file of fs.readdirSync(root).filter((f) => f === '.env' || f.startsWith('.env.'))) {
    const text = fs.readFileSync(path.join(root, file), 'utf8')
    for (const m of text.matchAll(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/gm)) urls.push(m[1].trim())
  }
  return urls
}

export function assertSafeTestDatabase(testUrl, root = process.cwd()) {
  if (!testUrl) {
    throw new Error(
      'E2E_DATABASE_URL is not set. These tests wipe and re-seed their database, so they need a NEW, dedicated test ' +
        'database URL (never your application database). Provide it for this run: E2E_DATABASE_URL=postgresql://... npx playwright test'
    )
  }
  const testFp = fingerprint(testUrl)
  if (!testFp) throw new Error('E2E_DATABASE_URL is not a valid URL.')
  for (const appUrl of collectAppDatabaseUrls(root)) {
    if (fingerprint(appUrl) === testFp) {
      throw new Error(
        `REFUSING TO RUN: E2E_DATABASE_URL points at the same host/database (${testFp}) as the application's DATABASE_URL. ` +
          'Create a separate database (e.g. a new Neon branch/project) for e2e tests.'
      )
    }
  }
  return testUrl
}
