# Part 1 — SQL Tasks (frozen)

Write exactly **7 queries** in `part1/sql/queries.sql`, one under each marker line, in order:

```
-- === QUERY n ===
```

Do not add, remove, rename or reorder markers. Each query must be runnable on its own against the seeded schema (the marker line is not part of the query). Column names, rounding and ordering are checked exactly. Run `npm run db:reset:part1` to load the fixture locally.

Money is integer paise. Where a result is `"a − b"`, return the difference (`a - b`; it may be negative before the row filter).

## Query 1 — Monthly received payments

Every month that has payments. Columns:

| column | meaning |
|---|---|
| `month` | `'YYYY-MM'` text (e.g. `'2026-08'`) |
| `payments_count` | number of payments received that month |
| `total_paise` | sum of `amount_paise` |

Order: `month` ascending.

## Query 2 — Outstanding per client

Every client, including clients without sent invoices. Columns:

| column | meaning |
|---|---|
| `client_id` | `clients.id` |
| `name` | client name |
| `outstanding_paise` | sum of `total_paise` of that client's `sent` invoices — `0` when none |
| `sent_invoices` | count of that client's `sent` invoices — `0` when none |

Order: `outstanding_paise` descending, then `name` ascending.

## Query 3 — Running invoice totals per client

All invoices (every status), one row each. Columns:

| column | meaning |
|---|---|
| `client_id` | |
| `number` | invoice number |
| `issued_on` | date |
| `total_paise` | |
| `running_total_paise` | window sum of `total_paise` per client, accumulated in `(issued_on, id)` order |

Order: `client_id` ascending, then `issued_on` ascending, then `id` ascending.

## Query 4 — Latest payment per client

One row per client that has payments. Columns: `client_id`, `received_on`, `amount_paise`, `reference`.
Definition: the payment with the greatest `received_on`; if several share that date, the one with the greatest `id`. Order: `client_id` ascending.

## Query 5 — Duplicate payment candidates

Payments that look like double entries, grouped on `(client_id, amount_paise, received_on, lower(reference))`, including groups created by reference-case differences. Columns:

| column | meaning |
|---|---|
| `client_id` | |
| `amount_paise` | |
| `received_on` | |
| `reference` | the **lowercased** reference key (`lower(reference)`) |
| `n` | count of rows in the group (always > 1) |

Return only groups with `n > 1`. Order: `client_id` ascending, then `received_on` ascending.

## Query 6 — Billable utilization per project

Projects with **at least one** time entry (projects with no entries are excluded). Columns:

| column | meaning |
|---|---|
| `project_id` | |
| `name` | project name |
| `total_minutes` | sum of all `minutes` |
| `billable_minutes` | sum of `minutes` where `billable` is true — `0` when none |
| `billable_pct` | `100 * billable_minutes / total_minutes`, **numeric rounded to 1 decimal place** (e.g. `83.3`, `50.0`, `0.0`) |

Order: `billable_pct` descending, then `project_id` ascending.

## Query 7 — Billing shortfall per client

Clients that have `outstanding_paise > 0` (as defined in Query 2) **and** whose computed shortfall is positive. Columns:

| column | meaning |
|---|---|
| `client_id` | |
| `name` | client name |
| `invoiced_paise` | sum of `total_paise` of all **non-void** invoices of the client (`0` when none) |
| `received_paise` | sum of `amount_paise` of all payments of the client (`0` when none) |
| `shortfall_paise` | `invoiced_paise - received_paise` |

Return only rows with `shortfall_paise > 0`. Order: `shortfall_paise` descending, then `client_id` ascending.

## Migration — `part1/sql/migration.sql`

One migration, applied to an already-seeded schema:

1. Add column `paid_at` (`date`, nullable) to `invoices`.
2. Backfill `invoices.paid_at = max(payments.received_on)` for invoices that have payments linked via `payments.invoice_id`; invoices without linked payments keep `NULL`.
3. Create index `idx_payments_received_on` on `payments (received_on)` — created under exactly that name.

The migration must be plain SQL executable as one script.
