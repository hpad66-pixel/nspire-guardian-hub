import { useParams } from "react-router-dom";
import { useSpecSets, useSpecSections, useGenerateSubmittalRegister } from "@/hooks/useSpecs";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SpecificationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: sets = [] } = useSpecSets(projectId ?? null);
  const [setId, setSetId] = useState<string | null>(null);
  const { data: sections = [] } = useSpecSections(setId);
  const generate = useGenerateSubmittalRegister(projectId ?? null);

  async function handleGenerate() {
    try {
      const r = await generate.mutateAsync();
      toast.success(`Created ${r.count} draft submittals`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Specifications</h1>
          <p className="text-muted-foreground mt-1">CSI divisions and sections.</p>
        </div>
        {setId && (
          <Button onClick={handleGenerate} disabled={generate.isPending}>
            Generate submittal register
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Sets</h2>
          {sets.map((s) => (
            <button
              key={s.id}
              onClick={() => setSetId(s.id)}
              className={`w-full text-left p-3 rounded-md border mb-1 ${setId === s.id ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.status}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Sections</CardTitle></CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="text-muted-foreground">Select a set to see sections.</div>
              ) : (
                <div className="divide-y">
                  {sections.map((sec) => (
                    <div key={sec.id} className="py-2">
                      <span className="font-mono text-muted-foreground mr-3">{sec.section_number}</span>
                      {sec.title}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
