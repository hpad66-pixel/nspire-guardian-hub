# Proj OS Governance

This folder holds the operating rules for keeping Proj OS enterprise-grade while
the team works aggressively without destabilizing the live application.

Start here:

- `LIVE_FREEZE.md` - what is frozen and what work may continue.
- `ENTERPRISE_SDLC.md` - branch flow, role gates, and release movement.
- `CODEX_PROMOTION_LADDER.md` - how Hardeep + Codex work starts and moves
  through review, integration, QA, release, and live.
- `RELEASE_CHECKLIST.md` - release-candidate checklist before production.
- `ROLLBACK_CHECKLIST.md` - production rollback checklist.

The short version: build fast on short-lived Level 1 branches, validate together
in `staging`, freeze a release candidate in `release/*`, release to `main` only
through approval gates, and keep production rollback evidence ready before
deployment.
