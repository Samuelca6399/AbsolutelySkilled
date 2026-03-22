<!-- Part of the playwright-testing AbsolutelySkilled skill. Load this file when
     debugging flaky tests, diagnosing intermittent failures, or stabilizing a
     Playwright test suite. -->

# Flaky Test Playbook

---

## Diagnosis flowchart

Start here when a test fails intermittently. Follow the first branch that matches.

```
Test is flaky
  |
  +-- Fails only in CI, passes locally?
  |     -> Check: viewport size, system fonts, timezone, locale,
  |        network latency to external services, Docker resource limits.
  |        See: Root Cause E (Viewport/font rendering)
  |
  +-- Fails only on specific browser(s)?
  |     -> WebKit: date/time pickers, file upload dialogs, scrollIntoView quirks
  |        Firefox: focus/blur ordering, clipboard API differences
  |        Chromium: usually the baseline; if only Chromium fails, check
  |        Chrome-specific DevTools Protocol assumptions.
  |        See: Root Cause G (Focus/hover races)
  |
  +-- Fails intermittently on the same browser?
  |     -> Race condition. Narrow down:
  |        - Appears after a navigation or route change? -> Hydration timing (B)
  |        - Appears after a button click that triggers an API call? -> Network race (C)
  |        - Appears during or right after an animation? -> Animation race (A)
  |
  +-- Fails only when run with other tests, passes in isolation?
  |     -> Shared state pollution. Check: database records, cookies,
  |        localStorage, service workers, global JS variables.
  |        See: Root Cause D (Shared mutable state)
  |
  +-- Fails around midnight, month boundaries, or DST transitions?
        -> Time-dependent logic.
           See: Root Cause F (Time-dependent tests)
```

---

## The 7 root causes

### A. Animation/transition races

The element exists in the DOM and passes actionability checks, but it is
mid-animation. Playwright clicks the element's current bounding box, which
shifts by the next frame, causing a misclick or a stale position.

**Fix 1 - Disable animations globally in test config:**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    contextOptions: {
      reducedMotion: 'reduce',
    },
  },
});
```

**Fix 2 - Inject a style that kills all animations:**

```typescript
// In a global setup or beforeEach
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `,
});
```

**Fix 3 - Wait for a specific animation to finish before acting:**

```typescript
// Wait until the sidebar's CSS transition ends
await page.locator('.sidebar').evaluate((el) => {
  return new Promise<void>((resolve) => {
    el.addEventListener('transitionend', () => resolve(), { once: true });
  });
});
await page.locator('.sidebar').getByRole('link', { name: 'Settings' }).click();
```

---

### B. Hydration timing

In SPA/SSR frameworks (Next.js, Nuxt, Remix, Astro), the server sends
pre-rendered HTML. Playwright finds the element immediately, but the framework
then hydrates the page - replacing DOM nodes. Your click fires on a dead node
that is about to be swapped out.

**Symptoms:** `click` succeeds (no error) but nothing happens. The action
worked on the server-rendered shell, not the hydrated interactive version.

**Fix 1 - Wait for a hydration signal:**

```typescript
// Next.js - wait for client-side data to be available
await page.waitForFunction(() => {
  return typeof window.__NEXT_DATA__?.props !== 'undefined';
});

// Generic - add a data attribute in your app's root component after mount
// In your app: document.documentElement.setAttribute('data-hydrated', 'true')
await page.locator('[data-hydrated="true"]').waitFor();
```

**Fix 2 - Gate on an interactive assertion (proves hydration complete):**

```typescript
await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
await page.getByRole('button', { name: 'Add to cart' }).click();
```

---

### C. Network race

The test clicks a button that fires an API call, then immediately asserts on
the result. The assertion runs before the response arrives and the UI updates.

**Fix 1 - Wait for the response, then assert:**

```typescript
const responsePromise = page.waitForResponse(
  (resp) => resp.url().includes('/api/orders') && resp.status() === 200
);
await page.getByRole('button', { name: 'Place order' }).click();
await responsePromise;
await expect(page.getByRole('alert')).toHaveText('Order confirmed');
```

**Fix 2 - Mock the route for deterministic control:**

```typescript
await page.route('**/api/orders', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'ord_123', status: 'confirmed' }),
  });
});
await page.getByRole('button', { name: 'Place order' }).click();
await expect(page.getByRole('alert')).toHaveText('Order confirmed');
```

> Web-first assertions (`toHaveText`, `toBeVisible`) auto-retry and handle
> most network timing without explicit waits. Add `waitForResponse` only when
> you need to assert on the response itself.

---

### D. Shared mutable state

Tests share a database, a user account, a file on disk, or browser storage.
Test A modifies the shared resource; test B depends on its original state.

**Fix 1 - Isolate data per test with a factory:**

```typescript
import { test as base } from '@playwright/test';

type TestFixtures = {
  testUser: { email: string; password: string };
};

export const test = base.extend<TestFixtures>({
  testUser: async ({ request }, use) => {
    const response = await request.post('/api/test/create-user', {
      data: { prefix: 'flaky-test' },
    });
    const user = await response.json();
    await use(user);
    // Teardown: delete the user after the test
    await request.delete(`/api/test/users/${user.id}`);
  },
});
```

**Fix 2 - Use `test.describe.configure({ mode: 'serial' })` only for wizard flows:**

```typescript
test.describe('checkout wizard', () => {
  test.describe.configure({ mode: 'serial' });
  test('step 1: add items', async ({ page }) => { /* ... */ });
  test('step 2: enter address', async ({ page }) => { /* ... */ });
});
```

