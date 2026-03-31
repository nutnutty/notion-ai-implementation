# {{PAGE_TITLE}}

Mode: `{{MODE}}`  
Language: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

## Primary Navigation

- 01 Strategy Home
- 02 Implementation Plan
- 03 System Runbook
- 04 Mission Control
- 05 Incident Playbook
- 06 Metrics and Governance
- 07 Archive and Migration
- Architecture and Integration Guide
- Operational Health and Error Model

<!-- REQUIRED:Purpose -->
## Purpose

Provide one operational control hub for Personal Knowledge Base AI OS in split-language mode.

<!-- REQUIRED:When to use -->
## When to use

- Daily startup and shutdown checks.
- Weekly governance and workflow decisions.
- Sync triage and incident coordination.

<!-- REQUIRED:How to use -->
## How to use

1. Start in `04 Mission Control`.
2. Check `AI Run Log` and runtime state endpoint.
3. Route abnormal behavior to `05 Incident Playbook`.
4. Record governance decisions in `06 Metrics and Governance`.
5. Keep migration steps and evidence in `07 Archive and Migration`.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs

**Inputs**

- Captured conversations and API payloads
- Core database updates
- Runtime health state

**Outputs**

- Structured records with clear workflow state
- Weekly decisions and accountable actions

<!-- REQUIRED:Health Signals -->
## Health Signals

- **Full efficiency**: capture and sync stable, follow-up runs on schedule.
- **Normal**: manageable inbox triage and minor retries.
- **Error**: recurring sync failures or stale operational state.

<!-- REQUIRED:Limitations -->
## Limitations

- Curated migration only; no bulk legacy import.
- Requires ongoing review cadence to remain useful.

<!-- REQUIRED:Examples -->
## Examples

- Capture and classify a cross-domain task from chat.
- Confirm route mapping by checking created Notion pages and sync metadata.

<!-- REQUIRED:Related Links -->
## Related Links

- [Runtime](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync](server/src/notion-sync.ts)

