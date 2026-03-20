# observability

Use this skill when implementing logging, metrics, distributed tracing, alerting, or defining SLOs. Triggers on structured logging, Prometheus, Grafana, OpenTelemetry, Datadog, distributed tracing, error tracking, dashboards, alert fatigue, SLIs, SLOs, error budgets, and any task requiring system observability or monitoring setup.

## Install

```bash
npx skills add AbsolutelySkilled/AbsolutelySkilled --skill observability
```

## Overview

Observability is the ability to understand what a system is doing from the outside by
examining its outputs - without needing to modify the system or guess at internals.
The three pillars are **logs** (what happened), **metrics** (how the system is
performing), and **traces** (where time is spent across service boundaries). These
pillars are only useful when correlated - a spike in your p99 metric should link to
traces, and those traces should link to logs. Invest in correlation from day one, not
as a retrofit.

---

## Tags

`observability` `logging` `metrics` `tracing` `alerting` `slo`

## Platforms

- claude-code
- gemini-cli
- openai-codex

## Recommended Skills

- [site-reliability](https://absolutelyskilled.dev/skill/site-reliability)
- [incident-management](https://absolutelyskilled.dev/skill/incident-management)
- [performance-engineering](https://absolutelyskilled.dev/skill/performance-engineering)
- [sentry](https://absolutelyskilled.dev/skill/sentry)

## Maintainers

- [@maddhruv](https://github.com/maddhruv)

---

*Generated from [AbsolutelySkilled](https://absolutelyskilled.dev/skill/observability)*
