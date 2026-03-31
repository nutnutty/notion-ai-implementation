# Notion AI Implementation

## ภาพรวม / Overview

### TH
Repository นี้คือระบบ `ChatGPT Apps SDK + MCP + Notion` สำหรับรับข้อความจากแชท, classify งานอัตโนมัติ, เก็บเป็น structured records, และ sync ลง Notion แบบ controlled write.

### EN
This repository provides a `ChatGPT Apps SDK + MCP + Notion` runtime for autonomous conversation capture, record classification, and controlled-write Notion synchronization.

## ความสามารถหลัก / Core Capabilities

| TH | EN |
| --- | --- |
| ค้นหาและเปิด knowledge docs ผ่าน widget (`search`, `fetch`, `render_search_widget`) | Search and fetch knowledge docs via widget (`search`, `fetch`, `render_search_widget`) |
| จับข้อความจากแชทเป็น `task`, `todo`, `research`, `knowledge`, `incident`, `inbox` | Capture chat messages into `task`, `todo`, `research`, `knowledge`, `incident`, `inbox` |
| จัดการวงจรงานผ่าน MCP และ HTTP endpoints | Manage record lifecycle via MCP tools and HTTP endpoints |
| sync ลง Notion แบบ downstream โดย local store ยังเป็น source of truth | Sync to Notion as downstream while local store remains source of truth |
| เลือกหน้าเอกสาร Notion template ได้ 3 โหมดจาก Git/CLI | Choose among 3 Git/CLI Notion template modes |

## โครงสร้างระบบ / Architecture

### TH
- `server/src/index.ts`: MCP server + HTTP automation endpoints
- `server/src/automation-engine.ts`: classification, dedupe, status lifecycle
- `server/src/notion-sync.ts`: map fields และ sync ลง Notion
- `data/automation-store.json`: local persistence (authoritative store)
- `web/src/component.tsx`: React widget UI

### EN
- `server/src/index.ts`: MCP server + HTTP automation endpoints
- `server/src/automation-engine.ts`: classification, dedupe, status lifecycle
- `server/src/notion-sync.ts`: field mapping and downstream Notion sync
- `data/automation-store.json`: authoritative local persistence
- `web/src/component.tsx`: React widget UI

## เริ่มต้นเร็ว / Quick Start

```bash
nvm use
npm install
npm run build
npm start
```

Node version is pinned in `.nvmrc` (`22`).

## สคริปต์หลัก / Main Scripts

```bash
npm run dev
npm run dev:tunnel
npm run check
npm test
npm run build
npm run inspect
```

## MCP Tools และ HTTP Contracts / MCP Tools and HTTP Contracts

### MCP tools

- `capture_conversation`
- `list_automation_records`
- `update_automation_record_status`
- `run_follow_up_cycle`

### HTTP endpoints

- `GET /automation/state`
- `GET /automation/records`
- `POST /automation/capture`
- `POST /automation/records/status`
- `POST /automation/followups/run`

## Notion Template Modes (3 Versions in Git)

### TH
รองรับ template โหมด:
- `en-only` (อังกฤษอย่างเดียว)
- `th-en-split` (ไทยและอังกฤษแยกคนละหน้า, default production)
- `bilingual` (หน้าเดียวมีทั้ง TH และ EN โดย TH ก่อน)

### EN
Supported template modes:
- `en-only`
- `th-en-split` (separate TH and EN pages, default production mode)
- `bilingual` (single page with TH-first bilingual content)

Commands:

```bash
npm run notion:templates:list
npm run notion:templates:validate
npm run notion:templates:apply -- --mode=en-only
npm run notion:templates:apply -- --mode=th-en-split
npm run notion:templates:apply -- --mode=bilingual
```

`apply` runs in dry-run by default. Use `--write` to generate rendered output under `docs/notion-templates/build/<mode>/`.

Source of truth:

