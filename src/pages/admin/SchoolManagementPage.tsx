import { useState } from 'react';
import { School, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SchoolCard } from '@/components/admin/SchoolCard';
import { SchoolAssignmentDrawer } from '@/components/admin/SchoolAssignmentDrawer';
import { useAllSchools } from '@/hooks/useUserSchool';
import type { LWSchool } from '@/hooks/useUserSchool';

export default function SchoolManagementPage() {
  const { data: schools = [], isLoading } = useAllSchools();
  const [drawerSchool, setDrawerSchool] = useState<LWSchool | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <School className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">LearnWorlds Schools</h1>
              <p className="text-sm text-muted-foreground">
                Connect schools to organizations and individual subscribers
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs flex-shrink-0" disabled>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add School
          </Button>
        </div>

        {/* ── Schools grid ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : schools.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-8 py-16 text-center">
            <School className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No schools configured</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Contact APAS support to add LearnWorlds school connections.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {schools.map((school) => (
              <SchoolCard
                key={school.id}
                school={school}
                onManageAssignments={() => setDrawerSchool(school)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Assignment drawer ──────────────────────────────────────────────── */}
      {drawerSchool && (
        <SchoolAssignmentDrawer
          school={drawerSchool}
          open={!!drawerSchool}
          onClose={() => setDrawerSchool(null)}
        />
      )}
    </div>
  );
}
