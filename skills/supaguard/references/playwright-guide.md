# Playwright monitoring best practices

## monitoring scripts vs test scripts

Monitoring scripts run on a schedule against production. They must be:

- **Resilient**: handle transient failures (network blips, slow loads, cookie banners)
- **Fast**: complete in under 60 seconds (runner timeout). Keep scripts lean.
- **Observable**: meaningful assertions that detect real breakage, not flaky checks

## best practices

1. Always start with `import { test, expect } from "@playwright/test";`
2. Use `page.goto(url, { waitUntil: "networkidle" })` for initial page loads
3. Prefer `page.getByTestId("x")` over CSS selectors
4. Use `await expect(element).toBeVisible()` before interacting with an element
5. Use explicit waits: `page.waitForSelector()`, `page.waitForResponse()`
6. **NEVER** use `page.waitForTimeout()` or `sleep()` - these make checks flaky and waste time
7. Keep one logical flow per check (e.g., login only, not login + checkout + logout)
8. Assert on user-visible outcomes, not internal DOM state
9. Handle common obstacles before proceeding:
   - Cookie consent banners: dismiss or accept
   - Popups/modals: close or interact as needed
   - Loading states: wait for spinners to disappear with `await expect(spinner).not.toBeVisible()`
10. Use descriptive test names: `test("user can complete checkout", ...)`

## anti-patterns

- Don't assert on CSS classes or style properties (they change with redesigns)
- Don't assert on exact text that includes dynamic data (dates, counts, prices)
- Don't navigate to more than 3-4 pages in a single check
- Don't fill forms with real credentials - use test accounts or environment variables
- Don't use `page.evaluate()` for assertions - use Playwright's built-in matchers
- Don't use React Testing Library methods (`getByDisplayValue`, `queryByText`, `findByRole`, `getAllByTestId`, etc.) - these are NOT Playwright APIs
- Don't use `getBySelector()`, `getByCssSelector()`, or `getByXPath()` - use `page.locator()` or `page.getByRole()`

## script templates

### login flow monitoring

```typescript
import { test, expect } from "@playwright/test";

test("login flow works", async ({ page }) => {
  await page.goto("https://YOUR_APP_URL/login", { waitUntil: "networkidle" });

  // Fill credentials
  await page.getByTestId("email-input").fill("monitor@example.com");
  await page.getByTestId("password-input").fill("test-password");
  await page.getByTestId("login-button").click();

  // Verify successful login
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/dashboard/);
});
```

### page load monitoring

```typescript
import { test, expect } from "@playwright/test";

test("homepage loads correctly", async ({ page }) => {
  const response = await page.goto("https://YOUR_APP_URL", { waitUntil: "networkidle" });

  // Verify page loaded
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Verify key content is present
  await expect(page.getByTestId("hero-section")).toBeVisible();
  await expect(page.getByTestId("nav-menu")).toBeVisible();
});
```

### form submission monitoring

```typescript
import { test, expect } from "@playwright/test";

test("contact form submits successfully", async ({ page }) => {
  await page.goto("https://YOUR_APP_URL/contact", { waitUntil: "networkidle" });

  // Fill form
  await page.getByTestId("name-input").fill("Monitor Bot");
  await page.getByTestId("email-input").fill("monitor@example.com");
  await page.getByTestId("message-input").fill("Automated monitoring check");
  await page.getByTestId("submit-button").click();

  // Verify submission
  await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 10000 });
});
```

### API health check

API checks use a different approach - no Playwright script needed. Use the CLI directly:

```bash
supaguard checks create --type api \
  --name "API Health" \
  --url "https://api.example.com/health" \
  --method GET \
  --assert-status 200 \
  --assert-response-time 5000 \
  --locations eastus,northeurope \
  --cron "*/5 * * * *" \
  --json
```

## allowed npm packages in scripts

Scripts can import these packages (they're available in the runner):

- `@playwright/test` (always available)
- `@faker-js/faker` / `faker` - for generating test data
- `dayjs` / `date-fns` - for date manipulation
- `lodash` / `lodash-es` - for utility functions
- `uuid` - for generating UUIDs
- `zod` - for schema validation
