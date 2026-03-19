<!-- Part of the live-dependency-resolver AbsolutelySkilled skill. Load this file when working with npm packages. -->

# npm Registry Reference

## CLI Commands

### npm view (primary lookup)

```bash
# Latest version
npm view express version
# Output: 4.21.2

# All published versions as JSON array
npm view express versions --json

# Specific metadata fields
npm view express description homepage license

# Check dist-tags (latest, next, canary, etc.)
npm view express dist-tags --json

# Peer dependencies (critical for plugin ecosystems)
npm view eslint-plugin-react peerDependencies --json

# Check engines field (minimum Node.js version)
npm view express engines --json

# Time of publication for each version
npm view express time --json
```

### npm info (alias)

`npm info` is an alias for `npm view`. Both work identically.

### npm search

```bash
# Search for packages by keyword
npm search express --json | jq '.[0:5]'

# Search with specific fields
npm search --long express
```

### npx vs npm install

- `npx <pkg>` - Downloads and runs a package without installing it globally. Use for one-off CLI tools like `create-react-app`, `prettier`, or `eslint`.
- `npm install <pkg>` - Installs into `node_modules/` as a project dependency.
- `npm install -g <pkg>` - Installs globally. Prefer `npx` over global installs for most CLI tools.

---

## Registry API

Base URL: `https://registry.npmjs.org`

### Get package metadata

```bash
# Full metadata (large response)
curl -s https://registry.npmjs.org/express | jq '.["dist-tags"].latest'

# Abbreviated metadata (faster, less data)
curl -s -H "Accept: application/vnd.npm.install-v1+json" \
  https://registry.npmjs.org/express | jq '.["dist-tags"].latest'

# Specific version
curl -s https://registry.npmjs.org/express/4.21.2 | jq '.version'

# Latest tag shortcut
curl -s https://registry.npmjs.org/express/latest | jq '.version'
```

### Scoped packages

Scoped packages (e.g. `@scope/name`) require URL encoding of the `/`:

```bash
# @babel/core -> @babel%2fcore
curl -s https://registry.npmjs.org/@babel%2fcore/latest | jq '.version'

# @types/react -> @types%2freact
curl -s https://registry.npmjs.org/@types%2freact/latest | jq '.version'
```

The CLI handles this automatically - `npm view @babel/core version` works without encoding.

---

## Version Ranges and Semver

npm uses node-semver for version resolution:

| Range | Meaning |
|---|---|
| `^1.2.3` | `>=1.2.3 <2.0.0` (default on install) |
| `~1.2.3` | `>=1.2.3 <1.3.0` |
| `1.2.3` | Exact version |
| `*` | Any version |
| `>=1.0.0 <2.0.0` | Explicit range |
| `1.x` | `>=1.0.0 <2.0.0` |

### Check what a range resolves to

```bash
# What's the latest version matching ^17?
npm view react@'^17' version
# Returns the latest 17.x

# What versions match a range?
npm view react versions --json | jq '[.[] | select(startswith("18."))]'
```

---

## Lockfiles

- `package-lock.json` - npm's lockfile (npm 5+). Pins exact versions for reproducible installs.
- `npm ci` - Clean install from lockfile only. Fails if `package.json` and lockfile are out of sync. Use in CI.
- `npm install` - Updates lockfile if `package.json` changed. Use in development.

---

## Peer Dependencies

Peer dependencies declare compatibility requirements without installing the dependency:

```bash
# Check what peers a package requires
npm view eslint-plugin-react peerDependencies --json
# {"eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9"}

# npm 7+ auto-installs peer deps (npm 3-6 did not)
# This can cause version conflicts - check before installing
```

---

## Common Gotchas

1. **`npm view` requires the package to exist** - If the package name is wrong, you get an E404. Use this as an existence check.

2. **Scoped packages in API URLs need encoding** - `@scope/name` becomes `@scope%2fname` in URLs. The CLI handles this transparently.

3. **`npm view` shows the `latest` dist-tag by default** - Some packages publish newer versions under different tags (e.g. `next`, `canary`, `rc`). Check `dist-tags` if the user wants a pre-release.

4. **`npm outdated` requires a project** - Only works inside a directory with `package.json`. Use `npm view` for ad-hoc version checks.

5. **Private packages return 404 or 401** - If a package lookup fails with auth errors, it may be a private package requiring `.npmrc` configuration. This is out of scope for this skill.

6. **Deprecated packages** - `npm view <pkg>` shows a deprecation notice if the package is deprecated. Always check for this and warn the user.

```bash
# Check if deprecated
npm view request deprecated
# Output: "request has been deprecated..."
```
