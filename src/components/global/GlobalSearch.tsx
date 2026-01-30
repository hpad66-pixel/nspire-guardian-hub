import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useProjects } from '@/hooks/useProjects';
import { useIssues } from '@/hooks/useIssues';

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
  
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search properties, projects, issues..."
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
      </CommandList>
    </CommandDialog>
  );
}
