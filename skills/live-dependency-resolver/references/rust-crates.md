<!-- Part of the live-dependency-resolver AbsolutelySkilled skill. Load this file when working with Rust crates. -->

# Rust Crates Reference

## CLI Commands

### cargo search (primary lookup)

```bash
# Search for a crate by name
cargo search serde --limit 1
# Output: serde = "1.0.219"    # A generic serialization/deserialization framework

# Search with more results
cargo search http --limit 10

# The output format is: name = "version"    # description
# Parse carefully - extract just the version between quotes
```

**Gotcha:** `cargo search` output includes a description after the version number. When extracting the version programmatically, parse only the content between the first pair of double quotes after `=`.

### cargo add (add dependency)

```bash
# Add latest version (built-in since Rust 1.62)
cargo add serde

# Add with specific features
cargo add serde --features derive
cargo add tokio --features full

# Add specific version
cargo add serde@1.0.219

# Add as dev dependency
cargo add --dev criterion

# Add as build dependency
cargo add --build cc

# Dry run to see what would change
cargo add serde --dry-run
```

For Rust versions before 1.62, `cargo add` requires the `cargo-edit` crate:
```bash
cargo install cargo-edit
```

### cargo update

```bash
# Update all dependencies to latest compatible versions
cargo update

# Update a specific crate
cargo update serde

# Update to a specific version
cargo update serde --precise 1.0.219
```

---

## crates.io API

Base URL: `https://crates.io/api/v1`

**Critical:** crates.io requires a `User-Agent` header on all API requests. Requests without it return 403 Forbidden.

### Get crate metadata

```bash
# Get crate info (requires User-Agent header)
curl -s -H "User-Agent: live-dep-resolver" \
  https://crates.io/api/v1/crates/serde | jq '.crate.max_version'

# Get specific version info
curl -s -H "User-Agent: live-dep-resolver" \
  https://crates.io/api/v1/crates/serde/1.0.219 | jq '.version.num'

# List all versions
curl -s -H "User-Agent: live-dep-resolver" \
  https://crates.io/api/v1/crates/serde/versions | jq '.versions[].num' | head -10

# Get download count
curl -s -H "User-Agent: live-dep-resolver" \
  https://crates.io/api/v1/crates/serde | jq '.crate.downloads'

# Search for crates
curl -s -H "User-Agent: live-dep-resolver" \
  'https://crates.io/api/v1/crates?q=json&per_page=5' | jq '.crates[].name'
```

### Check crate existence

```bash
# Returns 200 if exists, 404 if not
curl -s -o /dev/null -w "%{http_code}" \
  -H "User-Agent: live-dep-resolver" \
  https://crates.io/api/v1/crates/some-crate-name
```

---

## Feature Flags

Rust crates use feature flags to enable optional functionality:

```toml
# Cargo.toml - enabling features
[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }

# Default features are enabled automatically
# To disable them:
serde_json = { version = "1.0", default-features = false }
```

### Checking available features

```bash
# Via API
curl -s -H "User-Agent: live-dep-resolver" \
  https://crates.io/api/v1/crates/tokio/1.43.0 | jq '.version.features'

# Via docs.rs (human-readable)
# https://docs.rs/tokio/latest/tokio/#feature-flags
```

Common feature patterns:
- `derive` - Proc macro derives (serde, thiserror)
- `full` - All features enabled (tokio)
- `json` - JSON support (reqwest)
- `rustls-tls` / `native-tls` - TLS backend selection
- `async` - Async runtime support

---

## Cargo.toml Version Requirements

| Requirement | Meaning |
|---|---|
| `"1.0.219"` | `>=1.0.219, <2.0.0` (default caret) |
| `"^1.0.219"` | Same as above (explicit caret) |
| `"~1.0.219"` | `>=1.0.219, <1.1.0` (tilde) |
| `"=1.0.219"` | Exact version only |
| `">=1.0, <2.0"` | Explicit range |
| `"*"` | Any version |

**Note:** Cargo's default `"1.0.219"` is equivalent to npm's `^1.0.219`. This is the recommended way to specify versions - it allows patch and minor updates while preventing breaking changes.

### Workspace dependencies (monorepo)

```toml
# Root Cargo.toml
[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

# Member Cargo.toml
[dependencies]
serde = { workspace = true }
tokio = { workspace = true }
```

---

## Common Gotchas

1. **crates.io API requires User-Agent** - Any request without a `User-Agent` header returns 403. Always include one: `-H "User-Agent: my-app"`.

2. **`cargo search` output needs parsing** - The output format is `name = "version"  # description`. Don't include the description text when extracting the version.

3. **Feature flags can change between versions** - A feature available in v1.0 may be renamed or removed in v2.0. Always check features for the specific version being installed.

4. **Yanked versions** - Crate authors can yank versions (similar to npm deprecation). Yanked versions won't be selected by cargo but can still be used if already in `Cargo.lock`. The API field is `version.yanked`.

5. **`cargo add` availability** - Built into cargo since Rust 1.62 (June 2022). For older toolchains, install `cargo-edit`: `cargo install cargo-edit`.

6. **Crate name vs module name** - Crate names use hyphens (`serde-json`) but Rust code uses underscores (`serde_json`). The registry treats them as equivalent but `use` statements require underscores.

7. **Build scripts and proc macros** - Some crates require a C compiler or system libraries. `openssl-sys` needs OpenSSL headers; `ring` needs a C compiler. Check the crate's README for system dependencies.
