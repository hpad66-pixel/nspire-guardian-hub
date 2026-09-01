/**
 * useMyDay — splits open action items into mine / waiting / focus / project counts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const m = await import('@/test/fixtures/supabase');
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));

import { useMyDay, useCompleteActionItemById } from '../useMyDay';
import { renderHookWithClient } from '@/test/utils';
import { __mock, makeBuilder } from '@/test/fixtures/supabase';

describe('useMyDay', () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it('splits mine vs waiting and ranks focus items', async () => {
    const rows = [
      {
        id: '1',
        title: 'Overdue mine',
        status: 'todo',
        priority: 'urgent',
        due_date: '2026-08-01',
        project_id: 'p1',
        assigned_to: 'me',
        created_by: 'me',
        project: { id: 'p1', name: 'Conveyance', project_type: 'construction', status: 'active' },
      },
      {
        id: '2',
        title: 'Waiting on Chris',
        status: 'todo',
        priority: 'high',
        due_date: '2026-09-10',
        project_id: 'p1',
        assigned_to: 'chris',
        created_by: 'me',
        project: { id: 'p1', name: 'Conveyance', project_type: 'construction', status: 'active' },
      },
      {
        id: '3',
        title: 'Someone else',
        status: 'todo',
        priority: 'low',
        due_date: null,
        project_id: 'p2',
        assigned_to: 'other',
        created_by: 'other',
        project: { id: 'p2', name: 'Larkin', project_type: 'consulting', status: 'active' },
      },
    ];

    __mock.from.mockImplementation((table: string) => {
      if (table === 'project_action_items') {
        // First call = open list; second = done-today count (head)
        return makeBuilder({ data: rows, error: null, count: 2 });
      }
      if (table === 'profiles') {
        return makeBuilder({
          data: [{ user_id: 'chris', full_name: 'Chris Solomon', email: 'c@r4.com' }],
          error: null,
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    const { result } = renderHookWithClient(() => useMyDay());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.mine).toHaveLength(1);
    expect(result.current.mine[0].id).toBe('1');
    expect(result.current.waiting).toHaveLength(1);
    expect(result.current.waiting[0].assignee?.full_name).toBe('Chris Solomon');
    expect(result.current.focusItems[0].id).toBe('1');
    expect(result.current.overdue).toBe(1);
    expect(result.current.byProject.get('p1')?.needsYou).toBe(1);
  });

  it('completes an item and invalidates my-day queries', async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);

    const { result } = renderHookWithClient(() => useCompleteActionItemById());
    result.current.mutate('item-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(builder.update).toHaveBeenCalled();
  });
});
