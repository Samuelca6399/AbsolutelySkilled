<!-- Part of the codedocs AbsolutelySkilled skill. Load this file when
     running codedocs:generate to document a codebase. -->

# Generate Workflow

Complete reference for the `codedocs:generate` command - discovery heuristics,
module boundary detection, tech stack identification, and output templates.

---

## Discovery Phase

### Step 1: Tech stack identification

Scan the repo root (and target path) for manifest files. Each file reveals
language, framework, and dependency information:

| Manifest file | Language/Platform | Key info to extract |
|---|---|---|
| `package.json` | JavaScript/TypeScript | dependencies, scripts, main/module entry |
| `tsconfig.json` | TypeScript | paths, baseUrl, project references |
| `Cargo.toml` | Rust | dependencies, workspace members, bin targets |
| `go.mod` | Go | module path, dependencies |
| `requirements.txt` / `pyproject.toml` / `setup.py` | Python | dependencies, entry points |
| `composer.json` | PHP | autoload paths, dependencies |
| `pom.xml` / `build.gradle` | Java/Kotlin | modules, dependencies |
| `Gemfile` | Ruby | gems, groups |
| `mix.exs` | Elixir | deps, applications |
| `CMakeLists.txt` / `Makefile` | C/C++ | targets, includes |
| `Package.swift` | Swift | targets, dependencies |
| `.csproj` / `.sln` | C#/.NET | project references, packages |

For monorepos, check for workspace definitions:
- `package.json` with `workspaces` field
- `Cargo.toml` with `[workspace]` section
- `go.work` file
- `pnpm-workspace.yaml`
- `lerna.json`

Record: primary language, framework (if detectable from dependencies), build
tool, and test framework.

### Step 2: Entry point detection

Entry points are the starting locations for understanding code flow. Detect them
by checking (in priority order):

1. **Explicit main files** - `main.ts`, `main.go`, `main.rs`, `__main__.py`,
   `Main.java`, `Program.cs`
2. **Index/entry exports** - `index.ts`, `index.js`, `lib.rs`, `__init__.py`,
   `mod.rs`
3. **Framework entry points** - `app.ts` (Express/Fastify), `pages/` or `app/`
   (Next.js), `src/App.tsx` (React), `manage.py` (Django), `config/routes.rb`
   (Rails)
4. **CLI entry points** - `bin/` directory, `scripts` in package.json,
   `[tool.poetry.scripts]` in pyproject.toml
5. **Config-defined entries** - `main` or `module` field in package.json,
   `[lib]` in Cargo.toml

### Step 3: Module boundary detection

Modules are the primary unit of documentation. Detect boundaries using these
heuristics (apply in order, first match wins):

1. **Monorepo packages** - Each workspace package is a module
2. **Top-level src/ directories** - `src/auth/`, `src/api/`, `src/database/`
   each become a module if they contain 3+ files
3. **Framework conventions** - `controllers/`, `models/`, `services/`,
   `routes/`, `middleware/`, `utils/` in MVC frameworks
4. **Explicit module markers** - Directories containing `mod.rs` (Rust),
   `__init__.py` (Python), `index.ts` (TypeScript)
5. **Domain directories** - Any directory 2+ levels deep with 5+ source files
   and a cohesive purpose (inferred from file names and imports)

For each candidate module, record:
- Directory path
- File count and primary language
- Exports (public API surface)
- Imports from other modules (dependency graph)
- One-line purpose summary (inferred from directory name, exports, and README
  if present)

### Step 4: Cross-cutting pattern detection

Patterns are concerns that span multiple modules. Detect by looking for:

- **Error handling** - Shared error types, error middleware, Result/Either
  patterns, custom exception classes
- **Testing** - Test directory structure, test utilities, fixtures, mocking
  patterns, test configuration
- **Logging/observability** - Logger configuration, structured logging,
  metrics, tracing setup
- **Authentication/authorization** - Auth middleware, guards, decorators,
  permission checks across modules
- **Configuration** - Config loading, environment variable handling, feature
  flags
- **Database access** - ORM setup, migration patterns, repository patterns,
  connection management
- **API conventions** - Request/response schemas, validation patterns,
  serialization, versioning

Only create a pattern doc if the pattern appears in 2+ modules. Single-module
patterns belong in the module doc.

### Step 5: Present the plan

Before writing any documentation, present the discovery results to the user:

```
Codedocs Discovery Plan
========================
Repository: <name>
Tech stack: <language> + <framework> (<build tool>)
Entry points: <list>

Modules to document (<count>):
  - <module-name> (<path>) - <one-line summary>
  - ...

Patterns detected (<count>):
  - <pattern-name> - <where it appears>
  - ...

Estimated output: <N> files in <output-dir>/

Proceed? [Y/n]
```

Wait for user approval. They may want to add, remove, or rename modules.

---

## OVERVIEW.md Template

```markdown
# <Project Name>

<2-3 sentence summary of what the project does, who it's for, and the core
problem it solves.>

## Tech Stack

| Layer | Technology |
|---|---|
| Language | <e.g. TypeScript> |
| Framework | <e.g. Next.js 14> |
| Database | <e.g. PostgreSQL via Prisma> |
| Testing | <e.g. Vitest + Playwright> |
| Build | <e.g. Turbopack> |

## Architecture

<2-4 paragraphs describing the high-level architecture. Include:
- System boundaries (what's in this repo vs external services)
- Request/data flow (how a request enters, gets processed, and returns)
- Key architectural decisions and their rationale>

## Entry Points

| Entry point | Purpose |
|---|---|
| `<path>` | <what it starts/serves> |

## Module Map

| Module | Path | Description |
|---|---|---|
| <name> | `<path>` | <one-line purpose> |

## Key Concepts

<Glossary of domain-specific terms used throughout the codebase. Only include
terms that would confuse someone unfamiliar with the project.>

## Getting Started

<Minimal steps to clone, install, and run the project locally. Pull from
existing README if available.>
```

---

## Module Doc Template

Each module doc in `modules/` follows this structure:

```markdown
# <Module Name>

<1-2 sentence summary of the module's purpose and responsibility.>

## Public API

<List of exported functions, classes, types, or endpoints with brief
descriptions. This is what other modules consume.>

## Internal Structure

<How the module is organized internally. Key files and their roles.
Only list files that are important for understanding - skip trivial
utility files.>

## Dependencies

| Depends on | Why |
|---|---|
| <module/package> | <what it uses from it> |

## Dependents

| Used by | How |
|---|---|
| <module> | <what it imports/uses> |

## Implementation Notes

<Key design decisions, non-obvious behavior, performance considerations,
or known limitations specific to this module. Skip this section if there
is nothing noteworthy.>
```

---

## Pattern Doc Template

Each pattern doc in `patterns/` follows this structure:

```markdown
# <Pattern Name>

<1-2 sentence description of the pattern and why the codebase uses it.>

## Where It Appears

<List of modules that implement or interact with this pattern.>

## Convention

<The rules to follow when working with this pattern. Be specific -
code style, naming conventions, file placement, etc.>

## Examples

<2-3 concrete examples from the codebase showing the pattern in use.
Reference actual file paths.>
```
