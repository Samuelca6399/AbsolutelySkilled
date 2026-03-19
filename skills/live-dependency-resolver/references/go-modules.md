<!-- Part of the live-dependency-resolver AbsolutelySkilled skill. Load this file when working with Go modules. -->

# Go Modules Reference

## CLI Commands

### go list -m (primary lookup)

```bash
# Latest version of a module
go list -m golang.org/x/sync@latest
# Output: golang.org/x/sync v0.12.0

# All available versions
go list -m -versions golang.org/x/sync
# Output: golang.org/x/sync v0.0.0-20181108010431-42b317875d0f v0.1.0 v0.2.0 ...

# JSON output with more detail
go list -m -json golang.org/x/sync@latest
# {"Path": "golang.org/x/sync", "Version": "v0.12.0", "Time": "2025-01-..."}
```

**Gotcha:** `go list -m` must be run inside a Go module directory (one containing `go.mod`). Outside a module, use `GOFLAGS=-mod=mod` or the Go proxy API instead.

### go get vs go install

These two commands serve different purposes:

```bash
# go get: add/update a dependency in go.mod (for libraries)
go get github.com/gin-gonic/gin@latest
go get github.com/gin-gonic/gin@v1.10.0

# go install: install a binary tool (for executables)
go install golang.org/x/tools/gopls@latest
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

- Use `go get` when adding a library dependency to your project
- Use `go install` when installing a standalone CLI tool
- Since Go 1.17, `go get` no longer builds and installs binaries - use `go install` for that

### go mod tidy

```bash
# Clean up go.mod and go.sum
go mod tidy

# Add missing and remove unused dependencies
# Also downloads missing modules
```

---

## Go Module Proxy API

Base URL: `https://proxy.golang.org`

### Get latest version

```bash
# Latest version info
curl -s https://proxy.golang.org/golang.org/x/sync/@latest
# {"Version":"v0.12.0","Time":"2025-01-06T15:10:07Z"}

# List all versions
curl -s https://proxy.golang.org/golang.org/x/sync/@v/list
# v0.0.0-20181108010431-42b317875d0f
# v0.1.0
# v0.2.0
# ...

# Get go.mod for a specific version
curl -s https://proxy.golang.org/golang.org/x/sync/@v/v0.12.0.mod
```

### Case-encoding in proxy URLs

Go module paths are case-sensitive. The proxy uses a special encoding where uppercase letters become `!` + lowercase:

```bash
# github.com/Azure/azure-sdk-for-go -> github.com/!azure/azure-sdk-for-go
curl -s https://proxy.golang.org/github.com/'!azure'/azure-sdk-for-go/@latest
```

This rarely comes up for most packages but is critical for Microsoft, Google, and other mixed-case module paths.

---

## Module Paths and Versioning

### Module path structure

```
github.com/user/repo                    # Standard module
github.com/user/repo/v2                 # Major version 2+
golang.org/x/tools                      # Go standard library extensions
google.golang.org/grpc                  # Vanity import path
```

### Major version suffixes

Go modules use major version suffixes in the import path for v2+:

```go
import "github.com/user/repo"       // v0.x or v1.x
import "github.com/user/repo/v2"    // v2.x
import "github.com/user/repo/v3"    // v3.x
```

```bash
# Get latest v1
go list -m github.com/user/repo@latest

# Get latest v2 (different module path!)
go list -m github.com/user/repo/v2@latest
```

**Gotcha:** `v0` and `v1` do not have a version suffix in the import path. Starting from `v2`, the suffix is required. If you `go get repo/v2` but the module hasn't published a v2, it fails.

### Version selection

```bash
# Specific version
go get github.com/gin-gonic/gin@v1.10.0

# Latest tagged version
go get github.com/gin-gonic/gin@latest

# Specific commit (pseudo-version)
go get github.com/gin-gonic/gin@abc1234

# Upgrade all dependencies
go get -u ./...

# Upgrade only patch versions
go get -u=patch ./...
```

---

## go.mod File Format

```go
module github.com/myorg/myproject

go 1.22

require (
    github.com/gin-gonic/gin v1.10.0
    golang.org/x/sync v0.12.0
)

// Indirect dependencies (transitive)
require (
    github.com/some/indirect v1.0.0 // indirect
)

// Replace directives (local development or forks)
replace github.com/original/pkg => ../local-fork

// Exclude a broken version
exclude github.com/broken/pkg v1.0.1
```

---

## Common Gotchas

1. **Module paths are case-sensitive** - `github.com/User/Repo` and `github.com/user/repo` are different modules. Always use the exact casing from the repository.

2. **`go get` in module mode requires `go.mod`** - Running `go get` outside a module directory with `GO111MODULE=on` (default since Go 1.16) fails. Initialize with `go mod init` first.

3. **Major version suffixes change the import path** - v2+ of a module is a completely different module path. You cannot `go get repo@v2.0.0` - you must `go get repo/v2@v2.0.0`.

4. **`@latest` may not be the newest tag** - `@latest` resolves to the latest stable (non-pre-release) semver tag. A `v2.0.0-beta.1` tag won't be selected by `@latest`. Use `@v2.0.0-beta.1` explicitly for pre-releases.

5. **Private modules bypass the proxy** - Modules from private repos aren't available on `proxy.golang.org`. Set `GONOSUMCHECK` and `GOPRIVATE` for private module paths:
   ```bash
   go env -w GOPRIVATE=github.com/myorg/*
   ```

6. **`go mod tidy` may upgrade dependencies** - Running `go mod tidy` can change versions in `go.sum` if the dependency graph has changed. Review the diff before committing.

7. **Retracted versions** - Module authors can retract versions via `go.mod`. A retracted version won't be selected by `@latest` but can still be explicitly requested.
