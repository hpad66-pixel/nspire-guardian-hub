# Proj OS MCP deployment

Proj OS exposes a remote Streamable HTTP MCP endpoint at `/mcp`. The endpoint calls the existing OAuth-protected Supabase API; database credentials are never exposed to Hermes.

## 1. Deploy the API changes

Apply `20260827220000_agent_api_audit_log.sql`, then deploy the updated `api-v1` Supabase Edge Function and Cloudflare Pages function `functions/mcp.js`. Recommended agent scopes:

- `read:projects`, `write:projects`
- `read:contacts`, `write:contacts`
- `read:project-directory`, `write:project-directory`
- `read:action-items`, `write:action-items`
- `read:project-status`
- `read:change-orders`, `write:change-orders`
- `read:proposals`, `write:proposals`
- `read:pay-apps`, `write:pay-apps`
- `read:client-updates`, `write:client-updates`

Mint a dedicated API client for agents and grant only the scopes you want those agents to use.

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

## 4. Connect Hermes (Telegram)

Store the shared MCP bearer secret in `~/.hermes/.env` as `PROJ_OS_MCP_TOKEN`. Merge `hermes/config.yaml.example` into `~/.hermes/config.yaml`. Important Hermes settings:

- `skip_preflight: true` — older `/mcp` GET responses were `text/plain` and Hermes rejected the server
- `tools.include: ["proj_os_*"]` — do not hard-code tool names; new portal/project tools would never appear
- `sampling.enabled: false` and `elicitation.enabled: false` — some MCP servers reject extra initialize capabilities
- `protocol: legacy` — this endpoint is Streamable HTTP JSON-RPC, not SSE discovery

Then run `hermes mcp test proj_os`. In the Telegram topic use `/reload-mcp`. Copy `hermes/skills/proj-os/` into the Hermes skills directory and bind it to that topic.

`GET /mcp` now returns JSON (`405` + `application/json`) so a current Hermes preflight can succeed even without `skip_preflight`. Keep the flag anyway.

## 5. Connect Cursor / Slack agents

Add a remote MCP server in Cursor and store `PROJ_OS_MCP_SHARED_SECRET` as a Cursor secret. Slack-launched agents can only call live projOS tools after that MCP is registered for the workspace/user.

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

`GET /mcp` is not supported (no SSE). Clients must POST JSON-RPC.

Cursor Slack/cloud agents send `Origin: https://cursor.com`. Authenticated bearer requests are allowed regardless of Origin so those agents can load the tools. Unauthenticated browser origins still must match `PROJ_OS_MCP_ALLOWED_ORIGINS` (default `https://projos.ai`) or the Cursor hosts.

Financial tools create **draft** records only:

| Tool family | Creates |
|-------------|---------|
| `proj_os_*_proposal` | Financial proposals (`proposals`) |
| `proj_os_*_change_order` | Draft PCO/CCO (`change_orders`) |
| `proj_os_*_invoice` | GC→owner pay apps (`prime_contract_pay_apps`) |

## 6. Install the skill

Copy `hermes/skills/proj-os/` into the Hermes skills directory and bind `proj-os` to a dedicated Telegram topic. The skill requires previews and user confirmation before writes.

## Security properties

- API tokens are workspace-scoped and scope-checked.
- Project access is checked through each project's workspace-owned property or client.
- Cross-workspace records return `404`, avoiding record-existence disclosure.
- Create operations require idempotency keys and derive stable record IDs from them.
- API writes are recorded in the immutable, tenant-scoped `agent_api_audit_log` with API client, requester, project, tenant, and correlation metadata.
- The MCP endpoint requires a separate bearer secret for every request. Unauthenticated browser origins must match `PROJ_OS_MCP_ALLOWED_ORIGINS` or the Cursor hosts; authenticated bearer requests are allowed regardless of Origin so Slack/cloud agents can load tools.
