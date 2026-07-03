import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FlaskConical, CalendarClock, Mail, Gauge } from 'lucide-react';
import type { Project } from '@/hooks/useProjects';
import { SamplingPanel } from '@/components/projects/envcompliance/SamplingPanel';

// The Environmental Compliance suite. Sampling is live; the other capabilities
// are the planned build order (obligations → correspondence → score), shown as
// stubs so the shape of the module is visible.
export function EnvComplianceTab({ projectId }: { projectId: string; project?: Project }) {
  const [sub, setSub] = useState('sampling');
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-[var(--apas-emerald)]/12 flex items-center justify-center shrink-0"><FlaskConical className="h-5 w-5 text-[var(--apas-emerald)]" /></div>
        <div>
          <h2 className="text-lg font-semibold">Environmental Compliance</h2>
          <p className="text-sm text-muted-foreground">Sampling &amp; exceedances, permit obligations, and regulatory correspondence for this engagement.</p>
        </div>
      </div>

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList>
          <TabsTrigger value="sampling" className="gap-1.5"><FlaskConical className="h-4 w-4" />Sampling</TabsTrigger>
          <TabsTrigger value="obligations" className="gap-1.5"><CalendarClock className="h-4 w-4" />Obligations</TabsTrigger>
          <TabsTrigger value="correspondence" className="gap-1.5"><Mail className="h-4 w-4" />Correspondence</TabsTrigger>
          <TabsTrigger value="score" className="gap-1.5"><Gauge className="h-4 w-4" />Score</TabsTrigger>
        </TabsList>

        <TabsContent value="sampling" className="mt-4"><SamplingPanel projectId={projectId} /></TabsContent>
        <TabsContent value="obligations" className="mt-4"><ComingSoon icon={CalendarClock} title="Permit obligations" desc="Track permit conditions and deadlines against the compliance calendar. Next up." /></TabsContent>
        <TabsContent value="correspondence" className="mt-4"><ComingSoon icon={Mail} title="Regulatory correspondence" desc="Draft agency letters, route for sign-off, submit, and keep an audit trail." /></TabsContent>
        <TabsContent value="score" className="mt-4"><ComingSoon icon={Gauge} title="Compliance score" desc="A 0–100 compliance health score with a timeline, feeding the portfolio cockpit." /></TabsContent>
      </Tabs>
    </div>
  );
}

function ComingSoon({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <Icon className="mx-auto h-9 w-9 text-muted-foreground mb-3" />
      <div className="font-medium">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{desc}</p>
      <div className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">Coming next</div>
    </div>
  );
}