- [docs/notion-templates/manifest.json](docs/notion-templates/manifest.json)
- [docs/notion-templates/README.md](docs/notion-templates/README.md)
- [scripts/notion-template-mode.mjs](scripts/notion-template-mode.mjs)

## Notion Sync Profiles

### `personal-kb-v2` (current workspace profile)

Routing:
- `task`, `todo` -> `Work Items`
- `research` -> `Research Library`
- `knowledge` -> `Knowledge Hub`
- `incident` -> `Incident Register`
- `inbox` -> `Conversation Inbox`

Key mapped fields now include:
- `Source Conversation ID`
- `Message ID`
- `Source URL` / `Source Record URL`
- `Confidence`
- `Policy Mode`
- `Source Channel`

### `knowledge-base-v1` (legacy profile)

Still supported for compatibility with older workspace structure.

Quick enable:

```bash
export NOTION_SYNC_ENABLED=true
export NOTION_SYNC_PROFILE=personal-kb-v2
export NOTION_API_TOKEN=your_notion_integration_token
```

## Env ที่สำคัญ / Key Environment Variables

See full list in `.env.example`. Most important:

- `NOTION_SYNC_ENABLED`
- `NOTION_SYNC_PROFILE`
- `NOTION_API_TOKEN`
- `NOTION_<TYPE>_DATA_SOURCE_ID` or `NOTION_<TYPE>_DATABASE_ID`
- `NOTION_<TYPE>_*_PROPERTY` overrides
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (optional, for model-based classification)

Security-related variables:

- `ALLOWED_DOC_HOSTS`
- `ALLOWED_MCP_ORIGINS`
- `AUTH_BEARER_TOKEN`
- `ENABLE_OAUTH_CHALLENGE`
- `TENANT_ID_HEADER`, `REQUIRE_TENANT_ID`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`

## ทดสอบระบบ / Local Validation

```bash
npm test
npm run check
npm run build
npm run notion:templates:validate -- --all
```

Manual runtime checks:

1. Start server: `npm start`
2. Check root health: `http://localhost:8787/`
3. Check automation state: `http://localhost:8787/automation/state`
4. Run capture smoke test and verify `sync` object in response

## ความเป็นส่วนตัวและสุขอนามัย Repo / Privacy and Repo Hygiene

### TH
- Repo นี้ถูก sanitize แล้ว และใช้ policy “no personal identifiers in Git”
- สำหรับเครื่องที่เคย clone ก่อน history rewrite ให้ sync ใหม่ด้วย `reset --hard` หรือ clone ใหม่
- ก่อน push ให้สแกนหา PII/IDs ด้วย `rg` ตามคู่มือ

### EN
- This repo has been sanitized and follows a no-personal-identifiers-in-Git policy.
- Existing clones from before the history rewrite must hard-reset or re-clone.
- Run the pre-push PII scan before every push.

รายละเอียดดูที่:
- [docs/repository-privacy-guidelines.md](docs/repository-privacy-guidelines.md)

## เอกสารที่เกี่ยวข้อง / Related Docs

- [docs/notion-personal-kb-v2-setup.md](docs/notion-personal-kb-v2-setup.md)
- [docs/notion-live-sync-setup.md](docs/notion-live-sync-setup.md)
- [docs/personal-kb-v2-migration-batch-001.md](docs/personal-kb-v2-migration-batch-001.md)
- [docs/notion-templates/README.md](docs/notion-templates/README.md)
- [docs/repository-privacy-guidelines.md](docs/repository-privacy-guidelines.md)

## หมายเหตุการทำงาน / Operational Notes

### TH
- Local store เป็นตัวจริง แม้ Notion sync จะล้มเหลว
- sync errors จะรายงานผ่าน `sync` object โดยไม่ rollback capture
- การ migrate จาก workspace เก่าใช้แนว curated batches ไม่ใช้ bulk import

### EN
- Local store remains authoritative even when Notion sync fails.
- Sync failures are surfaced via `sync` response object and do not roll back capture.
- Legacy migration follows curated batches (no bulk import).
