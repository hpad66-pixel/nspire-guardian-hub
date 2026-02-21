import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TriangleAlert, FileText, Plus, CheckCircle2, Search } from 'lucide-react';
import { useAllIncidents, usePendingIncidents, useOSHA300Data, useOSHA300ATotals } from '@/hooks/useSafety';
import { useUserPermissions } from '@/hooks/usePermissions';
import { IncidentCard } from '@/components/safety/IncidentCard';
import { LogIncidentSheet } from '@/components/safety/LogIncidentSheet';
import { ClassifyIncidentDrawer } from '@/components/safety/ClassifyIncidentDrawer';
import { OSHA300Preview } from '@/components/safety/OSHA300Preview';
import { OSHA300APreview } from '@/components/safety/OSHA300APreview';
import type { SafetyIncident } from '@/hooks/useSafety';

export default function SafetyDashboardPage() {
  const currentYear = new Date().getFullYear();
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [osha300Open, setOsha300Open] = useState(false);
  const [osha300AOpen, setOsha300AOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const { isAdmin, currentRole } = useUserPermissions();
  const isManager = isAdmin || ['owner', 'manager', 'superintendent', 'project_manager'].includes(currentRole ?? '');

  const { data: allIncidents = [], isLoading } = useAllIncidents({ year: currentYear, search, classification: classFilter });
  const { data: pendingIncidents = [] } = usePendingIncidents();
  const { data: osaIncidents = [] } = useOSHA300Data(currentYear);
  const totals = useOSHA300ATotals(currentYear);

  const recordableCount = allIncidents.filter(i => i.is_osha_recordable).length;
  const closedCount = allIncidents.filter(i => i.status === 'closed').length;

  function handleReview(incident: SafetyIncident) {
    setSelectedIncident(incident);
    setClassifyOpen(true);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <TriangleAlert className="h-4 w-4 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">Safety</h1>
          </div>
          <p className="text-muted-foreground text-sm">Incident log and OSHA recordkeeping</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isManager && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOsha300Open(true)}>
                <FileText className="h-4 w-4" />OSHA 300
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOsha300AOpen(true)}>
                <FileText className="h-4 w-4" />OSHA 300A
              </Button>
            </>
          )}
          <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setLogSheetOpen(true)}>
            <Plus className="h-4 w-4" />Log Incident
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total This Year', value: allIncidents.length, color: 'text-foreground' },
            { label: 'OSHA Recordable', value: recordableCount, color: 'text-red-600' },
            { label: 'Pending Review', value: pendingIncidents.length, color: 'text-amber-600' },
            { label: 'Closed', value: closedCount, color: 'text-green-600' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="h-9">
          <TabsTrigger value="all">All Incidents</TabsTrigger>
          {isManager && (
            <>
              <TabsTrigger value="pending" className="relative">
                Pending Review
                {pendingIncidents.length > 0 && (
                  <span className="ml-1.5 h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                    {pendingIncidents.length > 9 ? '9+' : pendingIncidents.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="osha">OSHA Log</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Tab 1 - All Incidents */}
        <TabsContent value="all" className="mt-4 space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'recordable', label: 'Recordable' },
                { id: 'first_aid', label: 'First Aid' },
                { id: 'near_miss', label: 'Near Miss' },
              ].map(f => (
                <Button key={f.id} size="sm" variant={classFilter === f.id ? 'default' : 'outline'} className="h-9 text-xs" onClick={() => setClassFilter(f.id)}>
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
          ) : allIncidents.length === 0 ? (
            <div className="text-center py-16">
              <TriangleAlert className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium">No incidents reported</p>
              <p className="text-sm text-muted-foreground mt-1">Log an incident using the button above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allIncidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} onReview={handleReview} isManager={isManager} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2 - Pending Review */}
        <TabsContent value="pending" className="mt-4">
          {pendingIncidents.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="font-medium">All incidents have been reviewed</p>
              <p className="text-sm text-muted-foreground mt-1">Nothing pending — you're up to date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingIncidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} onReview={handleReview} isManager={isManager} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3 - OSHA Log */}
        <TabsContent value="osha" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOsha300Open(true)}>Preview OSHA 300</Button>
            <Button variant="outline" size="sm" onClick={() => setOsha300AOpen(true)}>Preview OSHA 300A</Button>
          </div>

          {osaIncidents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No OSHA recordable incidents for {currentYear}</div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Case #', 'Employee', 'Date', 'Location', 'Recordable Type', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {osaIncidents.map(i => (
                    <tr key={i.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => handleReview(i)}>
                      <td className="px-3 py-2 font-mono text-xs">{i.case_number}</td>
                      <td className="px-3 py-2">{i.is_privacy_case ? 'Privacy Case' : i.injured_employee_name}</td>
                      <td className="px-3 py-2 text-xs">{i.incident_date}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[140px]">{i.location_description}</td>
                      <td className="px-3 py-2 text-xs capitalize">{i.injury_type?.replace('_', ' ')}</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">Recordable</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 300A summary */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-semibold mb-3">Annual Summary (300A) — {currentYear}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { label: 'Deaths', value: totals.totalDeaths },
                { label: 'Days Away Cases', value: totals.totalDaysAway },
                { label: 'Transfer Cases', value: totals.totalTransfer },
                { label: 'Other Recordable', value: totals.totalOtherRecordable },
              ].map(t => (
                <div key={t.label}>
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                  <p className="text-xl font-bold">{t.value}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Log Incident Sheet */}
      <LogIncidentSheet
        open={logSheetOpen}
        onOpenChange={setLogSheetOpen}
        sourceType="standalone"
        onSuccess={() => setLogSheetOpen(false)}
      />

      {/* Classify Drawer */}
      <ClassifyIncidentDrawer
        incident={selectedIncident}
        open={classifyOpen}
        onOpenChange={setClassifyOpen}
      />

      {/* OSHA 300 Modal */}
      <Dialog open={osha300Open} onOpenChange={setOsha300Open}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>OSHA 300 Log — {currentYear}</DialogTitle></DialogHeader>
          <OSHA300Preview year={currentYear} />
        </DialogContent>
      </Dialog>

      {/* OSHA 300A Modal */}
      <Dialog open={osha300AOpen} onOpenChange={setOsha300AOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>OSHA 300A Summary — {currentYear}</DialogTitle></DialogHeader>
          <OSHA300APreview year={currentYear} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
