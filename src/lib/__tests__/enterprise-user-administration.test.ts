import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260828150000_enterprise_user_administration.sql',
  'utf8',
);
const invitationSender = readFileSync('supabase/functions/send-invitation/index.ts', 'utf8');
const userManager = readFileSync('supabase/functions/manage-workspace-user/index.ts', 'utf8');
const propertyRbac = readFileSync(
  'supabase/migrations/20260829023000_enterprise_property_rbac.sql',
  'utf8',
);
const invitationAcceptor = readFileSync(
  'supabase/functions/accept-workspace-invitation/index.ts',
  'utf8',
);
const acceptPage = readFileSync('src/pages/auth/AcceptInvitePage.tsx', 'utf8');
const authPage = readFileSync('src/pages/auth/AuthPage.tsx', 'utf8');
const userHooks = readFileSync('src/hooks/useUserManagement.ts', 'utf8');

describe('enterprise workspace user administration', () => {
  it('requires a valid single-use invitation before joining an existing workspace', () => {
    expect(migration).toMatch(/invitation_token/);
    expect(migration).toMatch(/lower\(i\.email\) = lower\(NEW\.email\)/);
    expect(migration).toMatch(/i\.accepted_at IS NULL/);
    expect(migration).toMatch(/i\.revoked_at IS NULL/);
    expect(migration).toMatch(/i\.expires_at > now\(\)/);
    expect(migration).toMatch(/valid invitation token is required to join an existing workspace/i);
  });

  it('applies the invitation role only to the selected property', () => {
    expect(propertyRbac).toMatch(/INSERT INTO public\.user_roles \(user_id, role\) VALUES \(NEW\.id, 'user'\)/);
    expect(propertyRbac).toMatch(/INSERT INTO public\.property_team_members[\s\S]{0,220}v_invitation\.role/);
    expect(propertyRbac).not.toMatch(/INSERT INTO public\.user_roles[\s\S]{0,120}v_invitation\.role/);
    expect(invitationAcceptor).toContain('invitation_token: token');
    expect(acceptPage).not.toMatch(/workspace_id:\s*invitation/);
  });

  it('uses the branded single-use invitation as email verification', () => {
    expect(invitationAcceptor).toContain('auth.admin.createUser');
    expect(invitationAcceptor).toContain('email_confirm: true');
    expect(acceptPage).toContain("'accept-workspace-invitation'");
    expect(acceptPage).toContain('signInWithPassword');
    expect(acceptPage).not.toContain('auth.signUp');
    expect(authPage).not.toContain('Create a company workspace');
  });

  it('routes role writes through audited tenant-authorized RPCs', () => {
    expect(userHooks).toContain("rpc('assign_workspace_user_role'");
    expect(userHooks).toContain("rpc('remove_workspace_user_role'");
    expect(userHooks).not.toMatch(/from\('user_roles'\)[\s\S]{0,100}\.insert/);
    expect(migration).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.user_roles FROM authenticated/);
    expect(migration).toContain("'role.assigned'");
    expect(migration).toContain("'role.removed'");
  });

  it('authenticates invitation email delivery and status changes inside edge functions', () => {
    for (const source of [invitationSender, userManager]) {
      expect(source).toMatch(/auth\.getUser\(\)/);
      expect(source).toMatch(/Authentication required|Invalid session/);
    }
    expect(invitationSender).toContain('can_invite_workspace_role');
    expect(userManager).toContain('can_administer_workspace_user');
  });

  it('normalizes the configured app origin before building invitation links', () => {
    expect(invitationSender).toMatch(/APP_ORIGIN[\s\S]{0,120}\.trim\(\)\.replace\(\/\\\/\+\$\//);
    expect(invitationSender).toContain('/accept-invite/');
  });

  it('removes tenant resolution for deactivated workforce profiles', () => {
    expect(migration).toMatch(/COALESCE\(p\.status, 'active'\) <> 'active'/);
    expect(migration).toContain('protect_own_enterprise_profile_fields');
    expect(migration).toMatch(/NEW\.status IS DISTINCT FROM OLD\.status/);
    expect(userManager).toContain('ban_duration');
    expect(userManager).toContain('enterprise_user_audit_log');
  });
});
