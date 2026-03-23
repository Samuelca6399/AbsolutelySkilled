---
name: supaguard
version: 0.1.0
description: >
  Create, test, and deploy synthetic monitoring checks from source code using the
  supaguard CLI. Triggers on monitoring setup, Playwright script generation,
  uptime checks, health checks, and production observability workflows.
category: monitoring
tags: [monitoring, playwright, synthetic-monitoring, uptime, observability, health-checks]
recommended_skills: [playwright-testing, cli-design]
platforms:
  - claude-code
  - gemini-cli
  - openai-codex
license: MIT
maintainers:
  - github: maddhruv
---

When this skill is activated, always start your first response with the 🛡️ emoji.

# supaguard - synthetic monitoring from your codebase

supaguard is a synthetic monitoring platform. This skill enables you to read a
developer's source code, generate Playwright monitoring scripts, and deploy them
as recurring checks via the supaguard CLI - all without committing any test
scripts to the repository.

---

## When to use this skill

Trigger this skill when the user:
- Wants to set up synthetic monitoring for their app
- Asks about uptime monitoring, health checks, or production observability
- Wants to generate Playwright scripts for monitoring (not testing)
- Asks about the supaguard CLI or mentions `supaguard` commands
- Wants to monitor login flows, checkout flows, or critical user journeys
- Needs to create, test, update, or manage monitoring checks
- Asks about alerting for monitoring failures

Do NOT trigger this skill for:
- Writing Playwright tests for CI/CD pipelines - use playwright-testing skill
- General testing or QA workflows unrelated to production monitoring
- Building monitoring dashboards or custom observability platforms

---

## Workflow

Follow these steps every time a user asks you to create a monitoring check:

1. **Read source code** - scan components, routes, data-testids, API endpoints, and forms in the user's codebase
2. **Identify the critical flow** - determine what user journey to monitor (login, checkout, page load, etc.)
3. **Ask for the production URL** - if not obvious from code, env files, or package.json homepage field
4. **Run pre-flight checks** - verify CLI is installed and user is authenticated (see below)
5. **Generate a Playwright script** - use the templates and best practices from this skill's references
6. **Write script to `/tmp/sg-check-{random}.ts`** - NEVER write to the project directory
7. **Test via CLI** - `supaguard checks test /tmp/sg-check-{random}.ts --json`
8. **If test fails** - read the error output, adjust the script, retry (max 3 attempts before asking user)
9. **If test passes** - ask about deployment (see deployment flow below)
10. **Deploy** - run the CLI command with collected options
11. **Celebrate** - show the success banner and dashboard link (see success banner below)

---

## Pre-flight checks

Before generating any script, verify:

1. **CLI installed**: run `which supaguard`. If missing, tell the user: `npm install -g supaguard`
2. **Authenticated**: run `supaguard whoami --json`. If not logged in, tell the user to run `! supaguard login` (the `!` prefix runs it in the current session for Claude Code)
3. **Note the active org** from the whoami output - you'll need the org slug for API context

---

## Source code analysis

When analyzing the user's codebase, look for these patterns in priority order:

### DOM selectors (use the most stable available)

1. `data-testid` attributes - most stable, purpose-built for testing
2. `aria-label` and `role` attributes - accessible and stable
3. `id` attributes - stable but sometimes dynamic
4. Text content via `getByText()` - readable but locale-dependent
5. CSS classes - LAST RESORT, fragile and changes with redesigns

### Route discovery

- **Next.js App Router**: scan `app/` for `page.tsx` files, extract route patterns from directory structure
- **Next.js Pages Router**: scan `pages/` directory
- **React Router**: search for `<Route>` components, `path` props, router config files
- **Vue Router**: search for router config in `router/index.ts` or similar
- **Generic**: look for `<a href>` patterns, navigation components

### Form discovery

- Search for `<form>`, `<input>`, `<select>`, `<textarea>` elements
- Note form actions, validation patterns, submit handlers
- Identify auth forms (login, signup, password reset)

