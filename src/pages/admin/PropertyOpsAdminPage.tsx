/**
 * Admin — activate Property Ops on a managed property and invite external staff.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ExternalLink, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InviteOpsDialog } from '@/components/portal/InviteOpsDialog';
import { useOpsEnabledProperties } from '@/hooks/useOpsPortal';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PropertyOpsAdminPage() {
  const qc = useQueryClient();
  const { data: enabled = [], isLoading } = useOpsEnabledProperties();
  const [inviteProperty, setInviteProperty] = useState<{ id: string; name: string } | null>(null);

  const { data: allManaged = [] } = useQuery({
    queryKey: ['managed-properties-ops-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, city, state, ops_portal_enabled, is_managed_property, total_units')
        .eq('is_managed_property', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const enable = useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from('properties')
        .update({
          ops_portal_enabled: true,
          ops_portal_modules: ['maintenance', 'nspire', 'stores', 'voice'],
        } as any)
        .eq('id', propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ops-enabled-properties'] });
      qc.invalidateQueries({ queryKey: ['managed-properties-ops-admin'] });
      toast.success('Property Ops enabled');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6" data-testid="property-ops-admin-page">
      <div>
        <h1 className="font-display text-3xl font-medium text-[#08271f]">Property Ops Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          License Glorieta Gardens (and other managed properties) to external maintenance, PM, and owner users.
          They get a magic-link portal — never construction or consulting modules.
        </p>
      </div>

      <Card className="border-[#dedbd1]">
        <CardHeader>
          <CardTitle className="text-base">Default packages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge>Maintenance</Badge>
          <Badge variant="outline">NSPIRE</Badge>
          <Badge variant="outline">Stores</Badge>
          <Badge variant="outline">Voice</Badge>
          <span className="text-muted-foreground">Tech = Maintenance only · PM/Owner = all four + costs · Owner also gets Executive Dashboard</span>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {allManaged.map((p) => (
            <Card key={p.id} className="border-[#dedbd1]">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08271f] text-[#d5aa52]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#08271f]">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.city, p.state].filter(Boolean).join(', ') || p.address || 'Managed property'}
                      {p.total_units ? ` · ${p.total_units} units` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.ops_portal_enabled ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Ops live</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => enable.mutate(p.id)} disabled={enable.isPending}>
                      Enable Property Ops
                    </Button>
                  )}
                  {p.ops_portal_enabled && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={opsPortalPath(p.id)} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-4 w-4" /> Preview
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="bg-[#08271f] hover:bg-[#08271f]/90"
                    disabled={!p.ops_portal_enabled}
                    onClick={() => setInviteProperty({ id: p.id, name: p.name })}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" /> Invite people
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {allManaged.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No managed properties found. Mark a property as managed, or ensure Glorieta Gardens Apartments exists.
            </div>
          )}
        </div>
      )}

      {enabled.length > 0 && (
        <p className="text-xs text-muted-foreground">{enabled.length} propert{enabled.length === 1 ? 'y' : 'ies'} with Property Ops enabled.</p>
      )}

      {inviteProperty && (
        <InviteOpsDialog
          open={!!inviteProperty}
          onOpenChange={(o) => !o && setInviteProperty(null)}
          propertyId={inviteProperty.id}
          propertyName={inviteProperty.name}
        />
      )}
    </div>
  );
}
