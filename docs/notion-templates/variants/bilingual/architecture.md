# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

## Architecture Snapshot
### TH
- ChatGPT เรียก MCP tools เพื่อ capture/list/update/follow-up
- Runtime อยู่ที่ `server/src/index.ts`
- Logic หลักอยู่ที่ `server/src/automation-engine.ts`
- Sync ลง Notion อยู่ที่ `server/src/notion-sync.ts`
- Local store (`data/automation-store.json`) เป็น source of truth
### EN
- ChatGPT invokes MCP tools for capture/list/update/follow-up.
- Runtime endpoints are served by `server/src/index.ts`.
- Core lifecycle logic is in `server/src/automation-engine.ts`.
- Downstream Notion sync is in `server/src/notion-sync.ts`.
- Local store remains source of truth.

<!-- REQUIRED:Purpose -->
## Purpose
### TH
อธิบายสถาปัตยกรรม เหตุผลการออกแบบ จุดเชื่อมต่อ และเกณฑ์วัดการทำงานจริงของระบบ.
### EN
Describe architecture, design rationale, integration points, and measurable operational quality.

<!-- REQUIRED:When to use -->
## When to use
### TH
- ใช้ตอน onboarding ผู้ดูแลระบบ
- ใช้ก่อนเปลี่ยน schema mapping หรือ policy mode
### EN
- Use for maintainer onboarding.
- Use before changing mapping or policy mode.

<!-- REQUIRED:How to use -->
## How to use
### TH
1. อ่าน contract ของ endpoint/tool  
2. ทดสอบ capture + state  
3. ตรวจ mapping กับ Notion schema  
4. อ้างอิง Incident Playbook เมื่อผิดปกติ
### EN
1. Read endpoint/tool contracts.  
2. Run capture and state smoke tests.  
3. Verify mapping against Notion schema.  
4. Follow Incident Playbook for degraded states.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs
### TH
**Inputs:** `capture_conversation`, `/automation/capture`, `/automation/state`  
**Outputs:** local record + sync result + governance signal
### EN
**Inputs:** MCP tools and HTTP automation endpoints  
**Outputs:** persisted record, sync outcome, and operational signals

## Detailed User Cases
### TH
- ขอให้สรุป/แตกงาน -> route ไป Work Items
- ขอวิจัย -> route ไป Research Library
- ขอเก็บบทเรียน -> route ไป Knowledge Hub
- แจ้งปัญหา -> route ไป Incident Register
### EN
- Action capture -> Work Items
- Research request -> Research Library
- Knowledge capture -> Knowledge Hub
- Incident report -> Incident Register

## AI Chat Data Handling
### TH
- ระบบ classify ด้วย provider หรือ heuristic fallback
- เก็บ `conversationId`, excerpt, source URL เพื่อ trace กลับ
- sync fail ไม่ทำให้ข้อมูล local หาย
### EN
- Classification uses provider when available, with heuristic fallback.
- Source metadata is retained for traceability.
- Sync failures do not roll back local persistence.

<!-- REQUIRED:Health Signals -->
## Health Signals
### TH
- เต็มประสิทธิภาพ: capture/sync/follow-up ผ่านต่อเนื่อง
- ปกติ: มี retry เล็กน้อยแต่ไม่สะสม backlog
- ผิดพลาด: sync fail ซ้ำ, route mismatch, หรือ state ค้าง
### EN
- Full efficiency: stable capture, sync, and follow-up execution.
- Normal: minor retries, controlled backlog.
- Error: repeated sync failure, route mismatch, or stale state.

<!-- REQUIRED:Limitations -->
## Limitations
### TH
- คุณภาพ classify ขึ้นกับคุณภาพข้อความ
- หาก Notion permissions ไม่ครบจะ sync ไม่ได้บาง route
### EN
- Classification quality depends on message clarity.
- Incomplete Notion permissions can block route writes.

<!-- REQUIRED:Examples -->
## Examples
### TH
```bash
curl -X POST http://localhost:8787/automation/capture \
  -H 'content-type: application/json' \
  -d '{"conversationId":"bi-arch-1","message":"สรุป blocker และตั้ง follow-up พรุ่งนี้","policyMode":"hybrid","provider":"heuristic"}'
```
### EN
Expected: local record created, with sync status attached in response.

<!-- REQUIRED:Related Links -->
## Related Links
### TH
- [Runtime](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
### EN
- [Notion sync](server/src/notion-sync.ts)
- [Setup guide](docs/notion-personal-kb-v2-setup.md)

