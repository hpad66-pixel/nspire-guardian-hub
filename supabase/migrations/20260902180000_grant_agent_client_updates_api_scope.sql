-- Grant client-portal briefing and project-write API scopes to existing agent/MCP API clients.
-- In-flight oauth tokens keep their old scopes until they expire (~1 hour).

UPDATE public.api_clients
SET scopes = (
  SELECT coalesce(array_agg(DISTINCT s), '{}'::text[])
  FROM unnest(
    coalesce(scopes, '{}'::text[])
    || ARRAY[
      'write:projects',
      'read:client-updates',
      'write:client-updates'
    ]
  ) AS s
)
WHERE is_active = true
  AND revoked_at IS NULL
  AND (
    name ~* '(hermes|proj.?os|mcp|agent)'
    OR scopes && ARRAY[
      'read:pay-apps',
      'write:pay-apps',
      'write:contacts',
      'write:action-items'
    ]::text[]
  );
