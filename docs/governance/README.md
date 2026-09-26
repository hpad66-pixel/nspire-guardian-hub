# Proj OS Governance

This folder holds the operating rules for keeping Proj OS enterprise-grade while
the team works aggressively without destabilizing the live application.

Start here:

- `LIVE_FREEZE.md` - what is frozen and what work may continue.
- `ENTERPRISE_SDLC.md` - branch flow, role gates, and release movement.
- `RELEASE_CHECKLIST.md` - release-candidate checklist before production.
- `ROLLBACK_CHECKLIST.md` - production rollback checklist.

The short version: build fast on short-lived branches, validate in `staging`,
release to `main` only through approval gates, and keep production rollback
evidence ready before deployment.