---

### E. Viewport/font rendering

Screenshot and visual regression tests fail because CI renders fonts
differently, uses a different DPI, or has a different default viewport.

**Fix 1 - Set explicit viewport in config:**

```typescript
export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  },
});
```

**Fix 2 - Use `maxDiffPixelRatio` for slight rendering differences:**

```typescript
await expect(page).toHaveScreenshot('dashboard.png', {
  maxDiffPixelRatio: 0.01, // allow 1% pixel difference
});
```

---

### F. Time-dependent tests

Tests that assert on "today", "2 hours ago", or relative dates break when
they run near midnight, across DST boundaries, or in a different timezone.

**Fix - Use `page.clock` to freeze or control time:**

```typescript
// Freeze time to a known date
await page.clock.install({ time: new Date('2025-06-15T10:00:00Z') });
await page.goto('/dashboard');
await expect(page.getByText('June 15, 2025')).toBeVisible();

// Fast-forward time to test expiration logic
await page.clock.install({ time: new Date('2025-06-15T09:00:00Z') });
await page.goto('/session');
await page.clock.fastForward('02:00:00'); // advance 2 hours
await expect(page.getByText('Session expired')).toBeVisible();
```

**Also set the timezone in config to avoid CI surprises:**

```typescript
export default defineConfig({
  use: {
    timezoneId: 'America/New_York',
    locale: 'en-US',
  },
});
```

---

### G. Focus/hover races

Elements that appear only on hover (tooltips, dropdown menus, action buttons
on table rows) disappear before Playwright can interact with them. This
happens because the mouse moves to the target element's expected position,
but a layout shift or re-render moves the element between the hover and click.

**Fix 1 - Hover then act immediately on the revealed element:**

```typescript
await page.getByRole('row', { name: 'invoice-42' }).hover();
await page.getByRole('row', { name: 'invoice-42' }).getByRole('button', { name: 'Delete' }).click();
```

**Fix 2 - Find a non-hover code path (right-click, keyboard shortcut):**

```typescript
await page.getByRole('row', { name: 'invoice-42' }).click({ button: 'right' });
await page.getByRole('menuitem', { name: 'Delete' }).click();
```

Use `force: true` only as a last resort for elements behind transparent overlays.

---

## Playwright's built-in flaky detection

### Reproduce with `--repeat-each`

Run a suspect test many times to confirm it is actually flaky:

```bash
npx playwright test tests/checkout.spec.ts --repeat-each=20
```

If it fails 2 out of 20 times, you have a confirmed flaky test. The report
will show exactly which runs failed.

### Retries and the "flaky" label

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

When a test fails on the first attempt but passes on a retry, Playwright
marks it as **flaky** (yellow) in the HTML report - distinct from passed
(green) or failed (red).

> **Retries mask the problem. They do not fix it.** A test that needs retries
> to pass is a test that will eventually block a deploy at the worst time.
> Use retries as a safety net while you investigate, not as a permanent
> solution. Track the flaky label count over time and drive it to zero.

### Shard large suites to find interaction effects

```bash
npx playwright test --shard=1/4
npx playwright test --shard=2/4
```

If a test is flaky only in a specific shard, it likely has a shared state
dependency with another test in that shard.

---

## The nuclear option: test.fixme() vs test.skip()

When you cannot fix a flaky test immediately, quarantine it - but use the
right annotation.

| Annotation | Meaning | When to use |
|---|---|---|
| `test.fixme()` | Known broken, needs investigation | Flaky tests you plan to fix |
| `test.skip()` | Intentionally not running | Platform exclusions, feature flags |

```typescript
test('complex drag-and-drop reorder', async ({ page, browserName }) => {
  test.fixme(browserName === 'webkit', 'Flaky on WebKit - see issue #1234');
  // test body...
});

test('windows-only file path handling', async ({ page }) => {
  test.skip(process.platform !== 'win32', 'Only relevant on Windows');
  // test body...
});
```

`test.fixme()` shows up in the report as a reminder. `test.skip()` is silent.
Never use `test.skip()` to hide flaky tests - it removes accountability.

---

## Trace-based debugging

Traces are the single most effective tool for diagnosing flaky tests. They
capture a complete recording of what happened during a test run.

### Configure traces for flaky failures only

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry', // capture trace only when a test is retried
  },
  retries: 2,
});
```

Options: `'on'` (always), `'off'`, `'retain-on-failure'`, `'on-first-retry'` (recommended).

### Read a trace

```bash
npx playwright show-trace trace.zip
```

Key tabs: **Actions** (timeline), **Before/After** (DOM snapshots - fastest way
to spot race conditions), **Network** (request waterfall), **Console** (client errors).

For race conditions: compare the **After** snapshot of the last passing action
with the **Before** snapshot of the failing action. The diff reveals what changed.

---

## Quick reference: flaky test first-aid

| Symptom | Likely cause | First thing to try |
|---|---|---|
| Click does nothing | Hydration race (B) | `await expect(button).toBeEnabled()` before click |
| Element not found intermittently | Animation race (A) | Disable animations via `reducedMotion` |
| Wrong text in assertion | Network race (C) | Use `toHaveText` (auto-retries) or `waitForResponse` |
| Test fails after another test | Shared state (D) | Run in isolation to confirm, then isolate data |
| Screenshot diff in CI | Font/viewport (E) | Pin Docker image, set explicit viewport |
| Fails near midnight | Time-dependent (F) | Freeze clock with `page.clock.install()` |
| Hover menu disappears | Focus race (G) | Chain `.hover()` then immediate `.click()` |
