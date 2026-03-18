<!-- Part of the codedocs AbsolutelySkilled skill. Load this file when
     running codedocs:update to incrementally refresh docs. -->

# Update Workflow

Complete reference for the `codedocs:update` command - diff detection, manifest-driven
scoping, new module detection, and OVERVIEW.md synchronization.

---

## Pre-flight Check

1. Look for `.codedocs.json` in the output directory
2. If missing, respond: "No existing codedocs found. Run `codedocs:generate` first.
   `codedocs:update` only works with existing documentation."
3. If found, read the full manifest to understand the current documentation state

---

## Mode 1: Targeted Scope Update

**Command:** `codedocs:update --scope path/to/module`

### Step-by-step workflow

1. **Validate scope** - Confirm the specified path exists in the repo. Check
   if it maps to an existing module in the manifest.

2. **Re-discover the scoped path** - Run the discovery phase (from
   `generate-workflow.md`) limited to the specified directory. This produces
   an updated snapshot of:
   - File list and primary language
   - Exports (public API surface)
   - Imports from other modules
   - Internal structure

3. **Diff against existing module doc** - Compare the new discovery against
   the current content in `modules/<module>.md`. Identify:
   - New exports not in the current doc
   - Removed exports still listed in the current doc
   - Changed dependencies (new imports or dropped imports)
   - New files that might deserve mention in Internal Structure
   - Changed file structure (renamed, moved, or deleted files)

4. **Rewrite the module doc** - Update only the sections that changed. Keep
   unchanged sections intact to preserve any manual edits or notes the user
   may have added.

5. **Check OVERVIEW.md impact** - If any of these changed, update OVERVIEW.md:
   - Module's one-line description in the Module Map table
   - Module's dependencies (affects architecture understanding)
   - Module was renamed or moved

6. **Check pattern impact** - If the module's changes affect a documented
   pattern (e.g., a new error type, a changed auth flow), flag it:
   "The changes in `<module>` may affect the pattern doc
   `patterns/<pattern>.md`. Review and update if needed."

7. **Update manifest** - Set the module's `last_sha` to the current commit
   SHA and `last_updated` to the current timestamp.

### Handling new paths

If the `--scope` path doesn't match any existing module in the manifest:
- Treat it as a new module
- Run the full module doc generation workflow
- Add it to the manifest
- Add it to OVERVIEW.md's Module Map
- Prompt: "This path wasn't previously documented. I've added it as a new
  module: `<name>`. Verify the module name and description are correct."

---

## Mode 2: Git Diff Update

**Command:** `codedocs:update --diff [base..head]`

### Determining the diff range

- If `base..head` is provided, use it directly
- If only `--diff` is provided (no range), determine the range automatically:
  1. Read `last_global_sha` from the manifest
  2. Use `last_global_sha..HEAD` as the range
  3. If `last_global_sha` is missing, fall back to `HEAD~10..HEAD` and warn:
     "No baseline SHA in manifest. Diffing last 10 commits. For accurate
     results, run a full `codedocs:generate` to establish a baseline."

### Step-by-step workflow

1. **Get changed files** - Run:
   ```bash
   git diff --name-only <base>..<head>
   ```
   Collect the list of changed file paths.

2. **Filter to source files** - Remove non-source files that don't affect
   documentation: images, lock files, CI configs, editor configs, etc.
   Keep: source code files, manifest files (package.json, etc.), config
   files that affect architecture.

3. **Map files to modules** - For each changed file, find its parent module
   using the manifest's `source_path` mappings. Build a set of affected
   modules.

4. **Categorize changes:**
   - **Modified modules** - Modules with changed source files
   - **New module candidates** - Changed files in directories not mapped to
     any existing module
   - **Deleted modules** - Modules whose entire source directory was removed
   - **Config changes** - Changes to root-level config that might affect
     OVERVIEW.md (package.json dependencies, build config, etc.)

5. **Process modified modules** - For each affected module, run the targeted
   scope update workflow (Mode 1, steps 2-7).

6. **Handle new module candidates** - For directories with changed files that
   don't belong to any documented module:
   - If the directory has 3+ source files, suggest it as a new module
   - If fewer, suggest adding the files to the nearest existing module's doc
   - Prompt the user for confirmation before adding

7. **Handle deleted modules** - If a documented module's source directory no
   longer exists:
   - Remove the module doc from `modules/`
   - Remove the entry from the manifest
   - Remove the row from OVERVIEW.md's Module Map
   - Warn: "Module `<name>` was removed (source directory deleted). Its
     documentation has been cleaned up."

8. **Update OVERVIEW.md** - Sync any changes to the Module Map, Tech Stack
   (if dependencies changed), or Architecture section (if major structural
   changes detected).

9. **Update manifest** - Bump `last_global_sha` to `<head>`. Update
   per-module SHAs for all modified modules.

### Summary output

After processing, print a summary:

```
Codedocs Update Summary
========================
Diff range: <base>..<head> (<N> commits)
Files changed: <N>
Modules updated: <list>
New modules added: <list or "none">
Modules removed: <list or "none">
Pattern docs flagged: <list or "none">

Updated files:
  - docs/modules/<name>.md (modified)
  - docs/OVERVIEW.md (module map updated)
  - docs/.codedocs.json (manifest updated)
```

---

## OVERVIEW.md Sync Rules

OVERVIEW.md should be updated during any update operation if:

1. **Module Map changed** - Module added, removed, renamed, or description changed
2. **Tech Stack changed** - New dependency added to manifest file that changes
   the tech stack table (e.g., new database, new framework)
3. **Entry points changed** - New CLI command, new route file, new main entry
4. **Architecture changed** - Major structural refactor detected (multiple
   modules affected, new inter-module dependencies)

For minor changes (single module internal update, no API changes), skip
OVERVIEW.md to avoid unnecessary churn.

---

## Manifest Update Rules

After every update operation:

1. Set `last_global_sha` to the current HEAD (or the `head` from the diff range)
2. For each updated module, set `last_sha` to the latest commit touching that
   module's source path
3. Set `last_updated` to the current ISO 8601 timestamp
4. If modules were added or removed, update the `modules` array accordingly
5. Increment `update_count` by 1 (tracks how many times docs have been updated)
