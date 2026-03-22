<!-- Part of the playwright-testing AbsolutelySkilled skill. Load this file when
     working with Playwright Component Testing (CT) for React, Vue, Svelte, or
     Solid components. -->

# Playwright Component Testing (CT)

## What CT Mode Is

Playwright Component Testing mounts real framework components in a real browser
- not jsdom, not a simulated DOM. Each test spins up an actual Chromium, Firefox,
or WebKit instance and renders your component in isolation.

Key differences from e2e testing:

- **No dev server required** - CT bundles your component on the fly using Vite
- **Isolated rendering** - each test mounts a single component, not your full app
- **Real browser APIs** - unlike Jest/jsdom, you get real layout, real events, real rendering
- **Framework support** - React, Vue, Svelte, and Solid are supported via dedicated packages

The experimental packages are:

| Framework | Package                              |
|-----------|--------------------------------------|
| React     | `@playwright/experimental-ct-react`  |
| Vue       | `@playwright/experimental-ct-vue`    |
| Svelte    | `@playwright/experimental-ct-svelte` |
| Solid     | `@playwright/experimental-ct-solid`  |

---

## Setup

### Installation

```bash
npm init playwright@latest -- --ct
```

This scaffolds two key files:

1. `playwright-ct.config.ts` - the CT-specific Playwright config
2. `playwright/index.html` - the HTML shell where components are mounted
3. `playwright/index.ts` - bootstrap file for global styles and setup

### Config Structure

```typescript
import { defineConfig, devices } from '@playwright/experimental-ct-react'

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.ct.{ts,tsx}',
  use: {
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': '/src',
        },
      },
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
```

### The Mount Point - `playwright/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Testing</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.ts"></script>
  </body>
</html>
```

### The Bootstrap File - `playwright/index.ts`

Use this file to import global CSS and register any setup logic:

```typescript
// playwright/index.ts
import '../src/styles/globals.css'
```

---

## Writing CT Tests

### Basic React Example

```typescript
import { test, expect } from '@playwright/experimental-ct-react'
import { Counter } from './Counter'

test('increments count on click', async ({ mount }) => {
  const component = await mount(<Counter initialCount={0} />)
  await component.getByRole('button', { name: 'Increment' }).click()
  await expect(component.getByText('Count: 1')).toBeVisible()
})
```

### Passing Props

```typescript
import { test, expect } from '@playwright/experimental-ct-react'
import { Greeting } from './Greeting'

test('renders greeting with name', async ({ mount }) => {
  const component = await mount(<Greeting name="Playwright" />)
  await expect(component.getByText('Hello, Playwright!')).toBeVisible()
})
```

### Testing Slots (Vue)

```typescript
import { test, expect } from '@playwright/experimental-ct-vue'
import Card from './Card.vue'

test('renders slot content', async ({ mount }) => {
  const component = await mount(Card, {
    slots: {
      default: '<p>Card body content</p>',
    },
  })
  await expect(component.getByText('Card body content')).toBeVisible()
})
```

### Running CT Tests

```bash
npx playwright test -c playwright-ct.config.ts
npx playwright test -c playwright-ct.config.ts --project=chromium
npx playwright test -c playwright-ct.config.ts src/Counter.ct.tsx
```

---

## Gotchas

This is the most important section. CT has sharp edges you will hit.

### 1. CT Is Experimental - API May Change

The packages are namespaced under `@playwright/experimental-ct-*`. The API can
and does change between minor Playwright versions. Pin your version and read
the changelog before upgrading.

### 2. `mount()` Returns a Locator, Not a Component Instance

You cannot call React hooks, access component state, or invoke component methods.
The return value is a standard Playwright `Locator`. Interact with it the same
way you would in an e2e test - through the DOM.

```typescript
// WRONG - this does not work
const component = await mount(<Counter initialCount={0} />)
component.setState({ count: 5 }) // TypeError - not a React instance

// CORRECT - interact via the DOM
const component = await mount(<Counter initialCount={0} />)
await expect(component.getByText('Count: 0')).toBeVisible()
```

### 3. Bundling Uses Vite - Node Builtins Will Fail

CT uses Vite under the hood to bundle your component. If your component imports
Node builtins (`fs`, `path`, `crypto`) or server-only modules (`next/server`,
database clients), the test fails at build time.

Fix: mock those imports in `playwright/index.ts` or in the Vite config:

```typescript
// playwright-ct.config.ts
export default defineConfig({
  use: {
    ctViteConfig: {
      resolve: {
        alias: {
          'server-only-module': '/tests/mocks/server-only-module.ts',
        },
      },
    },
  },
})
```

### 4. Props Must Be Serializable

You cannot pass functions as props through `mount()`. Functions are not
serializable across the browser-Node boundary. Use the `on` option for
event handlers instead:

```typescript
// WRONG - function props are silently dropped
const component = await mount(<Button onClick={() => console.log('clicked')} />)

