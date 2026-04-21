# Procore Lite — Claude Code Runbook

> How to run the 30 Lovable prompts through Claude Code + GitHub instead of Lovable.
> Read this once at the start of the build. Read the P0 Context Prompt below at the start of every Claude Code session (until you're halfway through Phase 2 and it's second nature).

---

## Why Claude Code over Lovable for this build

Three things Claude Code gives you that Lovable can't:

1. **Real git discipline.** Branch per prompt → PR → review → merge. Every prompt becomes an auditable unit of work. Rollback is free. The commit graph maps 1:1 to your phase plan.
2. **Executable acceptance tests.** The `ACCEPTANCE TESTS` in every prompt become real Playwright/Vitest specs that run in CI. The gate stops being "looks right in the preview" and becomes "tests green".
3. **Verification subagents.** After each prompt, `/review` and `/security-review` run a second pass before merge. That's a quality leverage you can't replicate in Lovable.

The tradeoff: Claude Code will touch more files per prompt because it sees the whole tree. Mitigation is built into `CLAUDE.md` — the **"only touch files in COMPONENTS"** rule.

---

## One-time setup

```bash
# 1. Clone the repo
git clone git@github.com:<your-org>/nspire-guardian-hub-staging.git
cd nspire-guardian-hub-staging

# 2. Copy CLAUDE.md to repo root
cp ~/Downloads/CLAUDE.md ./CLAUDE.md
git add CLAUDE.md && git commit -m "docs: add CLAUDE.md for Claude Code sessions"

# 3. Start Claude Code in the repo
claude

# 4. Inside Claude Code, confirm it read CLAUDE.md
#    Ask: "What is the non-negotiable rule about tenant_id?"
#    If it doesn't answer from CLAUDE.md, run /init and re-paste CLAUDE.md as the starting content.

# 5. Wire CI
#    Add .github/workflows/ci.yml with: npm run typecheck, npm run test,
#    npm run test:e2e, supabase db push --dry-run
#    (Claude Code can write this — ask it to after step 4.)

# 6. Point at a real dev Supabase project
#    supabase login
#    supabase link --project-ref <your-dev-ref>
```

---

## The per-prompt loop

For each of the 30 prompts in `Procore_Lite_Lovable_Prompts.html`, in file order:

```
1. git checkout main && git pull
2. git checkout -b feature/<prompt-id>-<slug>
   (e.g. feature/A1-multi-tenant, feature/D4-change-orders)

3. In Claude Code: paste the prompt verbatim.
   Before pasting, add this header line:
   "Apply this prompt. Write Playwright + Vitest tests. Only touch files
    listed in COMPONENTS unless a dependency forces otherwise."

4. Let Claude Code build. It will:
   - Write/update SQL migration in supabase/migrations/
   - Write/update components in the paths listed in COMPONENTS
   - Write Playwright specs in e2e/<prompt-id>.spec.ts
   - Write Vitest specs in src/hooks/__tests__/

5. Run locally:
   supabase db push                      # apply the new migration
   npm run typecheck                     # must pass
   npm run test                          # must pass
   npm run test:e2e                      # must pass

6. Review the diff:
   git diff --stat
   # Anything outside COMPONENTS? Flag it.

7. Commit + push:
   git add -A
   git commit -m "feat(<area>): <prompt-id> <title>"
   git push -u origin feature/<prompt-id>-<slug>

8. Open PR. Title = prompt id + title.
   In PR body: What / Tests / Out of Spec.

9. In Claude Code on the PR branch: /review
   Fix anything flagged.

10. Merge when CI green + review clean.

11. Locally: git checkout main && git pull.
```

Repeat 30 times. At phase boundaries, run `/security-review` on the phase branch before tagging `v0.X-phaseN`.

---

## The P0 Context Prompt

Paste this at the start of every Claude Code session for this project — at least for Phases 1 and 2. Once the conventions stick, CLAUDE.md alone will carry you.

