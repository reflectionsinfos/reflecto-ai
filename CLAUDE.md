# Reflecto AI — Claude Code Context

## Project Structure

Monorepo with two apps:
- `apps/backend` — Express + TypeScript API, Drizzle ORM, PostgreSQL
- `apps/frontend` — Next.js (App Router), MSAL (Azure SSO), Tailwind

## Database

**Schema changes are deployed manually — do NOT use `drizzle-kit migrate`.**

The production database (`192.168.117.144:5432`, schema `reflecto-ai-2`) was created
outside of drizzle-kit, so there is no `drizzle.__drizzle_migrations` tracking table.
Running `drizzle-kit migrate` would attempt to replay all migrations from `0000` and
fail on `CREATE SCHEMA` (already exists).

### How to apply schema changes

1. Update `apps/backend/src/db/schema.ts`
2. Run `npx drizzle-kit generate` from `apps/backend/` to produce the SQL file in `./drizzle/`
3. Extract only the new `ALTER TABLE` / `CREATE TABLE` statements from the generated file
4. Run those statements directly against the DB using psql, DBeaver, or any SQL client
5. Do **not** run `drizzle-kit migrate`

## Authentication

Azure SSO via MSAL (frontend) + `passport-azure-ad` BearerStrategy (backend).

- Users are auto-provisioned on first login via `GET /api/users/me`
- Lookup order: Azure OID (`azure_oid` column) → email fallback (for pre-OID users)
- New users get `role = 'user'` by default; role changes must be done directly in the DB
- The `POST /api/users` endpoint has been removed — user creation is SSO-only
