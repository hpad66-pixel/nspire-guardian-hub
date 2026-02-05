-- Ensure only admins can delete (archive) documents
DELETE FROM public.role_permissions
WHERE role_key = 'manager' AND module = 'documents' AND action = 'delete';

-- Update role_definitions permissions JSON for manager to remove delete from documents
UPDATE public.role_definitions
SET permissions = jsonb_set(
  permissions,
  '{documents}',
  (COALESCE(permissions->'documents', '[]'::jsonb) - 'delete')
)
WHERE role_key = 'manager';
