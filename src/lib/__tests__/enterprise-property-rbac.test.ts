import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260829023000_enterprise_property_rbac.sql',
  'utf8',
);
const inviteDialog = readFileSync('src/components/people/InviteUserDialog.tsx', 'utf8');
const accessDialog = readFileSync('src/components/settings/UserPropertyAccessDialog.tsx', 'utf8');
const peopleHooks = readFileSync('src/hooks/usePeople.ts', 'utf8');

describe('enterprise property-scoped RBAC', () => {
  it('defines the complete module/action permission matrix', () => {
    const moduleRows = migration.match(/^\s*\('[a-z_]+',\s*'[^']+',/gm) ?? [];
    expect(moduleRows).toHaveLength(27);
    expect(migration).toContain("ARRAY['view','create','edit','delete','approve','assign']");
    expect(migration).toContain('user_property_permission_overrides');
    expect(accessDialog).toContain("const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'assign']");
  });

  it('never treats a property owner or manager as a workspace administrator', () => {
    expect(migration).toMatch(/ur\.role = 'admin'/);
    expect(migration).not.toMatch(/ur\.role IN \('admin','owner'/);
    expect(migration).toMatch(/p_role = 'admin'[\s\S]{0,100}Workspace Administrator is not a property role/);
    expect(migration).toContain("role NOT IN ('admin','user')");
  });

  it('requires an explicit property on every workforce invitation', () => {
    expect(migration).toContain("IF p_property_id IS NULL THEN RAISE EXCEPTION 'A property assignment is required'");
    expect(migration).toContain("IF p_role = 'admin' THEN RAISE EXCEPTION");
    expect(inviteDialog).toContain("property_id: z.string().uuid('Select the property this person may access')");
    expect(inviteDialog).not.toContain('All properties');
  });

  it('routes property assignments through the authorized RPC without adding a global role', () => {
    const assignmentHook = peopleHooks.slice(
      peopleHooks.indexOf('export function useAddPropertyAssignment'),
      peopleHooks.indexOf('export function useArchivePropertyAssignment'),
    );
    expect(assignmentHook).toContain("rpc('set_property_user_access'");
    expect(assignmentHook).not.toContain("from('user_roles')");
  });

  it('enforces property and project scope with restrictive database policies', () => {
    expect(migration).toContain('CREATE POLICY enterprise_property_scope ON public.properties AS RESTRICTIVE');
    expect(migration).toContain('CREATE POLICY enterprise_project_scope ON public.projects AS RESTRICTIVE');
    expect(migration).toContain('CREATE POLICY enterprise_record_scope ON public.%I AS RESTRICTIVE');
    expect(migration).toContain('public.can_access_property(auth.uid(), property_id)');
    expect(migration).toContain('public.can_access_project(auth.uid(), project_id)');
    expect(migration).toContain("public.effective_property_permission(auth.uid(), property_id");
    expect(migration).toContain("public.effective_project_permission(auth.uid(), project_id");
  });

  it('defaults unscoped operational records to workspace administrators only', () => {
    expect(migration).toContain('(property_id IS NOT NULL OR project_id IS NOT NULL)');
    expect(migration).toContain('(property_id IS NOT NULL AND public.can_access_property');
    expect(migration).toContain('(project_id IS NOT NULL AND public.can_access_project');
  });
});
