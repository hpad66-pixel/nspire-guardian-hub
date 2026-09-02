import { Link } from 'react-router-dom';
import { Copy, Droplets, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWaterIntelAdmin } from '@/hooks/useWaterIntelligence';
import { toast } from 'sonner';

function magicUrl(token: string | null | undefined) {
  if (!token) return '';
  return `${window.location.origin}/water/${token}`;
}

export default function WaterIntelAdminPage() {
  const { data = [], isLoading, setEnabled, rotate } = useWaterIntelAdmin();

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6" data-testid="water-intel-admin">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">Client module</div>
        <h1 className="font-display text-4xl text-[#08271f]">Water Intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#5c6863]">
          Turn the executive water brief on or off per client. Each enabled property gets a magic link you can send to the owner or keep as the consultant desk.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {data.map((p: any) => {
            const link = magicUrl(p.water_intel_token);
            return (
              <div key={p.id} className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08271f] text-[#d5aa52]">
                      <Droplets className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#08271f]">{p.name}</div>
                      <div className="text-xs text-[#8a8478]">
                        {[p.city, p.state].filter(Boolean).join(', ') || 'Property'}
                        {p.is_managed_property ? ' · managed' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.water_intel_enabled ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">On</Badge>
                    ) : (
                      <Badge variant="outline">Off</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setEnabled.isPending}
                      onClick={() => setEnabled.mutate({ propertyId: p.id, enabled: !p.water_intel_enabled })}
                    >
                      {p.water_intel_enabled ? 'Turn off' : 'Turn on'}
                    </Button>
                    {p.water_intel_enabled && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/water-intel/${p.id}`}>
                          <ExternalLink className="mr-1.5 h-4 w-4" /> Open desk
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                {p.water_intel_enabled && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[#F7F4EC] px-3 py-2">
                    <code className="flex-1 truncate text-xs text-[#3d4a45]">{link || 'Issuing magic link…'}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!link}
                      onClick={() => {
                        void navigator.clipboard.writeText(link);
                        toast.success('Magic link copied');
                      }}
                    >
                      <Copy className="mr-1.5 h-4 w-4" /> Copy
                    </Button>
                    <Button size="sm" variant="ghost" disabled={rotate.isPending} onClick={() => rotate.mutate(p.id)}>
                      <RefreshCw className="mr-1.5 h-4 w-4" /> Rotate
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
