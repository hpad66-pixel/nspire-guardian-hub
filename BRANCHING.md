# Proj OS Branching And Release Policy

This repository is the production source for Proj OS. The live application is
served from `main`, so `main` is treated as a protected release branch, not a
workspace for daily development.

## Current Branch Roles

| Branch | Purpose | Deployment meaning | Merge rule |
| --- | --- | --- | --- |
| `main` | Production source of truth | Live production | Protected. Merge only from an approved release PR. |
| `staging` | Shared integration lane for reviewed work | Staging or preview | Protected. Receives reviewed Level 1 PRs only. |
| `codex/<scope>` | Hardeep + Codex workbench, the lowest controlled lane | No live deploy | PR into `staging`; never deploy directly. |
| `feature/<scope>` | Normal developer product work | No live deploy | PR into `staging`; never deploy directly. |
| `fix/<scope>` | Non-emergency defects | No live deploy | PR into `staging`; promote through release gate. |
| `devops/<scope>` | CI/CD, infrastructure, environment, monitoring, rollback work | No live deploy unless approved | PR into `staging`; DevOps and release-owner review required when environment behavior changes. |
| `hotfix/<scope>` | Emergency production repair | Emergency candidate | PR into `main`, then immediately back-merge to `staging`. |
| `release/<date-or-version>` | Frozen QA release candidate | Optional release preview | Created from `staging` when QA starts; PR into `main` only after release gate. |

Long-lived branches are limited to `main` and `staging`. `release/*` branches
exist only for active release hardening and should be deleted after release or
rollback closure. All other branches should be short-lived and tied to one PR.

## Promotion Ladder

All normal work moves upward through the same gates:

```text
codex/*, feature/*, fix/*, devops/*
  -> staging
  -> release/<date-or-version>
  -> main
```

Codex work starts in `codex/*`. Developer work starts in `feature/*` or `fix/*`.
DevOps work starts in `devops/*`. Multiple people can work in parallel, but every
branch must enter the product through a reviewed PR into `staging`. `main` only
receives approved release candidates or approved hotfixes.

See `docs/governance/CODEX_PROMOTION_LADDER.md` for the full working model.

## Live Freeze Rule

Until the freeze is explicitly lifted, do not merge or push changes that can
deploy to production.

Allowed during freeze:

- Documentation and governance PRs.
- Local-only exploration.
- Feature branches that do not merge to `main`.
- Staging-only work when the release owner approves it.
- Emergency hotfixes with rollback evidence.

Blocked during freeze:

- Direct pushes to `main`.
- Merges into `main` for non-emergency work.
- Manual production deploys.
- Database migrations against production.
- Secret, DNS, Cloudflare, Supabase, or Auth0 production configuration changes
  without release-owner approval.

## Required Gates

Every PR into `staging` or `main` needs:

- One clear owner.
- Linked scope, ticket, Notion decision, or prompt.
- Test evidence appropriate to the risk.
- Screenshot or browser evidence for user-facing UI changes.
- Database migration dry-run evidence when migrations change.
- Security and tenant-isolation review when auth, RLS, portals, or payments
  change.
- Rollback notes.

Every release from `staging` to `main` needs:

- Green CI.
- Completed tester sign-off.
- Release-owner approval.
- DevOps deployment window.
- Rollback plan.
- Post-deploy production smoke test.

## Branch Cleanup Rule

Delete a remote branch when all of these are true:

- Its ideas are merged, documented, or intentionally abandoned.
- It is not `main`, `staging`, an active release branch, or an active financial
  evidence branch.
- There is no open PR depending on it.
- The latest useful commits are recoverable from GitHub, a local bundle, or an
  extraction document.

When in doubt, extract the idea to Notion or a markdown document first, then
delete the branch after review.

## Recovery Notes

Before the 2026-09-26 cleanup, all Git refs were backed up to a local bundle in:

`/Users/apas/Documents/ChatGPT/ProjOS/branch-cleanup-backups/`

That backup is local evidence only. It does not replace GitHub branch
protection, release tags, or deployment rollback artifacts.
