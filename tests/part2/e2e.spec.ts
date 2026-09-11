// Part 2 browser acceptance suite (Playwright). Port 4320; PART2_SERVER override
// is honoured by playwright.part2.config.ts (webServer command = node $PART2_SERVER).
//
// Canonical: candidates must not edit this file. Supervisors re-apply it.
import { expect, test, type Page } from '@playwright/test';

const XSS_PAYLOAD = '<img src=x onerror="window.__xss=1">';

const rows = (page: Page) => page.locator('#class-list tbody tr');
const titles = (page: Page) => page.locator('#class-list .class-title');

test.describe('class booking ops UI', () => {
  test('day filter shows the 01:00 IST class on its IST calendar day', async ({ page }) => {
    await page.goto('/');
    await expect(rows(page)).toHaveCount(5);

    await page.selectOption('#day-filter', '2026-08-11');
    await expect(rows(page)).toHaveCount(2);
    await expect(titles(page).filter({ hasText: 'Sunrise Yoga Flow' })).toHaveCount(1);
    await expect(titles(page).filter({ hasText: 'Evening Spin Blast' })).toHaveCount(1);
    await expect(titles(page).filter({ hasText: 'Strength Fundamentals' })).toHaveCount(0);
  });

  test('load more appends every remaining class exactly once', async ({ page }) => {
    await page.goto('/');
    await expect(rows(page)).toHaveCount(5);

    await page.click('#load-more');
    await expect(rows(page)).toHaveCount(8);

    const ids = await rows(page).evaluateAll((els) =>
      els.map((el) => Number((el as HTMLElement).dataset.classId)),
    );
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('class titles are rendered as text and never execute', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('#day-filter', '2026-08-14');
    await expect(titles(page)).toHaveCount(1);
    await expect(titles(page).first()).toHaveText(XSS_PAYLOAD);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test('a slow response for an earlier filter cannot overwrite the newer filter', async ({ page }) => {
    await page.route(
      (url) => url.pathname === '/api/classes/day' && url.searchParams.get('on') === '2026-08-12',
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
      },
    );

    await page.goto('/');
    await expect(rows(page)).toHaveCount(5);

    await page.selectOption('#day-filter', '2026-08-12'); // slow: 700 ms behind
    await page.selectOption('#day-filter', '2026-08-13'); // newer filter must win

    await expect(titles(page).filter({ hasText: 'Mobility and Recovery' })).toHaveCount(1);
    await page.waitForTimeout(1500); // let the stale response land
    await expect(titles(page).filter({ hasText: 'Mobility and Recovery' })).toHaveCount(1);
    await expect(titles(page).filter({ hasText: 'HIIT Express' })).toHaveCount(1);
    await expect(titles(page).filter({ hasText: 'Strength Fundamentals' })).toHaveCount(0);
  });
});
