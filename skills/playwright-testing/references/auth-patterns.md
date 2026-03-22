<!-- Part of the playwright-testing AbsolutelySkilled skill. Load this file when
     working with authentication flows, storageState, global setup, or token refresh
     in Playwright tests. -->

# Authentication Patterns in Playwright

## 1. storageState Flow

The standard pattern: log in once in global setup, persist browser state, reuse it across all tests.

### Global Setup File

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://myapp.com/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for the app to fully load after auth redirect
  await page.waitForURL('https://myapp.com/dashboard');

  // Save the authenticated state
  await context.storageState({ path: '.auth/user.json' });
  await browser.close();
}

export default globalSetup;
```

### Config Wiring

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  use: {
    storageState: '.auth/user.json',
  },
});
```

### Gotcha: sessionStorage Is Not Included

storageState persists cookies and localStorage only. If your app stores auth tokens in
sessionStorage, those are lost. Workaround - hydrate sessionStorage manually in a
beforeEach hook:

```typescript
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('access_token', 'test-token-value');
  });
});
```

`addInitScript` runs before any page script, so the token is available when your app boots.

---

## 2. Token Refresh Trap

storageState captures tokens at save time. If tokens have a short TTL (e.g., 15-minute
JWTs), tests that run later in a long suite hit mystery 401 errors.

### Symptoms

- Tests pass locally (fast machine, suite finishes in < 15 min).
- Tests fail in CI (slower, suite takes 30+ min).
- Failures are non-deterministic - early tests pass, later tests fail.

### Solution A: Check Expiry in Global Setup

```typescript
// global-setup.ts
import { chromium } from '@playwright/test';

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://myapp.com/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('https://myapp.com/dashboard');

  // Verify the token has enough runway
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    if (expiresIn < 30 * 60 * 1000) {
      console.warn(`Token expires in ${Math.round(expiresIn / 60000)} min - may not last the suite`);
    }
  }

  await context.storageState({ path: '.auth/user.json' });
  await browser.close();
}

export default globalSetup;
```

### Solution B: Refresh Hook Per Test File

```typescript
import { test } from '@playwright/test';

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/refresh', {
    headers: { Authorization: `Bearer ${process.env.REFRESH_TOKEN}` },
  });
  if (!response.ok()) {
    throw new Error('Token refresh failed - check REFRESH_TOKEN env var');
  }
});
```

### Solution C: Use a Long-Lived Test Token

Configure your auth provider to issue long-lived tokens (e.g., 24h) for the test
environment only. This is the simplest fix and the one most teams settle on.

---

## 3. Multi-Role Testing

Test different user roles (admin, member, guest) in a single suite using Playwright
projects with dependencies.

### Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup-admin',
      testMatch: /auth\.setup\.ts/,
      use: { storageState: '.auth/admin.json' },
    },
    {
      name: 'setup-member',
      testMatch: /auth\.setup\.ts/,
      use: { storageState: '.auth/member.json' },
    },
    {
      name: 'admin-tests',
      dependencies: ['setup-admin'],
      use: { storageState: '.auth/admin.json' },
    },
    {
      name: 'member-tests',
      dependencies: ['setup-member'],
      use: { storageState: '.auth/member.json' },
    },
  ],
});
```

### Auth Setup File

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

const credentials: Record<string, { email: string; password: string }> = {
  'setup-admin': {
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
  },
  'setup-member': {
    email: process.env.MEMBER_EMAIL!,
    password: process.env.MEMBER_PASSWORD!,
  },
};

setup('authenticate', async ({ page }) => {
  const creds = credentials[setup.info().project.name];
  if (!creds) throw new Error(`No credentials for project: ${setup.info().project.name}`);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');

  // storageState path comes from the project config
  await page.context().storageState({ path: setup.info().project.use.storageState as string });
});
```

### Gotcha: testMatch Is a Regex