```
You are helping build Procore Lite — a multi-tenant construction-management
SaaS — inside the nspire-guardian-hub-staging repo. Before you do anything,
read CLAUDE.md in the repo root. It contains non-negotiable rules about
tenant isolation, RLS, cost-code keying, the Ball-in-Court engine, and
file-touch scope. Those rules override any prompt.

I am going to paste numbered build prompts one at a time. Each prompt has
six sections: GOAL, TABLES (SQL DDL), COMPONENTS (file paths), ROUTES,
BUSINESS RULES, ACCEPTANCE TESTS. Treat the prompt as the spec and the
ACCEPTANCE TESTS as the contract.

For every prompt:
  1. Confirm you've read CLAUDE.md.
  2. Apply the SQL as a new migration in supabase/migrations/ with a
     timestamped filename. Never edit a merged migration.
  3. Create/update only the files in COMPONENTS unless a dependency
     forces otherwise — if it does, flag it in your response before you
     make the change.
  4. Write Playwright e2e specs in e2e/<prompt-id>.spec.ts — one test
     block per ACCEPTANCE TEST bullet. Make them real, not placeholder.
  5. Write Vitest unit tests in src/hooks/__tests__/ for every new hook.
     Cover happy path, validation path, permission path.
  6. Run npm run typecheck mentally before you finish. If TypeScript
     would fail, fix it.
  7. Summarize what you did in bullet form:
       - migration created: <filename>
       - files created/modified: <list>
       - tests added: <list>
       - out-of-spec changes: <list or "none">

Prompts arrive in dependency order. Never skip ahead — if a prompt
references a table that doesn't exist, stop and tell me which upstream
prompt is missing. Use the Dependencies cheat-sheet at the end of
Procore_Lite_Lovable_Prompts.html to verify.

Standing rules:
- tenant_id + RLS on every user-data table (no exceptions)
- cost_code_id FK on every financial row
- Ball-in-Court via src/lib/workflow (never re-implement)
- Distribution lists via src/lib/distribution (never hardcode recipients)
- Permission checks via src/lib/rbac/can() (never if (user.role === …))
- Feature gating via src/lib/billing/canUseFeature() (Phase 1 A6 onward)
- shadcn primitives in src/components/ui are READ-ONLY
- No new npm dependencies without asking

When you're done, end with the summary bullets above. Nothing else.
Ready for the first prompt.
```

Paste that once per session. Then paste prompts. Let Claude Code work. Review diffs. Merge.

---

## When things drift

### "Claude Code refactored a file outside COMPONENTS"
Reject the PR. Ask it to revert the out-of-spec change and re-submit. If the change is genuinely required, it must be flagged in the PR body under "Out of Spec" with a one-line reason.

### "The TypeScript fails after the migration"
Usually the generated Supabase types are stale. Run `supabase gen types typescript --linked > src/types/supabase.ts` and commit the regenerated types in the same PR.

### "A prompt references a table that doesn't exist yet"
You skipped a prompt. Check the dependency cheat-sheet at the end of `Procore_Lite_Lovable_Prompts.html`. Go back, run the missing upstream prompt, then resume.

### "A prompt's ACCEPTANCE TEST is ambiguous"
Ask Claude Code to propose a concrete Playwright assertion and confirm it before it writes the spec. A vague test is worse than no test.

### "Lovable-style preview URL"
You won't have one. Deploy the branch to Vercel (or Netlify, Fly, Railway — your pick) via the GitHub integration so every PR gets a preview URL. Add the preview URL to the PR description so reviewers can click through.

---

## Phase boundary checklist

Before tagging `v0.X-phaseN`:

- [ ] All prompts in the phase have merged PRs
- [ ] CI is green on `main`
- [ ] `npm run test:e2e` passes locally
- [ ] Seed prompt run against dev Supabase, demo data visible
- [ ] `/security-review` run on the full phase diff (compare `main` to the previous phase tag)
- [ ] Deploy `main` to staging, smoke-test the happy path for each new module
- [ ] Update the project README with the new feature list for the phase
- [ ] `git tag -a v0.X-phaseN -m "Phase N complete"`
- [ ] `git push origin v0.X-phaseN`

---

## Recommended cadence

- **Phase 1 (7 prompts):** 2–3 weeks solo, 1–1.5 weeks with a pair. The foundation prompts (A1 tenant, A2 RBAC) take the longest because they're infrastructure; A5 cost codes and A6 Stripe are one-session each.
- **Phase 2 (12 prompts + seed):** 4–5 weeks. Front-loaded — B1 Directory and B2 Drawings are two-session prompts. C-series (RFIs, submittals, punch) goes fast once the workflow engine is in.
- **Phase 3 (6 prompts):** 4–5 weeks. D1 and D6 are the anchors — budget for two sessions each. D3 Change Events is surprisingly small. D4 Change Orders is the one that will reveal gaps in your A4 workflow engine; expect to revisit A4 once.
- **Phase 4 (4 prompts):** 3 weeks. E3 reporting is the biggest — it's really two features (builder + dashboards). F1/F2 portals reuse 80% of main-app components so they move quickly once the RLS pattern clicks. F3 API is almost entirely PostgREST config + edge function glue.

**Total build estimate: 13–16 weeks** for a focused solo developer with Claude Code, assuming no deep rewrites. Plan for 18–20 weeks if you're balancing this with other work.

---

## After Phase 4

You have a working multi-tenant construction SaaS. The next frontier is differentiation — the ENHANCE items in the gap analysis:

- AI-assisted RFI drafting (LLM-authored first drafts from drawings + spec sections)
- Budget forecast ML (train on direct-cost history + change-event patterns)
- Photo-to-daily-log OCR (extract equipment, headcount, weather from field photos)
- Conversational reporting (natural-language queries over the whole schema)

Those aren't in `Procore_Lite_Lovable_Prompts.html` because they require a live system to train against. Phase 5 prompts get written from production telemetry, not up front.

---

*Last updated: 2026-04-19 · v1.0*