// CORRECT - use the `on` option
let clicked = false
const component = await mount(<Button />, {
  on: { click: () => { clicked = true } }
})
await component.click()
expect(clicked).toBe(true)
```

### 5. Global Styles Do Not Load Automatically

Your app's CSS reset, design tokens, or global styles won't be present unless
you explicitly import them in `playwright/index.ts`:

```typescript
// playwright/index.ts
import '../src/styles/globals.css'
import '../src/styles/design-tokens.css'
```

### 6. No Hot Module Replacement

Unlike `vite dev`, CT does not support HMR. When you change component code or
test code, you must re-run the test from scratch. There is no watch mode that
hot-reloads components in the browser.

### 7. Re-mounting Replaces the Component

Calling `mount()` a second time in the same test replaces the previously mounted
component. If you need to test unmount/remount behavior, use `component.unmount()`:

```typescript
test('cleanup on unmount', async ({ mount }) => {
  const component = await mount(<Timer />)
  await expect(component.getByText('Running')).toBeVisible()
  await component.unmount()
  // Component is removed from the DOM
})
```

---

## When to Use CT vs E2E vs Unit Tests

| Scenario                                      | CT  | E2E | Jest/Vitest |
|-----------------------------------------------|-----|-----|-------------|
| Component interaction (clicks, input, focus)  | Yes |     |             |
| Visual regression on isolated components      | Yes |     |             |
| Components hard to reach in the full app      | Yes |     |             |
| User flows across multiple pages              |     | Yes |             |
| Testing with a real backend/database          |     | Yes |             |
| Pure logic, utilities, data transformations   |     |     | Yes         |
| React hooks in isolation                      |     |     | Yes         |
| Fast feedback loop (sub-second)               |     |     | Yes         |
| Testing real browser layout/rendering         | Yes | Yes |             |
| Testing third-party script loading            |     | Yes |             |

**Rule of thumb**: if the test is about how a component looks or responds to user
interaction in a real browser, use CT. If it is about application flow, use e2e.
If it is about logic, use a unit test runner.

---

## Mocking in CT

### Mocking API Calls

Use `page.route()` to intercept network requests, just like in e2e tests:

```typescript
import { test, expect } from '@playwright/experimental-ct-react'
import { UserProfile } from './UserProfile'

test('displays user data from API', async ({ mount, page }) => {
  await page.route('**/api/user/1', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Test User', email: 'test@example.com' },
    })
  })

  const component = await mount(<UserProfile userId={1} />)
  await expect(component.getByText('Test User')).toBeVisible()
  await expect(component.getByText('test@example.com')).toBeVisible()
})
```

### Wrapping With Context Providers

Use the `hooksConfig` pattern to wrap components in providers. First, register
the hook in `playwright/index.ts`:

```typescript
// playwright/index.ts
import '../src/styles/globals.css'
import { beforeMount } from '@playwright/experimental-ct-react/hooks'
import { ThemeProvider } from '../src/providers/ThemeProvider'
import { BrowserRouter } from 'react-router-dom'

type HooksConfig = {
  theme?: 'light' | 'dark'
  routing?: boolean
}

beforeMount<HooksConfig>(async ({ App, hooksConfig }) => {
  let app = <App />

  if (hooksConfig?.routing) {
    app = <BrowserRouter>{app}</BrowserRouter>
  }

  if (hooksConfig?.theme) {
    app = <ThemeProvider theme={hooksConfig.theme}>{app}</ThemeProvider>
  }

  return app
})
```

Then use `hooksConfig` in your tests:

```typescript
import { test, expect } from '@playwright/experimental-ct-react'
import { ThemedButton } from './ThemedButton'

test('renders in dark mode', async ({ mount }) => {
  const component = await mount(<ThemedButton label="Save" />, {
    hooksConfig: { theme: 'dark' },
  })
  await expect(component.getByRole('button')).toHaveCSS(
    'background-color',
    'rgb(30, 30, 30)'
  )
})

test('renders with router context', async ({ mount }) => {
  const component = await mount(<NavLink to="/about">About</NavLink>, {
    hooksConfig: { routing: true },
  })
  await expect(component.getByRole('link', { name: 'About' })).toHaveAttribute(
    'href',
    '/about'
  )
})
```

### Mocking Child Components

Vite aliases can replace heavy child components with lightweight stubs:

```typescript
// playwright-ct.config.ts
export default defineConfig({
  use: {
    ctViteConfig: {
      resolve: {
        alias: {
          './HeavyChart': './tests/stubs/HeavyChart.tsx',
        },
      },
    },
  },
})
```

```typescript
// tests/stubs/HeavyChart.tsx
export function HeavyChart() {
  return <div data-testid="chart-stub">Chart placeholder</div>
}
```
