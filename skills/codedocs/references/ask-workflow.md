<!-- Part of the codedocs AbsolutelySkilled skill. Load this file when
     running codedocs:ask to answer questions from docs. -->

# Ask Workflow

Complete reference for the `codedocs:ask` command - question routing, doc-first
resolution strategy, source code fallback, and citation format.

---

## Pre-flight Check

Before answering any question:

1. Look for `.codedocs.json` in the expected output directory (default: `docs/`)
2. If missing, respond: "No codedocs found. Run `codedocs:generate` first to
   create documentation, then ask your question again."
3. If found, read the manifest to understand what's documented and when it was
   last updated.

---

## Question Routing

Route the user's question to the most relevant doc file(s):

### Architecture / overview questions

**Signals:** "how does this project work", "what's the architecture", "tech
stack", "what does this repo do", "system overview", "getting started"

**Route to:** `OVERVIEW.md`

### Module-specific questions

**Signals:** mentions a specific directory, file, feature area, function name,
class name, or module name that maps to an entry in the manifest's module list

**Route to:** `modules/<module-name>.md`

**Disambiguation:** If the question mentions something that could map to multiple
modules, check the manifest's source path mappings. If still ambiguous, read the
OVERVIEW.md module map to determine the best match. If truly ambiguous, read both
module docs.

### Cross-cutting / pattern questions

**Signals:** "how does error handling work", "testing strategy", "logging",
"auth flow", "configuration", "database access patterns" - anything that spans
modules

**Route to:** `patterns/<pattern-name>.md`

### Dependency / relationship questions

**Signals:** "what depends on X", "what does X import", "how are modules
connected", "dependency graph"

**Route to:** Start with `OVERVIEW.md` module map, then read relevant module
docs for their Dependencies and Dependents sections.

### Broad / unclear questions

**Signals:** Vague questions like "explain the code" or "how does everything
work together"

**Route to:** `OVERVIEW.md` first. If the user needs more depth, suggest
specific modules to drill into.

---

## Doc-First Resolution Strategy

This is the core principle of codedocs:ask. Follow this resolution order
strictly:

### Level 1: Docs only (preferred)

Read the routed doc file(s). If the answer is fully contained in the docs:
- Answer the question
- Cite the doc file: "Source: `docs/modules/auth.md`"
- Done

### Level 2: Docs + light inference

If the docs contain most of the answer but require minor inference (connecting
two documented facts, applying a documented pattern to a specific case):
- Answer with the inference clearly stated
- Cite the doc files used
- Done

### Level 3: Docs insufficient, source code needed

If the docs don't contain enough detail to answer the question:
1. Identify which source files would have the answer (use the module doc's
   Internal Structure section to locate them)
2. Read the minimum source files needed
3. Answer the question
4. Add a staleness flag: "Note: this answer required reading source code
   beyond what's in the docs. The following files contain details not yet
   captured: `<file list>`. Consider running `codedocs:update --scope
   <module-path>` to capture this."

### Level 4: Question outside documented scope

If the question is about code that isn't documented at all (no matching module
in the manifest):
1. Check if the code exists in the repo
2. If yes, answer from source and flag: "This code is not yet documented by
   codedocs. Run `codedocs:generate` or `codedocs:update` to add it."
3. If no, tell the user the code doesn't exist in this repo

---

## Staleness Awareness

When answering, check the manifest's `last_updated` timestamp and git SHA for
the relevant module:

- If the documented SHA matches the current HEAD for that module's files, the
  docs are fresh - answer with confidence
- If files have changed since the documented SHA, warn: "Note: the docs for
  this module were generated at commit `<sha>` but the code has changed since.
  The answer may be outdated. Run `codedocs:update --scope <path>` to refresh."

To check staleness without a full git operation, compare the manifest SHA
against `git log -1 --format=%H -- <module-path>`.

---

## Citation Format

Always cite sources in answers:

**From docs:**
```
Source: `docs/modules/auth.md`
```

**From multiple docs:**
```
Sources: `docs/OVERVIEW.md`, `docs/modules/auth.md`
```

**From source code (fallback):**
```
Source: `src/auth/middleware.ts` (not in docs - consider updating)
```

**From both:**
```
Sources: `docs/modules/auth.md`, `src/auth/middleware.ts:42` (detail not in docs)
```

---

## Multi-Turn Q&A

When the user asks follow-up questions in the same session:
- Keep track of which doc files are already loaded in context
- Don't re-read files already loaded unless the question requires a fresh look
- If the conversation is getting deep into a single module, suggest: "For more
  detail on this module, I can read the source code directly. Want me to?"
