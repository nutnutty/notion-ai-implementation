# {{PAGE_TITLE}}

Mode: `{{MODE}}`  
Language: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

## Architecture Snapshot

Core components:

- ChatGPT app client calling MCP tools
- MCP server and HTTP runtime in `server/src/index.ts`
- Classification + lifecycle logic in `server/src/automation-engine.ts`
- Local source of truth in `data/automation-store.json`
- Downstream Notion sync via `server/src/notion-sync.ts`
- Notion workspace databases (Inbox, Work, Research, Knowledge, Incident, Run Log)

<!-- REQUIRED:Purpose -->
## Purpose

Explain how the full system works, why it is designed this way, and how to verify real operational quality.

<!-- REQUIRED:When to use -->
## When to use

- New owner onboarding.
- Before changing sync mappings or policy mode.
- During incident analysis for missing or incorrect records.

<!-- REQUIRED:How to use -->
## How to use

1. Read runtime contracts in code (`index.ts`, `automation-engine.ts`, `notion-sync.ts`).
2. Validate endpoint behavior with local smoke tests.
3. Confirm Notion property mappings match current workspace schema.
4. Review health model and incident playbook before deploying mapping changes.

## Design Rationale

- Local JSON store is authoritative to avoid data loss when Notion is degraded.
- Notion sync is downstream and non-blocking, so capture can continue during sync incidents.
- Controlled write keeps blast radius low and prevents accidental broad edits.
- Record-type routing (`task`, `todo`, `research`, `knowledge`, `incident`, `inbox`) keeps operations measurable.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs

**Inputs**

- `capture_conversation` tool or `POST /automation/capture`
- `run_follow_up_cycle` or `POST /automation/followups/run`
- Status updates via MCP tool or `POST /automation/records/status`
- Optional AI provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)

**Outputs**

- Updated local records with status, priority, due/review dates, and metadata.
- Optional synced Notion pages, with sync outcome attached in API/tool response.
- Observable system state via `GET /automation/state`.

## Detailed User Cases

- **Case 1: capture operational task**
  - User asks for a follow-up action in chat.
  - Runtime classifies as `task` or `todo`, stores locally, then syncs to `Work Items`.
- **Case 2: capture research request**
  - User asks to compare solutions.
  - Runtime classifies as `research`, stores summary and source info, routes to `Research Library`.
- **Case 3: incident logging**
  - User reports broken workflow.
  - Runtime classifies as `incident`, records impact summary, routes to `Incident Register`.
- **Case 4: ambiguous message**
  - Message confidence is low.
  - Runtime routes to `inbox` for manual triage (ask-first/hybrid safety behavior).

## AI Chat Capture Model

- Input text is normalized and classified with provider model when available.
- If provider is unavailable, heuristic keyword + date/urgency parser is used.
- Dedupe checks compare message intent/title against recent records.
- Sync response is detached from capture success:
  - capture may succeed locally even if Notion sync fails.

<!-- REQUIRED:Health Signals -->
## Health Signals

- **Full efficiency**
  - Capture success > 95% with expected record type.
  - Sync success stable across routes with no persistent route errors.
  - Follow-up cycle runs with no stale backlog.
- **Normal**
  - Some inbox fallback or occasional sync retries.
  - Manual triage resolves low-confidence items within weekly cycle.
- **Error / no-operation**
  - Repeated `sync.synced=false` with persistent reason.
  - New records stop appearing in local store.
  - Endpoint health checks fail or return stale state.

<!-- REQUIRED:Limitations -->
## Limitations

- Classification quality depends on message clarity and available AI provider.
- Notion API permissions can silently block specific targets if sharing is incomplete.
- Schema drift in Notion can break property writes until mapping is updated.

<!-- REQUIRED:Examples -->
## Examples

```bash
curl -X POST http://localhost:8787/automation/capture \
  -H 'content-type: application/json' \
  -d '{
    "conversationId": "demo-arch-1",
    "message": "Investigate Notion sync failures and propose fix by 2026-04-03",
    "policyMode": "hybrid",
    "provider": "heuristic"
  }'
```

Expected response pattern:

- `record` is persisted locally.
- `sync` reports enabled/synced/target or error details.

<!-- REQUIRED:Related Links -->
## Related Links

- [Runtime entrypoint](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync mapper](server/src/notion-sync.ts)
- [Live sync setup](docs/notion-live-sync-setup.md)

