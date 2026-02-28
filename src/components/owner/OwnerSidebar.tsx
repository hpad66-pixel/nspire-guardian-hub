import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  FolderKanban,
  CalendarCheck,
  FileText,
  Phone,
  LogOut,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/owner-portal', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/owner-portal/projects', label: 'Projects', icon: FolderKanban },
  { to: '/owner-portal/compliance', label: 'Compliance', icon: CalendarCheck },
  { to: '/owner-portal/documents', label: 'Documents', icon: FileText },
  { to: '/owner-portal/contact', label: 'Contact', icon: Phone },
];

export function OwnerSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fullName = 'Chris Sullivan';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-sm font-bold text-foreground">APAS OS</span>
        </div>
        <p className="mt-2 truncate text-xs font-medium text-foreground">{fullName}</p>
        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
          Property Owner
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-l-[3px] border-primary bg-primary/5 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
