import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useChangeOrdersByType } from "@/hooks/useProcoreChangeOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function fmt(n: number | null) {
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CoList({ projectId, coType }: { projectId: string; coType: "PCO"|"OCO"|"CCO" }) {
  const { data: rows = [], isLoading } = useChangeOrdersByType(projectId, coType);
  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <div className="text-muted-foreground">No {coType}s.</div>;
  return (
    <div className="grid gap-2">
      {rows.map((co) => (
        <Link key={co.id} to={`/projects/${projectId}/financials/cos/${co.id}`}>
          <Card className="hover:border-primary transition">
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">
                  <span className="font-mono text-muted-foreground mr-2">{coType}-{co.co_no}</span>
                  {co.title}
                </div>
                {co.reason_code && <div className="text-xs text-muted-foreground">{co.reason_code}</div>}
              </div>
              <div className="flex gap-2 items-center">
                <span className="font-mono">{fmt(co.amount)}</span>
                <Badge variant="outline" className="capitalize">{co.status.replace("_", " ")}</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function ChangeOrdersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tab, setTab] = useState<"PCO"|"OCO"|"CCO">("PCO");

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Change Orders</h1>
      <p className="text-muted-foreground mb-6">PCO → OCO → CCO cascade.</p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="PCO">Potential (PCO)</TabsTrigger>
          <TabsTrigger value="OCO">Owner (OCO)</TabsTrigger>
          <TabsTrigger value="CCO">Commitment (CCO)</TabsTrigger>
        </TabsList>
        {projectId && (
          <>
            <TabsContent value="PCO"><CoList projectId={projectId} coType="PCO" /></TabsContent>
            <TabsContent value="OCO"><CoList projectId={projectId} coType="OCO" /></TabsContent>
            <TabsContent value="CCO"><CoList projectId={projectId} coType="CCO" /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
