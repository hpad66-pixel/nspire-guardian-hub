# Proj OS Rollback Checklist

Fill this out before any production release. A rollback plan created after a
failure is already late.

## Release Under Review

- Release name:
- Current production SHA:
- Candidate SHA:
- Previous known-good SHA:
- Release owner:
- DevOps owner:
- Rollback decision maker:

## Rollback Triggers

- [ ] Production route fails to render.
- [ ] Login or portal access fails.
- [ ] Critical financial workflow regresses.
- [ ] Tenant boundary, RLS, or role isolation concern appears.
- [ ] Migration corrupts or hides existing data.
- [ ] Error rate or function failure rate exceeds accepted threshold.
- [ ] Release owner calls rollback.

## Rollback Steps

1. Stop further deploys.
2. Record the failure, URL, timestamp, and visible error.
3. Revert or redeploy the previous known-good frontend SHA.
4. Revert edge functions to previous known-good code when functions changed.
5. For migrations, apply only a reviewed corrective migration. Do not rewrite a
   production-applied migration.
6. Re-run production smoke checks.
7. Record the final production SHA.
8. Open a follow-up issue or Notion action item with root cause and next steps.

## Database Rule

Production database rollback is not `git revert`. If schema or data changed,
write an explicit forward corrective migration and review it before applying.
For financial data, preserve auditability over cosmetic cleanup.

## Closure

- [ ] Production restored or stabilized.
- [ ] User-impact note drafted if needed.
- [ ] Release notes updated.
- [ ] Root-cause owner assigned.
- [ ] Fix-forward or retry branch named.
