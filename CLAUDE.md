# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Gmail Invoice Scanner Service — a Node/TypeScript/Express microservice. It searches a Gmail inbox for invoice emails from/to a set of supplier addresses, downloads PDF/XML/ZIP attachments, and parses them into structured invoice data (RUC/RUT, supplier name, totals, line items). The service owns the OAuth lifecycle for the Gmail accounts it scans: it implements the full Google consent flow, persists each connected account's tokens (encrypted) in PostgreSQL via Prisma, and refreshes them automatically. Callers identify which account to use by email (`accountEmail`) — they never handle raw Gmail tokens.

## Commands

```bash
pnpm run dev     # ts-node-dev with watch, runs src/index.ts directly (no build step)
pnpm run build   # tsc -> dist/
pnpm start        # node dist/index.js (requires build first)
pnpm test         # jest (all tests)
```

Run a single test file or test case:
```bash
pnpm exec jest src/tests/scanner.service.test.ts
pnpm exec jest -t "should parse Chile (DTE) XML structure correctly"
```

Local manual testing utilities (bypass the HTTP layer, read credentials from `.env`):
```bash
node scratch/test_gemini.js <path/to/invoice.pdf>   # test Gemini PDF extraction in isolation
node scratch/test_real_scanner.js                    # test the full scan() flow against a connected Gmail account (needs TEST_ACCOUNT_EMAIL)
```

Prisma / database:
```bash
pnpm exec prisma migrate dev --name <name>   # create + apply a migration in development (needs DATABASE_URL)
pnpm exec prisma generate                     # regenerate the Prisma Client after schema changes (also runs on pnpm install via postinstall)
```

## Architecture

- `src/index.ts` — Express app setup, CORS/body-size middleware (50mb, for base64 payloads), the `requireApiKey` middleware, and route wiring. Fails closed: if `SERVICE_API_KEY` isn't set, every protected request gets a 503 rather than skipping auth. `GET /auth/google/callback` is the one route deliberately left off `requireApiKey` (see below).
- `src/scanner.controller.ts` — `ScannerController` validates request input (`accountEmail`, sinceDate/supplierEmails or raw `q`), resolves an authenticated Gmail client via `AccountsService.getAuthorizedClient(accountEmail)`, and translates `ScannerService` results into HTTP responses. All error responses use a `{ userMessage, technicalError }` shape — `userMessage` is Spanish, user-facing; `technicalError` is the raw error for logs/debugging. `AccountNotFoundError` maps to `404`.
- `src/scanner.service.ts` — all the invoice-scanning logic, organized around two public entry points, both taking an already-authenticated `authClient: Auth.OAuth2Client` (imported from `googleapis`, not the standalone `google-auth-library` package — see "OAuth client typing" below):
  - `scan(req: ScanRequest)` — builds a Gmail search query (either from `supplierEmails` + `sinceDate`, or a raw `q` override), paginates `gmail.users.messages.list` up to `MAX_MESSAGES_PER_SCAN = 500` (setting `truncated: true` if the cap is hit), fetches each message, collects PDF/XML/ZIP attachments, and parses them. Per-message failures are collected into a `fallidas` array rather than aborting the whole scan.
  - `downloadInvoicePDF(...)` — fetches a single attachment by `messageId`/`attachmentId`, transparently unzipping if the target is inside a `.zip` and extracting the requested (or first) PDF.
- `src/accounts.controller.ts` — `AccountsController`, the OAuth connection flow: `login` (returns Google's consent URL), `callback` (exchanges the code, renders a small HTML result page — this is hit by an end user's browser, not an API caller), `list`, `remove`.
- `src/accounts.service.ts` — `AccountsService`, the account/token lifecycle: `getAuthUrl()`, `handleCallback(code, state)` (validates `state`, exchanges the code, upserts the `GmailAccount` row with encrypted tokens), `listAccounts()`, `deleteAccount(email)`, and `getAuthorizedClient(email)` (decrypts stored credentials into an `OAuth2Client`, and registers a `.on('tokens', ...)` listener so `google-auth-library`'s automatic refresh-before-expiry gets persisted back to the DB — no manual expiry-checking logic).
- `src/crypto.util.ts` — AES-256-GCM encrypt/decrypt for tokens at rest, keyed by `TOKEN_ENCRYPTION_KEY` (32-byte hex).
- `src/oauth-state.ts` — signs/verifies the OAuth `state` param (HMAC-SHA256, 10-minute TTL, no persistence — reuses `TOKEN_ENCRYPTION_KEY` as the HMAC secret). This is what protects `/auth/google/callback` instead of `x-api-key`, since that endpoint is hit by the end user's browser, not an authenticated caller.
- `src/prisma.ts` — the `PrismaClient` singleton, instantiated with the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter; it no longer reads `DATABASE_URL` from the schema automatically — see "Prisma 7 specifics" below).

