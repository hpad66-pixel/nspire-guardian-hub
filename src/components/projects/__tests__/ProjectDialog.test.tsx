import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: () => ({ data: [] }),
}));

vi.mock('@/hooks/useClients', () => ({
  useActiveClients: () => ({ data: [] }),
  useCreateClient: () => ({ mutateAsync: mocks.createClient, isPending: false }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateProject: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

vi.mock('@/components/ui/voice-dictation-textarea-ai', () => ({
  VoiceDictationTextareaWithAI: ({ value, onValueChange, ...props }: any) => (
    <textarea value={value} onChange={(event) => onValueChange(event.target.value)} {...props} />
  ),
}));

import { ProjectDialog } from '../ProjectDialog';

describe('ProjectDialog client-scoped creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ id: 'project-new', name: 'Roof Replacement' });
  });

  it('locks a new construction project to the selected client', async () => {
    const onOpenChange = vi.fn();
    const onCreated = vi.fn();

    render(
      <ProjectDialog
        open
        onOpenChange={onOpenChange}
        clientContext={{ id: 'client-r4', name: 'R4 Capital' }}
        onCreated={onCreated}
      />,
    );

    expect(screen.getByText('Create a project for R4 Capital')).toBeTruthy();
    expect(screen.getByText('Locked')).toBeTruthy();
    expect(screen.queryByText('Select client (required)')).toBeNull();

    fireEvent.change(screen.getByLabelText('Project Name *'), {
      target: { value: 'Roof Replacement' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Roof Replacement',
      project_type: 'construction',
      client_id: 'client-r4',
      property_id: null,
    }));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'project-new' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('can create a consulting engagement without changing the client', async () => {
    render(
      <ProjectDialog
        open
        onOpenChange={vi.fn()}
        clientContext={{ id: 'client-larkin', name: 'Larkin Hospital' }}
      />,
    );

    const consultingTab = screen.getByRole('tab', { name: 'Consulting' });
    fireEvent.mouseDown(consultingTab, { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText('Project Name *'), {
      target: { value: 'MRI Consulting' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'MRI Consulting',
      project_type: 'consulting',
      client_id: 'client-larkin',
      property_id: null,
    }));
  });
});
