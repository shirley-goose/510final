# Security & QA review (automated + manual)

**Scope:** Pre-release QA issue — automated tests, bundle checks, and RLS review (no live penetration test logged here).

## Supabase RLS (cross-user access)

Policies are defined in SQL migrations:

| Resource | Policy idea |
|----------|-------------|
| **`public.companions`** | `auth.uid() = user_id` on SELECT, INSERT, UPDATE, DELETE (`002_create_companions.sql`). |
| **`public.pet_uploads`** | `auth.uid() = user_id` on SELECT / INSERT (`001_create_pet_uploads.sql`). |
| **`storage.objects` (pet-uploads)** | Path folder matches `auth.uid()` for insert/select (`001_create_pet_uploads.sql`). |

**API routes** (`/api/uploads`, `/api/generate`, `/api/companions/[id]`) use the **Supabase service role** on the server. They must **never** trust the client for `user_id`: all handlers resolve the user from the **Bearer JWT** (`getUser` / `authenticateBearer`) and scope queries/updates with that `user.id`. Companion mutations use `.eq('user_id', auth.user.id)` so another user’s UUID in the path cannot access rows.

**Manual verification:** In Supabase SQL editor (optional), `select * from companions` as a normal user session should only return own rows; RLS applies to the Postgres role used by the client. Service role bypasses RLS by design — only use it in trusted server routes.

## Client bundles (secrets)

- `NEXT_PUBLIC_*` vars are **expected** in browser bundles (Supabase URL + anon key for auth).
- **Forbidden** in client chunks: `SUPABASE_SERVICE_ROLE_KEY`, `MESHY_API_KEY`, `THREED_AI_STUDIO_API_KEY`, and similar server env reads.

**Automated checks (no trufflehog):**

- **Source:** `npm run security:scan-source` — rejects obvious hardcoded `MESHY_API_KEY` / `THREED_AI_STUDIO_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` assignments in `app/`, `lib/`, `components/`.
- **Built client chunks:** After `npm run build`, run `npm run security:scan-bundles`. It scans `.next/static/chunks/**/*.js` for forbidden patterns. A clean run prints `OK`.

**Static checks (Vitest):** `tests/integration/pipeline.integration.test.ts` and `tests/security/env-and-secrets.test.ts` assert `lib/supabase/client.ts` and `use client` modules do not reference server-only secret names.

## Automated tests

| Suite | Role |
|-------|------|
| `tests/api/*` | API route unit tests (auth gates, validation, companion CRUD, GET generate status) with mocked `getSupabaseAdmin`. |
| `lib/uploads/validation.test.ts` | Upload validation rules used before `/api/uploads`. |
| `tests/security/env-and-secrets.test.ts` | **Security:** `.env.example` shape, `.gitignore` for env files, browser client must not name server secrets, `use client` modules must not mention those identifiers. |
| `tests/integration/pipeline.integration.test.ts` | Offline smoke + client source sanity. |

**Full upload → 3D AI Studio → `.glb` display** is **not** fully automated (requires real provider keys and Supabase). Run manual QA: upload → generate → dashboard/overlay.

## Commands (CI / local)

```bash
npm test                       # vitest (includes security tests above)
npm run security:scan-source # scan app/lib/components for hardcoded-looking API keys (no build required)
npm run lint                 # next lint --max-warnings 0
npm run build                # production build (server env optional at build time)
npm run security:scan-bundles   # run after build — client chunks must not contain server secrets
npm run qa                   # test + scan-source + lint + build + bundle scan (see package.json)
```

## Findings

- **PASS:** Vitest suite (≥3 automated tests across API, validation, security, integration); ESLint no warnings with `eslint-config-next@14` + `eslint@8`; production build succeeds without production secrets in env; `security:scan-source` and bundle scan find no leaked secret patterns; RLS policies documented above align with “users only see own rows” for direct client access.
- **Residual risk:** Service-role APIs are powerful — keep deploy secrets out of git; rotate keys if leaked.
- **Manual:** Re-run bundle scan on each release after `next build`; re-verify RLS if migrations change.
