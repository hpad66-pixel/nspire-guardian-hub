import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useProjectTeam', () => ({
  useProjectTeamMembers: () => ({ data: [], isLoading: false }),
  useAddProjectTeamMember: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveProjectTeamMember: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateProjectTeamMemberRole: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useUserManagement', () => ({ useUsers: () => ({ data: [], isLoading: false }) }));
vi.mock('@/hooks/useInvitations', () => ({
  useCreateInvitation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSendInvitation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useProjectPeople', () => ({
  useProjectContacts: () => ({
    data: [{
      entryId: 'entry-1', contactId: 'contact-1', name: 'Sina Malek, P.E',
      email: 'sina@example.com', phone: '+17863250938', companyName: 'ASM Consulting Engineers',
      jobTitle: 'President', roleLabel: 'Project Consultant', isKeyContact: true, hasPortalAccess: false,
    }],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useProjectDirectory', () => ({ useProjectDirectory: () => ({ remove: { mutate: vi.fn() } }) }));
vi.mock('@/components/directory/AddPersonDialog', () => ({ AddPersonDialog: () => null }));
vi.mock('@/components/projects/correspondence/CorrespondenceComposer', () => ({ CorrespondenceComposer: () => null }));
vi.mock('@/components/projects/correspondence/ProjectSmsComposer', () => ({ ProjectSmsComposer: () => null }));

import { ProjectTeamSheet } from '../ProjectTeamSheet';

describe('ProjectTeamSheet', () => {
  it('shows external CRM contacts separately without granting portal access', () => {
    render(<ProjectTeamSheet open onOpenChange={() => {}} projectId="project-1" projectName="Stucco Repairs" />);
    expect(screen.getByText('People & Team')).toBeInTheDocument();
    expect(screen.getByText('Sina Malek, P.E')).toBeInTheDocument();
    expect(screen.getByText('No portal access')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Text' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Attach contact' })).toBeInTheDocument();
  });
});
