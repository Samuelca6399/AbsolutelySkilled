# supaguard

supaguard is a production-ready AI agent skill for claude-code, gemini-cli, openai-codex. Creating synthetic monitoring checks from source code, generating Playwright monitoring scripts, deploying checks via CLI, setting up alerting, and managing uptime monitoring.

## Quick Facts

| Field | Value |
|-------|-------|
| Category | monitoring |
| Version | 0.1.0 |
| Platforms | claude-code, gemini-cli, openai-codex |
| License | MIT |

## How to Install

1. Make sure you have Node.js installed on your machine.
2. Run the following command in your terminal:

```bash
npx skills add AbsolutelySkilled/AbsolutelySkilled --skill supaguard
```

3. The supaguard skill is now available in your AI coding agent (Claude Code, Gemini CLI, OpenAI Codex, etc.).

## Overview

supaguard is a synthetic monitoring platform that lets you monitor production
applications by running Playwright scripts on a schedule from multiple regions.
This skill teaches your AI coding agent to read your source code, identify
critical user journeys, generate resilient Playwright monitoring scripts, and
deploy them as recurring checks - all without committing any test scripts to
your repository.

The workflow is fully interactive: the agent analyzes your codebase for routes,
forms, and testable elements, generates a script, tests it in the cloud runner,
and walks you through deployment options (scheduling, regions, alerting) one
step at a time.

---

## Tags

`monitoring` `playwright` `synthetic-monitoring` `uptime` `observability` `health-checks`

## Platforms

- claude-code
- gemini-cli
- openai-codex

## Related Skills

Pair supaguard with these complementary skills:

- [playwright-testing](https://www.absolutelyskilled.pro/skill/playwright-testing)
- [cli-design](https://www.absolutelyskilled.pro/skill/cli-design)

## Frequently Asked Questions

### What is supaguard?

supaguard is a synthetic monitoring skill that enables AI coding agents to create, test, and deploy production monitoring checks from your source code. It generates Playwright scripts that run on a schedule from multiple global regions, monitoring critical user flows like login, checkout, and page loads.

### How do I install supaguard?

Run `npx skills add AbsolutelySkilled/AbsolutelySkilled --skill supaguard` in your terminal. The skill will be immediately available in your AI coding agent.

### What AI agents support supaguard?

This skill works with claude-code, gemini-cli, openai-codex. Install it once and use it across any supported AI coding agent.

### Do I need the supaguard CLI?

Yes. The skill requires the supaguard CLI to test and deploy checks. Install it with `npm install -g supaguard` and authenticate with `supaguard login`.

### Does it write files to my project?

No. All monitoring scripts are written to `/tmp/sg-check-*.ts` and never committed to your repository.

## Maintainers

- [@maddhruv](https://github.com/maddhruv)

---

*Generated from [AbsolutelySkilled](https://www.absolutelyskilled.pro/skill/supaguard)*
