# Personal KB v2 Migration Batch 001

อัปเดตล่าสุด: 2026-03-30

## Goal

เริ่ม curated migration ชุดแรกจาก legacy Notion workspace โดยไม่ bulk import

## Source of truth for this batch

ข้อมูลชุดนี้อ้างอิงจาก:

- [docs/notion-system-handoff.md](docs/notion-system-handoff.md)
- old Notion page URLs ที่ถูกเก็บไว้ใน handoff doc

## Batch scope

1. Project
   - Source: [Project - Mission Control System](https://www.notion.so/<REDACTED>)
   - Target: `Projects`
   - Rationale: เก็บ strategic/operating intent ของระบบเดิมในรูป project เดียวที่อ้างอิงได้

2. Research
   - Source: [Research Summary - Planning + Execution AI Agent Design with Notion Integration](https://www.notion.so/<REDACTED>)
   - Target: `Research Library`
   - Rationale: เป็น research artifact ที่มีสมมติฐานและ next action ชัดเจน

3. Knowledge
   - Source: [Bilingual Content Standard (TH/EN)](https://www.notion.so/<REDACTED>)
   - Target: `Knowledge Hub`
   - Rationale: เป็น reusable operating rule ที่ควรถูก promote เป็น canonical knowledge

4. Raw import trace
   - Source URLs เดียวกันข้างต้น
   - Target: `Conversation Inbox`
   - Rationale: เก็บ legacy import trace ตาม migration rule ของ workspace ใหม่

## Rules

- ห้าม copy ทุกหน้าจาก workspace เก่าเข้ามาตรงๆ
- ทุก item ต้องมี `Source URL` หรือ `Source Record URL`
- raw import ต้องมี `Source Channel=legacy-import`
- promote เฉพาะสิ่งที่ active, reusable, หรือมี long-term decision value
