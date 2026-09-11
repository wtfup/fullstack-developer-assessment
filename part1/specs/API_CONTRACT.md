# Part 1 — API Contract (frozen)

Implement a JSON API in `part1/server/server.mjs` using **Node stdlib `http` + `pg` only** (no frameworks). Serve the dashboard from `WEB_DIR` at `/`. All money values are integer **paise**. This contract is judged by `tests/part1/backend.test.mjs` exactly as written here.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `4318` | HTTP port |
| `DATABASE_URL` | — | Postgres connection string (provided by the lab) |
| `LAB_SCHEMA` | `part1_lab` | Schema to apply as the Postgres `search_path` for every connection |
| `WEB_DIR` | `part1/web` | Directory served as static root at `/` |

All SQL must run inside `LAB_SCHEMA` (set `search_path` per connection/pool). Load the seed fixture to develop against: `npm run db:reset:part1`.

## Error envelope (all non-2xx JSON responses)

```json
{ "error": { "code": "validation", "message": "human readable", "fields": [ { "path": "issuedOn", "message": "must be YYYY-MM-DD" } ] } }
```

`fields` is optional; include it for `validation` errors on request bodies (one entry per invalid field).

| code | HTTP | used for |
|---|---|---|
| `validation` | 400 | malformed body/JSON, invalid or missing fields, invalid query params |
| `not_found` | 404 | unknown id / unknown resource / unmatched `/api/*` route |
| `conflict` | 409 | duplicate invoice number, duplicate payment reference, idempotency-key conflict |
| `invalid_transition` | 409 | forbidden invoice status change (incl. same-status) |
| `invalid_state` | 409 | payment against a `draft`/`void` invoice |
| `unsupported_media_type` | 415 | request body without `content-type: application/json` |
| `payload_too_large` | 413 | request body larger than 16 KB (16 384 bytes) |
| `internal` | 500 | unexpected server error |

Request bodies: `content-type` must be `application/json` (charset parameter allowed); otherwise `415`. Malformed JSON → `400 validation`. Bodies over 16 384 bytes → `413 payload_too_large`. No CORS headers are required.

## Routes

### `GET /health`

Runs `SELECT 1`. DB reachable → `200 {"status":"ok","db":"up"}`; DB unreachable → `503 {"status":"degraded","db":"down"}`.

### `GET /api/clients`

`200 { "items": [ { "id", "name", "email", "createdAt" } ] }` — all clients ordered by `name` ascending. `createdAt` is an ISO-8601 string.

### `GET /api/invoices?status=&q=&cursor=&limit=`

`200 { "items": [ ... ], "nextCursor": string|null }`

Item shape: `{ "id", "number", "clientId", "clientName", "issuedOn", "dueOn", "status", "totalPaise" }` — `issuedOn`/`dueOn` are `YYYY-MM-DD` strings.

- **Order**: `issuedOn` descending, then `id` descending. The order must be total and stable across pages.
- **`limit`**: integer 1–100, default 20. Anything else (non-integer, 0, negative, >100) → `400 validation`.
- **`status`**: optional; must be one of `draft`, `sent`, `paid`, `void` → otherwise `400 validation`.
- **`q`**: optional; case-insensitive substring match on `number` **or** `clientName`. Empty/absent means no filter. Treat `%` and `_` in `q` as literal characters.
- **`cursor`**: optional opaque token. Encode it yourself, but it must be **base64url (RFC 4648 §5, no padding) — URL-safe characters `A–Z a–z 0–9 - _` only**. It must encode the `(issuedOn, id)` position of the last returned row so the next page continues strictly after it. A token that cannot be decoded/validated → `400 validation`.
- **`nextCursor`**: always present. `null` when the page is the last one, otherwise a cursor that fetches the next page. Walking pages with `nextCursor` must return every matching invoice exactly once (no duplicates, no skips).

### `POST /api/invoices`

Body: `{ "clientId": int>0, "number": string, "issuedOn": "YYYY-MM-DD", "dueOn": "YYYY-MM-DD", "totalPaise": int>0 }`

- Missing/unknown `clientId` → `404 not_found`.
- `number` duplicate of any existing invoice (exact string) → `409 conflict`.
- Invalid field values (missing, wrong type, not an integer, `totalPaise <= 0`, bad calendar date, `issuedOn > dueOn`) → `400 validation` with `fields`.
- Success → **201** with the created invoice in the same shape as a list item (`status` is `draft`).
- Unknown extra fields are ignored.

**`Idempotency-Key` header (optional).** Same key + same request body → replay the identical status code and identical response body as the first success, and insert no second row. Same key + different body → `409 conflict`. You may keep the key store in memory (no restart persistence required).

### `PATCH /api/invoices/:id`

Body: `{ "status": "sent" | "paid" | "void" }`

- Body missing/not one of the four statuses → `400 validation`.
- Unknown `id` → `404 not_found`.
- Allowed edges only: `draft→sent`, `draft→void`, `sent→paid`, `sent→void`. **Anything else** — including `paid→void`, `void→*`, `draft→paid` and same-status — → `409 invalid_transition`. (`paid` and `void` are terminal.)
- Success → `200` with the updated invoice (list-item shape).

### `POST /api/payments`

Body: `{ "invoiceId"?: int>0, "clientId": int>0, "amountPaise": int>0, "receivedOn": "YYYY-MM-DD", "method": string, "reference": string }`

- Invalid/missing fields (incl. missing/empty `method` or `reference`) → `400 validation` with `fields`.
- Unknown `clientId` → `404 not_found`. Unknown `invoiceId` → `404 not_found`.
- `invoiceId` given and that invoice's status is `draft` or `void` → `409 invalid_state` (only `sent`/`paid` invoices are payable).
- Duplicate `reference` (exact string match against **any** existing payment, globally) → `409 conflict`.
- Success → **201** with the payment: `{ "id", "invoiceId", "clientId", "amountPaise", "receivedOn", "method", "reference", "createdAt" }` (`invoiceId` is `null` when not provided).

### `POST /api/payments/batch`

Body: `{ "payments": [ <payment body>, ... ] }` — non-empty array; each entry follows the rules above (field error paths are prefixed, e.g. `payments[1].amountPaise`).

- **All-or-nothing**: any validation error, unknown reference, `invalid_state`, or duplicate reference — *against existing rows or within the batch itself* — aborts the whole batch with that error and **zero rows inserted**.
- Success → **201 `{ "inserted": n }`**.
- An empty array (or missing/non-array `payments`) → `400 validation`.
- **Concurrency**: two simultaneous batches that share a `reference` must not both commit; at most one may succeed, the other must fail with `409 conflict` and insert nothing.

## Static serving

`GET /` and any unmatched non-API path serve files from `WEB_DIR` (`/` → `index.html`). Unknown `/api/*` routes → `404 not_found` (JSON).
