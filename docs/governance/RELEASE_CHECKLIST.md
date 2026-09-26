# Proj OS Release Checklist

Use this checklist for every release from `staging` to `main`.

## Release Identity

- Release name:
- Release owner:
- DevOps owner:
- Tester:
- Source branch:
- Target branch:
- Commit SHA:
- Production URL:
- Staging URL:

## Pre-Release

- [ ] Scope is documented in Notion, issue, or PR.
- [ ] Branch is current with target branch.
- [ ] CI is green.
- [ ] `npm run typecheck` passed or CI equivalent passed.
- [ ] `npm run test` or `npm run test:coverage` passed.
- [ ] `npm run build` passed.
- [ ] `npm run test:e2e` passed or exceptions are documented.
- [ ] Supabase migration dry-run passed when migrations changed.
- [ ] Database tests passed when schema, RLS, or financial logic changed.
- [ ] User-facing changes have screenshot or browser evidence.
- [ ] Authenticated workflows were checked when affected.
- [ ] Tenant isolation was reviewed when affected.
- [ ] Payment, invoice, pay app, or financial calculations were reviewed when
      affected.
- [ ] Rollback checklist is filled before deployment.

## Approval

- [ ] Product owner approved scope.
- [ ] Reviewer approved code and risk.
- [ ] Tester approved acceptance behavior.
- [ ] DevOps owner approved deployment window.
- [ ] Release owner approved merge to `main`.

## Deployment

- [ ] Merge commit SHA recorded.
- [ ] Deployment started by:
- [ ] Deployment completed at:
- [ ] Production smoke test completed.
- [ ] Release tag created.
- [ ] Command Center or release notes updated.

## Post-Release

- [ ] Live public route checked.
- [ ] Live authenticated route checked if applicable.
- [ ] Error logs checked.
- [ ] Supabase function logs checked if functions changed.
- [ ] Data integrity spot-check completed if migrations changed.
- [ ] Stale release branch deleted or scheduled for deletion.
