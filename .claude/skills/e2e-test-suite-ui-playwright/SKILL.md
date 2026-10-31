---
name: e2e-test-suite-ui-playwright
description: Create and run a repeatable Playwright UI regression suite (headed, never headless) for a full-stack web app (React/Vite + Express + Postgres style), against a dedicated throwaway test database. Use whenever the user asks to e2e test, UI test, regression test, smoke test, or "run the Playwright tests" on an app, or wants to check a change didn't break the UI before merging. Always asks the user for a NEW test DB URL; never uses the app's own database.
---

# e2e-test-suite-ui-playwright

Builds (first time) and runs (every time) a real Playwright regression suite for a full-stack app. The suite lives **inside the app** in `e2e/` + `playwright.config.js`, is committed, and is re-run on demand before merging changes. Working reference implementation: `ecommerce/` in this workspace (`ecommerce/e2e/`, `ecommerce/playwright.config.js`). Infrastructure templates: `templates/` next to this file.

## Non-negotiable rules

1. **Headed always.** `headless: false` in the config. Never pass `--headless`, never set `headless: true`, never "fix" a display problem by going headless. If it cannot open a window, tell the user.
2. **Always ask for a NEW test DB URL, every run.** Use AskUserQuestion at the start of every invocation, even if you used one before or one is in the environment. Never read, reuse, or fall back to the app's `.env` / `DATABASE_URL`. Never write the URL to disk (not into `.env`, config, memory, or the report); pass it only as the `E2E_DATABASE_URL` environment variable on the command line. The suite **drops the entire `public` schema** in that DB each run, so make sure the user knows that and that it is disposable (e.g. a fresh Neon branch/project).
3. **Never touch the app's real DB.** Keep `db-guard.js`: it refuses to run if the test URL has the same host+database as any `DATABASE_URL` in the shell env or app `.env*` files. Keep `reuseExistingServer: false` and a non-dev port so the suite always boots its own server wired to the test DB.
4. **Real assertions, repeatable.** Every run starts from a blank schema (migrate + seed). Tests create their own unique users (`uniqueUser()`), never depend on order or leftover data, and assert on persisted DB rows as well as UI. No `waitForTimeout` sleeps; use web-first `expect` assertions.
5. **Report honestly.** If tests fail, show the failing test names and errors. Do not edit a test to make it pass unless the test is wrong; if the app is wrong, say so. Don't claim green without a run.

## Step 1 - Ask for the test database

Ask with AskUserQuestion (free text via "Other"): the dedicated test DB connection URL (Postgres/Neon). If the app also needs other datastores to boot (e.g. a TiDB/MySQL client that throws at import time), ask whether dummy placeholder env values are acceptable when the UI never uses them, or whether they will supply a test one. State plainly that the schema in this DB will be wiped.

If the user supplies a URL identical to the app's own, refuse and ask again.

## Step 2 - Detect state

In the app root (the dir with `package.json`):
- `playwright.config.js` + `e2e/` exist -> **Run mode** (Step 4). If the app changed since the suite was written (new pages/routes/features in `git diff`/`git log`), also do Step 3b first for the new behavior.
- Otherwise -> **Create mode** (Step 3).

## Step 3 - Create mode

**a. Learn the app** (read, don't guess): `package.json` scripts, the server entry (what it serves, port, env vars it requires at import time), auth setup, DB schema/seed/migration commands, the router, every page's visible texts/roles/labels, and API routes. Note what is rendered from the DB and which routes are auth-guarded.

**b. Install and scaffold**
```
npm i -D @playwright/test
npx playwright install chromium
```
Copy `templates/playwright.config.js` -> app root and `templates/e2e/support/*` -> `e2e/support/`, then edit only the marked app-specific blocks:
- `playwright.config.js`: `PORT`, `START_COMMAND` (build + start the prod-like server), `HEALTH_PATH` (a route that does not query the DB - the server starts before global-setup builds the schema, and an async DB error crashes Express 4), and the `webServer.env` block (point every DB/URL/secret env var the app needs at test values; `DATABASE_URL` <- `E2E_DATABASE_URL`; the app's own base-URL/auth-secret vars -> test values; unused datastores -> dummy values).
- `global-setup.js`: `SCHEMA_COMMANDS` (the app's own migrate + seed scripts, in dependency order). If the DB is not Postgres, swap the schema-reset query and the `pg` client accordingly.
- `fixtures.js` / `helpers.js`: adapt sign-up endpoint, field labels, and user shape to the app's auth. Drop the `signedIn` fixture if there is no auth.
- Add scripts to `package.json`: `"test:e2e": "playwright test"`, `"test:e2e:report": "playwright show-report e2e-report"`. Add `e2e-report/` and `e2e-results/` to `.gitignore`.

**c. Write specs** (`e2e/<feature>.spec.js`), covering at minimum, as applicable:
- Every page renders its seeded data correctly (counts, names, prices, formatting) - import the seed array rather than hard-coding numbers.
- Every primary user journey end to end (browse -> add to cart -> sign up -> checkout -> history; or the app's equivalent), asserting the DB row afterwards via the `db` fixture.
- Auth: register, login, wrong password, duplicate email, sign out, session persists on reload, guarded routes redirect anonymous users and return them after login.
- Input validation and boundaries (min quantity, required fields, HTML validation).
- Isolation: one user cannot see another's data.
- Error states: `page.route()` to force 500s and assert the error UI and that no state was lost.
- API contract basics: 401 without session, 400 on bad payload, 404 on unknown id, numeric types.
- Cross-cutting state: persistence across reload (localStorage etc.).

Selector priority: role/label/text > stable class names > nothing else. Do not add test ids to the app unless a selector is otherwise impossible (then say so).

## Step 3b - Extending for new work

When the app gained features since the last run, add specs for them in the same style before running; keep existing specs unless the intended behavior genuinely changed (then update with a note to the user).

## Step 4 - Run mode

From the app root:
```
E2E_DATABASE_URL='<url from the user>' npx playwright test
```
(Single spec: `... npx playwright test e2e/cart.spec.js`; single test: `-g "title"`; debug a failure: `--debug`.) It opens real Chromium windows; tell the user that is expected and not to close them. First run is slow (build + `npx auth@latest` etc.); allow up to ~10 minutes via the Bash timeout, or run in the background and wait for the completion notice.

Then report: pass/fail counts, each failing test with its error and the artifact path (`e2e-results/<test>/` has trace, screenshot, video; `npm run test:e2e:report` opens the HTML report). For each failure decide: product bug (report it, point to the code), outdated test (fix it and say why), or flake (investigate the missing wait; re-run once; don't just retry blindly). Failing runs are never summarized as passing.

## Troubleshooting

- "E2E_DATABASE_URL is not set" / "REFUSING TO RUN": the guard is working; get a different DB from the user.
- Server never becomes healthy: run `START_COMMAND` manually with the same env to see the import-time error (missing env var is the usual cause).
- Port in use: set `E2E_PORT`.
- Auth sign-up via API returns 403: the auth library checks `Origin`; keep the `origin: baseURL` header.
- Windows opening is a hard requirement; on machines without a display, stop and tell the user rather than switching to headless.
