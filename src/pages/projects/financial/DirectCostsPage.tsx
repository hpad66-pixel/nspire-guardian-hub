import { useParams } from "react-router-dom";
import { useState } from "react";
import { useDirectCosts } from "@/hooks/useDirectCosts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { InvoiceEntryForm } from "@/components/financial/InvoiceEntryForm";
import { TimecardEntryForm } from "@/components/financial/TimecardEntryForm";
import { ExpenseEntryForm } from "@/components/financial/ExpenseEntryForm";
import { money } from "@/lib/pdf";

function DcList({
  projectId,
  costType,
  onNew,
}: {
  projectId: string;
  costType: "invoice" | "timecard" | "expense";
  onNew: () => void;
}) {
  const { data: rows = [], isLoading } = useDirectCosts(projectId, costType);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={onNew}>
          <Plus className="h-4 w-4 mr-1" /> New {costType}
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No {costType}s yet. Click "New {costType}" to add one.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{r.description ?? r.reference_no ?? costType}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.cost_date}
                    {r.reference_no && ` · ${r.reference_no}`}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-mono">{money(r.amount)}</span>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectCostsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tab, setTab] = useState<"invoice" | "timecard" | "expense">("invoice");
  const [openInvoice, setOpenInvoice] = useState(false);
  const [openTimecard, setOpenTimecard] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Direct Costs</h1>
      <p className="text-muted-foreground mb-6">
        Non-commitment costs: invoices, timecards, expenses. Each is cost-code-keyed and flows into Budget Actual-Cost.
      </p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="invoice">Invoices</TabsTrigger>
          <TabsTrigger value="timecard">Timecards</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>
        {projectId && (
          <>
            <TabsContent value="invoice">
              <DcList projectId={projectId} costType="invoice" onNew={() => setOpenInvoice(true)} />
            </TabsContent>
            <TabsContent value="timecard">
              <DcList projectId={projectId} costType="timecard" onNew={() => setOpenTimecard(true)} />
            </TabsContent>
            <TabsContent value="expense">
              <DcList projectId={projectId} costType="expense" onNew={() => setOpenExpense(true)} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {projectId && (
        <>
          <InvoiceEntryForm open={openInvoice} onOpenChange={setOpenInvoice} projectId={projectId} />
          <TimecardEntryForm open={openTimecard} onOpenChange={setOpenTimecard} projectId={projectId} />
          <ExpenseEntryForm open={openExpense} onOpenChange={setOpenExpense} projectId={projectId} />
        </>
      )}
    </div>
  );
}
