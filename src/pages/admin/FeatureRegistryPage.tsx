import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Layers, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Lifecycle, Visibility, FeatureKind } from '@/registry/seed';

interface RegistryRow {
  id: string;
  slug: string;
  kind: FeatureKind;
  display_name: string;
  module: string;
  path: string | null;
  lifecycle: Lifecycle;
  visibility: Visibility;
  owner: string | null;
  description: string | null;
  opa_locka_in_use: boolean;
  last_verified_at: string | null;
  updated_at: string;
}

const LIFECYCLE_COLOR: Record<Lifecycle, string> = {
  LIVE: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  PREVIEW: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  LAB: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  ARCHIVED: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
  DEPRECATED: 'bg-red-500/15 text-red-600 border-red-500/30',
};

const LIFECYCLES: (Lifecycle | 'ALL')[] = ['ALL', 'LIVE', 'PREVIEW', 'LAB', 'ARCHIVED', 'DEPRECATED'];
const KIND_LABEL: Record<FeatureKind, string> = {
  module: 'Module',
  route: 'Route',
  page: 'Page',
  edge_function: 'Edge Fn',
  integration: 'Integration',
  experiment: 'Experiment',
};

const STALE_DAYS = 90;

function isStale(last_verified_at: string | null): boolean {
  if (!last_verified_at) return true;
  const ms = Date.now() - new Date(last_verified_at).getTime();
  return ms > STALE_DAYS * 24 * 60 * 60 * 1000;
}

function useRegistryRows() {
  return useQuery({
    queryKey: ['feature-registry', 'admin-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_registry' as never)
        .select(
          'id, slug, kind, display_name, module, path, lifecycle, visibility, owner, description, opa_locka_in_use, last_verified_at, updated_at',
        )
        .order('module')
        .order('slug');

      if (error) throw error;
      return (data ?? []) as RegistryRow[];
    },
  });
}

export default function FeatureRegistryPage() {
  const { data: role, isLoading: roleLoading } = useCurrentUserRole();
  const { data: rows, isLoading, error } = useRegistryRows();

  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<Lifecycle | 'ALL'>('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');

  const modules = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows ?? []) set.add(r.module);
    return ['ALL', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (lifecycleFilter !== 'ALL' && r.lifecycle !== lifecycleFilter) return false;
      if (moduleFilter !== 'ALL' && r.module !== moduleFilter) return false;
      if (q) {
        const hay = `${r.slug} ${r.display_name} ${r.path ?? ''} ${r.module}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, lifecycleFilter, moduleFilter]);

  const counts = useMemo(() => {
    const c: Record<Lifecycle, number> = {
      LIVE: 0,
      PREVIEW: 0,
      LAB: 0,
      ARCHIVED: 0,
      DEPRECATED: 0,
    };
    let verified90d = 0;
    for (const r of rows ?? []) {
      c[r.lifecycle]++;
      if (!isStale(r.last_verified_at)) verified90d++;
    }
    const total = (rows ?? []).length;
    const pctVerified = total === 0 ? 0 : Math.round((verified90d / total) * 100);
    return { ...c, total, pctVerified };
  }, [rows]);

  if (roleLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Admin only
            </CardTitle>
            <CardDescription>
              The Feature Registry is restricted to APAS admin users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Registry</h1>
        </div>
        <p className="text-muted-foreground">
          Single source of truth for every route, page, and edge function. Phase 1 skeleton — lifecycle
          transitions land in Phase 4.
        </p>
      </div>

      {/* Counts */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(['LIVE', 'PREVIEW', 'LAB', 'ARCHIVED', 'DEPRECATED'] as Lifecycle[]).map((state) => (
          <Card key={state}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{state}</p>
              <p className="text-3xl font-bold leading-tight mt-1">{counts[state]}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verified ≤ 90d
            </p>
            <p className="text-3xl font-bold leading-tight mt-1">
              {counts.pctVerified}
              <span className="text-lg text-muted-foreground">%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Registry entries</CardTitle>
              <CardDescription>
                {filtered.length} of {counts.total} entries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search slug, name, path…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={lifecycleFilter}
              onValueChange={(v) => setLifecycleFilter(v as Lifecycle | 'ALL')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Lifecycle" />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l === 'ALL' ? 'All lifecycles' : l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === 'ALL' ? 'All modules' : m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-destructive">
                      Failed to load registry: {(error as Error).message}
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No features match these filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const stale = isStale(r.last_verified_at);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-mono text-xs">{r.slug}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {r.display_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.module}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {KIND_LABEL[r.kind] ?? r.kind}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={LIFECYCLE_COLOR[r.lifecycle]}>
                            {r.lifecycle}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.path ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.owner ?? '—'}
                        </TableCell>
                        <TableCell>
                          {r.last_verified_at ? (
                            <span
                              className={
                                stale
                                  ? 'text-xs text-amber-600 dark:text-amber-500'
                                  : 'text-xs text-muted-foreground'
                              }
                              title={format(new Date(r.last_verified_at), 'PPp')}
                            >
                              {formatDistanceToNow(new Date(r.last_verified_at), { addSuffix: true })}
                              {stale ? ' · stale' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-500">never · stale</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
