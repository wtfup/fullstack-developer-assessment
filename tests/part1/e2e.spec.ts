// Part 1 — canonical browser acceptance suite (behavioral, not pixel-based).
//
// Runs against the server on http://127.0.0.1:4318 (Playwright webServer) and the
// reset-able part1_lab schema. Re-seeds part1_lab in beforeAll so the suite is
// repeatable without manual cleanup; every test then reads the canonical fixture.
import { test, expect, type Page, type Response } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const SCHEMA = process.env.LAB_SCHEMA || 'part1_lab';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://fullstack:fullstack@127.0.0.1:55440/fullstack';

const rowsOf = (page: Page) => page.getByTestId('invoice-row');
const rowWith = (page: Page, number: string) => rowsOf(page).filter({ hasText: number });

test.beforeAll(async () => {
  if (!/^part1_(lab|test_[a-f0-9]{24})$/.test(SCHEMA)) throw new Error(`refusing to reset schema: ${SCHEMA}`);
  const pool = new pg.Pool({ connectionString: DATABASE_URL, options: `-c search_path=${SCHEMA}`, max: 2, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE; CREATE SCHEMA ${SCHEMA}; SET LOCAL search_path TO ${SCHEMA}`);
      await client.query(await readFile(path.resolve(process.cwd(), 'part1/seed/schema.sql'), 'utf8'));
      await client.query(await readFile(path.resolve(process.cwd(), 'part1/seed/seed.sql'), 'utf8'));
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
});

test('seed table renders the first page with client, dates, money and status', async ({ page }) => {
  await page.goto('/');
  const rows = rowsOf(page);
  await expect(page.getByTestId('invoices-table')).toBeVisible();
  await expect(rows).toHaveCount(10);

  const first = rows.nth(0);
  await expect(first.getByTestId('invoice-number')).toHaveText('INV-1012');
  await expect(first).toContainText('Fernwood Studio');
  await expect(first).toContainText('2026-08-12');
  await expect(first).toContainText('2026-09-12');
  await expect(first).toContainText('₹250.00');
  await expect(first.getByTestId('status-badge')).toHaveText('void');

  const second = rows.nth(1);
  await expect(second.getByTestId('invoice-number')).toHaveText('INV-1007');
  await expect(second).toContainText('Drift Analytics');
  await expect(second).toContainText('₹500.00');
  await expect(second.getByTestId('status-badge')).toHaveText('draft');
});

test('status filter narrows the table and syncs the URL', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Status').selectOption('sent');
  const rows = rowsOf(page);
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0).getByTestId('invoice-number')).toHaveText('INV-1009');
  await expect(rows.nth(1).getByTestId('invoice-number')).toHaveText('INV-1006');
  await expect(rows.nth(2).getByTestId('invoice-number')).toHaveText('INV-1003');
  await expect(rows.nth(3).getByTestId('invoice-number')).toHaveText('INV-1001');
  for (const index of [0, 1, 2, 3]) {
    await expect(rows.nth(index).getByTestId('status-badge')).toHaveText('sent');
  }
  await expect(page).toHaveURL(/status=sent/);
});

test('search is debounced and matches case-insensitively', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/invoices') && url.includes('q=crest')) requests.push(url);
  });
  await page.goto('/');
  await page.getByLabel('Search').pressSequentially('crestline', { delay: 40 });
  const rows = rowsOf(page);
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByTestId('invoice-number')).toHaveText('INV-1006');
  await expect(rows.nth(1).getByTestId('invoice-number')).toHaveText('INV-1005');
  expect(requests.length).toBeGreaterThanOrEqual(1);
  expect(requests.length).toBeLessThan(9);
});

test('Load more appends the next page without duplicates and then hides', async ({ page }) => {
  await page.goto('/');
  const rows = rowsOf(page);
  await expect(rows).toHaveCount(10);
  const loadMore = page.getByTestId('load-more');
  await expect(loadMore).toBeVisible();
  await loadMore.click();
  await expect(rows).toHaveCount(12);
  const numbers = await rows.evaluateAll((els) =>
    els.map((el) => el.querySelector('[data-testid="invoice-number"]')?.textContent?.trim() ?? ''),
  );
  expect(new Set(numbers).size).toBe(12);
  expect(numbers[10]).toBe('INV-1001');
  expect(numbers[11]).toBe('INV-1005');
  await expect(loadMore).toBeHidden();
});

test('URL state (?status=&q=) is restored on load', async ({ page }) => {
  await page.goto('/?status=sent&q=crestline');
  await expect(page.getByLabel('Status')).toHaveValue('sent');
  await expect(page.getByLabel('Search')).toHaveValue('crestline');
  const rows = rowsOf(page);
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0).getByTestId('invoice-number')).toHaveText('INV-1006');

  await page.goto('/?status=void');
  await expect(page.getByLabel('Status')).toHaveValue('void');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByTestId('invoice-number')).toHaveText('INV-1012');
  await expect(rows.nth(1).getByTestId('invoice-number')).toHaveText('INV-1008');
  await expect(rows.nth(0).getByTestId('status-badge')).toHaveText('void');
  await expect(rows.nth(1).getByTestId('status-badge')).toHaveText('void');
});

test('controls are labelled and keyboard-operable', async ({ page }) => {
  await page.goto('/');
  const search = page.getByLabel('Search');
  const status = page.getByLabel('Status');
  await search.focus();
  await expect(search).toBeFocused();
  await status.focus();
  await expect(status).toBeFocused();
  await expect(page.getByTestId('toast')).toHaveAttribute('aria-live', 'polite');

  const loadMore = page.getByTestId('load-more');
  await loadMore.focus();
  await expect(loadMore).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(rowsOf(page)).toHaveCount(12);
});

test('empty search result shows the empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search').fill('zzz-no-match');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('empty-state')).toHaveText('No invoices found');
  await expect(rowsOf(page)).toHaveCount(0);
});

test('optimistic success: the row updates before the server responds and persists', async ({ page }) => {
  await page.goto('/');
  const row = rowWith(page, 'INV-1004');
  await expect(row.getByTestId('status-badge')).toHaveText('draft');

  let intercepted = false;
  await page.route('**/api/invoices/**', async (route) => {
    if (route.request().method() === 'PATCH') {
      intercepted = true;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    await route.continue();
  });

  const patchResponse = page.waitForResponse(
    (response: Response) => response.request().method() === 'PATCH' && response.url().includes('/api/invoices/'),
  );
  await row.getByRole('button', { name: 'Mark sent' }).click();
  await expect(row.getByTestId('status-badge')).toHaveText('sent', { timeout: 450 });
  expect(intercepted).toBe(true);
  await patchResponse;

  await page.goto('/');
  await expect(rowWith(page, 'INV-1004').getByTestId('status-badge')).toHaveText('sent');
});

test('failed patch rolls back the optimistic update and shows an error toast', async ({ page }) => {
  await page.goto('/');
  const row = rowWith(page, 'INV-1003');
  await expect(row.getByTestId('status-badge')).toHaveText('sent');

  await page.route('**/api/invoices/**', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'internal', message: 'forced failure' } }),
    });
  });

  const markPaid = row.getByRole('button', { name: 'Mark paid' });
  await markPaid.click();

  await expect(row.getByTestId('status-badge')).toHaveText('paid', { timeout: 800 });
  await expect(row.getByRole('button', { name: 'Mark paid' })).toBeDisabled();

  await expect(row.getByTestId('status-badge')).toHaveText('sent', { timeout: 3000 });
  const toast = page.getByTestId('toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Could not update');
  await expect(row.getByRole('button', { name: 'Mark paid' })).toBeEnabled();
});
