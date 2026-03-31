# Notion Template Sources

This folder holds shared guidance for the Notion template system.

## Layout

- `../manifest.json` is the source of truth for mode/page mapping.
- `../variants/en-only` is English-only output.
- `../variants/th-en-split` is Thai and English on separate pages.
- `../variants/bilingual` is Thai-first plus English in one page.
- `../build/<mode>` is generated output from `apply --write`.

## Authoring rules

- Keep property and schema names in English when referencing databases.
- Keep runtime contracts aligned with:
  - `server/src/index.ts`
  - `server/src/automation-engine.ts`
  - `server/src/notion-sync.ts`
- Always preserve required section markers from `section-contract.md`.

