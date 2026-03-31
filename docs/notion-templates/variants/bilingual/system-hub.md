# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## Purpose
### TH
เป็นหน้า hub เดียวที่สรุปการทำงานของระบบทั้งหมดแบบ TH ก่อน EN.
### EN
Single hub page to operate the full system with Thai-first bilingual structure.

<!-- REQUIRED:When to use -->
## When to use
### TH
- ใช้เปิดวันและปิดวันเพื่อตรวจสถานะระบบ
- ใช้ทุกครั้งก่อน weekly review
### EN
- Use for start/end-of-day system checks.
- Use before weekly governance review.

<!-- REQUIRED:How to use -->
## How to use
### TH
1. เปิด Mission Control
2. ตรวจ AI Run Log และ `/automation/state`
3. เปิด Incident Playbook หากพบ error
### EN
1. Open Mission Control.
2. Review AI Run Log and `/automation/state`.
3. Use Incident Playbook if an error state is detected.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs
### TH
**Input:** chat capture, API capture, manual updates  
**Output:** งานที่จัดประเภทแล้ว + บันทึกการตัดสินใจ
### EN
**Input:** chat/API captures and manual updates  
**Output:** structured records plus governance decisions

<!-- REQUIRED:Health Signals -->
## Health Signals
### TH
- เต็มประสิทธิภาพ: classify + sync + follow-up ทำงานครบ
- ผิดพลาด: sync fail ซ้ำหรือไม่เกิด record ใหม่
### EN
- Full efficiency: stable classification, sync, and follow-up.
- Error: persistent sync failure or no new persisted records.

<!-- REQUIRED:Limitations -->
## Limitations
### TH
- ไม่รองรับ bulk import อัตโนมัติ
### EN
- No automatic bulk legacy import by design.

<!-- REQUIRED:Examples -->
## Examples
### TH
- ตัวอย่างคำสั่ง: "ช่วยแตกงานและกำหนด due date ภายในสัปดาห์นี้"
### EN
- Example command: "Break this work into tasks and set due dates this week."

<!-- REQUIRED:Related Links -->
## Related Links
### TH
- [Runtime](server/src/index.ts)
### EN
- [Automation engine](server/src/automation-engine.ts)
- [Notion sync](server/src/notion-sync.ts)

