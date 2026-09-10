# Client Meetings and Actions

## Outcome
One client-level journal across consulting and construction projects. Staff edit the complete report on screen, generate draft text from a transcript, maintain accountable actions, and explicitly release a dated snapshot. Clients read only released records, comment, and submit completion for review.

## Implementation sequence
1. Add tenant-bound client meetings, immutable publications, live actions, comments, and delivery preferences. Guard every command in Postgres, including optimistic revision checks and project/client boundary validation.
2. Configure the shared workflow engine for action submission and staff confirmation. Keep dated publications independent of live action changes.
3. Add the responsive editor and owner view, with direct client-level navigation. Reuse the existing branded report email composer and PDF renderer.
4. Add transcript-to-draft generation. Evidence and uncertainty stay visible; regeneration is a preview, never an automatic overwrite or release.
5. Add weekly delivery of new approved publications only. Keep delivery off until an administrator selects recipients and enables it. Use delivery claims and provider idempotency to prevent duplicate sends.
6. Add scoped MCP read/draft-edit tools and a portable client-meeting-brief skill. Do not modify Hermes credentials or install on an unverified remote runtime.
7. Verify validation, permissions, revisions, workflow, report rendering, navigation, and production build. Publish through a reviewed PR only after checks pass.

## Boundaries
- This module does not change financial calculations, project status, existing meeting records, or existing project tasks.
- Existing project meetings remain source records. No bulk migration or fabricated historical minutes.
- Clients cannot read transcripts, drafts, delivery recipients, or other clients' records.
- On-demand email supports HTML/PDF and To/CC/BCC. Weekly automation sends the approved HTML snapshot with a secure portal link; it skips unchanged publications and does not invent a weekly update.
- Published edits require a new release. Sending and publishing are separate explicit actions.
- Skill outputs remain drafts until human review. Unknown dates, project matches, and assignees stay unresolved.

## Verification and operation
- Implemented the client-level navigation, complete on-screen editor, interactive actions, branded HTML/PDF composer, weekly preferences, AI preview, and scoped MCP tools.
- Local full unit suite: 1,031 passed. Typecheck gate and production build passed.
- Local rollback-only database suite: 29 assertions covering revisions, client boundaries, private sources, shared workflow closure, immutable publications, agent restrictions, and delivery deduplication.
- Browser checks exercise the actual React page with isolated test data: narrative editing, mobile client comments, existing-action editing, PDF generation, and MCP restrictions. No real client messages or production test records are created.
- Weekly preferences start disabled. An administrator must select recipients and enable them. Only new approved versions send, during the selected hour. The scheduled job retrieves its service credential securely from the existing Supabase management credential and never stores it in the repository.
- The portable Hermes skill is checked in under `hermes/skills/client-meeting-brief/`. Installing it in a separate Hermes runtime and reloading its MCP tools is a separate configuration step, not claimed as completed here.
- AI generation and real recipient delivery require a live authorized smoke test; local tests do not substitute for sending an actual email.
