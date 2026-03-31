# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

## แผงนำทางหลัก

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
## วัตถุประสงค์ (Purpose)

เป็นศูนย์กลางควบคุมระบบ Personal Knowledge Base AI OS ให้ทำงานได้จริงในชีวิตประจำวัน ด้วยการจับงานอัตโนมัติ, ซิงก์แบบควบคุมสิทธิ์, และวัดสุขภาพระบบได้.

<!-- REQUIRED:When to use -->
## ใช้เมื่อไร (When to use)

- เปิดวันทำงานเพื่อกำหนดงานสำคัญ.
- ปิดวันเพื่อตรวจคุณภาพการบันทึก.
- รีวิวรายสัปดาห์เพื่อตัดสินใจปรับ workflow.

<!-- REQUIRED:How to use -->
## วิธีใช้งาน (How to use)

1. เริ่มจาก `04 Mission Control` เพื่อตรวจ Inbox/Work ที่ค้าง.
2. เช็ก `AI Run Log` และ `GET /automation/state`.
3. ถ้ามีความผิดปกติ ไป `05 Incident Playbook`.
4. บันทึกการตัดสินใจที่ `06 Metrics and Governance`.
5. ย้ายข้อมูลเก่าแบบ curated ใน `07 Archive and Migration`.

<!-- REQUIRED:Inputs/Outputs -->
## ข้อมูลเข้า/ออก (Inputs/Outputs)

**Inputs**

- ข้อความจาก ChatGPT หรือ API capture
- งานที่อัปเดตในฐานข้อมูลหลัก
- สถานะ runtime จาก endpoint

**Outputs**

- บันทึกที่จัดประเภทแล้วใน 6 ฐานข้อมูลหลัก
- การตัดสินใจเชิงปฏิบัติที่ตรวจสอบย้อนกลับได้

<!-- REQUIRED:Health Signals -->
## สัญญาณสุขภาพระบบ (Health Signals)

- **ประสิทธิภาพสูง**: classify ถูก, sync ผ่าน, follow-up วิ่งตรงรอบ
- **ปกติ**: มีรายการ inbox บางส่วนแต่เคลียร์ได้ตามรอบ
- **ผิดพลาด**: sync fail ซ้ำ, route mismatch, ข้อมูลไม่อัปเดต

<!-- REQUIRED:Limitations -->
## ข้อจำกัด (Limitations)

- ไม่มี bulk import อัตโนมัติจาก workspace เก่า
- ยังต้องมี weekly review เพื่อรักษาคุณภาพ
- ถ้าชื่อ property ใน Notion เปลี่ยน ต้องอัปเดต mapping

<!-- REQUIRED:Examples -->
## ตัวอย่าง (Examples)

- คำสั่ง: "ช่วยสรุป blocker migration แล้วกำหนด follow-up พรุ่งนี้"
- ผลลัพธ์: สร้าง record ใน Work/Inbox ตามระดับความมั่นใจ และคืนผล sync แยกจาก capture

<!-- REQUIRED:Related Links -->
## ลิงก์ที่เกี่ยวข้อง (Related Links)

- [Runtime](server/src/index.ts)
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync](server/src/notion-sync.ts)

