# {{PAGE_TITLE}}

Mode: `{{MODE}}`  
Language: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## Purpose

Define operational health states, thresholds, and response actions so the system remains reliable and observable.

<!-- REQUIRED:When to use -->
## When to use

- Daily startup and end-of-day checks.
- Before/after runtime or mapping changes.
- Whenever sync, capture, or follow-up behavior looks abnormal.

<!-- REQUIRED:How to use -->
## How to use

1. Check `GET /automation/state` for runtime and sync posture.
2. Review latest entries in `AI Run Log` and `Incident Register`.
3. If degraded or failing, run targeted capture smoke test.
4. Apply incident playbook and track corrective action in `Work Items`.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs

**Inputs**

- Endpoint telemetry (`/automation/state`, `/automation/records`)
- Sync outcomes in capture/update responses
- Notion dashboard views (`AI Runs Failed`, `Missing Required Fields`, `Active Incidents`)

**Outputs**

- Health classification: `full`, `normal`, `degraded`, `failed`
- Required action owner and due date
- Incident record if status is degraded/failed beyond one cycle

<!-- REQUIRED:Health Signals -->
## Health Signals

- **Full**
  - Local capture is successful and timely.
  - Sync succeeds for active routes.
  - Follow-up cycle runs with no stale items.
  - Validation views show no unresolved critical issues.
- **Normal**
  - Capture works; limited sync retries occur.
  - Inbox triage queue exists but is manageable.
- **Degraded**
  - Repeated sync failures on one route.
  - Backlog growth in unresolved inbox or incidents.
  - Missing required fields appears in governance view.
- **Failed**
  - Capture endpoint fails or records stop persisting.
  - Multiple route sync failures with no successful recovery.
  - Follow-up cycle not running and operational decisions blocked.

<!-- REQUIRED:Limitations -->
## Limitations

- Health is only as accurate as logged events and review discipline.
- No external monitoring stack is included by default.
- Manual governance is still required for ambiguous AI classifications.

<!-- REQUIRED:Examples -->
## Examples

- Healthy: capture request returns `mode=created` and `sync.synced=true`.
- Degraded: capture returns success but `sync.synced=false` for `research` route.
- Failed: `/automation/state` unavailable or local store write errors observed.

<!-- REQUIRED:Related Links -->
## Related Links

- [Incident playbook root page template](docs/notion-templates/variants/en-only/root-page.md)
- [Automation runtime](server/src/index.ts)
- [Notion sync manager](server/src/notion-sync.ts)

