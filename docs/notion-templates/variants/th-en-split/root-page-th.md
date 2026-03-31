# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## วัตถุประสงค์ (Purpose)

ใช้เป็นแม่แบบหน้าหลักในโหมดแยกภาษา เพื่อให้ทุกหน้ามีโครงสร้างการใช้งานเหมือนกันและต่อยอดได้จริง.

<!-- REQUIRED:When to use -->
## ใช้เมื่อไร (When to use)

- ทุกครั้งที่สร้างหรือรีเฟรชหน้า root 01..07
- ก่อนส่งมอบให้ผู้ใช้ใช้งานจริง

<!-- REQUIRED:How to use -->
## วิธีใช้งาน (How to use)

1. ระบุเป้าหมายหน้าและ owner.
2. ใส่งานที่ active และ next action ไว้ส่วนบน.
3. ลิงก์ไปฐานข้อมูล/วิวที่เกี่ยวข้อง.
4. อัปเดตสรุปผลทุกสัปดาห์.

<!-- REQUIRED:Inputs/Outputs -->
## ข้อมูลเข้า/ออก (Inputs/Outputs)

**Inputs**

- ข้อมูลจาก Work Items, Research, Knowledge, Incident, Inbox
- ผล weekly review

**Outputs**

- แผนหรือสถานะที่ actionable
- หลักฐานการตัดสินใจและลิงก์ย้อนกลับ

<!-- REQUIRED:Health Signals -->
## สัญญาณสุขภาพระบบ (Health Signals)

- มี owner + due date ใน action สำคัญ
- ไม่มีลิงก์ที่กดแล้วไป dead-end
- ข้อมูลสรุปอัปเดตล่าสุดไม่เกิน 7 วัน

<!-- REQUIRED:Limitations -->
## ข้อจำกัด (Limitations)

- เป็น template เนื้อหา ไม่ได้สร้าง automation ใหม่เอง
- ถ้าไม่อัปเดตตามรอบ หน้าจะเสื่อมคุณค่าเร็ว

<!-- REQUIRED:Examples -->
## ตัวอย่าง (Examples)

- เพิ่มบล็อก "Weekly Changes: kept/changed/removed workflows"
- เพิ่มบล็อก "Current blockers + owner + target resolution date"

<!-- REQUIRED:Related Links -->
## ลิงก์ที่เกี่ยวข้อง (Related Links)

- [Manifest](docs/notion-templates/manifest.json)
- [Section contract](docs/notion-templates/common/section-contract.md)
- [Template script](scripts/notion-template-mode.mjs)

