# /ui-component-audit

Use this workflow to clean up UI implementation quality for `playground-chatgpt-app`.

## Repo profile

- Stack: `React application, TypeScript`
- Stack key: `react-app`
- Progression source: `PROJECT_PROGRESSION.md`

## Applicability

This stack has a meaningful UI surface, so component audit work is applicable.

## Audit scope

- Audit component composition, spacing, typography, responsive layout, and duplicated utility classes.
- Prioritize `app/`, `pages/`, `src/components/`, `src/routes/`, and global style files when present.

## Validation

- run the repo's build
- run lint or typecheck if available
- keep the audit output grounded in files and behavior

## Do not do

- Do not turn the audit into a generic redesign
- Do not auto-create product features during startup bootstrap
