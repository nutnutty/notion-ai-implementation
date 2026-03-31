# {{PAGE_TITLE}}

Mode: `{{MODE}}`  
Language: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

## Navigation

- 01 Strategy Home — planning goals and constraints
- 02 Implementation Plan — milestones, tasks, dependencies
- 03 System Runbook — day-to-day operations and SOPs
- 04 Mission Control — current execution cockpit
- 05 Incident Playbook — incident response and recovery
- 06 Metrics and Governance — KPI and decision governance
- 07 Archive and Migration — curated migration from legacy workspace
- Architecture and Integration Guide — end-to-end architecture
- Operational Health and Error Model — health, degraded, and failure states

<!-- REQUIRED:Purpose -->
## Purpose

Operate Personal Knowledge Base AI OS from a single control surface with predictable routing, controlled writes, and measurable health.

<!-- REQUIRED:When to use -->
## When to use

- Start of day to choose priorities and confirm system health.
- End of day to verify capture quality and pending follow-ups.
- Weekly review to inspect execution consistency across all domains.

<!-- REQUIRED:How to use -->
## How to use

1. Open `04 Mission Control` and check active work + inbox triage.
2. Review `AI Run Log` and `/automation/state` for sync status.
3. If capture is blocked, open `05 Incident Playbook`.
4. Record decisions in `06 Metrics and Governance`.
5. Move non-actionable legacy content into `07 Archive and Migration`.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs

**Inputs**

- Conversation capture from ChatGPT or API calls.
- Manual Notion edits on root pages and operational databases.
- Runtime telemetry from endpoints:
  - `GET /automation/state`
  - `GET /automation/records`

**Outputs**

- Structured records in `Conversation Inbox`, `Work Items`, `Research Library`, `Knowledge Hub`, `Incident Register`, and `AI Run Log`.
- Weekly governance decisions with clear status transitions.

<!-- REQUIRED:Health Signals -->
## Health Signals

- **Full efficiency**: captures are classified correctly, records sync to Notion, follow-ups run on schedule, no unresolved sync errors.
- **Normal**: occasional low-confidence items routed to inbox; manual triage clears backlog within one cycle.
- **Error**: repeated sync failures, stale follow-up runs, missing records, or schema mismatch causing dropped fields.

<!-- REQUIRED:Limitations -->
## Limitations

- No automatic legacy bulk import by design.
- Controlled-write policy requires explicit routing and database sharing.
- Final quality still depends on weekly review discipline.

<!-- REQUIRED:Examples -->
## Examples

- Capture request: "Summarize migration blockers and assign follow-up by tomorrow."
- Result: work item created, due date inferred, sync result returned with Notion target.

<!-- REQUIRED:Related Links -->
## Related Links

- [Runtime entrypoint](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync mapper](server/src/notion-sync.ts)
- [Setup guide](docs/notion-personal-kb-v2-setup.md)

