# /sync-social-data

Use this workflow to inspect or wire external social-data synchronization for `playground-chatgpt-app`.

## Repo profile

- Stack: `React application, TypeScript`
- Stack key: `react-app`
- Progression source: `PROJECT_PROGRESSION.md`

## Likely sync surfaces

- Look for CMS, social APIs, feed imports, analytics pulls, or scheduled content refresh jobs.
- Track env variables, cache rules, and rendering impact before changing sync behavior.

## Workflow

1. find the existing integration code and env variables
2. identify current fetch cadence, failure modes, and data contracts
3. implement the smallest safe sync change
4. validate with the closest available smoke test, fixture, or build check
5. log blockers or integration status changes in the progression source

## Do not do

- Do not add hidden background jobs without explicit approval
- Do not duplicate source-of-truth docs for sync status
