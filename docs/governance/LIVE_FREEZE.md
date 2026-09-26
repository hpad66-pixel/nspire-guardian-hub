# Proj OS Live Freeze

Status: active until Hardeep explicitly lifts it.

## Purpose

The live Proj OS application remains stable while the repository is cleaned up
and enterprise release governance is put in place. This freeze is not a stop on
product work. It is a stop on uncontrolled production change.

## Frozen

- `main` production merges, except approved hotfixes.
- Production database migrations.
- Production Supabase edge function deploys.
- Production Cloudflare Pages deploys.
- Production Auth0, Cloudflare, DNS, payment, and secret changes.
- Deleting or rewriting release tags.

## Allowed

- Local development.
- Short-lived `feature/*`, `fix/*`, and `codex/*` branches.
- Documentation and governance changes.
- Notion planning and idea extraction.
- Staging validation after review.
- Emergency `hotfix/*` work when it includes rollback evidence.

## Required Before Production Is Unfrozen

- `main` protected in GitHub.
- `staging` protected in GitHub.
- Direct pushes to protected branches blocked.
- Required CI checks on PRs.
- At least one human approval on normal PRs.
- Additional review for migrations, RLS, auth, payments, and portal boundaries.
- Clear release owner and rollback owner named for each production release.

## Live Verification Rule

For every production-impacting change, record:

- The exact commit SHA deployed.
- The production URL checked.
- The authenticated or public route checked.
- The tester or release owner who checked it.
- The rollback route if the smoke test fails.
