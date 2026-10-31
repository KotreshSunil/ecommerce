# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A small e-commerce demo ("ecommerce-portal"): a React SPA (Vite) served by an Express server, backed by two interchangeable databases wired up in parallel — Neon (serverless Postgres) and TiDB Serverless (MySQL-compatible).

## Commands

- `npm run dev` — Vite dev server for the React frontend (hot reload). `vite.config.js` proxies `/api/*` to `http://localhost:3000`, so the Express server (see below) must also be running separately for API calls (and Better Auth's session cookie) to work in dev.
- `npm start` — run the Express server (`server/index.js`) against the built `dist/` output. Requires `npm run build` first.
- `npm run build` — Vite production build to `dist/`.
- `npm run preview` — preview the Vite production build.
- `npm run serve` — build then start the Express server (`build && start`) — the closest thing to a full production run locally.
- `npm run db:seed` — create Postgres `products`/`orders` tables if missing and seed `products` from `server/db/seed-data.js`. Also adds the `orders.user_id` column if missing.
- `npm run db:seed:mysql` — same, but against TiDB Serverless (MySQL-flavored schema, same seed data). Not wired to Better Auth — see Authentication below.
- `npm run db:auth:migrate` — runs Better Auth's own CLI (`npx auth@latest migrate --config server/auth.js -y`, non-interactive) to create/update its `user`/`session`/`account`/`verification` tables directly in Neon Postgres. Re-run after changing `server/auth.js`'s config (e.g. adding a plugin) in a way that changes the schema.

- `E2E_DATABASE_URL='<throwaway test DB>' npm run test:e2e` — Playwright UI regression suite (`e2e/*.spec.js`, config in `playwright.config.js`). Single file: `... npx playwright test e2e/cart.spec.js`; single test: `-g "title"`. `npm run test:e2e:report` opens the HTML report (`e2e-report/`; traces/videos of failures in `e2e-results/`). See "E2E tests" below before running.

There is no lint config and no unit-test suite; the Playwright suite is the only test suite.

## Environment

- Requires `DATABASE_URL` (Neon Postgres connection string) in `.env` — copy `.env.example` to `.env` and fill it in. `server/db/client.js` throws at import time if it's unset.
- Requires `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE` (TiDB Serverless connection details, from the cluster's "Connect" dialog at tidbcloud.com) in `.env`. `server/db/mysql-client.js` throws at import time if any are unset — meaning the server won't start at all without both databases configured.
- `PORT` is optional (defaults to 3000) for the Express server.
- Requires `BETTER_AUTH_SECRET` (32+ bytes of entropy — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) and `BETTER_AUTH_URL` (the server's own base URL, e.g. `http://localhost:3000`) in `.env`. Used by `server/auth.js`.

## Architecture

**Two runtimes, one process in production.** The Express server (`server/index.js`) mounts the Better Auth handler at `/api/auth/*`, then `/api/products` and `/api/orders` (plus the MySQL-mirrored routes), then falls back to serving static files from `dist/` and an SPA catch-all (`app.get('*', ...)` → `dist/index.html`). In dev, the frontend runs under Vite (`npm run dev`) separately from the API, proxied via `vite.config.js`.

**Authentication (Better Auth).** `server/auth.js` configures `betterAuth()` with email/password sign-in, backed by a `pg.Pool` (the `pg` package) pointed at the *same* Neon Postgres database the tagged-SQL `sql` client uses — a second, unrelated way of talking to that DB, used only for auth. Better Auth's handler is mounted with `toNodeHandler(auth)` at `app.all('/api/auth/*', ...)` in `server/index.js`, registered *before* `express.json()` (Better Auth parses its own request bodies). Sessions are cookie-based; route handlers read the current session server-side with `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })` (see `server/routes/orders.js`). On the client, `src/lib/auth-client.js` wraps `createAuthClient` from `better-auth/react` and exports `signIn`/`signUp`/`signOut`/`useSession`. `src/components/RequireAuth.jsx` is a route-guard component (the only one in the app) that redirects to `/login` when `useSession()` has no session; it wraps the `/checkout` and `/orders` routes in `App.jsx`. `orders.user_id` (added via `ALTER TABLE` in `server/db/seed.js`, `REFERENCES "user"(id)`) links an order to the signed-in user — `POST /api/orders` requires a session and sets it, `GET /api/orders/mine` (backs `src/pages/OrderHistory.jsx`) filters by it. None of this touches the MySQL/TiDB side, which remains unused by the frontend.

**Database access, mirrored across two backends** — there's no ORM or query-builder layer in either:
- Postgres/Neon: `server/db/client.js` exports a tagged-SQL `sql` client from `@neondatabase/serverless`, used by `server/routes/products.js` and `server/routes/orders.js`, mounted at `/api/products` and `/api/orders`. This is what the React frontend actually talks to.
- MySQL/TiDB: `server/db/mysql-client.js` exports a `mysql2/promise` pool, used by the near-identical `server/routes/products-mysql.js` and `server/routes/orders-mysql.js` (parameterized `?` queries instead of tagged templates), mounted at `/api/mysql/products` and `/api/mysql/orders`. Same response shapes as the Postgres routes, but nothing in the frontend calls these yet — they exist so the same data can be read/written through either database.

Both sides store prices as fixed-point decimals (`NUMERIC` in Postgres, `DECIMAL` in MySQL) that come back from their drivers as strings, so every route handler converts with a `toNumber`-style helper before sending JSON.

**Schema and seed data** live together, once per backend: `server/db/seed.js` (Postgres) and `server/db/seed-mysql.js` (MySQL) each create their own `products`/`orders` tables (idempotent `CREATE TABLE IF NOT EXISTS`, with backend-appropriate types — e.g. `SERIAL`/`TIMESTAMPTZ`/`JSONB` vs `AUTO_INCREMENT`/`TIMESTAMP`/`JSON`) and both upsert rows from the *same* `server/db/seed-data.js` array (Postgres via `ON CONFLICT (id) DO NOTHING`, MySQL via `ON DUPLICATE KEY UPDATE id = id`). There are no migration files — schema changes mean editing the relevant `seed*.js` file directly, and likely both if the schema change should apply to both backends.

**Frontend state**: cart state lives in `src/context/CartContext.jsx`, a React Context provider wrapping the whole app in `App.jsx`. It persists to `localStorage` via the generic `src/hooks/useLocalStorage.js` hook (key `ecommerce_cart`) rather than calling an API — the cart is client-only until checkout. `Checkout.jsx` is what POSTs the cart to `/api/orders` and clears it on success.

**Routing**: plain `react-router-dom` `BrowserRouter` in `App.jsx` with product list (`/`), product detail (`/product/:id`), cart (`/cart`), checkout (`/checkout`, gated by `RequireAuth`), `/login`, `/register`, and `/orders` (also gated). Pages fetch their own data with `useEffect` + `fetch` (no data-fetching library); loading/error states are handled per-page with local `status` state (`'loading' | 'ready' | 'error'`, or `'idle' | 'submitting' | 'error'` for the auth forms).

**E2E tests (Playwright).** Created/run via the `e2e-test-suite-ui-playwright` skill (`../.claude/skills/`), which also holds the reusable templates for the infrastructure in `e2e/support/`.
- Always headed (`headless: false` in `playwright.config.js`) — never change that.
- Needs a NEW, disposable Postgres URL in `E2E_DATABASE_URL` on every run; never use the app's `.env` `DATABASE_URL`. `e2e/support/db-guard.js` refuses to run if it matches the app's DB. `global-setup.js` **drops the whole `public` schema** in that DB, then runs `npm run db:auth:migrate` and `npm run db:seed`, so every run starts blank.
- `webServer` builds and boots its own server on port 3100 (`E2E_PORT` to override, never reuses an existing server) with `DATABASE_URL` overridden to the test DB (dotenv never overrides already-set env vars), dummy `TIDB_*` values (the UI never uses TiDB), and `BETTER_AUTH_URL` set to the test origin.
- The `webServer` health check must hit a route that doesn't query the DB (`/`): the server boots before `global-setup.js` creates the schema, and an async DB error in an Express 4 route crashes the process.
- After clicking "Sign out", wait for the signed-out UI before signing in again, otherwise the sign-out request can finish after the new login and wipe it.
- Tests create unique users per test (`uniqueUser()`/`signedIn` fixture in `e2e/support/fixtures.js`; the `db` fixture queries the test DB to assert persisted rows). Better Auth's sign-up API requires an `Origin` header, so API sign-ups pass `origin: baseURL`. Expected catalog data is imported from `server/db/seed-data.js`, not hard-coded.

**Deployment (Render).** Deployed as a single Node web service (Express serves the built `dist/`) at https://ecommerce-portal-d6tt.onrender.com (service id `srv-dbioblijnfac73b67qig`, free plan — sleeps when idle, slow first request). Defined by `render.yaml` at the *git root* (one level above this directory) with `rootDir: ecommerce`, build `npm install && npm run build`, start `npm start`, health check `/`. Auto-deploys on push to `main` of `KotreshSunil/ecommerce`. Gotchas:
- Env vars (`DATABASE_URL`, `TIDB_*`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) are set on Render, not in the repo (`sync: false` in the blueprint). Production uses the *same* Neon/TiDB databases as local `.env`, so prod and local share data.
- `BETTER_AUTH_URL` must equal the real public URL; Render added a `-d6tt` suffix to the hostname, so changing the service name/URL means updating it and redeploying or sign-in breaks.
- No seed/migrate step runs on deploy; schema changes require running the `db:*` scripts manually against the DB.
- Step-by-step (including the API-driven flow) is in the `build-fullstack-react-app` skill, `references/deploy-render.md`.

**Styling**: one plain CSS file per page/component under `src/styles/`, imported directly into the corresponding JSX file (no CSS modules, no CSS-in-JS, no Tailwind).
