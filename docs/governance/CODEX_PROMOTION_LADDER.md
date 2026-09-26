# Codex Promotion Ladder

This is the required path for work that starts with Hardeep and Codex.

`main` is the live branch. It is not the first place where Codex writes product
changes. Codex starts in the lowest controlled lane, then the work is promoted
upward through review, testing, release, and production approval.

## Branch Ladder

| Level | Branch pattern | Name | Purpose | Who touches it |
| --- | --- | --- | --- | --- |
| 0 | `main` | Live baseline | Current production source of truth. | Release owner only through approved PR. |
| 1 | `codex/workbench` | Standing Codex workbench | Hardeep + Codex build, inspect, document, and push first drafts. | Codex operator. |
| 1 | `codex/<ticket-or-date>-<scope>` | Scoped Codex branch | Optional narrower branch for a specific Codex work package. | Codex operator. |
| 1 | `feature/<ticket>-<scope>` | Developer workbench | Developer-owned product work in parallel with Codex work. | Developer. |
| 1 | `devops/workbench` | Standing DevOps workbench | DevOps prepares infrastructure and release-system work. | DevOps owner. |
| 1 | `devops/<ticket>-<scope>` | DevOps workbench | CI/CD, Cloudflare, Supabase, secrets, monitoring, rollback tooling. | DevOps owner. |
| 1 | `fix/<ticket>-<scope>` | Fix workbench | Non-emergency bug repair. | Developer or Codex. |
| 2 | `staging` | Integration lane | Combines reviewed Level 1 work for shared testing. | Reviewer / release owner. |
| 3 | `release/candidate` | Standing QA release candidate | Frozen candidate for QA, final review, release notes, rollback planning. | Tester, DevOps, release owner. |
| 3 | `release/<date>-<scope>` | Scoped QA release candidate | Optional dated release branch for a larger or named release. | Tester, DevOps, release owner. |
| 4 | `main` | Live production | Production-ready code only. | Release owner after final approval. |

Level 1 branches are many. Levels 2 through 4 are controlled gates. The team may
work aggressively in Level 1, but production only changes through the promotion
ladder.

## Default Codex Path

1. Start from current `main`, unless the release owner explicitly says to start
   from `staging`.
2. Work in `codex/workbench` by default, or create a narrower
   `codex/<ticket-or-date>-<scope>` branch when the work needs isolation.
3. Implement the smallest coherent change.
4. Push only to that Codex branch.
5. Open a PR from the Codex branch to `staging`.
6. Use the PR description to explain the change in plain English, including:
   what changed, why it changed, what risk exists, what tests ran, what evidence
   exists, and how to roll back.
7. After review and testing, merge to `staging`.
8. Promote the frozen release set from `staging` to `release/candidate`, or cut a
   dated `release/<date>-<scope>` branch for a larger release.
9. Merge the release candidate to `main` only after QA, DevOps, release notes,
   rollback plan, and Hardeep approval are complete.

## Parallel Work Rule

Parallel work is normal. The protection is that everyone uses the same ladder.

- Codex work starts in `codex/workbench` or a scoped `codex/*` branch.
- Developer work starts in `feature/*` or `fix/*`.
- DevOps work starts in `devops/workbench` or a scoped `devops/*` branch.
- Each branch opens its own PR into `staging`.
- Conflicts are resolved before merge to `staging`, not in `main`.
- Integration behavior is tested in `staging`.
- `release/candidate` is updated only after the included PR list is known.

No contributor should merge directly into `main` unless the branch is an approved
`hotfix/*` and the release owner has accepted the emergency path.

## Required Promotion Evidence

### Level 1 To Level 2

Required before a work branch can merge into `staging`:

- Clear PR summary.
- Linked Notion decision, issue, prompt, or audit item.
- CI results.
- Test evidence proportional to risk.
- Screenshot or browser evidence for UI changes.
- Migration dry-run evidence for database changes.
- Extra review for auth, RLS, tenant boundaries, payments, invoices, pay apps,
  portals, and production configuration.

### Level 2 To Level 3

Required before cutting a `release/*` branch:

- The release scope is frozen.
- Included PRs are listed.
- Known defects are listed.
- Tester has a test plan.
- DevOps has deployment and rollback access.
- Notion release note exists.

### Level 3 To Level 4

Required before merge to `main`:

- QA sign-off.
- Release owner approval.
- DevOps approval.
- Rollback checklist completed.
- Production smoke-test plan ready.
- Hardeep explicitly approves the live merge.

## Review Branch Meaning

A review branch is not a permanent place to keep ideas. It is a temporary gate.
Its job is to make the next question easy:

- `codex/workbench`, `codex/*`, `feature/*`, `fix/*`, `devops/workbench`, `devops/*`: Is this individual change good?
- `staging`: Do multiple approved changes work together?
- `release/candidate` or `release/*`: Is this exact release candidate ready to go live?
- `main`: What is live now?

When a branch has served its gate, merge it or delete it. Preserve the memory in
PRs, Notion, release notes, and Git tags.
