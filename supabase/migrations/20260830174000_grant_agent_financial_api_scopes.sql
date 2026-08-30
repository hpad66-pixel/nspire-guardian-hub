-- Grant financial API scopes to existing agent/MCP API clients.
-- In-flight oauth tokens keep their old scopes until they expire (~1 hour).
-- New tokens minted after this change include the financial scopes.

UPDATE public.api_clients
SET scopes = (
  SELECT coalesce(array_agg(DISTINCT s), '{}'::text[])
  FROM unnest(
    coalesce(scopes, '{}'::text[])
    || ARRAY[
      'read:change-orders',
      'write:change-orders',
      'read:proposals',
      'write:proposals',
      'read:pay-apps',
      'write:pay-apps'
    ]
  ) AS s
)
WHERE is_active = true
  AND revoked_at IS NULL
  AND (
    name ~* '(hermes|proj.?os|mcp|agent)'
    OR scopes && ARRAY[
      'write:contacts',
      'write:action-items',
      'write:project-directory'
    ]::text[]
  );
