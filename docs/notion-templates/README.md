# Notion Template Versioning

This repository supports 3 Git-selectable Notion content modes:

- `en-only`: English pages only
- `th-en-split`: Thai and English on separate pages (default)
- `bilingual`: Thai + English in a single page (Thai first)

## Source of truth

- Mapping contract: [`manifest.json`](docs/notion-templates/manifest.json)
- Required section contract: [`common/section-contract.md`](docs/notion-templates/common/section-contract.md)
- Mode script: [`scripts/notion-template-mode.mjs`](scripts/notion-template-mode.mjs)

## Commands

```bash
npm run notion:templates:list
npm run notion:templates:validate
npm run notion:templates:apply -- --mode=en-only
npm run notion:templates:apply -- --mode=th-en-split
npm run notion:templates:apply -- --mode=bilingual
```

By default, `apply` is dry-run and prints what would be generated.  
To write rendered output:

```bash
npm run notion:templates:apply -- --mode=th-en-split --write
```

Generated files are written to `docs/notion-templates/build/<mode>/`.

