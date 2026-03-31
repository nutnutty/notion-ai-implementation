# {{PAGE_TITLE}}

Mode: `{{MODE}}`  
Language: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

## Architecture Snapshot

- ChatGPT uses MCP tools for capture/list/update/follow-up.
- `server/src/index.ts` exposes MCP and HTTP endpoints.
- `server/src/automation-engine.ts` handles classification and lifecycle.
- `data/automation-store.json` is the local source of truth.
- `server/src/notion-sync.ts` pushes records to Notion as downstream sync.
- Notion databases are the operational user surfaces.

<!-- REQUIRED:Purpose -->
## Purpose

Describe system architecture, design rationale, integrations, and practical criteria for full-efficiency vs normal vs error states.

<!-- REQUIRED:When to use -->
## When to use

- Onboarding operators and maintainers.
- Before changing schema mappings or policy mode.
- During incident triage for missing, stale, or wrong records.

<!-- REQUIRED:How to use -->
## How to use

1. Read runtime contracts in code.
2. Run capture and state smoke tests.
3. Verify Notion property mapping alignment.
4. Use incident playbook for degraded or failed states.

## Design Rationale

- Local-first persistence prevents data loss when Notion is unavailable.
- Downstream sync decouples capture success from external write failures.
- Controlled-write mode reduces accidental workspace-wide changes.
- Explicit route keys keep governance and observability clear.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs

**Inputs**

- MCP: `capture_conversation`, `list_automation_records`, `update_automation_record_status`, `run_follow_up_cycle`
- HTTP: `/automation/capture`, `/automation/records`, `/automation/records/status`, `/automation/followups/run`, `/automation/state`

**Outputs**

- Persisted automation records with traceable metadata.
- Notion sync outcome per operation (`enabled`, `synced`, `error`).
- Operational state for dashboard and governance loops.

## Detailed User Cases

- Capture action item -> route to `Work Items`.
- Capture research prompt -> route to `Research Library`.
- Capture reusable process note -> route to `Knowledge Hub`.
- Capture outage/problem report -> route to `Incident Register`.
- Capture ambiguous text -> route to `Conversation Inbox` for triage.

## AI Chat Data Capture Behavior

- Messages are normalized and classified with provider if available.
- Heuristic fallback remains active when provider keys are missing.
- Similarity checks reduce duplicate work records.
- Source pointers (`conversationId`, message IDs, source URL/excerpt) preserve traceability.

<!-- REQUIRED:Health Signals -->
## Health Signals

- **Full efficiency**
  - Capture remains reliable.
  - Sync succeeds on configured routes.
  - Follow-up cycle executes on schedule.
- **Normal**
  - Minor retries or inbox fallback with manageable backlog.
- **Error / no-operation**
  - Persistent sync failures.
  - Capture failures or stale local store.
  - No new state transitions despite incoming work.

<!-- REQUIRED:Limitations -->
## Limitations

- Classification confidence depends on message quality.
- Notion permission/scheme drift can block writes.
- Notion page styling remains constrained by markdown/block capabilities.

<!-- REQUIRED:Examples -->
## Examples

```bash
curl -X POST http://localhost:8787/automation/capture \
  -H 'content-type: application/json' \
  -d '{
    "conversationId": "split-en-arch-1",
    "message": "Document system sync limitations and add a mitigation task due tomorrow",
    "policyMode": "hybrid",
    "provider": "heuristic"
  }'
```

<!-- REQUIRED:Related Links -->
## Related Links

- [Runtime](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync](server/src/notion-sync.ts)
- [Live sync setup](docs/notion-live-sync-setup.md)

