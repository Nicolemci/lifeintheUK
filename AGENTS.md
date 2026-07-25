# AGENTS

## Cursor Cloud specific instructions

This is a fully client-side single-page app (Vite + React 19 + TypeScript). There is no
backend, database, or external service; all user progress is persisted in the browser's
`localStorage` per local profile name, so no secrets or environment variables are required
to run, test, or build it.

Standard commands are defined in `package.json` scripts (referenced, not duplicated here):

- Dev server: `npm run dev` (Vite). It serves on port `5173`; use `npm run dev -- --host`
  if you need it reachable on the VM network interface.
- Tests: `npm run test` (Vitest, jsdom environment).
- Build + type-check: `npm run build` runs `tsc --noEmit` first, then `vite build`.

Non-obvious notes:

- There is no dedicated `lint` script. Type-checking (`tsc --noEmit`) runs as the first
  step of `npm run build`, so use the build to catch type errors.
- Progress state lives in `localStorage`; to test a "new user" flow, clear site data or use
  a fresh browser profile, otherwise a previously used profile name restores saved progress.
