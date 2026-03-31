# Repository Privacy Guidelines (TH/EN)

## TH: แนวทางความเป็นส่วนตัวสำหรับ Repo นี้

### 1) หลักการ

- ห้าม commit ข้อมูลส่วนตัวหรือข้อมูลระบุตัวตนจริง เช่น token, user UUID, local path, URL เอกสารส่วนตัว
- ใช้ placeholder เสมอ: `<REDACTED>`, `<REDACTED_ID>`, `your_notion_integration_token`
- ตั้งค่าจริงให้ผ่าน environment variables เท่านั้น

### 2) หลังมีการ force-push ประวัติ (history rewrite)

สำหรับเครื่องอื่นที่เคย clone repo:

```bash
git fetch --all
git checkout main
git reset --hard origin/main
git clean -fd
```

หรือวิธีที่ปลอดภัยที่สุด: ลบโฟลเดอร์เดิมแล้ว clone ใหม่

### 3) Checklist ก่อน push

```bash
rg -n "(/Users/|https://www\\.notion\\.so/[A-Za-z0-9]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|ntn_|sk-)" --hidden --glob '!.git/*'
```

ผลลัพธ์ควรเป็นว่าง หรือเป็นค่า placeholder เท่านั้น

### 4) นโยบายเอกสาร

- เอกสาร setup ต้องไม่ใส่ URL Notion จริงและไม่ใส่ data source IDs จริง
- ถ้าต้องแสดงตัวอย่าง ให้ใช้ค่าจำลองเท่านั้น
- ไม่อ้าง absolute path ของเครื่องผู้ใช้

### 5) นโยบายโค้ด

- ห้าม hardcode IDs ของ workspace/profile ใน source code
- routing IDs ต้องมาจาก `NOTION_<TYPE>_DATA_SOURCE_ID` หรือ profile config ภายนอกเท่านั้น

## EN: Privacy Guidance for This Repository

### 1) Policy

- Never commit personal identifiers, real tokens, user UUIDs, local machine paths, or private document URLs.
- Always use placeholders: `<REDACTED>`, `<REDACTED_ID>`, `your_notion_integration_token`.
- Keep real values in environment variables only.

### 2) After force-pushed history rewrite

For existing clones:

```bash
git fetch --all
git checkout main
git reset --hard origin/main
git clean -fd
```

Safest option: re-clone the repository.

### 3) Pre-push checklist

```bash
rg -n "(/Users/|https://www\\.notion\\.so/[A-Za-z0-9]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|ntn_|sk-)" --hidden --glob '!.git/*'
```

Expected result: empty or placeholder-only matches.

### 4) Documentation policy

- Setup docs must not include real Notion URLs or real data source IDs.
- Use mock/sample values in all examples.
- Do not reference machine-specific absolute paths.

### 5) Source code policy

- Do not hardcode workspace/profile IDs directly in source code.
- Route IDs must come from `NOTION_<TYPE>_DATA_SOURCE_ID` or external profile configuration.

