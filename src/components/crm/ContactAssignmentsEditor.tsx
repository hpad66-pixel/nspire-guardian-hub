import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, FolderKanban, Search } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useProperties } from "@/hooks/useProperties";

interface NamedItem {
  id: string;
  name: string;
  subtitle?: string | null;
}

function AssignmentChecklist({
  title,
  icon: Icon,
  items,
  selectedIds,
  onChange,
  emptyLabel,
  searchPlaceholder,
}: {
  title: string;
  icon: React.ElementType;
  items: NamedItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyLabel: string;
  searchPlaceholder: string;
}) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.subtitle ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const toggle = (id: string) => {
    if (selected.has(id)) {
      onChange(selectedIds.filter((existing) => existing !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <Icon className="h-4 w-4" />
          {title}
        </Label>
        <Badge variant="secondary" className="text-[10px]">
          {selectedIds.length} attached
        </Badge>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 pl-8 text-sm"
        />
      </div>
      <ScrollArea className="h-40 rounded-md border bg-muted/20">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {filtered.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <Checkbox
                  checked={selected.has(item.id)}
                  onCheckedChange={() => toggle(item.id)}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{item.name}</span>
                  {item.subtitle && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ContactAssignmentsEditorProps {
  selectedProjectIds: string[];
  selectedPropertyIds: string[];
  onProjectIdsChange: (ids: string[]) => void;
  onPropertyIdsChange: (ids: string[]) => void;
}

export function ContactAssignmentsEditor({
  selectedProjectIds,
  selectedPropertyIds,
  onProjectIdsChange,
  onPropertyIdsChange,
}: ContactAssignmentsEditorProps) {
  const { data: projects = [] } = useProjects();
  const { data: properties = [] } = useProperties();

  const projectItems = useMemo<NamedItem[]>(
    () =>
      [...projects]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((project) => ({
          id: project.id,
          name: project.name,
          subtitle: project.property?.name ?? null,
        })),
    [projects],
  );

  const propertyItems = useMemo<NamedItem[]>(
    () =>
      [...properties]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((property) => ({
          id: property.id,
          name: property.name,
          subtitle: [property.city, property.state].filter(Boolean).join(", ") || null,
        })),
    [properties],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AssignmentChecklist
        title="Projects"
        icon={FolderKanban}
        items={projectItems}
        selectedIds={selectedProjectIds}
        onChange={onProjectIdsChange}
        emptyLabel="No projects match that search."
        searchPlaceholder="Search all projects..."
      />
      <AssignmentChecklist
        title="Properties"
        icon={Building2}
        items={propertyItems}
        selectedIds={selectedPropertyIds}
        onChange={onPropertyIdsChange}
        emptyLabel="No properties match that search."
        searchPlaceholder="Search all properties..."
      />
    </div>
  );
}

export function ContactAssignmentBadges({
  projectNames,
  propertyNames,
}: {
  projectNames: string[];
  propertyNames: string[];
}) {
  if (projectNames.length === 0 && propertyNames.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Not attached to a project or property yet
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {projectNames.map((name) => (
        <Badge key={`p-${name}`} variant="secondary" className="max-w-[140px] truncate text-[10px] px-1.5 py-0">
          <FolderKanban className="mr-0.5 h-2.5 w-2.5 shrink-0" />
          {name}
        </Badge>
      ))}
      {propertyNames.map((name) => (
        <Badge key={`r-${name}`} variant="outline" className="max-w-[140px] truncate text-[10px] px-1.5 py-0">
          <Building2 className="mr-0.5 h-2.5 w-2.5 shrink-0" />
          {name}
        </Badge>
      ))}
    </div>
  );
}
