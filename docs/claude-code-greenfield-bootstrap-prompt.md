# Claude Code Prompt: Greenfield Autonomous Work OS

## Recommendation

ถ้าถามว่า "ทำเป็น prompt สำหรับ Claude Code หรืออัปขึ้น Git ดี" คำตอบที่ถูกคือทำทั้งสองอย่าง:

- `Git` = source of truth สำหรับเอกสาร, schema, decisions, และโค้ด
- `Prompt` = execution contract สำหรับให้ Claude Code เริ่มงานได้ตรงทาง

ดังนั้นไฟล์นี้คือ prompt ส่วน [greenfield-autonomous-work-os-implementation-plan.md](docs/greenfield-autonomous-work-os-implementation-plan.md) คือ canonical source document

## Paste-Ready Prompt

```text
You are Claude Code working in a greenfield repository.

Your job is to bootstrap a new Autonomous Work OS project from the implementation blueprint below.

Primary source document:
- docs/greenfield-autonomous-work-os-implementation-plan.md

Non-negotiable rules:
1. Keep the original functional contract:
   - conversation capture
   - intent classification for task, todo, research, knowledge, incident, inbox
   - due/review extraction
   - policy routing: ask-first, hybrid, auto
   - status lifecycle
   - duplicate control and idempotency
   - follow-up jobs
   - audit logging
   - provider neutrality
   - downstream sync separation
   - human override
2. Do NOT reuse old Notion databases, old data source IDs, old page names, or old schema assumptions.
3. Treat this as a clean-slate project. Reuse only architectural patterns and functional behavior.
4. Local persistence must remain the immediate source of truth. Downstream sync must never be allowed to corrupt local state.
5. Build for OpenAI and Claude compatibility from the start through a provider abstraction layer.
6. Start with human-in-the-loop defaults unless a requirement explicitly says otherwise.
7. Every write path must have audit logging and idempotency protection.

Execution goals:
1. Read and summarize the blueprint before broad edits.
2. Produce a short implementation plan mapped to phases and acceptance criteria.
3. Scaffold the project structure for:
   - domain schemas
   - classifier/policy services
   - provider adapters
   - local store
   - Notion adapter
   - HTTP and MCP transport
   - scheduler/follow-up worker
   - review UI surface
4. Create new docs for:
   - strategy home
   - implementation plan
   - system runbook
   - notion schema
   - launch checklist
5. Define a new greenfield Notion model with these databases:
   - Conversation Inbox
   - Work Items
   - Research Library
   - Knowledge Hub
   - Incident Register
   - AI Run Log
   - optional Projects
6. Implement the runtime in the following order:
   - schemas/types
   - local persistence
   - capture flow
   - status updates
   - follow-up cycle
   - provider abstraction
   - Notion sync adapter
   - review UI
   - metrics/governance layer
7. Add tests for:
   - classification
   - idempotency
   - duplicate control
   - status transitions
   - follow-up generation
   - downstream sync isolation
8. Keep diffs small and verifiable. Run checks after each meaningful milestone.

Expected outputs:
- a short plan
- the scaffolded file structure
- the new data model
- initial implementation for the automation runtime
- tests and verification results
- a short note listing remaining gaps or assumptions

Working style:
- Prefer smallest reversible changes.
- Explain tradeoffs briefly when making structural decisions.
- Do not invent fake integrations or fake IDs.
- If Notion credentials are unavailable, implement the adapter and configuration surface anyway, but do not pretend live sync was validated.
- If a decision is ambiguous, prefer a general reusable design over one tied to a specific old workspace.

Definition of done for the first delivery:
- project structure exists
- greenfield schemas exist
- capture/update/follow-up flow works locally
- provider abstraction exists
- Notion adapter exists
- basic review path exists or is scaffolded
- docs and launch checklist exist
- tests/build/check pass

Start by reading docs/greenfield-autonomous-work-os-implementation-plan.md and then produce the execution plan before broad edits.
```

## Recommended Usage

ใช้ prompt นี้เมื่อ:

- เปิด repo ใหม่เพื่อเริ่มระบบจากศูนย์
- ต้องการให้ Claude Code scaffold ทั้ง docs + code + schema พร้อมกัน
- ต้องการกันไม่ให้ Claude ดึง assumptions จาก workspace Notion เก่ามาใช้ผิดบริบท

ไม่ควรใช้ prompt นี้ตรง ๆ เมื่อ:

- ต้องการแค่แก้ bug เล็ก
- ต้องการผูกกับ workspace เดิม
- ต้องการแค่เขียน Notion pages โดยยังไม่เริ่ม implementation
