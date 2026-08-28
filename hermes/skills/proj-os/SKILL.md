---
name: proj-os
description: Operate Proj OS CRM and projects safely.
version: 1.0.0
author: APAS.AI
metadata:
  hermes:
    tags: [proj-os, crm, project-management]
    category: productivity
---

# Proj OS

Use the Proj OS MCP tools to work with the shared CRM and authorized projects.

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

Never delete, merge, bulk-update, send external communications, deploy, spend money, or change permissions through these v1 tools.

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

