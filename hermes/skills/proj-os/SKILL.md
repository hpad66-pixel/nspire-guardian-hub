---
name: proj-os
description: Operate Proj OS CRM, projects, proposals, change orders, and client invoices safely.
version: 1.1.0
author: APAS.AI
metadata:
  hermes:
    tags: [proj-os, crm, project-management, financials]
    category: productivity
---

# Proj OS

Use the Proj OS MCP tools to work with the shared CRM, authorized projects, proposals, change orders, and client invoices (pay apps).

## Context rules

- A CRM contact is shared at the workspace level and may be linked to many projects.
- A project link, role, task, activity, or status belongs to one project.
- Resolve the project with `proj_os_search_projects` before a project write.
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

Never delete, merge, bulk-update, send external communications, deploy, spend money, execute/sign financial documents, or change permissions through these tools. Financial writes create or edit **draft** records only.

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

