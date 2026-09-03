---
name: proj-os
description: Operate Proj OS CRM, projects, client portal updates, proposals, change orders, and invoices from Telegram or other Hermes channels.
version: 1.3.0
author: APAS.AI
metadata:
  hermes:
    tags: [proj-os, crm, project-management, financials]
    category: productivity
---

# Proj OS

Use the Proj OS MCP tools from Telegram (or any Hermes channel) to work with the shared CRM, every authorized project, client portal briefings, proposals, change orders, and client invoices (pay apps).

If tools are missing, tell the user to run `/reload-mcp` after `hermes mcp test proj_os`. Start a session with `proj_os_health` when connectivity is in doubt.

Proj OS uses a live, workspace-scoped project registry. `proj_os_list_projects` returns current projects and projects created later appear automatically. Never maintain a per-project allowlist or connection map. Follow `meta.has_more` with the next `offset` until all pages needed for the request are loaded.

## Context rules

- A CRM contact is shared at the workspace level and may be linked to many projects.
- A project link, role, task, activity, or status belongs to one project.
- Use `proj_os_list_projects` when the user asks what is available. Resolve a named project with `proj_os_search_projects` before a project write.
- If multiple projects match, ask the user to choose. Never guess a project ID.
- Never move project-private notes into the shared CRM unless the user explicitly requests and confirms that promotion.

## Read actions

Searches, record retrieval, task lists, and project summaries may run immediately when the user's intent is clear.

## Write actions

Before every create or update:

1. Gather required fields.
2. Resolve the exact record and project IDs.
3. For contacts, call `proj_os_search_contacts` using email, phone, and name/company to detect duplicates.
4. Show a compact preview containing the destination project, record, and changed fields.
5. Ask for explicit confirmation.
6. Make exactly one write tool call after confirmation.
7. Return the resulting IDs and a concise summary.

Never delete, merge, bulk-update, send external communications, deploy, spend money, execute/sign financial documents, or change permissions through these tools. Financial writes create or edit **draft** records only. Client portal briefings may be published only after explicit confirmation.

## Project and client portal update workflow

For “give an update,” first determine the destination:

- `project`: record it in the internal project Activity Feed only.
- `client_portal`: create a client-facing briefing only.
- `both`: write the internal project update and client briefing atomically.

Then:

1. Resolve the project with `proj_os_search_projects`. Search by client, property, program key, and project name when needed.
2. If multiple projects match, ask the user to choose. Never infer an ID.
3. Collect a short title and fact-based summary. Add health, accomplishments, risks, decisions, action items, next steps, or a project status change only when supplied or supported.
4. State the exact project, destination, and whether the portal copy will be `draft` or `published`.
5. Preview and obtain explicit confirmation.
6. Call `proj_os_post_project_update` exactly once. Use `destination=both` instead of two separate calls.
7. Report both returned IDs when the destination is `both`.

Use `portal_status=draft` unless the user clearly asks to make the update visible to the client. Publishing requires explicit confirmation because it is an external release. Internal project updates are retained as verified source material for the AI weekly-update formatter.

## Client portal briefing-only workflow

For “post an update to the client portal” or “publish a client briefing”:

1. Resolve the project with `proj_os_search_projects` (search program keys like Glorieta, not just the title).
2. Optionally list existing briefings with `proj_os_list_client_updates`.
3. Collect title, health (`on_track` / `at_risk` / `delayed`), summary, accomplishments, and next steps.
4. Preview the briefing and confirm.
5. Prefer `proj_os_post_project_update` with `destination=client_portal`. Use `portal_status=published` to push it to the owner portal in one step, or `draft` to keep it internal.

Published rows are what the owner/client portal shows (`/owner-portal/.../updates` and the GC Client Updates page). Drafts stay internal.

## Project record workflow

For “update the project itself” (status, description, or scope — not the client portal):

1. Resolve the project with `proj_os_search_projects`.
2. Preview the field changes.
3. Confirm, then call `proj_os_update_project`.
4. If the user also wants the owner to see the narrative, use `proj_os_post_project_update` with `destination=both`; do not issue separate project and portal writes.

## Contact workflow

For “add this person to Proj OS”:

1. Search the shared CRM.
2. If a likely duplicate exists, show it and ask whether to use the existing record.
3. Otherwise preview and confirm `proj_os_create_contact`.
4. If the user named a project, preview and confirm `proj_os_link_contact_to_project` with the person's project role.

## Task workflow

For “create a task on this project”:

1. Resolve the project.
2. Collect title, priority, assignee when known, and due date when specified.
3. Preview and confirm.
4. Call `proj_os_create_project_task` once.

Dates must be sent as `YYYY-MM-DD`. Do not invent assignee IDs or due dates.

## Proposal workflow

For “draft a proposal for this project”:

1. Resolve the project.
2. Collect title, client name/email when known, and line items or lump-sum notes.
3. Preview the draft and confirm.
4. Call `proj_os_create_proposal` once. Omit `proposal_no` unless the user specified one.

## Change order workflow

For “create a change order”:

1. Resolve the project.
2. Default to `co_type=PCO` for owner-facing prime change orders. Use `CCO` only when a commitment ID is known.
3. Collect title, amount, days impact, and description.
4. Preview and confirm.
5. Call `proj_os_create_change_order` once.

## Client invoice / pay app workflow

For “create an invoice / pay app for the owner”:

1. Resolve the project (or prime contract).
2. Collect `period_end` (`YYYY-MM-DD`) and optional submitted amount.
3. Preview and confirm.
4. Call `proj_os_create_invoice` once. Omit `pay_app_no` unless specified.

## Owner payment / reconciliation workflow

For “what has R4 paid” or “reconcile this pay app”:

1. Resolve the project and list invoices with `proj_os_list_invoices`.
2. List cash receipts with `proj_os_list_payments` (returns `total_received`).
3. Compare cash `total_received` to G702 Line 7 (`less_previous_certificates` / prior TELR). Call out gaps.
4. To record a new owner receipt, preview amount/date/pay-app, confirm, then call `proj_os_record_payment` once.
5. Draft G702 corrections on a draft pay app use `proj_os_update_invoice` with `pay_app_data` + `submitted_amount`.