### API endpoint discovery

- **Next.js**: scan `app/api/` or `pages/api/` for route handlers
- **Express/Fastify**: search for `app.get()`, `app.post()`, router definitions
- **Client-side**: look for fetch/axios calls to identify external API dependencies

### Critical flows to monitor

- Authentication (login, signup, logout, password reset)
- Core product flows (dashboard load, data CRUD, search)
- Checkout/payment flows
- User settings and profile management

---

## Deployment flow

After a test passes, do NOT auto-deploy. Instead, ask the user interactively
using `AskUserQuestion` - one question at a time, in this order:

### Step 1: Ask for a check name
Ask what they want to name this check. Suggest a sensible default based on the
flow being monitored (e.g., "Login Flow", "Homepage Load", "Checkout").

### Step 2: Ask about scheduling
Use `AskUserQuestion` with these options:
- **Scheduled (recurring)** - runs automatically on a cron schedule from multiple regions
- **On-demand only** - no schedule, triggered manually via `supaguard checks run` or the dashboard

### Step 3: If scheduled - ask for regions
Use `AskUserQuestion` with multi-select. Options:
- US East (Virginia) - `eastus`
- EU North (Ireland) - `northeurope`
- India Central (Pune) - `centralindia`

Recommend selecting 2+ regions for geographic coverage.

### Step 4: If scheduled - ask for frequency
Use `AskUserQuestion` with options:
- Every 5 minutes (recommended)
- Every 10 minutes
- Every 15 minutes
- Every 30 minutes
- Every hour
- Other (let user specify a cron expression)

### Step 5: Deploy

For **scheduled** checks:
```bash
supaguard checks create /tmp/sg-check-{random}.ts --name "Check Name" --locations eastus,northeurope --cron "*/5 * * * *" --skip-test --json
```

For **on-demand** checks, deploy with a very long interval then pause:
```bash
supaguard checks create /tmp/sg-check-{random}.ts --name "Check Name" --locations eastus --cron "0 0 1 1 *" --skip-test --json
```
Then immediately pause it:
```bash
supaguard checks pause <checkId> --json
```
Tell the user they can trigger runs manually with `supaguard checks run <checkId> --json` or from the dashboard.

Note: use `--skip-test` since we already tested the script in step 7.

### Step 6: Offer alerting
After deployment, ask if they want to set up alerting. See
`references/modules-and-alerting.md` for details.

---

## Success banner

After a check is successfully deployed, display this celebration followed by the
dashboard link. Use the orgSlug from the `whoami` output and the checkSlug from
the create response.

```
╔═════════════════════════════════════════╗
║ supaguard check deployed successfully  ║
╚═════════════════════════════════════════╝
```

Then output:
```
name:      {checkName}
schedule:  {frequency or "on-demand"}
regions:   {region list or "paused"}
dashboard: https://supaguard.app/dashboard/{orgSlug}/checks/{checkSlug}
```

The dashboard URL format is `https://supaguard.app/dashboard/{orgSlug}/checks/{checkSlug}` where:
- `orgSlug` comes from `supaguard whoami --json` (the `org.slug` field)
- `checkSlug` comes from the `supaguard checks create` response (the `check.slug` field)

---

## Constraints

These are hard rules. Follow them without exception:

1. **NEVER write Playwright scripts to the user's project directory** - always use `/tmp/sg-check-*.ts`
2. **NEVER commit monitoring scripts to git**
3. Scripts **MUST** contain `import { test, expect } from "@playwright/test"`
4. Scripts **MUST** contain at least one `test()` or `test.describe()` block
5. Scripts **MUST NOT** import from forbidden Node.js modules: `child_process`, `fs`, `net`, `dgram`, `cluster`, `worker_threads`, `vm`, `http`, `https`
6. Scripts **MUST NOT** use `eval()`, `Function()`, `process.exit`, `process.kill`, or dynamic `import()`
7. Scripts **MUST NOT** use `console.log` - use Playwright assertions instead
8. Scripts should complete in under 60 seconds (runner timeout is 60s, per-test timeout is 30s)
9. **Always use `--json` flag** when calling supaguard CLI commands - parse JSON output to determine success/failure
10. When a test fails, iterate on the script (read error output, fix, retry) - max 3 attempts before asking the user for help
11. Always include the production URL in scripts - ask the user if not obvious from code or environment configs
12. **DO NOT** use React Testing Library APIs (`getByDisplayValue`, `queryByText`, `findByRole`, etc.) - use Playwright's native `page.getBy*()` methods

