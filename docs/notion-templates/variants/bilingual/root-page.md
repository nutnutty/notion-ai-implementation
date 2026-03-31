# {{PAGE_TITLE}}

โหมด: `{{MODE}}`  
ภาษา: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## Purpose
### TH
แม่แบบหน้า root สำหรับโหมดหน้าเดียวสองภาษา (ไทยก่อน อังกฤษตาม).
### EN
Root-page template for single-page bilingual mode (Thai first, then English).

<!-- REQUIRED:When to use -->
## When to use
### TH
- ใช้สร้าง/รีเฟรชหน้า 01..07
### EN
- Use to create or refresh pages in the 01..07 root set.

<!-- REQUIRED:How to use -->
## How to use
### TH
1. ระบุ goal ของหน้า  
2. วาง action สำคัญไว้ด้านบน  
3. ใส่ owner และ due date  
4. อัปเดตผลรายสัปดาห์
### EN
1. Define page objective.  
2. Keep active actions at top.  
3. Add owner and due date.  
4. Update weekly outcomes.

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs
### TH
**Inputs:** ข้อมูลจาก core databases + review  
**Outputs:** แผนงานที่ actionable และ traceable
### EN
**Inputs:** records from core databases and reviews  
**Outputs:** actionable plan/status with traceability

<!-- REQUIRED:Health Signals -->
## Health Signals
### TH
- ไม่มี dead links
- action สำคัญมี owner + due date ครบ
### EN
- No dead links.
- Critical actions always include owner and due date.

<!-- REQUIRED:Limitations -->
## Limitations
### TH
- template อย่างเดียว ต้องพึ่ง process discipline
### EN
- Template only; execution quality depends on operational discipline.

<!-- REQUIRED:Examples -->
## Examples
### TH
- เพิ่มบล็อกสรุป kept/changed/removed workflow รายสัปดาห์
### EN
- Add a weekly section for kept/changed/removed workflows.

<!-- REQUIRED:Related Links -->
## Related Links
### TH
- [Manifest](docs/notion-templates/manifest.json)
### EN
- [Section contract](docs/notion-templates/common/section-contract.md)
- [Template script](scripts/notion-template-mode.mjs)

