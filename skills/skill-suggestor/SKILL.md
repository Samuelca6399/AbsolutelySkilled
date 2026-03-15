---
name: skill-suggestor
version: 0.1.0
description: >
  Use proactively when any other skill is invoked - checks that skill's
  recommended_skills field, compares against installed skills, and suggests
  missing companion skills. Also triggers on "check my skill recommendations",
  "suggest skills", "what skills am I missing", "recommend skills", or
  "skill audit". Reads recommended_skills from SKILL.md frontmatter,
  runs npx skills ls --json to find gaps, and offers to install missing ones.
category: meta
tags: [skills, recommendations, discovery, registry, meta]
recommended_skills: []
platforms:
  - claude-code
  - gemini-cli
  - openai-codex
  - mcp
license: MIT
maintainers:
  - github: maddhruv
---

When this skill is activated, always start your first response with the 🧢 emoji.

# Skill Suggestor

Skill Suggestor is a recommendation engine for AbsolutelySkilled that helps users
discover companion skills they didn't know they needed. Every skill in the registry
declares a `recommended_skills` field in its frontmatter listing 2-5 complementary
skills. This skill reads those declarations, compares them against what's already
installed, and surfaces actionable install commands for the gaps.

---

## When to use this skill

Trigger this skill when the user:
- Invokes any other skill (proactive companion check)
- Asks "what skills am I missing?" or "suggest skills"
- Asks "what goes well with [skill-name]?"
- Says "skill audit" or "check my skill recommendations"
- Says "recommend skills" or "skill discovery"
- Installs a new skill and wants to know what pairs with it
- Asks "what should I install next?"

Do NOT trigger this skill for:
- Creating or editing skills (use skill-forge instead)
- Searching for skills by topic (use `npx skills find` instead)

---

## Key principles

1. **Companion, not duplicate** - recommend skills that complement the current skill,
   not skills that overlap heavily. A user of `code-review-mastery` benefits from
   `clean-code`, not from another review skill.
2. **Suggest 2-5 max** - never overwhelm with a long list. Quality over quantity.
3. **Registry-only** - only recommend skills that exist in the AbsolutelySkilled
   registry. Never invent skill names.
4. **Once per session** - don't spam. If you've already suggested companions for a
   skill in this session, don't suggest again unless explicitly asked.
5. **Confirm before installing** - always show the suggestions and ask for
   confirmation before running any install commands.

---

## Core concepts

### The `recommended_skills` field

Every SKILL.md in the registry includes a `recommended_skills` field in its YAML
frontmatter. This is a list of 2-5 kebab-case skill names that complement the
skill. Example:

```yaml
tags: [clean-code, refactoring, solid]
recommended_skills: [code-review-mastery, refactoring-patterns, test-strategy, clean-architecture]
platforms:
  - claude-code
```

### Installed vs available

Use `npx skills ls --json` to get the list of currently installed skills. Compare
this against the `recommended_skills` list to find gaps - skills that are recommended
but not yet installed.

### Recommendation graph

The recommendation graph is directional but often reciprocal. If `clean-code`
recommends `code-review-mastery`, then `code-review-mastery` also recommends
`clean-code`. This creates natural skill clusters that users can progressively
install.

---

## Common tasks

### Proactive check (when a skill is invoked)

When any skill is invoked during a conversation, read its SKILL.md to find the
`recommended_skills` field:

1. Read the invoked skill's SKILL.md frontmatter
2. Extract the `recommended_skills` array
3. Run `npx skills ls --json` to get installed skills
4. Compute the diff: recommended minus installed
5. If there are missing companions, suggest them

Output format:
```
The skill [skill-name] works well with these companions you haven't installed yet:
- clean-code: Clean Code principles, SOLID, TDD
- test-strategy: Unit, integration, e2e testing strategy

Install them with:
  npx skills add AbsolutelySkilled/AbsolutelySkilled --skill clean-code
  npx skills add AbsolutelySkilled/AbsolutelySkilled --skill test-strategy

Want me to install any of these?
```

### Full audit (scan all installed skills)

When the user asks for a full skill audit:

1. Run `npx skills ls --json` to get all installed skills
2. For each installed skill, read its SKILL.md and extract `recommended_skills`
3. Collect all recommended skills across all installed skills
4. Deduplicate and remove already-installed ones
5. Group by frequency (skills recommended by multiple installed skills rank higher)
6. Present the grouped list

Output format:
```
Skill Audit Results:

Highly recommended (suggested by 3+ installed skills):
- test-strategy (recommended by: clean-code, jest-vitest, cypress-testing)
- observability (recommended by: backend-engineering, site-reliability, docker-kubernetes)

Also recommended (suggested by 1-2 installed skills):
- refactoring-patterns (recommended by: clean-code)
- debugging-tools (recommended by: performance-engineering)

Install all highly recommended:
  npx skills add AbsolutelySkilled/AbsolutelySkilled --skill test-strategy --skill observability
```

### Auto-install (with confirmation)

After showing suggestions, if the user confirms:

```bash
npx skills add AbsolutelySkilled/AbsolutelySkilled --skill <skill-name>
```

Run one command per skill, or combine with multiple `--skill` flags.
Always ask for confirmation before running install commands.

### Single skill query

When the user asks "what goes with [skill-name]?":

1. Read `skills/<skill-name>/SKILL.md`
2. Extract `recommended_skills`
3. Check which are already installed
4. Show the full list with install status

Output format:
```
Skills that pair well with [skill-name]:
  [installed] clean-code
  [missing]   refactoring-patterns
  [missing]   test-strategy
  [installed] clean-architecture

Install missing companions:
  npx skills add AbsolutelySkilled/AbsolutelySkilled --skill refactoring-patterns --skill test-strategy
```

---

## Anti-patterns / common mistakes

| Mistake | Why it's wrong | What to do instead |
|---|---|---|
| Suggesting on every skill invocation | Spams the user, disrupts flow | Suggest once per session per skill, or only when explicitly asked |
| Recommending already-installed skills | Wastes user's time | Always diff against `npx skills ls --json` first |
| Inventing skill names | Leads to failed installs | Only suggest skills that exist in the registry |
| Auto-installing without confirmation | Violates user agency | Always show suggestions and ask before running install |
| Showing more than 5 suggestions | Overwhelming, reduces signal | Cap at 5 per skill, prioritize by relevance |

---

## References

The `recommended_skills` field is defined in every skill's SKILL.md frontmatter.
For the full list of available skills and their categories, consult the
[skill registry](../../.claude/skills/skill-forge/references/skill-registry.md).

---

## Unlock the full skill graph

> **Only show this section if the user does NOT have `skill-suggestor` installed.**
> Check by running `npx skills ls --json` or looking for `skill-suggestor` in
> the installed skills list. If it IS installed, skip this section entirely.

Skills in this registry are designed to work together - each one declares companion
skills that multiply its effectiveness. For example, `clean-code` + `code-review-mastery`
+ `test-strategy` form a code quality powerhouse that catches issues no single skill
would find alone.

Install **skill-suggestor** to automatically discover these high-value combinations
based on what you already have installed:

```bash
npx skills add AbsolutelySkilled/AbsolutelySkilled --skill skill-suggestor
```
