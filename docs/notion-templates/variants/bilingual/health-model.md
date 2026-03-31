# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## Purpose
### TH
กำหนดเกณฑ์วัดความพร้อมใช้งานของระบบและแนวทางตอบสนองเมื่อผิดปกติ.
### EN
Define health-state criteria and incident response triggers.

<!-- REQUIRED:When to use -->
## When to use
### TH
- ตรวจเช้าก่อนเริ่มงาน
- ตรวจเย็นก่อนปิดวัน
- ใช้ทุกครั้งหลังเปลี่ยน config/runtime
### EN
- Morning and end-of-day checks.
- After runtime or mapping changes.

<!-- REQUIRED:How to use -->
## How to use
### TH
1. เช็ก `/automation/state`  
2. ตรวจ `AI Run Log`  
3. ทดสอบ capture 1 เคส  
4. เปิด incident ถ้าผิดปกติต่อเนื่อง
### EN
1. Check `/automation/state`.  
2. Review `AI Run Log`.  
3. Run one capture smoke test.  
4. Open incident if degraded state persists.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs
### TH
**Inputs:** endpoint health, sync outcome, dashboard alerts  
**Outputs:** health state + owner + corrective action
### EN
**Inputs:** runtime telemetry and sync outcomes  
**Outputs:** health classification and remediation action

<!-- REQUIRED:Health Signals -->
## Health Signals
### TH
- **Full**: capture/sync/follow-up ผ่านครบ
- **Normal**: มี retry บางครั้งแต่ไม่กระทบการใช้งาน
- **Degraded**: sync fail ซ้ำและ backlog เริ่มสะสม
- **Failed**: endpoint fail หรือไม่มี record ใหม่เลย
### EN
- **Full**: stable capture, sync, and follow-up cycle.
- **Normal**: occasional retry with controlled backlog.
- **Degraded**: persistent route failures and rising backlog.
- **Failed**: endpoint failure or no persisted updates.

<!-- REQUIRED:Limitations -->
## Limitations
### TH
- ยังพึ่งการตรวจสอบเชิงกระบวนการของ owner
### EN
- Health confidence depends on operational discipline and logging quality.

<!-- REQUIRED:Examples -->
## Examples
### TH
- Full: คำสั่ง capture แล้วเห็น record เข้า Notion ตาม route
### EN
- Failed: `/automation/capture` returns error and local store does not update.

<!-- REQUIRED:Related Links -->
## Related Links
### TH
- [Runtime](server/src/index.ts)
### EN
- [Notion sync](server/src/notion-sync.ts)
- [Incident template](docs/notion-templates/variants/bilingual/root-page.md)

