# Proge OS MCP deployment

Proge OS exposes a remote Streamable HTTP MCP endpoint at `/mcp`. The endpoint calls the existing OAuth-protected Supabase API; database credentials are never exposed to Hermes.

## 1. Deploy the API changes

Apply `20260827220000_agent_api_audit_log.sql`, then deploy the updated `api-v1` Supabase Edge Function. Its new scopes are:

- `read:projects`
- `read:contacts`, `write:contacts`
- `read:project-directory`, `write:project-directory`
- `read:action-items`, `write:action-items`
- `read:project-status`

The API client that Hermes uses should receive only these scopes.

## 2. Create the Proge OS API client

In Proge OS, open **Settings → API Clients** and create a client named `Hermes – Proge OS`. Copy its client ID and once-only client secret into the deployment environment. Do not paste either value into chat or commit them.

## 3. Configure the deployed Proge OS application

Set these server-side Cloudflare Pages environment variables:

```text
PROGE_OS_MCP_SHARED_SECRET=<new random bearer secret>
PROGE_OS_CLIENT_ID=<once-only API client ID>
PROGE_OS_CLIENT_SECRET=<once-only API client secret>
PROGE_OS_SUPABASE_FUNCTIONS_URL=https://xlfwzqpixlrnntzqhvcm.supabase.co/functions/v1
PROGE_OS_MCP_ALLOWED_ORIGINS=https://projos.ai
```

`PROGE_OS_MCP_SHARED_SECRET` authenticates Hermes to the MCP endpoint. It must be different from the Proge OS API client secret.

## 4. Connect Hermes

Store the shared MCP bearer secret in the Hermes environment as `PROGE_OS_MCP_TOKEN`. Add the following to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  proge_os:
    url: "https://projos.ai/mcp"
    headers:
      Authorization: "Bearer ${PROGE_OS_MCP_TOKEN}"
    timeout: 30
    connect_timeout: 15
    supports_parallel_tool_calls: false
    tools:
      include:
        - proge_os_search_projects
        - proge_os_get_project_summary
        - proge_os_search_contacts
        - proge_os_get_contact
        - proge_os_create_contact
        - proge_os_update_contact
        - proge_os_link_contact_to_project
        - proge_os_list_project_tasks
        - proge_os_create_project_task
        - proge_os_update_project_task
      prompts: false
      resources: false
```

Run `hermes mcp test proge_os`, then use `/reload-mcp` in the messaging gateway.

## 5. Install the skill

Copy `hermes/skills/proge-os/` into the Hermes skills directory and bind `proge-os` to a dedicated Telegram topic. The skill requires previews and user confirmation before writes.

## Security properties

- API tokens are workspace-scoped and scope-checked.
- Project access is checked through each project's workspace-owned property or client.
- Cross-workspace records return `404`, avoiding record-existence disclosure.
- Create operations require idempotency keys and derive stable record IDs from them.
- API writes are recorded in the immutable, tenant-scoped `agent_api_audit_log` with API client, requester, project, tenant, and correlation metadata.
- The MCP endpoint validates browser origins when an `Origin` header is present and requires a separate bearer secret for every request.
