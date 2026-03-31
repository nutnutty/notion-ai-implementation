# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

## ภาพรวมสถาปัตยกรรม

- ChatGPT เรียก MCP tools เพื่อ capture/list/update/follow-up
- `server/src/index.ts` ให้บริการทั้ง MCP และ HTTP endpoint
- `server/src/automation-engine.ts` ทำ classify + lifecycle ของ record
- `data/automation-store.json` เป็น source of truth ฝั่งระบบ
- `server/src/notion-sync.ts` sync ลง Notion แบบ downstream
- ฐานข้อมูล Notion เป็นปลายทางสำหรับการใช้งานจริง

<!-- REQUIRED:Purpose -->
## วัตถุประสงค์ (Purpose)

อธิบายการทำงานของโปรแกรมทั้งหมด, เหตุผลการออกแบบ, จุดเชื่อมต่อ, และเกณฑ์วัดว่าใช้งานได้เต็มประสิทธิภาพหรือไม่.

<!-- REQUIRED:When to use -->
## ใช้เมื่อไร (When to use)

- onboarding ผู้ใช้งาน/ผู้ดูแลระบบใหม่
- ก่อนปรับ mapping หรือ policy mode
- หลังเกิด incident ที่ข้อมูลหาย, classify ผิด, หรือ sync ไม่เข้า Notion

<!-- REQUIRED:How to use -->
## วิธีใช้งาน (How to use)

1. อ่าน runtime contract จาก `index.ts`, `automation-engine.ts`, `notion-sync.ts`.
2. รัน smoke test capture + state.
3. ตรวจว่า property names ใน Notion ตรง mapping.
4. ถ้ามี error ให้บันทึก incident และอัปเดตแผนแก้ไข.

## เหตุผลเชิงออกแบบ

- ใช้ local store เป็นตัวจริง เพื่อลดความเสี่ยงข้อมูลหายเมื่อ Notion ช้า/ล่ม
- sync เป็น downstream ทำให้ capture ไม่ถูก block
- ใช้ controlled write ลด blast radius
- แยกชนิด record ชัดเจนเพื่อวัดผลและทำ governance ได้

<!-- REQUIRED:Inputs/Outputs -->
## ข้อมูลเข้า/ออก (Inputs/Outputs)

**Inputs**

- MCP tools:
  - `capture_conversation`
  - `list_automation_records`
  - `update_automation_record_status`
  - `run_follow_up_cycle`
- HTTP:
  - `POST /automation/capture`
  - `GET /automation/records`
  - `POST /automation/records/status`
  - `POST /automation/followups/run`
  - `GET /automation/state`

**Outputs**

- Record ที่ persist ใน local store พร้อม metadata
- ผล sync ไป Notion แบบแยกสถานะ `enabled/synced/error`
- ข้อมูลสำหรับ dashboard และ weekly governance

## User Cases

- **งานปฏิบัติการ**: รับคำสั่งจากแชท -> classify เป็น task/todo -> เข้าฐาน Work Items
- **งานวิจัย**: คำถามเชิงเทียบ/วิเคราะห์ -> เข้าฐาน Research Library
- **องค์ความรู้**: บทเรียน/คู่มือ -> เข้าฐาน Knowledge Hub
- **เหตุการณ์ผิดปกติ**: รายงานปัญหา -> เข้าฐาน Incident Register
- **ข้อความกำกวม**: confidence ต่ำ -> เข้าฐาน Conversation Inbox

## การเก็บข้อมูลแชทของ AI

- ระบบ normalize ข้อความและเลือก provider classification ตาม config
- ถ้าไม่มี provider key ใช้ heuristic classifier
- ทำ dedupe กับ record เดิมตามความคล้ายชื่อ/เนื้อหา
- บันทึก source conversation/message และ excerpt เพื่อ trace กลับได้

<!-- REQUIRED:Health Signals -->
## สัญญาณสุขภาพระบบ (Health Signals)

- **เต็มประสิทธิภาพ**
  - capture สำเร็จต่อเนื่อง
  - sync สำเร็จทุก route ที่เปิดใช้
  - follow-up cycle วิ่งตามรอบ
  - view สำคัญไม่มี error ค้าง
- **ปกติ**
  - มี retry หรือ inbox fallback บางส่วน แต่ทีมเคลียร์ได้ในรอบ
- **ผิดพลาด/ไม่ทำงาน**
  - endpoint ล้มเหลวหรือเขียน local store ไม่ได้
  - sync fail ต่อเนื่องจนข้อมูลไม่เข้าปลายทาง
  - review รอบสัปดาห์ไม่มีข้อมูลอัปเดตสำหรับตัดสินใจ

<!-- REQUIRED:Limitations -->
## ข้อจำกัด (Limitations)

- คุณภาพการ classify ขึ้นกับคุณภาพข้อความ input
- หากสิทธิ์ integration ใน Notion ไม่ครบ จะเขียนบาง route ไม่ได้
- การตกแต่งหน้า Notion มีข้อจำกัดตาม markdown + block structure
- หากต้องการ UI เฉพาะทางมากขึ้น ควรใช้ app/widget เพิ่มเติม

<!-- REQUIRED:Examples -->
## ตัวอย่าง (Examples)

```bash
curl -X POST http://localhost:8787/automation/capture \
  -H 'content-type: application/json' \
  -d '{
    "conversationId": "thai-arch-case-1",
    "message": "สรุปสถาปัตยกรรม Notion sync และสร้างงานแก้ blocker ภายในสัปดาห์นี้",
    "policyMode": "hybrid",
    "provider": "heuristic"
  }'
```

<!-- REQUIRED:Related Links -->
## ลิงก์ที่เกี่ยวข้อง (Related Links)

- [Runtime](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync](server/src/notion-sync.ts)
- [Personal KB v2 setup](docs/notion-personal-kb-v2-setup.md)

