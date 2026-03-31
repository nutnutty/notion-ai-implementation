# /deploy-firebase

Use this workflow to ship `playground-chatgpt-app` after hard gates pass.

## Repo profile

- Stack: `React application, TypeScript`
- Stack key: `react-app`
- Detected deploy target: `custom`
- Package manager: `npm`
- Progression source: `PROJECT_PROGRESSION.md`

## Verification commands

- Install: `npm ci`
- Build: `npm run build`
- Lint: `npm run check`
- Typecheck: detect the repo-native command
- Test: `npm run test`

## Steps

1. Review the progression source before deployment and confirm the current phase.
2. Run the detected hard gates above in the strongest practical order for this stack.
3. Adapt the final deploy step to the real platform:

- Package manager: `npm`
- Preferred deploy path: use the repository's documented deployment flow.
- Run `npm run build` before deployment.

4. Record deployment outcome and blockers in the progression source instead of inventing a second status document.

## Do not do

- Do not create duplicate progression files.
- Do not deploy around failed hard gates.
- Do not invent missing infrastructure.
