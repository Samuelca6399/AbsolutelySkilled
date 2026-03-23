# Shared modules, alerting, regions, and scheduling

## shared modules

### when to suggest modules

Suggest modules when you notice:
- 2+ checks that share login logic
- Same selectors used across multiple checks (page objects)
- Helper functions reused across checks (waitForAuth, dismissCookieBanner)

### module workflow

1. Write the module to `/tmp/sg-module-{name}.ts`
2. Push: `supaguard modules push /tmp/sg-module-{name}.ts --path "pages/LoginPage.ts" --json`
3. Import in scripts: `import { LoginPage } from './pages/LoginPage';`

IMPORTANT: Always ask the user before pushing modules. Suggest, don't auto-push.

### module path rules

- Must end in `.ts` or `.js`
- Can only contain alphanumeric characters, underscores, hyphens, forward slashes
- Cannot contain `..` (no path traversal)
- Cannot start with `/` (must be relative)
- Pattern: `[a-zA-Z0-9_\-/.]+\.(ts|js)`

### module content rules

Modules follow the same forbidden-import rules as scripts:
- No `child_process`, `fs`, `net`, `dgram`, `cluster`, `worker_threads`, `vm`, `http`, `https`
- No `eval()`, `Function()`, `process.exit`, `process.kill`, dynamic `import()`

## alerting

### basic alerting via CLI

After deploying a check, offer to set up alerting:

```bash
# Create an alert policy
supaguard alerts create --name "Critical Alerts" --channel slack:#monitoring --json

# Link the alert policy to a check
supaguard checks update <checkId> --alert-policy <policyId> --json
```

### supported channels

- Slack: `--channel slack:#channel-name`
- Email: `--channel email:team@company.com`
- Webhook: `--channel webhook:https://hooks.example.com/alert`

### recommended setup

- Set `consecutiveFailuresRequired` to 2 (avoids alerting on transient failures)
- Use Slack for immediate notification, email for escalation
- For complex escalation chains (multi-step, delays, SMS, phone): direct the user to the supaguard dashboard

## regions

Available regions (use these exact IDs in `--locations` flag):

| ID | Label |
|---|---|
| `eastus` | US East (Virginia) |
| `northeurope` | EU North (Ireland) |
| `centralindia` | India Central (Pune) |

For most monitoring: use 2+ regions for geographic coverage.

## scheduling

Common cron presets (use in `--cron` flag):

| Cron | Frequency |
|---|---|
| `*/5 * * * *` | Every 5 minutes |
| `*/10 * * * *` | Every 10 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour |
| `0 */6 * * *` | Every 6 hours |
| `0 */12 * * *` | Every 12 hours |
| `0 0 * * *` | Every 24 hours |

Recommended default: `*/5 * * * *` (every 5 minutes) with 2+ regions.
