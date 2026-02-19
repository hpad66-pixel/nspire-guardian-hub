import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalBySlug, usePortalSession } from '@/hooks/usePortal';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useAllCredentials } from '@/hooks/useCredentials';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

type PortalTab = 'home' | 'credentials' | 'training' | 'safety' | 'equipment';

function ComplianceDot({ expiry }: { expiry?: string | null }) {
  if (!expiry) return null;
  const days = differenceInDays(new Date(expiry), new Date());
  const color = days < 0 ? 'bg-red-500' : days <= 60 ? 'bg-amber-400' : 'bg-green-500';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} flex-shrink-0`} />;
}

export default function PortalHomePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: portal, isLoading } = usePortalBySlug(slug);
  const { session, isAuthenticated } = usePortalSession();
  const [activeTab, setActiveTab] = useState<PortalTab>('home');

  const { data: credentials = [] } = useAllCredentials();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAuthenticated || !portal) {
    return <Navigate to={`/portal/${slug}`} replace />;
  }

  const accent = portal.brand_accent_color ?? '#0F172A';

  const MODULE_ICONS: Record<string, string> = {
    credentials: '🏆',
    training: '🎓',
    safety: '⚠️',
    equipment: '🚛',
  };

  return (
    <PortalLayout portal={portal} activeTab={activeTab} onTabChange={tab => setActiveTab(tab as PortalTab)}>
      {/* HOME TAB */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Welcome card */}
          {portal.welcome_message && (
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm" style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
              <p className="text-sm text-foreground leading-relaxed">{portal.welcome_message}</p>
            </div>
          )}

          {/* Module summary cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {portal.shared_modules.map(m => (
              <button
                key={m}
                onClick={() => setActiveTab(m as PortalTab)}
                className="bg-white rounded-2xl border border-border p-5 text-left shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{MODULE_ICONS[m] ?? '📋'}</span>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <p className="font-semibold text-sm text-foreground capitalize">{m}</p>
                <p className="text-xs text-muted-foreground mt-1">Tap to view</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CREDENTIALS TAB */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Credentials & Licenses</h2>
            <span className="text-xs text-muted-foreground">{credentials.length} records</span>
          </div>
          {credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No credentials shared yet.</p>
          ) : (
            <div className="space-y-2">
              {credentials.map(c => {
                const days = c.expiry_date ? differenceInDays(new Date(c.expiry_date), new Date()) : null;
                const statusLabel = days === null ? 'No expiry' : days < 0 ? 'Expired' : days <= 60 ? 'Expiring soon' : 'Current';
                const statusColor = days === null ? 'text-muted-foreground' : days < 0 ? 'text-red-600' : days <= 60 ? 'text-amber-600' : 'text-green-600';
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-border p-4 flex items-start justify-between gap-3 shadow-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{c.credential_type}{c.custom_type_label ? ` (${c.custom_type_label})` : ''}</p>
                      {c.issuing_authority && <p className="text-xs text-muted-foreground">{c.issuing_authority}</p>}
                      <p className={`text-xs font-medium mt-1 ${statusColor}`}>{statusLabel}{c.expiry_date ? ` · ${new Date(c.expiry_date).toLocaleDateString()}` : ''}</p>
                    </div>
                    <ComplianceDot expiry={c.expiry_date} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OTHER TABS — placeholder */}
      {(activeTab === 'training' || activeTab === 'safety' || activeTab === 'equipment') && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-2xl mb-2">{MODULE_ICONS[activeTab]}</p>
          <p className="text-sm font-medium capitalize">{activeTab} records</p>
          <p className="text-xs mt-1">Records will appear here once shared.</p>
        </div>
      )}
    </PortalLayout>
  );
}
