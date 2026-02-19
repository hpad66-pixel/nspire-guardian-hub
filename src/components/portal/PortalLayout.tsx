import { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { clearPortalSession, ClientPortal } from '@/hooks/usePortal';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface PortalLayoutProps {
  portal: ClientPortal;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

const TAB_LABELS: Record<string, string> = {
  home: 'Home',
  credentials: 'Credentials',
  training: 'Training',
  safety: 'Safety',
  equipment: 'Equipment',
};

export function PortalLayout({ portal, activeTab, onTabChange, children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const accent = portal.brand_accent_color ?? '#0F172A';

  function handleSignOut() {
    clearPortalSession();
    navigate(`/portal/${portal.portal_slug}`);
  }

  const tabs = ['home', ...portal.shared_modules.filter(m =>
    ['credentials', 'training', 'safety', 'equipment'].includes(m)
  )];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {portal.brand_logo_url ? (
              <img src={portal.brand_logo_url} alt="logo" className="h-8 object-contain" />
            ) : (
              <div
                className="h-8 w-8 rounded flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {(portal.client_name ?? portal.name).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* Nav tabs */}
        <div className="max-w-4xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === tab
                    ? 'border-current text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                style={activeTab === tab ? { borderColor: accent, color: accent } : undefined}
              >
                {TAB_LABELS[tab] ?? tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">Powered by APAS OS · apasos.ai</p>
      </footer>
    </div>
  );
}
