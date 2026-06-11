import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Building2,
  FolderKanban,
  AlertTriangle,
  Wrench,
  ClipboardCheck,
  Settings,
  FileText,
  Users,
  BarChart3,
  Home,
  HelpCircle,
  Package,
  Contact,
} from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useProjects } from '@/hooks/useProjects';
import { useIssues } from '@/hooks/useIssues';
import { useCRMContacts } from '@/hooks/useCRMContacts';
import { useOrganizationDocuments } from '@/hooks/useDocuments';
import { matchesQuery, rfiRoute, submittalRoute, contactsRoute, documentsRoute } from '@/lib/global-search';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const { data: properties } = useProperties();
  const { data: projects } = useProjects();
  const { data: issues } = useIssues();
  const { data: contacts } = useCRMContacts();
  const { data: documents } = useOrganizationDocuments();

  // Org-wide RFIs / submittals (RLS scopes to the tenant). Loaded only
  // while the palette is open and the user has typed something.
  const { data: rfis } = useQuery({
    queryKey: ['global-search', 'rfis'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_rfis')
        .select('id, rfi_number, subject, project_id')
        .order('rfi_number', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
  const { data: submittals } = useQuery({
    queryKey: ['global-search', 'submittals'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_submittals')
        .select('id, submittal_number, title, project_id')
        .order('submittal_number', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setSearch('');
  };
  
  // Filter results based on search
  const filteredProperties = properties?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);
  
  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);
  
  const filteredIssues = issues?.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  const filteredRfis = rfis?.filter(r =>
    matchesQuery([r.subject, `rfi-${r.rfi_number}`], search)
  ).slice(0, 5);

  const filteredSubmittals = submittals?.filter(s =>
    matchesQuery([s.title, `sub-${s.submittal_number}`], search)
  ).slice(0, 5);

  const filteredContacts = contacts?.filter(c =>
    matchesQuery([`${c.first_name} ${c.last_name ?? ''}`, c.company_name], search)
  ).slice(0, 5);

  const filteredDocuments = documents?.filter(d =>
    matchesQuery([d.name], search)
  ).slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search properties, projects, RFIs, submittals, contacts, documents..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Quick Navigation */}
        <CommandGroup heading="Quick Navigation">
          <CommandItem onSelect={() => handleSelect('/')}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/properties')}>
            <Building2 className="mr-2 h-4 w-4" />
            Properties
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/projects')}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/issues')}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Issues
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/work-orders')}>
            <Wrench className="mr-2 h-4 w-4" />
            Work Orders
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/inspections')}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Inspections
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/documents')}>
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/reports')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        
        {/* Properties */}
        {filteredProperties && filteredProperties.length > 0 && search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Properties">
              {filteredProperties.map((property) => (
                <CommandItem
                  key={property.id}
                  onSelect={() => handleSelect('/properties')}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <div>
                    <p>{property.name}</p>
                    <p className="text-xs text-muted-foreground">{property.address}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        
        {/* Projects */}
        {filteredProjects && filteredProjects.length > 0 && search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {filteredProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => handleSelect(`/projects/${project.id}`)}
                >
                  <FolderKanban className="mr-2 h-4 w-4" />
                  <div>
                    <p>{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.property?.name}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        
        {/* Issues */}
        {filteredIssues && filteredIssues.length > 0 && search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Issues">
              {filteredIssues.map((issue) => (
                <CommandItem
                  key={issue.id}
                  onSelect={() => handleSelect('/issues')}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <div>
                    <p>{issue.title}</p>
                    <p className="text-xs text-muted-foreground">{issue.property?.name}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* RFIs */}
        {filteredRfis && filteredRfis.length > 0 && search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="RFIs">
              {filteredRfis.map((rfi) => (
                <CommandItem
                  key={rfi.id}
                  onSelect={() => handleSelect(rfiRoute(rfi.project_id))}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <div>
                    <p>RFI-{String(rfi.rfi_number).padStart(3, '0')}</p>
                    <p className="text-xs text-muted-foreground">{rfi.subject}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Submittals */}
        {filteredSubmittals && filteredSubmittals.length > 0 && search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Submittals">
              {filteredSubmittals.map((sub) => (
                <CommandItem
                  key={sub.id}
                  onSelect={() => handleSelect(submittalRoute(sub.project_id))}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <div>
                    <p>SUB-{String(sub.submittal_number).padStart(3, '0')}</p>
                    <p className="text-xs text-muted-foreground">{sub.title}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Contacts */}
        {filteredContacts && filteredContacts.length > 0 && search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Contacts">
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  onSelect={() => handleSelect(contactsRoute)}
                >
                  <Contact className="mr-2 h-4 w-4" />
                  <div>
                    <p>{contact.first_name} {contact.last_name}</p>
                    <p className="text-xs text-muted-foreground">{contact.company_name}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Documents */}
        {filteredDocuments && filteredDocuments.length > 0 && search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
              {filteredDocuments.map((doc) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() => handleSelect(documentsRoute)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div>
                    <p>{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.folder}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
