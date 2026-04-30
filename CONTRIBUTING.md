# Contributing — Procore Lite build

> Workflow rules for every change that lands on `main`. Adapted from the
> QA/QC memo's ground rules and formalized here so there's a single
> authoritative copy.

## The rule in one sentence

**One prompt → one branch → one PR.** Always.

## Branch naming

```
feature/<prompt-id>-<kebab-slug>
```

Examples:
- `feature/A1-multi-tenant`
- `feature/B2-drawings`
- `feature/D4-change-orders`
- `feature/F2-owner-portal`

If the work isn't tied to a numbered prompt (e.g. CI fix, dependency bump),
use:

```
chore/<slug>        # routine maintenance
fix/<slug>          # production bug fix
hotfix/<slug>       # emergency patch
```

## Commit style

Conventional commits. The first line is ≤ 72 characters and names the
module in parentheses:

```
feat(rfis): add RFIResponseDialog with three action modes
fix(budget): correct pending-exposure join on D6 matrix
chore(ci): bump Playwright to 1.48
```

Body lines wrap at 72 characters, separated from the subject by a blank
line. Include a `Refs:` trailer when the commit implements a specific
prompt:

```
Refs: Procore_Lite_Lovable_Prompts.html#D4
```

## PR lifecycle

### 1. Open the branch with the helper

```
./scripts/new-prompt-branch.sh <prompt-id> <kebab-slug>
```

The helper:
1. Checks that `main` is clean and up-to-date.
2. Creates `feature/<prompt-id>-<slug>` from `main`.
3. Pushes an empty branch so the PR URL is reserved.

### 2. Work against the prompt's **COMPONENTS** block, not adjacent code

- Only touch files listed under `COMPONENTS:` in the Lovable prompt.
- If a dependency forces a change elsewhere, flag it in the PR description
  under `## Out of Spec`. Do **not** silently refactor neighboring modules.

### 3. Ship the contract

Every PR must include:

- Every file listed under `COMPONENTS:` at its prompt-specified path.
- Every route listed under `ROUTES:` registered in `src/App.tsx`.
- Every business rule under `BUSINESS RULES:` enforced in code
  (service / hook / trigger), not merely described in a comment.
- A Playwright spec at `e2e/<prompt-id>.spec.ts` where each
  `ACCEPTANCE TEST` bullet becomes a `test(...)` block.
- Vitest unit coverage for every hook added, under
  `src/hooks/__tests__/use<Resource>.test.ts`, covering happy /
  validation / permission paths per `CLAUDE.md`.

### 4. PR title

```
<prompt-id> <title>
```

Examples:
- `A1 Multi-tenant hardening`
- `D4 Change orders (G701)`
- `F2 Owner portal (OCOs + pay apps + schedule + reports)`

### 5. PR description

Use the three-section template. The PR template populates it
automatically.

```markdown
## What

One sentence describing what this PR implements, ending with the prompt ID.

## Tests

- [ ] `npm run typecheck` green
- [ ] `npm run test` green
- [ ] `npm run test:e2e` green locally
- New Playwright: `e2e/<prompt-id>.spec.ts` · N tests
- New Vitest:   `src/hooks/__tests__/use<Resource>.test.ts` · N tests

## Out of Spec

Any file changed outside the prompt's `COMPONENTS:` block. If the prompt
itself introduced a new convention (new lib under `src/lib/…`, new edge
function under `supabase/functions/…`), document it here so `CLAUDE.md`
can be updated in the same PR.
```

## Review rules

- Run `/review` on every PR via Claude Code or the reviewer bot before
  requesting human review.
- Two approvals required for any change under `src/lib/workflow`,
  `src/lib/billing`, `src/lib/rbac`, or `supabase/migrations/`.
- One approval otherwise.

## Do not

- Do not push to `main`.
- Do not skip pre-commit hooks (`--no-verify`).
- Do not bundle multiple prompts into one PR. If the prompts depend on each
  other, stack them as separate PRs (`feature/B1 → feature/B2` with
  "merge after B1" in the description).
- Do not rename files outside the `COMPONENTS:` block. If a path mismatch
  exists, add a re-export shim rather than moving the source.

## Phase boundaries

Tag `main` at the end of each phase:

```
git tag -a v0.1-phase1 -m "Phase 1 complete"
git tag -a v0.2-phase2 -m "Phase 2 complete"
git tag -a v0.3-phase3 -m "Phase 3 complete"
git tag -a v0.4-phase4 -m "Phase 4 complete"
```

## Escalation

If a prompt cannot be implemented with the approved stack (see the
`Stack` section of `CLAUDE.md`), **stop and ask in the PR before adding a
new dependency.** Specifically:

- Adding an npm dep → PR description must justify and link to any
  lighter alternatives that were ruled out.
- Adding a Supabase migration that introduces state not described in the
  prompt → PR description must justify and update `CLAUDE.md` in the
  same PR.
