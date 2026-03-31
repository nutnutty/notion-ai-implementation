# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## วัตถุประสงค์ (Purpose)

กำหนดเกณฑ์วัดสุขภาพระบบ, สถานะผิดปกติ, และแนวทางตอบสนอง เพื่อให้ระบบใช้งานได้ต่อเนื่อง.

<!-- REQUIRED:When to use -->
## ใช้เมื่อไร (When to use)

- เช็กระบบประจำวันก่อนเริ่มงานและก่อนปิดวัน
- ก่อน deploy การเปลี่ยน mapping/policy
- เมื่อพบว่า record ไม่เข้า Notion หรือ follow-up ไม่วิ่ง

<!-- REQUIRED:How to use -->
## วิธีใช้งาน (How to use)

1. เรียก `GET /automation/state`.
2. ตรวจ `AI Run Log` และ `Active Incidents`.
3. ทดสอบ capture หนึ่งรายการ.
4. หากยังผิดปกติ ให้เปิด incident พร้อม owner และ due date.

<!-- REQUIRED:Inputs/Outputs -->
## ข้อมูลเข้า/ออก (Inputs/Outputs)

**Inputs**

- สถานะ endpoint และ sync outcome
- Dashboard view: `AI Runs Failed`, `Missing Required Fields`

**Outputs**

- ระบุสถานะ `full` / `normal` / `degraded` / `failed`
- แผนแก้ไขพร้อมผู้รับผิดชอบและเวลาติดตาม

<!-- REQUIRED:Health Signals -->
## สัญญาณสุขภาพระบบ (Health Signals)

- **Full**
  - capture และ sync สำเร็จสม่ำเสมอ
  - follow-up cycle ทำงานตามรอบ
  - backlog ต่ำและควบคุมได้
- **Normal**
  - มี error บางครั้งแต่กู้คืนได้ภายในรอบเดียว
- **Degraded**
  - sync fail ซ้ำ route เดิม
  - ข้อมูลสำคัญเริ่มตกหล่นหรือคิวสะสม
- **Failed**
  - endpoint ใช้งานไม่ได้
  - local persistence ผิดพลาด
  - ไม่มีข้อมูลใหม่เข้าระบบแม้มีคำสั่งใช้งาน

<!-- REQUIRED:Limitations -->
## ข้อจำกัด (Limitations)

- ยังไม่มี external monitoring stack แบบเต็มรูปแบบ
- ต้องพึ่งวินัยการอัปเดต incident และ weekly review

<!-- REQUIRED:Examples -->
## ตัวอย่าง (Examples)

- สถานะ Full: capture สำเร็จ + `sync.synced=true`
- สถานะ Degraded: capture สำเร็จแต่ sync fail ต่อเนื่องสำหรับ `research`
- สถานะ Failed: `/automation/state` เรียกไม่ได้หรือ timeout ต่อเนื่อง

<!-- REQUIRED:Related Links -->
## ลิงก์ที่เกี่ยวข้อง (Related Links)

- [Runtime](server/src/index.ts)
- [Notion sync](server/src/notion-sync.ts)
- [Incident Playbook template](docs/notion-templates/variants/th-en-split/root-page-th.md)

