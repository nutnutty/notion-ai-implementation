# {{PAGE_TITLE}}

Mode: `{{MODE}}`  
Language: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## Purpose

Define health-state criteria and response actions so the system remains operational and measurable.

<!-- REQUIRED:When to use -->
## When to use

- Daily startup and closure checks.
- Before/after sync or schema mapping changes.
- During incident triage.

<!-- REQUIRED:How to use -->
## How to use

1. Inspect `GET /automation/state`.
2. Review `AI Run Log` and incident views.
3. Execute one capture smoke test.
4. Open an incident if degraded/failed state persists.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs

**Inputs**

- Runtime endpoint state
- Capture/update sync outcomes
- Governance and incident dashboard views

**Outputs**

- Health status label (`full`, `normal`, `degraded`, `failed`)
- Corrective action plan with owner and due date

<!-- REQUIRED:Health Signals -->
## Health Signals

- **Full**
  - Capture + sync stable on active routes.
  - Follow-up cycle executes on time.
- **Normal**
  - Occasional retries with controlled backlog.
- **Degraded**
  - Repeated route-level sync failures.
  - Increasing triage backlog.
- **Failed**
  - Capture endpoint failure or no local persistence.
  - System cannot produce usable operational records.

<!-- REQUIRED:Limitations -->
## Limitations

- Health quality depends on consistent logging and reviews.
- No default external observability stack included.

<!-- REQUIRED:Examples -->
## Examples

- Full: new capture appears in local records and Notion.
- Degraded: local records update but Notion sync repeatedly fails.
- Failed: capture request returns runtime error and no new record.

<!-- REQUIRED:Related Links -->
## Related Links

- [Runtime](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync](server/src/notion-sync.ts)

