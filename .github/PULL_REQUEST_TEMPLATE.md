<!--
Title format (replace above): `<prompt-id> <title>`
e.g. `D4 Change orders (G701)`  |  `F2 Owner portal`  |  `chore(ci): bump playwright`
-->

## What

<!-- One sentence. End with the prompt ID (A1–F3) when applicable. -->

## Tests

- [ ] `npm run typecheck` green
- [ ] `npm run test` green
- [ ] `npm run test:e2e` green locally
- Playwright added/modified: `e2e/<prompt-id>.spec.ts` · N tests
- Vitest added/modified: `src/hooks/__tests__/use<Resource>.test.ts` · N tests

## Out of Spec

<!--
List every file changed outside the prompt's COMPONENTS: block.
If this PR introduces a new convention that should be codified, call it
out here and update CLAUDE.md in the same PR.
-->

## Checklist

- [ ] COMPONENTS: every path from the prompt exists at the exact path.
- [ ] ROUTES: every route from the prompt is registered in `src/App.tsx`.
- [ ] BUSINESS RULES: every rule is enforced in code (service / hook / trigger).
- [ ] Playwright spec has one `test(...)` per ACCEPTANCE TEST bullet.
- [ ] No new npm dependency without justification (see CONTRIBUTING.md).
- [ ] No direct edits to a merged migration — new migration only.
- [ ] RLS policy + `tenant_id` on every new user-data table.
