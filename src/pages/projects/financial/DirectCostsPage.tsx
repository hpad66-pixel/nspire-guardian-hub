import { useParams } from "react-router-dom";
import { useState } from "react";
import { useDirectCosts } from "@/hooks/useDirectCosts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DcList({ projectId, costType }: { projectId: string; costType: "invoice"|"timecard"|"expense" }) {
  const { data: rows = [], isLoading } = useDirectCosts(projectId, costType);
  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <div className="text-muted-foreground">No {costType}s.</div>;
  return (
    <div className="grid gap-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{r.description ?? r.reference_no ?? costType}</div>
              <div className="text-xs text-muted-foreground">{r.cost_date}</div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-mono">{fmt(r.amount)}</span>
              <Badge variant="outline" className="capitalize">{r.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DirectCostsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tab, setTab] = useState<"invoice"|"timecard"|"expense">("invoice");

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Direct Costs</h1>
      <p className="text-muted-foreground mb-6">Non-commitment costs: invoices, timecards, expenses.</p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="invoice">Invoices</TabsTrigger>
          <TabsTrigger value="timecard">Timecards</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>
        {projectId && (
          <>
            <TabsContent value="invoice"><DcList projectId={projectId} costType="invoice" /></TabsContent>
            <TabsContent value="timecard"><DcList projectId={projectId} costType="timecard" /></TabsContent>
            <TabsContent value="expense"><DcList projectId={projectId} costType="expense" /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
