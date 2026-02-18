import { useState, useMemo } from 'react';
import {
  Building2,
  Briefcase,
  Home,
  Shield,
  Globe,
  Plus,
  Search,
  Mail,
  Phone,
  Users,
  FolderKanban,
  ArchiveRestore,
  Pencil,
  Archive,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OrganizationDialog } from '@/components/organizations/OrganizationDialog';
import { OrganizationMembersSheet } from '@/components/organizations/OrganizationMembersSheet';
import { useClientsWithCounts, useArchiveClient, useDeleteClient, type Client, type ClientType } from '@/hooks/useClients';
import { useUserPermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

// ─── Type Config (exported so sheet can use it) ──────────────────────────────
export const CLIENT_TYPE_CONFIG: Record<ClientType, {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  dotClass: string;
}> = {
  internal_org: {
    label: 'Internal Org',
    icon: <Building2 className="h-3 w-3" />,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
  },
  business_client: {
    label: 'Business Client',
    icon: <Briefcase className="h-3 w-3" />,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  property_management: {
    label: 'Property Mgmt',
    icon: <Home className="h-3 w-3" />,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  government: {
    label: 'Government',
    icon: <Shield className="h-3 w-3" />,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  other: {
    label: 'Other',
    icon: <Globe className="h-3 w-3" />,
    badgeClass: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
  },
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, colorClass }: { icon: React.ReactNode; label: string; value: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Organization Card ───────────────────────────────────────────────────────
interface OrgCardProps {
  org: Client;
  onEdit: () => void;
  onViewMembers: () => void;
  onArchive: () => void;
  onDelete: () => void;
  canManage: boolean;
}

function OrganizationCard({ org, onEdit, onViewMembers, onArchive, onDelete, canManage }: OrgCardProps) {
  const typeConfig = CLIENT_TYPE_CONFIG[org.client_type];

  return (
    <Card className={cn('transition-all hover:shadow-md', !org.is_active && 'opacity-60')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: name + type */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border', typeConfig.badgeClass)}>
              {typeConfig.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base leading-tight truncate">{org.name}</h3>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', typeConfig.badgeClass)}>
                  {typeConfig.icon}
                  {typeConfig.label}
                </span>
                {!org.is_active && (
                  <Badge variant="secondary" className="text-xs">Archived</Badge>
                )}
              </div>
              {org.industry && (
                <p className="text-xs text-muted-foreground mt-0.5">{org.industry}</p>
              )}
            </div>
          </div>

          {/* Right: actions */}
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onArchive}
                title={org.is_active ? 'Archive' : 'Restore'}
              >
                {org.is_active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Contact info row */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          {org.contact_email && (
            <a href={`mailto:${org.contact_email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3 w-3 shrink-0" />
              {org.contact_email}
            </a>
          )}
          {org.contact_phone && (
            <a href={`tel:${org.contact_phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-3 w-3 shrink-0" />
              {org.contact_phone}
            </a>
          )}
          {(org.city || org.state) && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3 shrink-0" />
              {[org.city, org.state].filter(Boolean).join(', ')}
            </span>
          )}
        </div>

        {/* Stats + View Members */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <div className="flex gap-5">
            <button
              onClick={onViewMembers}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">{org.member_count ?? 0}</span>
              <span>member{(org.member_count ?? 0) !== 1 ? 's' : ''}</span>
            </button>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              <span className="font-medium">{org.project_count ?? 0}</span>
              <span>project{(org.project_count ?? 0) !== 1 ? 's' : ''}</span>
            </span>
          </div>
          {(org.member_count ?? 0) > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onViewMembers}>
              View Members
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
  const { data: organizations, isLoading } = useClientsWithCounts();
  const archiveClient = useArchiveClient();
  const deleteClient = useDeleteClient();
  const { currentRole } = useUserPermissions();
  const canManage = ['admin', 'owner', 'manager'].includes(currentRole ?? '');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Client | null>(null);
  const [membersOrg, setMembersOrg] = useState<Client | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    if (!organizations) return [];
    return organizations.filter((org) => {
      const matchesSearch =
        !search ||
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        org.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
        org.industry?.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || org.client_type === typeFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && org.is_active) ||
        (statusFilter === 'archived' && !org.is_active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [organizations, search, typeFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!organizations) return { internal: 0, business: 0, property: 0, government: 0, members: 0 };
    const active = organizations.filter(o => o.is_active);
    return {
      internal: active.filter(o => o.client_type === 'internal_org').length,
      business: active.filter(o => o.client_type === 'business_client').length,
      property: active.filter(o => o.client_type === 'property_management').length,
      government: active.filter(o => o.client_type === 'government').length,
      members: active.reduce((sum, o) => sum + (o.member_count ?? 0), 0),
    };
  }, [organizations]);

  const handleEdit = (org: Client) => {
    setEditOrg(org);
    setDialogOpen(true);
  };

  const handleViewMembers = (org: Client) => {
    setMembersOrg(org);
    setMembersOpen(true);
  };

  const handleArchive = async (org: Client) => {
    await archiveClient.mutateAsync({ id: org.id, archive: org.is_active });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteClient.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations & Clients</h1>
          </div>
          <p className="text-muted-foreground">
            Manage companies, clients, and organizations. Link them to projects and team members.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => { setEditOrg(null); setDialogOpen(true); }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard
          icon={<Building2 className="h-5 w-5 text-primary" />}
          label="Internal Orgs"
          value={stats.internal}
          colorClass="bg-primary/10"
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-primary" />}
          label="Business Clients"
          value={stats.business}
          colorClass="bg-primary/10"
        />
        <StatCard
          icon={<Home className="h-5 w-5 text-primary" />}
          label="Property Mgmt"
          value={stats.property}
          colorClass="bg-primary/10"
        />
        <StatCard
          icon={<Shield className="h-5 w-5 text-primary" />}
          label="Government"
          value={stats.government}
          colorClass="bg-primary/10"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          label="Linked Members"
          value={stats.members}
          colorClass="bg-muted"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ClientType | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="internal_org">Internal Organization</SelectItem>
            <SelectItem value="business_client">Business Client</SelectItem>
            <SelectItem value="property_management">Property Management</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'active' | 'archived' | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Organization List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">
            {organizations?.length === 0
              ? 'No organizations yet'
              : 'No organizations match your filters'}
          </p>
          {organizations?.length === 0 && canManage && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => { setEditOrg(null); setDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first organization
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((org) => (
            <OrganizationCard
              key={org.id}
              org={org}
              canManage={canManage}
              onEdit={() => handleEdit(org)}
              onViewMembers={() => handleViewMembers(org)}
              onArchive={() => handleArchive(org)}
              onDelete={() => setDeleteTarget(org)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <OrganizationDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditOrg(null); }}
        organization={editOrg}
      />

      <OrganizationMembersSheet
        open={membersOpen}
        onOpenChange={setMembersOpen}
        organization={membersOrg}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization. Any projects or users linked to it will
              lose their association. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
