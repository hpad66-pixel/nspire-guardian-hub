import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const fixture = await import('@/test/fixtures/supabase');
  return { supabase: fixture.supabase, __mock: fixture.__mock };
});

import { __mock } from '@/test/fixtures/supabase';
import { renderHookWithClient } from '@/test/utils';
import { useAddProjectTeamMember, useProjectMentionCandidates } from '@/hooks/useProjectTeam';
import { useUpsertClientTeamMember } from '@/hooks/useClients';
import { useCreateDiscussion } from '@/hooks/useProjectDiscussions';

describe('scoped teams and discussion mentions', () => {
  beforeEach(() => __mock.reset());

  it('assigns an existing account user to a project through the guarded RPC', async () => {
    __mock.rpc.mockResolvedValueOnce({ data: 'membership-1', error: null });
    const { result } = renderHookWithClient(() => useAddProjectTeamMember());

    await result.current.mutateAsync({ projectId: 'project-1', userId: 'user-2', role: 'project_manager' });

    expect(__mock.rpc).toHaveBeenCalledWith('upsert_project_team_member', {
      p_project_id: 'project-1',
      p_user_id: 'user-2',
      p_role: 'project_manager',
    });
  });

  it('assigns an existing account user to a client through the guarded RPC', async () => {
    __mock.rpc.mockResolvedValueOnce({ data: 'membership-2', error: null });
    const { result } = renderHookWithClient(() => useUpsertClientTeamMember());

    await result.current.mutateAsync({ clientId: 'client-1', userId: 'user-2', role: 'manager' });

    expect(__mock.rpc).toHaveBeenCalledWith('upsert_client_team_member', {
      p_client_id: 'client-1',
      p_user_id: 'user-2',
      p_role: 'manager',
    });
  });

  it('loads only the project-scoped mention directory', async () => {
    __mock.rpc.mockResolvedValueOnce({
      data: [{ user_id: 'user-2', full_name: 'Project Teammate', access_source: 'Project team' }],
      error: null,
    });
    const { result } = renderHookWithClient(() => useProjectMentionCandidates('project-1', 'Project'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].access_source).toBe('Project team');
    expect(__mock.rpc).toHaveBeenCalledWith('get_project_mention_candidates', {
      p_project_id: 'project-1',
      p_search: 'Project',
      p_limit: 30,
    });
  });

  it('creates the discussion, tags, and notification through one transaction', async () => {
    __mock.rpc.mockResolvedValueOnce({ data: { id: 'discussion-1' }, error: null });
    const { result } = renderHookWithClient(() => useCreateDiscussion());

    await result.current.mutateAsync({
      projectId: 'project-1',
      title: 'Weekly coordination',
      content: '@Project Teammate please review.',
      mentionedUserIds: ['user-2', 'user-2'],
    });

    expect(__mock.rpc).toHaveBeenCalledWith('create_project_discussion_with_mentions', {
      p_project_id: 'project-1',
      p_title: 'Weekly coordination',
      p_content: '@Project Teammate please review.',
      p_attachments: [],
      p_mentioned_user_ids: ['user-2'],
    });
  });
});
