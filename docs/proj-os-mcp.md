# Proj OS MCP deployment

Proj OS exposes a remote Streamable HTTP MCP endpoint at `/mcp`. The endpoint calls the existing OAuth-protected Supabase API; database credentials are never exposed to Hermes.

## 1. Deploy the API changes

Apply `20260827220000_agent_api_audit_log.sql`, then deploy the updated `api-v1` Supabase Edge Function. Its new scopes are:

- `read:projects`
- `read:contacts`, `write:contacts`
- `read:project-directory`, `write:project-directory`
- `read:action-items`, `write:action-items`
- `read:project-status`

The API client that Hermes uses should receive only these scopes.

## 2. Create the Proj OS API client

In Proj OS, open **Settings → API Clients** and create a client named `Hermes – Proj OS`. Copy its client ID and once-only client secret into the deployment environment. Do not paste either value into chat or commit them.

## 3. Configure the deployed Proj OS application

Set these server-side Cloudflare Pages environment variables:

```text
PROJ_OS_MCP_SHARED_SECRET=<new random bearer secret>
PROJ_OS_CLIENT_ID=<once-only API client ID>
PROJ_OS_CLIENT_SECRET=<once-only API client secret>
PROJ_OS_SUPABASE_FUNCTIONS_URL=https://xlfwzqpixlrnntzqhvcm.supabase.co/functions/v1
PROJ_OS_MCP_ALLOWED_ORIGINS=https://projos.ai
```

`PROJ_OS_MCP_SHARED_SECRET` authenticates Hermes to the MCP endpoint. It must be different from the Proj OS API client secret.

## 4. Connect Hermes

Store the shared MCP bearer secret in the Hermes environment as `PROJ_OS_MCP_TOKEN`. Add the following to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  proj_os:
    url: "https://projos.ai/mcp"
    headers:
      Authorization: "Bearer ${PROJ_OS_MCP_TOKEN}"
    timeout: 30
    connect_timeout: 15
    supports_parallel_tool_calls: false
    tools:
      include:
        - proj_os_search_projects
        - proj_os_get_project_summary
        - proj_os_search_contacts
        - proj_os_get_contact
        - proj_os_create_contact
        - proj_os_update_contact
        - proj_os_link_contact_to_project
        - proj_os_list_project_tasks
        - proj_os_create_project_task
        - proj_os_update_project_task
      prompts: false
      resources: false
```

Run `hermes mcp test proj_os`, then use `/reload-mcp` in the messaging gateway.

## 5. Connect Cursor (or another Streamable HTTP MCP client)

The same endpoint works from Cursor if you add a remote MCP server. This Slack/Cursor cloud session does **not** include that server unless you register it in Cursor settings with the shared secret.

```json
{
  "mcpServers": {
    "proj_os": {
      "url": "https://projos.ai/mcp",
      "headers": {
        "Authorization": "Bearer ${PROJ_OS_MCP_SHARED_SECRET}"
      }
    }
  }
}
```

`GET /mcp` is not supported (no SSE). Clients must POST JSON-RPC. The live tools cover project search/status, contacts, directory, and action items. Financial and field modules stay on the REST API at `/functions/v1/api-v1`.

## 6. Install the skill

Copy `hermes/skills/proj-os/` into the Hermes skills directory and bind `proj-os` to a dedicated Telegram topic. The skill requires previews and user confirmation before writes.

## Security properties

- API tokens are workspace-scoped and scope-checked.
- Project access is checked through each project's workspace-owned property or client.
- Cross-workspace records return `404`, avoiding record-existence disclosure.
- Create operations require idempotency keys and derive stable record IDs from them.
- API writes are recorded in the immutable, tenant-scoped `agent_api_audit_log` with API client, requester, project, tenant, and correlation metadata.
- The MCP endpoint validates browser origins when an `Origin` header is present and requires a separate bearer secret for every request.
