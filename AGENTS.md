# Workspace Rules

## Build, Lint, and Test Execution

- **Do NOT run lint, tests, or production builds locally.**
  - Never run `npm run lint`, `eslint`, `npm test`, `vitest`, `node --test`, `npm run build`, or `next build` in the local environment.
- **Lint, tests, and production builds must only run on Vercel.**
- For local sanity checks during development, use typechecking (`npm run typecheck` / `tsc --noEmit`) or `npm run dev` when needed, rather than running lint, tests, or production builds locally.
- **Exception: Foundry contracts (`contracts/`).** Vercel cannot run Foundry, so `forge build`, `forge test` and `forge coverage` may run locally for the contracts only. Everything else above still applies to the web app and packages.

## Git, Branches, and Pull Requests

- **Never include `"phase"` in branch names or pull request titles.**
  - Use descriptive, feature- or milestone-oriented names (e.g., `chore/monorepo-foundations`, `feat/landing-verifier`).
