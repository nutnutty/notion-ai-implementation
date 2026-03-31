# /auto-pilot

Master workflow for `playground-chatgpt-app`.

## Scope

This workflow orchestrates the startup automation files while keeping project progression separate.

- Progression source: `PROJECT_PROGRESSION.md`
- Stack: `React application, TypeScript`
- Stack key: `react-app`
- Package manager: `npm`
- Deploy target: `custom`

## Verification baseline

- Install: `npm ci`
- Build: `npm run build`
- Lint: `npm run check`
- Typecheck: detect the repo-native command
- Test: `npm run test`

## Order

1. detect the authoritative progression source
2. refresh startup workflows if they are missing or stale
3. run `/sync-social-data` when the repo integrates with external content or scheduled data pulls
4. run `/ui-component-audit` when UI cleanup is part of the current goal
5. run `/seo-audit` before public launch, content expansion, or discoverability work
6. run `/deploy-firebase` last, adapted to the real deploy target `custom`

## Rules

- treat progression as a separate source of truth
- do not create `PROJECT_PROGRESSION.md` if `PROJECT_PROGRESSION.md` already exists
- do not auto-create product features as part of startup automation
- use explicit user requests for feature work such as Google Antigravity-style experiences