---

## Anti-patterns / common mistakes

| Mistake | Why it is wrong | What to do instead |
|---|---|---|
| Writing scripts to project directory | Pollutes the codebase with monitoring artifacts | Always write to `/tmp/sg-check-*.ts` |
| Using `page.waitForTimeout()` | Makes checks flaky and wastes runner time | Use `waitForSelector()`, `waitForResponse()`, or Playwright assertions |
| Asserting on CSS classes | Breaks on redesigns, not meaningful for monitoring | Assert on text content, roles, testids, or visibility |
| Using React Testing Library APIs | Not available in Playwright runner | Use `page.getBy*()` methods: `getByTestId`, `getByRole`, `getByText` |
| Monitoring too many flows in one check | Hard to diagnose failures, exceeds timeout | Keep one logical flow per check |
| Hardcoding credentials in scripts | Security risk, scripts are stored in the cloud | Use test accounts or environment variables |
| Skipping pre-flight checks | Leads to confusing errors mid-workflow | Always verify CLI install and auth first |
| Auto-deploying without asking | User should control scheduling and regions | Always ask before deploying |
| Omitting `--json` flag | Human-readable output is hard to parse programmatically | Always use `--json` for structured output |

---

## Gotchas

1. **Forbidden module imports** - The supaguard runner sandboxes scripts and blocks `fs`, `child_process`, `net`, `http`, `https`, `vm`, and other Node.js built-ins. Scripts that import these will fail at runtime with a cryptic error. Stick to `@playwright/test` and the allowed npm packages listed in `references/playwright-guide.md`.

2. **Runner timeout is 60 seconds** - Scripts that navigate through too many pages or wait on slow third-party resources will time out. Keep checks focused on a single flow and set individual test timeouts to 30 seconds.

3. **React Testing Library confusion** - Methods like `getByDisplayValue`, `queryByText`, and `findByRole` are NOT Playwright APIs. Playwright has similarly named but different methods: `page.getByTestId()`, `page.getByRole()`, `page.getByText()`. Mixing these up causes runtime errors.

4. **On-demand checks still need a cron** - The CLI requires `--cron` even for on-demand checks. Use a far-future cron (`"0 0 1 1 *"`) and immediately pause the check after creation.

5. **Cookie consent banners** - Production sites often have cookie banners that block interaction. Always handle these before proceeding with the main flow. Look for common patterns: `[data-testid="cookie-accept"]`, buttons with text "Accept", or known cookie consent libraries.

---

## References

For detailed guidance, load these reference files as needed:

- `references/cli-reference.md` - full CLI command reference with flags and --json output shapes
- `references/playwright-guide.md` - monitoring best practices, anti-patterns, and script templates
- `references/framework-patterns.md` - framework-specific code analysis patterns
- `references/modules-and-alerting.md` - shared modules, alerting, regions, and scheduling

Only load a references file if the current task requires it - they are long and
will consume context.

---

## Companion check

> On first activation of this skill in a conversation: check which companion skills are installed by running `ls ~/.claude/skills/ ~/.agent/skills/ ~/.agents/skills/ .claude/skills/ .agent/skills/ .agents/skills/ 2>/dev/null`. Compare the results against the `recommended_skills` field in this file's frontmatter. For any that are missing, mention them once and offer to install:
> ```
> npx skills add AbsolutelySkilled/AbsolutelySkilled --skill <name>
> ```
> Skip entirely if `recommended_skills` is empty or all companions are already installed.
