# Notion Personal KB v2 Live Sync Setup

เอกสารนี้สรุป route mapping สำหรับ Personal KB v2 workspace ที่ bootstrap ไว้เมื่อ 2026-03-30

## Template Mode Selection (Git)

รองรับ template สำหรับหน้า Notion 3 โหมด:

- `en-only`
- `th-en-split` (default production)
- `bilingual`

คำสั่งใช้งาน:

```bash
npm run notion:templates:list
npm run notion:templates:validate
npm run notion:templates:apply -- --mode=en-only
npm run notion:templates:apply -- --mode=th-en-split
npm run notion:templates:apply -- --mode=bilingual
```

หมายเหตุ: `apply` เป็น dry-run โดยค่าเริ่มต้น และจะแสดงรายการหน้าที่จะสร้าง/อัปเดต  
หากต้องการสร้างไฟล์ผลลัพธ์ให้เพิ่ม `--write`

## Quick Start

ตั้ง environment อย่างน้อยดังนี้:

```bash
export NOTION_SYNC_ENABLED=true
export NOTION_SYNC_PROFILE=personal-kb-v2
export NOTION_API_TOKEN=your_notion_integration_token
export NOTION_DEFAULT_ASSIGNEE_USER_ID=<NOTION_ASSIGNEE_USER_ID_REDACTED>
export NOTION_DEFAULT_KNOWLEDGE_DOMAIN=work
```

หมายเหตุ:

- `NOTION_API_TOKEN` ต้องเป็น internal integration token ของ `Playground Notion Sync`
- integration ตัวนี้ต้องถูก share ให้กับ root pages และ databases ของ workspace ใหม่เท่านั้น
- local JSON store ยังเป็น source of truth; Notion เป็น downstream sync target

## Built-in Route Mapping: `personal-kb-v2`

### Task and Todo records

- Route types: `task`, `todo`
- Target database: `Work Items`
- Data source ID: `<REDACTED_ID>`
- Notion URL: [Work Items](https://www.notion.so/<REDACTED>)

Mapped properties:

- `Title`
- `Status`
- `Priority`
- `Due Date`
- `Review Date`
- `Assignee`
- `Tags`
- `Workflow`
- `Work Type`
- `Source Excerpt`
- `Source Conversation ID`
- `Source URL`

Default semantic mapping:

- `task` -> `Work Type=task`, `Workflow=execution`
- `todo` -> `Work Type=todo`, `Workflow=execution`

### Research records

- Route type: `research`
- Target database: `Research Library`
- Data source ID: `<REDACTED_ID>`
- Notion URL: [Research Library](https://www.notion.so/<REDACTED>)

Mapped properties:

- `Title`
- `Status`
- `Priority`
- `Due Date`
- `Review Date`
- `Owner`
- `Tags`
- `Findings Summary`
- `Source Excerpt`
- `Source URL`

### Knowledge records

- Route type: `knowledge`
- Target database: `Knowledge Hub`
- Data source ID: `<REDACTED_ID>`
- Notion URL: [Knowledge Hub](https://www.notion.so/<REDACTED>)

Mapped properties:

- `Title`
- `Status`
- `Review Date`
- `Owner`
- `Tags`
- `Record Type`
- `Knowledge Domain`
- `Summary`
- `Source Conversation ID`
- `Source Record URL`

Default semantic mapping:

- `knowledge` -> `Record Type=documentation`
- `Knowledge Domain` follows `NOTION_DEFAULT_KNOWLEDGE_DOMAIN`

### Incident records

- Route type: `incident`
- Target database: `Incident Register`
- Data source ID: `<REDACTED_ID>`
- Notion URL: [Incident Register](https://www.notion.so/<REDACTED>)

Mapped properties:

- `Title`
- `Status`
- `Severity`
- `Follow-up Due`
- `Owner`
- `Impact Summary`
- `Source Excerpt`

### Inbox records

- Route type: `inbox`
- Target database: `Conversation Inbox`
- Data source ID: `<REDACTED_ID>`
- Notion URL: [Conversation Inbox](https://www.notion.so/<REDACTED>)

Mapped properties:

- `Title`
- `Status`
- `Suggested Type`
- `Policy Mode`
- `Source Channel`
- `Conversation ID`
- `Message ID`
- `Original Message`
- `Confidence`

Default semantic mapping:

- `Suggested Type` uses `capturedAs` when an ambiguous message is downgraded to inbox
- `Status` maps `draft -> new`, `active -> reviewing`, `done -> resolved`, `archived -> dismissed`

## Manual Steps Outside the Repo

1. Create the internal integration `Playground Notion Sync`
2. Grant capabilities: `read content`, `insert content`, `update content`
3. Share the new root pages and databases with that integration
4. Put the token into `NOTION_API_TOKEN`
5. Run the normal checks and then a live capture smoke test

## Smoke Test

```bash
curl -X POST http://localhost:8787/automation/capture \
  -H 'content-type: application/json' \
  -d '{
    "conversationId": "personal-kb-v2-smoke-1",
    "message": "ช่วยสรุป workflow การ migrate Notion เก่าเข้าระบบใหม่",
    "policyMode": "hybrid",
    "provider": "heuristic",
    "metadata": {
      "sourceUrl": "https://www.notion.so/<REDACTED>"
    }
  }'
```

ตรวจผลที่:

- `GET /automation/state`
- [Conversation Inbox](https://www.notion.so/<REDACTED>)
- [Research Library](https://www.notion.so/<REDACTED>)
- [Knowledge Hub](https://www.notion.so/<REDACTED>)
