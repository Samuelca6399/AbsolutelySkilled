# supaguard CLI reference

IMPORTANT: Always use `--json` flag when calling CLI commands. Parse JSON output for structured data. Errors go to stderr as `{ "error": "message" }`. Exit code 0 = success, 1 = failure.

## auth

### supaguard login
Opens browser for OAuth authentication. No `--json` flag.

### supaguard logout [--json]
Revokes token and clears local config.
```json
{ "success": true }
```

### supaguard whoami [--json]
Shows current user and active organization.
```json
{ "user": { "name": "...", "email": "..." }, "org": { "id": "uuid", "slug": "acme-corp", "name": "Acme Corp" } }
```

### supaguard orgs [--json]
Lists organizations. In interactive mode, allows switching the active org.
```json
{ "organizations": [{ "id": "uuid", "slug": "...", "name": "..." }], "activeOrg": { "id": "...", "slug": "...", "name": "..." } }
```

## checks

### supaguard checks list [--status STATUS] [--limit N] [--json]
Lists monitoring checks for the active organization.
```json
{ "checks": [{ "id": "...", "slug": "...", "name": "...", "status": "ACTIVE", "type": "browser", "latestRun": {...} }], "total": 10, "limit": 50, "offset": 0 }
```

### supaguard checks test \<file\> [--json]
Tests a Playwright script in the cloud runner. Does NOT deploy.
```json
{ "status": "passed" | "failed", "durationMs": 1234, "error": "...", "artifactUrls": { "recording": "...", "screenshot": "...", "trace": "..." } }
```
On failure, read `error` for a friendly message and `artifactUrls` for debugging artifacts.

### supaguard checks create \<file\> --name NAME --locations LOCATIONS --cron CRON [--alert-policy ID] [--skip-test] [--json]
Tests the script first (unless `--skip-test`), then deploys as a recurring monitoring check.

- `--name` (required): human-readable check name
- `--locations` (required): comma-separated region IDs (e.g., `eastus,northeurope`)
- `--cron` (required): cron expression for schedule (e.g., `"*/5 * * * *"`)
- `--alert-policy`: alert policy ID to attach
- `--skip-test`: skip the test-before-deploy step

```json
{ "check": { "id": "uuid", "slug": "abc123", "name": "...", "status": "ACTIVE", "type": "browser", "dashboardUrl": "https://supaguard.app/dashboard/..." } }
```

### supaguard checks update \<id\> [--name NAME] [--script FILE] [--locations LOCATIONS] [--cron CRON] [--alert-policy ID] [--json]
Updates an existing check. If `--script` is provided, the new script is tested first.
```json
{ "check": { "id": "...", "slug": "...", "name": "...", "status": "..." } }
```

### supaguard checks delete \<id\> [--force] [--json]
Deletes a check. Prompts for confirmation unless `--force` is set.
```json
{ "deleted": true }
```

### supaguard checks status \<id\> [--json]
Shows check details and recent executions.
```json
{ "check": { "id": "...", "name": "...", "status": "...", "type": "..." }, "executions": [{ "id": "...", "status": "...", "durationMs": 1234, "createdAt": "..." }] }
```

### supaguard checks run \<id\> [--region REGION] [--json]
Triggers an on-demand execution of the check.
```json
{ "executionId": "uuid", "url": "https://supaguard.app/dashboard/..." }
```

### supaguard checks pause \<id\> [--json]
Pauses a check (sets status to DISABLED).
```json
{ "checkId": "...", "status": "DISABLED" }
```

### supaguard checks resume \<id\> [--json]
Resumes a paused check (sets status to ACTIVE).
```json
{ "checkId": "...", "status": "ACTIVE" }
```

## modules

### supaguard modules list [--json]
Lists shared modules for the active organization.
```json
{ "modules": [{ "id": "...", "path": "pages/LoginPage.ts", "updatedAt": "..." }] }
```

### supaguard modules push \<file\> [--path MODULE_PATH] [--json]
Uploads or updates a shared module. `--path` sets the module's import path (e.g., `pages/LoginPage.ts`).
```json
{ "module": { "id": "...", "path": "...", "createdAt": "..." } }
```

### supaguard modules delete \<id\> [--force] [--json]
Deletes a module. Prompts for confirmation unless `--force`.
```json
{ "deleted": true }
```

## alerts

### supaguard alerts list [--json]
Lists alert policies for the active organization.
```json
{ "policies": [{ "id": "...", "name": "...", "isDefault": false, "steps": [...] }] }
```

### supaguard alerts create --name NAME --channel TYPE:TARGET [--json]
Creates a simple single-channel alert policy.

Channel formats:
- Slack: `--channel slack:#channel-name`
- Email: `--channel email:team@company.com`
- Webhook: `--channel webhook:https://hooks.example.com/alert`

```json
{ "policy": { "id": "...", "name": "...", "steps": [...] } }
```

For complex escalation chains (multi-step, delays, SMS, phone), direct the user to the supaguard dashboard.
