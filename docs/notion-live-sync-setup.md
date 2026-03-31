# Notion Live Sync Setup

หมายเหตุ: เอกสารนี้อธิบาย legacy profile `knowledge-base-v1`
ถ้าต้องการใช้ workspace ใหม่ Personal KB v2 ให้ใช้ [docs/notion-personal-kb-v2-setup.md](docs/notion-personal-kb-v2-setup.md)

เอกสารนี้สรุป route mapping สำหรับ Notion workspace ชุดที่ค้นพบจากระบบปัจจุบัน เพื่อเปิด autonomous sync ได้เร็วที่สุด

## Quick Start

ตั้ง environment อย่างน้อยดังนี้:

```bash
export NOTION_SYNC_ENABLED=true
export NOTION_SYNC_PROFILE=knowledge-base-v1
export NOTION_API_TOKEN=your_notion_integration_token
export NOTION_DEFAULT_ASSIGNEE_USER_ID=<NOTION_ASSIGNEE_USER_ID_REDACTED>
export NOTION_DEFAULT_SCOPE="Knowledge Base Global"
export NOTION_DEFAULT_KNOWLEDGE_DOMAIN="Operations"
```

จากนั้นรัน server ตามปกติ ระบบจะใช้ built-in profile `knowledge-base-v1` ทันที

## Built-in Route Mapping

### Task-like records

- Route types: `task`, `todo`, `research`, `incident`, `inbox`
- Target database: `🎟️ Knowledge Base Capture Activity Tasks`
- Data source ID: `<REDACTED_ID>`
- Notion URL: [Knowledge Base Capture Activity Tasks](https://www.notion.so/<REDACTED>)

Mapped properties:

- `Task`
- `Status`
- `Priority`
- `Due Date`
- `Assignee`
- `Activity Type`
- `Workflow`
- `Scope`

Default semantic mapping:

- `task` / `todo` -> `Activity Type=Implementation`, `Workflow=notion-spec-to-implementation`
- `research` -> `Activity Type=Research`, `Workflow=notion-research-documentation`
- `incident` -> `Activity Type=Incident`, `Workflow=notion-spec-to-implementation`
- `inbox` -> `Activity Type=Capture`, `Workflow=notion-knowledge-capture`

### Knowledge records

- Route type: `knowledge`
- Target database: `⏰ Decision Kanban`
- Data source ID: `<REDACTED_ID>`
- Notion URL: [Decision Kanban](https://www.notion.so/<REDACTED>)

Mapped properties:

- `Title`
- `Status`
- `Priority`
- `Review Date`
- `Owner`
- `Tags`
- `Activity Type`
- `Type`
- `Workflow`
- `Scope`
- `Knowledge Domain`
- `Outcome`

Default semantic mapping:

- `knowledge` -> `Type=Documentation`
- `Activity Type=Capture`
- `Workflow=notion-knowledge-capture`
- `Knowledge Domain=Operations`

## Related Databases

ฐานข้อมูลที่เกี่ยวข้องซึ่งค้นพบแล้ว แต่ยังไม่ได้ใช้ใน built-in sync profile นี้:

- [Knowledge Base](https://www.notion.so/<REDACTED>)
  - Data source ID: `<REDACTED_ID>`
- [Projects & Tasks](https://www.notion.so/<REDACTED>)
  - Projects: `<REDACTED_ID>`
  - Tasks: `<REDACTED_ID>`

## Notes

- Local JSON store ยังเป็น source of truth
- Notion เป็น downstream sync target
- ถ้าต้องการเปลี่ยน route/database/property สามารถ override ได้ด้วย `NOTION_<TYPE>_*`
- ถ้าต้องการ validation แบบ live write ยังต้องมี `NOTION_API_TOKEN` ของ integration ที่เข้าถึง databases ข้างต้นได้จริง
