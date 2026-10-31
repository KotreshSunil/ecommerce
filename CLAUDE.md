# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This directory is a workspace of independent web-app projects, not a monorepo — there is no root `package.json`, and each project has its own `package.json`, `node_modules`, and `CLAUDE.md`. Run all npm commands from inside the relevant project directory.

- `ecommerce/` — the only project tracked by this repo's git history (React + Vite SPA, Express server, Neon Postgres + TiDB MySQL, Better Auth). See `ecommerce/CLAUDE.md` for commands, environment variables, and architecture.
- `airline-booking-portal/`, `tennis-court-booking/`, `restaurant-reservations/` — sibling projects, each with its own git repo and listed in the root `.gitignore`. Changes there are not committed to this repo; read each project's own `CLAUDE.md` before working in it.

The workspace-level skill `e2e-test-suite-ui-playwright` lives in `.claude/skills/` and is meant to be reused on these apps: it scaffolds and runs a headed Playwright regression suite, and must always ask the user for a new throwaway test DB URL (never the app's own). The reference implementation is `ecommerce/e2e/`.

`render.yaml` at this root is the Render Blueprint for `ecommerce/` (it uses `rootDir: ecommerce`); see `ecommerce/CLAUDE.md` for deployment details.

Because `.gitignore` excludes those three directories, `git status` at the root only reflects `ecommerce/` changes. Also ignored: `node_modules`, `dist`, `.env`, `*.local`, `.claude/settings.local.json`.

The sibling projects share a common stack shape (Vite frontend + `server/` Express backend), but don't assume code or config is shared between them — verify in the project you're editing.
