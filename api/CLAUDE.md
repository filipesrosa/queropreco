# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
queropreco/
├── api/   ← you are here (Fastify + Prisma + PostgreSQL, port 3001)
└── app/   ← Next.js 15 frontend (port 3000)
```

## Environment setup

Node 22 via nvm is required before running any command:

```bash
source ~/.nvm/nvm.sh && nvm use 22
```

Package manager: **pnpm**

## Development commands (api/)

```bash
pnpm dev          # start API with tsx watch (hot reload)
pnpm build        # tsc compile to dist/
pnpm start        # run compiled dist/server.js

pnpm db:generate  # regenerate Prisma client after schema changes
pnpm db:migrate   # run migrations (creates new migration if schema changed)
pnpm db:studio    # open Prisma Studio
```

Environment variable required: `DATABASE_URL` (PostgreSQL connection string).

## Architecture

### API request flow

1. **`src/server.ts`** — Fastify bootstrap, registers CORS and route plugins, listens on `$PORT` (default 3001).
2. **`src/routes/capture.ts`** — `POST /bills/capture { url }` fetches an NFC-e HTML page, parses it via `nfce-parser`, then delegates to `upsertBill`. Also `POST /bills/barcode { accessKey }` for 44-digit barcode-only capture (no item detail).
3. **`src/routes/bills.ts`** — `POST /bills` (full upsert from a `NFCeReceipt` body), `GET /bills` (paginated list, optional `from`/`to` date filter), `GET /bills/:id`.
4. **`src/lib/bill-upsert.ts`** — shared upsert logic called by both routes inside a Prisma transaction. Upserts Establishment by CNPJ, finds existing Bill by `invoice.accessKey`, then either updates all sub-records or creates new ones. Items are always deleted and recreated on update.
5. **`src/lib/nfce-parser.ts`** — cheerio-based HTML parser for SP SEFAZ NFC-e format. Uses multi-strategy CSS selectors with fallbacks.
6. **`src/types/nfce.ts`** — `NFCeReceipt` TypeScript interfaces (mirrored in `app/types/nfce.ts`).

### Data model (Prisma)

`Establishment` (upserted by CNPJ) → `Bill` → one-to-one: `Invoice` (unique by `accessKey`), `Payment`, `Taxes`; one-to-many: `Item[]`.

Decimal currency fields use `@db.Decimal(10,2)`; item quantity uses `@db.Decimal(10,3)`.

### Frontend (app/)

- `app/page.tsx` — home with entry points: QR scan or barcode input.
- `app/scan/page.tsx` — `?mode=barcode` shows 44-digit key input; default shows camera QR scanner. On scan, redirects to `/review?url=<encoded>` or `/review?barcode=<key>`.
- `app/review/page.tsx` — POSTs to `/bills/capture` or `/bills/barcode`, shows editable receipt. If unchanged: confirm and go home. If changed: re-POST to `/bills` with the edited `NFCeReceipt`.
- `components/QrScanner.tsx` — `html5-qrcode` wrapper, always dynamically imported (SSR disabled).

`NEXT_PUBLIC_API_URL` env var points the frontend at the API (defaults to `http://localhost:3001`).

## Key conventions

- All Fastify route files export an async plugin function and are registered in `server.ts`.
- TypeScript imports use `.js` extensions (ESM, `"type": "module"` implied by tsx).
- The `NFCeReceipt` type is the contract between parser → upsert → frontend. Keep `api/src/types/nfce.ts` and `app/types/nfce.ts` in sync when changing it.
- `upsertBill` always receives a Prisma transaction client (`TxClient`), never the top-level `prisma` singleton — callers are responsible for wrapping in `prisma.$transaction(...)`.
