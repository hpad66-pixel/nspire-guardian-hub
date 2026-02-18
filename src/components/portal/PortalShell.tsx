import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { House, Camera, MessageCircle, FileText, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadClientMessageCount } from '@/hooks/useClientCommunication';
import type { CompanyBranding } from '@/hooks/useCompanyBranding';

export type PortalTab = 'home' | 'updates' | 'messages' | 'docs';

interface PortalShellProps {
  children: React.ReactNode;
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  projectId: string;
  branding: CompanyBranding | null;
}

const TABS: { id: PortalTab; label: string; icon: React.ElementType }[] = [
  { id: 'home',     label: 'Home',     icon: House         },
  { id: 'updates',  label: 'Updates',  icon: Camera        },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'docs',     label: 'Docs',     icon: FileText      },
];

export function PortalShell({ children, activeTab, onTabChange, projectId, branding }: PortalShellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: unreadCount = 0 } = useUnreadClientMessageCount(projectId);

  const accentColor = branding?.primary_color ?? 'hsl(217, 91%, 60%)';
  const companyName = branding?.company_name ?? 'Your Contractor';
  const userInitial = user?.email?.charAt(0).toUpperCase() ?? '?';

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/auth');
  }

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: '#0D1117', color: 'white', fontFamily: 'inherit' }}
    >
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[200px] min-h-screen border-r border-white/[0.06] fixed left-0 top-0 bottom-0">
        {/* Company identity */}
        <div className="px-5 pt-6 pb-4 border-b border-white/[0.06]">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={companyName} className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-sm font-semibold text-white">{companyName}</span>
          )}
        </div>

        {/* Tab nav */}
        <nav className="flex-1 px-3 pt-4 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'messages' && unreadCount > 0 ? unreadCount : 0;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative',
                  isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
                style={isActive ? { background: `${accentColor}22`, color: accentColor } : undefined}
              >
                <Icon size={16} />
                {tab.label}
                {badge > 0 && (
                  <span
                    className="ml-auto min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: accentColor }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-xs text-slate-500 truncate mb-2">
            Signed in as<br />
            <span className="text-slate-300">{user?.email}</span>
          </p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 border-b border-white/[0.06]"
        style={{ background: '#0D1117' }}
      >
        {/* Logo / company */}
        <div>
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={companyName} className="h-7 w-auto object-contain" />
          ) : (
            <span className="text-sm font-semibold text-white">{companyName}</span>
          )}
        </div>

        {/* Right: message badge + user avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('messages')}
            className="relative p-1.5"
          >
            <MessageCircle size={20} className="text-slate-400" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: accentColor }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu((s) => !s)}
              className="flex items-center gap-1"
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: accentColor }}
              >
                {userInitial}
              </div>
              <ChevronDown size={12} className="text-slate-500" />
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 top-10 w-44 rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                style={{ background: '#161B22' }}
              >
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="flex-1 md:ml-[200px] pt-14 pb-[72px] md:pt-0 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ──────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] flex items-center"
        style={{ background: '#0D1117', height: 64 }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badge = tab.id === 'messages' && unreadCount > 0 ? unreadCount : 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative"
            >
              <div className="relative">
                <Icon
                  size={20}
                  style={{ color: isActive ? accentColor : '#64748B' }}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                    style={{ background: accentColor }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? accentColor : '#64748B' }}
              >
                {tab.label}
              </span>
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: accentColor }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
