#!/usr/bin/env bash
# Setup a new Playwright project with best-practice defaults.
# Usage: bash scripts/setup-project.sh [--ci github-actions|gitlab-ci]
#
# What it does:
#   1. Installs @playwright/test
#   2. Installs browsers (chromium by default, or all if --all-browsers)
#   3. Scaffolds playwright.config.ts with CI-ready defaults
#   4. Creates test directory structure with example fixture
#   5. Adds .auth/ and test-results/ to .gitignore
#   6. Creates GitHub Actions workflow (if --ci github-actions)

set -euo pipefail

CI_PROVIDER=""
ALL_BROWSERS=false
BASE_URL="http://localhost:3000"
TEST_DIR="./tests"

while [[ $# -gt 0 ]]; do
  case $1 in
    --ci) CI_PROVIDER="$2"; shift 2 ;;
    --all-browsers) ALL_BROWSERS=true; shift ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --test-dir) TEST_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: setup-project.sh [--ci github-actions|gitlab-ci] [--all-browsers] [--base-url URL] [--test-dir DIR]"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "==> Installing @playwright/test..."
npm install -D @playwright/test

echo "==> Installing browsers..."
if $ALL_BROWSERS; then
  npx playwright install --with-deps
else
  npx playwright install --with-deps chromium
fi

echo "==> Creating test directory structure..."
mkdir -p "$TEST_DIR/pages" "$TEST_DIR/fixtures" ".auth"

# Scaffold playwright.config.ts
if [ ! -f playwright.config.ts ]; then
  cat > playwright.config.ts << 'CONFEOF'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : [['html']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
CONFEOF
  echo "    Created playwright.config.ts"
else
  echo "    playwright.config.ts already exists, skipping"
fi

# Scaffold example fixture
if [ ! -f "$TEST_DIR/fixtures/index.ts" ]; then
  cat > "$TEST_DIR/fixtures/index.ts" << 'FIXEOF'
import { test as base, expect } from '@playwright/test'

// Extend the base test with app-specific fixtures
export const test = base.extend<{
  // Add custom fixtures here
}>({
  // Example: authenticated page fixture
  // authenticatedPage: async ({ page }, use) => { ... },
})

export { expect }
FIXEOF
  echo "    Created $TEST_DIR/fixtures/index.ts"
fi

# Update .gitignore
touch .gitignore
for pattern in ".auth/" "test-results/" "playwright-report/" "blob-report/" ".playwright-skill/"; do
  if ! grep -qF "$pattern" .gitignore; then
    echo "$pattern" >> .gitignore
    echo "    Added $pattern to .gitignore"
  fi
done

# GitHub Actions workflow
if [ "$CI_PROVIDER" = "github-actions" ]; then
  mkdir -p .github/workflows
  cat > .github/workflows/playwright.yml << 'GHAEOF'
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

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
          cache: npm

      - run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Install system deps (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 7
GHAEOF
  echo "    Created .github/workflows/playwright.yml"
fi

echo ""
echo "==> Setup complete!"
echo "    Run tests:  npx playwright test"
echo "    UI mode:    npx playwright test --ui"
echo "    Codegen:    npx playwright codegen $BASE_URL"
