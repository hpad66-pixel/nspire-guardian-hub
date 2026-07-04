import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FlaskConical, CalendarClock, Mail, Gauge } from 'lucide-react';
import type { Project } from '@/hooks/useProjects';
import { SamplingPanel } from '@/components/projects/envcompliance/SamplingPanel';
import { ObligationsPanel } from '@/components/projects/envcompliance/ObligationsPanel';
import { CorrespondencePanel } from '@/components/projects/envcompliance/CorrespondencePanel';
import { ScorePanel } from '@/components/projects/envcompliance/ScorePanel';

// The Environmental Compliance suite: Sampling, Obligations, Correspondence, Score.
export function EnvComplianceTab({ projectId, project }: { projectId: string; project?: Project }) {
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
        <TabsContent value="obligations" className="mt-4"><ObligationsPanel projectId={projectId} /></TabsContent>
        <TabsContent value="correspondence" className="mt-4"><CorrespondencePanel projectId={projectId} projectName={project?.name} /></TabsContent>
        <TabsContent value="score" className="mt-4"><ScorePanel projectId={projectId} /></TabsContent>
      </Tabs>
    </div>
  );
}
