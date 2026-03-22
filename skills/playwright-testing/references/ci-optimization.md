<!-- Part of the playwright-testing AbsolutelySkilled skill. Load this file when
     optimizing Playwright test runs in CI, configuring sharding, caching browsers,
     or setting up container images. -->

# CI/CD Optimization for Playwright

## 1. Browser Caching Strategy

Playwright downloads ~500 MB per browser on `npx playwright install`. Without
caching, every CI run pays this cost.

### GitHub Actions Cache

Cache the browser binary directory, keyed on the exact Playwright version from
your lockfile. A version mismatch between the cached binaries and the installed
`@playwright/test` package causes cryptic launch failures like
`browserType.launch: Executable doesn't exist` - the binaries look present but
are the wrong version.

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Get Playwright version
        id: pw-version
        run: |
          PW_VERSION=$(node -e "const lock = require('./package-lock.json'); console.log(lock.packages['node_modules/@playwright/test'].version)")
          echo "version=$PW_VERSION" >> "$GITHUB_OUTPUT"

      - name: Cache Playwright browsers
        id: cache-browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-browsers-${{ steps.pw-version.outputs.version }}

      - name: Install Playwright browsers
        if: steps.cache-browsers.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install system deps (cache hit)
        if: steps.cache-browsers.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run tests
        run: npx playwright test
```

Key detail: when the cache hits, you still need `npx playwright install-deps` to
install OS-level shared libraries (libnss3, libatk-bridge, etc.). The cache only
covers the browser binaries themselves.

### Docker Alternative

Use the official Playwright Docker image. The tag **must** match the exact
version of `@playwright/test` in your project - there is no "latest" that works
reliably.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.48.0-noble
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test
```

No browser install or caching needed - they are baked into the image.

---

## 2. Sharding Math

`--shard=N/M` splits the test **files** (not individual tests) across M buckets.
Playwright hashes each file path and assigns it to a shard deterministically.

This means a single file containing 50 tests goes entirely to one shard. If
your suite has one large file and many small ones, one shard may take 10x
longer than the rest, defeating the purpose.

### Fix: Keep Files Small

Aim for 10-15 tests per file maximum. If a file grows beyond that, split it by
feature area.

### GitHub Actions Matrix for 4 Shards

```yaml
name: E2E Sharded

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - name: Upload shard report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-shard-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 7

  merge-reports:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Download all shard reports
        uses: actions/download-artifact@v4
        with:
          pattern: playwright-report-shard-*
          path: all-shard-reports

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-shard-reports

      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-merged
          path: playwright-report/
          retention-days: 7
```

`fail-fast: false` is important - you want all shards to complete so you see
every failure, not just the first shard that breaks.

---

## 3. Parallel Workers vs Shards

These are two different axes of parallelism:

| Concept   | Scope            | Controls                        |
|-----------|------------------|---------------------------------|
| Workers   | Single machine   | Threads/processes on one runner |
| Shards    | Multiple machines| Separate CI jobs                |

Use both together for maximum throughput:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  workers: '50%',
  fullyParallel: true,
  // ...rest of config
});
```

Then run with `--shard=N/4` in CI across 4 jobs.

### Shared State Warning

Workers within one machine share the same process environment. If your tests
rely on a shared database, all workers hit the same connection pool. Common
symptoms:

- Deadlocks under high parallelism
- Unique constraint violations from concurrent inserts
- Tests that pass with `workers: 1` but fail with more

Solutions:
- Use per-worker database schemas (key off `process.env.TEST_WORKER_INDEX`)
- Use `test.describe.serial` for tests that mutate shared state
- Mock the data layer entirely with `page.route()`

---

## 4. Container Gotchas

### Missing System Dependencies

`npx playwright install-deps` installs OS packages (libgbm, libasound2, etc.)
and requires root. In Docker, run it at build time:

```dockerfile
FROM node:20-bookworm

WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps

COPY . .
CMD ["npx", "playwright", "test"]
```

Do **not** defer `install-deps` to runtime - it will fail in read-only
containers or non-root contexts.

### Display Server

Playwright runs headless by default in CI. However, certain operations behave
differently in headless mode:

- Clipboard API (`navigator.clipboard`) may be unavailable
- Drag-and-drop coordinates can shift
- Some CSS hover states do not trigger

If you need headed mode in a container without a display:

```yaml
- name: Run tests headed
  run: xvfb-run npx playwright test --headed
```

`xvfb-run` creates a virtual framebuffer. Install it with
`apt-get install -y xvfb` in your Dockerfile or setup step.

### Timezone

Containers default to UTC. Tests that assert on formatted dates or
time-dependent logic will break if they assume a local timezone.

```yaml
- name: Run tests
  run: npx playwright test
  env:
    TZ: America/New_York
```

Or set it in `playwright.config.ts`:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    timezoneId: 'America/New_York',
  },
});
```

The `timezoneId` in config controls the browser's timezone. The `TZ` env var
controls Node's timezone (for any server-side assertions).

---

## 5. Artifact Strategies

### What to Upload and When

| Artifact              | When to upload   | Why                                   |
|-----------------------|------------------|---------------------------------------|
| `playwright-report/`  | On failure       | HTML report for debugging             |
| Traces                | On first retry   | Detailed timeline without storage bloat|
| Screenshot diffs      | Always           | Let PR reviewers see visual changes   |

### Recommended Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 2,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['html', { open: 'never' }],
    ['github'],
  ],
});
```

### GitHub Actions Upload

```yaml
- name: Upload test report
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7

- name: Upload screenshot diffs
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: screenshot-diffs
    path: test-results/**/*-diff.png
    retention-days: 7
    if-no-files-found: ignore
```

Use `retention-days: 7` - test artifacts are only useful while actively
investigating a failure. Keeping them longer wastes storage.

The `if-no-files-found: ignore` on screenshot diffs prevents the step from
failing when all visual tests pass (no diff images generated).

---

## 6. Speeding Up Test Runs

Quick wins, ordered by impact:

| Optimization | Time saved | How |
|---|---|---|
| `storageState` for auth | 2-5s per test | See `references/auth-patterns.md` |
| Mock external APIs | 1-3s per API call | `page.route('**/api.external.com/**', ...)` |
| `fullyParallel: true` | 30-60% total time | Tests within a file run concurrently |
| Explicit waits over `networkidle` | 1-5s per navigation | `await expect(locator).toBeVisible()` instead |
| Sharding (section 2 above) | Linear speedup | 4 shards = ~4x faster |

### Profile slow tests

```bash
PWDEBUG=1 npx playwright test --headed tests/slow-test.spec.ts
```

Replace `networkidle` (waits for ALL network to stop) with explicit waits:

```typescript
// Slow
await page.goto('/dashboard', { waitUntil: 'networkidle' })

// Fast - waits only for what you need
await page.goto('/dashboard')
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
```
