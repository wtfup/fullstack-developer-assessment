# Part 1 — UI Spec (frozen summary; judged by `tests/part1/e2e.spec.ts`)

Build the invoices dashboard in `part1/web/` (`index.html`, `styles.css`, `app.js`) — dependency-free HTML/CSS/JS only (no frameworks, no CDN). It is served by your server at `/` and talks to your own `/api/invoices` routes on the same origin. Render everything through `textContent` (or equivalent escaping) — never `innerHTML` with data.

## Required structure and hooks

The automated checks rely on these exact hooks; everything must hold for the fixture loaded by `npm run db:reset:part1`:

| element | hook / accessible name |
|---|---|
| status filter `<select>` | label text `Status`; option `All statuses` + one per status (`draft`, `sent`, `paid`, `void`) |
| search `<input type="search">` | label text `Search` |
| invoices table | `data-testid="invoices-table"` |
| one `<tr>` per invoice | `data-testid="invoice-row"` |
| number cell | `data-testid="invoice-number"` |
| status badge | `data-testid="status-badge"` |
| load-more `<button>` | text `Load more`, `data-testid="load-more"` |
| empty state | `data-testid="empty-state"`, exact text `No invoices found` |
| error state + retry `<button>` | `data-testid="error-state"` / `data-testid="retry-button"` (button text `Retry`) |
| toast region | `data-testid="toast"`, `aria-live="polite"` |

Row action `<button>`s (only the ones legal for that row's status): text `Mark sent` (`draft` only), `Mark paid` (`sent` only), `Void` (`draft` or `sent`). Rows are ordered exactly as the API returns them.

## Data loading

- On load, read `?status=` and `?q=` from the URL and apply them to the controls before the first fetch; write the current `status`/`q` back to the URL (omit empty values) whenever they change.
- Fetch pages with `limit=10`. `Load more` is visible only when the API returned a non-null `nextCursor`; clicking it appends the next page **without duplicates** (a loaded row must never be rendered twice).
- `Search` input triggers fetching after a **300 ms debounce** of typing (not one request per keystroke).
- While a fetch is in flight show a loading indication; when a fetch fails show the error state with a working `Retry`; when the result set is empty (and no error) show exactly `No invoices found`.

## Display format

- Amounts: `₹` + paise/100 with 2 decimals and thousands separators (`120000` → `₹1,200.00`; `25000` → `₹250.00`).
- `issuedOn` / `dueOn` rendered as `YYYY-MM-DD`. Status badge text is exactly the status (`draft`/`sent`/`paid`/`void`).

## Row actions — optimistic update

`Mark sent`, `Mark paid`, `Void` apply the PATCH immediately in the UI (optimistic), then call `PATCH /api/invoices/:id`:

- On success: keep the new status and update the row's actions from the server object.
- On failure: **roll back** the row to its previous status, re-enable the button, and show an error **toast inside `[data-testid="toast"]`** whose text starts with `Could not update`. The toast clears or is replaced on the next successful action. The toast region must be `aria-live="polite"`.
- While the PATCH is in flight the clicked button is disabled.

## Accessibility / keyboard

- Every control reachable and operable by keyboard (`Tab` to focus, `Enter`/`Space` to activate).
- Controls carry accessible names as tabled above (`<label for>` or `aria-label`).