`testMatch: /auth\.setup\.ts/` matches any file path containing `auth.setup.ts`. If you
have multiple setup files, be specific or use `testDir` per project to isolate them.

### Gotcha: Dependencies Run Serially by Default

Setup projects run before dependent projects but the dependent projects themselves run in
parallel. If your admin and member setup both hit the same login endpoint, ensure your test
environment handles concurrent logins.

---

## 4. OAuth/SSO Testing

Navigating to `/auth/google` in CI hits a real Google login page. This fails because:
- CAPTCHAs block automated browsers.
- MFA prompts require human interaction.
- Google actively detects and blocks automation.

### Option A: Mock the OAuth Provider

Intercept the OAuth redirect and return a fake token:

```typescript
import { test, expect } from '@playwright/test';

test('login via mocked OAuth', async ({ page }) => {
  // Intercept the OAuth callback that your app expects
  await page.route('**/api/auth/callback/google*', async (route) => {
    await route.fulfill({
      status: 302,
      headers: {
        location: '/dashboard',
        'set-cookie': 'session=fake-session-token; Path=/; HttpOnly',
      },
    });
  });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  await expect(page).toHaveURL('/dashboard');
});
```

### Option B: Test-Only Bypass Endpoint

Add a server-side endpoint that exists only in test/staging environments:

```typescript
import { test } from '@playwright/test';

test('login via test bypass', async ({ page }) => {
  // Server-side endpoint that creates a session without OAuth
  await page.goto('/api/test-auth?user=test@example.com&role=admin');
  await page.waitForURL('/dashboard');
});
```

Guard this endpoint behind an environment check and a secret header in production.

### Option C: Pre-Saved storageState as CI Secret

1. Log in manually in a real browser.
2. Export storageState from the browser context.
3. Store it as a CI secret (e.g., GitHub Actions secret).
4. Decode it in global setup before tests run.

```typescript
// global-setup.ts
import fs from 'fs';

async function globalSetup() {
  const encoded = process.env.AUTH_STORAGE_STATE;
  if (encoded) {
    fs.mkdirSync('.auth', { recursive: true });
    fs.writeFileSync('.auth/user.json', Buffer.from(encoded, 'base64').toString('utf-8'));
  }
}

export default globalSetup;
```

Downside: the saved state expires. Set up a scheduled CI job to refresh it.

---

## 5. API Token Auth

For API-only test suites, skip browser login entirely. Use `extraHTTPHeaders` on the
request context.

### Config-Level Pattern

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    extraHTTPHeaders: {
      Authorization: `Bearer ${process.env.API_TOKEN}`,
    },
  },
});
```

### Per-Test Override

```typescript
import { test, expect } from '@playwright/test';

test('fetch user profile via API', async ({ playwright }) => {
  const apiToken = process.env.API_TOKEN;
  if (!apiToken) throw new Error('API_TOKEN env var is required');

  const context = await playwright.request.newContext({
    baseURL: 'https://api.myapp.com',
    extraHTTPHeaders: {
      Authorization: `Bearer ${apiToken}`,
      'X-Request-ID': `test-${Date.now()}`,
    },
  });

  const response = await context.get('/v1/me');
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.email).toBeDefined();

  await context.dispose();
});
```

### Gotcha: extraHTTPHeaders Apply to Every Request

Including third-party scripts, images, and analytics calls. If your token is sensitive,
use `page.route()` to add the header only to your API domain:

```typescript
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api.myapp.com/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      Authorization: `Bearer ${process.env.API_TOKEN}`,
    };
    await route.continue({ headers });
  });
});
```

---

## 6. .gitignore Pattern

storageState files contain live session tokens. Never commit them.

Add to `.gitignore`:

```
# Playwright auth state
.auth/
```

Common mistake: running `git add .` after first test run and committing `.auth/user.json`
with a valid session cookie inside it. Rotate any tokens that were committed.

Also add `.auth/` to `.dockerignore` if you build Docker images from the repo - leaked
tokens in image layers are equally dangerous.