Every request needs `accountEmail`; the Gemini API key can still come from the request body or fall back to `GEMINI_API_KEY`. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` are env-only now — no per-request override.

### OAuth client typing

`googleapis` bundles its own nested copy of `google-auth-library` (a different version than what you'd get installing `google-auth-library` standalone). Always type Gmail-auth values as `Auth.OAuth2Client` via `import { google, Auth } from 'googleapis'` — never add `google-auth-library` as a direct dependency and import `OAuth2Client` from it, that produces two structurally-incompatible `OAuth2Client` types and `google.gmail({ auth })` fails to typecheck.

### Prisma 7 specifics

This project is on Prisma 7, which changed several defaults from Prisma 5/6:
- `datasource.url` in `prisma/schema.prisma` is no longer allowed — the connection string lives in `prisma.config.ts` (`datasource.url: process.env.DATABASE_URL`), used by the CLI (`migrate dev`/`migrate deploy`/`generate`).
- `PrismaClient` no longer reads `DATABASE_URL` implicitly; it must be constructed with an explicit driver `adapter` (`src/prisma.ts` uses `@prisma/adapter-pg`).
- The generator is pinned to `provider = "prisma-client-js"` (not the newer `"prisma-client"`), so the client still generates into `node_modules/@prisma/client` and imports as `from '@prisma/client'` — this avoids the new generator's TS-source output, which would violate `tsconfig.json`'s `rootDir: "./src"`.
- The query engine is WASM-based (bundled in the generated client), so no `binaryTargets` are needed in the schema for the app to run cross-platform; only the CLI's native schema-engine binary (used by `migrate deploy`) is platform-specific, and it's downloaded automatically for whatever platform runs `pnpm install`.

### Attachment parsing priority

For a given message, XML is preferred over PDF when both are present (XML parsing is free/local; PDF requires a paid Gemini call). The flow per message:
1. If a ZIP attachment exists, decompress in memory (`adm-zip`) and look for XML/PDF inside.
2. If an XML is found (loose or inside the ZIP), parse it with `parseXMLInvoice` — a format-detecting parser (via `findDeepValue`/`getText` helpers) covering Chile DTE, Peru/Colombia UBL, Mexico CFDI, and Ecuador SRI (including CDATA-wrapped envelopes), with a generic fallback.
3. Only if no usable XML was found, and a `geminiApiKey` was supplied, fall back to `parsePDFInvoice`, which sends the PDF to Gemini (`gemini-3.5-flash` via `@google/genai`, see `.agents/skills/gemini-interactions-api/SKILL.md` for current model/SDK usage) with a strict `responseSchema` for structured extraction.
4. `cleanParsedData` normalizes/sanitizes the final result before it's added to `facturas`.

### Testing approach

Tests mock `googleapis` (`google.gmail`, `google.auth.OAuth2`) and `@google/genai` — no live network calls or real credentials are used in the suite. `src/tests/accounts.service.test.ts` additionally mocks `../prisma.js` with a plain object of `jest.fn()`s for `gmailAccount.findUnique/findMany/upsert/update/delete` (no real DB in tests). Controller-level tests (`scanner.controller.test.ts`, `accounts.controller.test.ts`) import the real `app` from `src/index.ts` and mock the service layer (`../scanner.service.js`, `../accounts.service.js`) with `jest.requireActual` spread in for the error classes (`AccountNotFoundError`, `InvalidOAuthStateError`), so `instanceof` checks in the controllers still work against mocked rejections.

`src/tests/scanner.service.test.ts` is organized by concern: per-country XML parsing, ZIP/XML-vs-PDF prioritization, Gmail query construction, pagination/truncation, error collection into `fallidas`, and `downloadInvoicePDF` (including the ZIP-extraction and XML→PDF attachment-swap edge cases). `jest.config.js` maps `.js`-suffixed imports back to `.ts` for `ts-jest`, since `tsconfig.json` targets `NodeNext` module resolution (imports use `.js` extensions in source even though the files are `.ts`).

## Deployment

Deployed via a multi-stage `Dockerfile` (builder compiles TypeScript, runner installs only production deps) to Dokploy. Both stages copy `prisma.config.ts` and `prisma/` and run `pnpm install --frozen-lockfile` *before* anything else, because `postinstall: prisma generate` needs the schema present. The container's `CMD` runs `pnpm exec prisma migrate deploy` before `pnpm start`, since `DATABASE_URL` is a Dokploy runtime env var, not available at build time. See the "Despliegue en Dokploy" section of `README.md` for the full list of required environment variables (`SERVICE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `DATABASE_URL`, `TOKEN_ENCRYPTION_KEY`, `GEMINI_API_KEY`, `SUPPLIER_EMAILS`).

## Roadmap / known gaps

`docs/roadmap_mejoras.md` tracks a 3-phase improvement plan with completion status. Notable *pending* items as of the last update: cross-validation of Gemini-extracted totals against item sums (`needsReview` flag), retry/backoff on Gmail/Gemini transient errors, a `correlationId` for cross-service log tracing, making the Gemini model configurable via env var, and bounded concurrency for attachment processing.
