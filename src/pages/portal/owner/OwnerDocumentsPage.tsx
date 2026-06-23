/**
 * Owner portal — Documents vault. One place for the client to find and download
 * the documents that concern them: executed change orders, pay applications, and
 * the lien waivers we've issued to them. Read-only; each pdf_path is a public URL.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerPortalData } from "@/hooks/usePortals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, FileDiff, ReceiptText, ShieldCheck } from "lucide-react";

interface DocRow { id: string; label: string; sub: string; status?: string; url: string; }

export default function OwnerDocumentsPage() {
  const { data: portal } = useOwnerPortalData();
  const contract = (portal?.primeContracts as any[] | undefined)?.[0];
  const projectId = contract?.project_id ?? null;
  const contractId = contract?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["owner-documents", projectId, contractId],
    enabled: Boolean(projectId && contractId),
    queryFn: async () => {
      const [cos, payApps, liens] = await Promise.all([
        supabase.from("change_orders" as any).select("id, co_no, co_type, title, status, pdf_path")
          .eq("project_id", projectId!).not("pdf_path", "is", null),
        supabase.from("prime_contract_pay_apps" as any).select("id, pay_app_no, period_end, status, pdf_path")
          .eq("prime_contract_id", contractId!).not("pdf_path", "is", null),
        supabase.from("lien_releases" as any).select("id, waiver_no, title, status, pdf_path, direction")
          .eq("project_id", projectId!).eq("direction", "outbound").not("pdf_path", "is", null),
      ]);
      const changeOrders: DocRow[] = ((cos.data ?? []) as any[]).map((c) => ({
        id: c.id, label: `${c.co_type}-${String(c.co_no).padStart(3, "0")} · ${c.title ?? ""}`,
        sub: "Change order", status: c.status, url: c.pdf_path,
      }));
      const payApplications: DocRow[] = ((payApps.data ?? []) as any[]).map((p) => ({
        id: p.id, label: `Pay Application #${p.pay_app_no}`, sub: `Period ending ${p.period_end ?? "—"}`,
        status: p.status, url: p.pdf_path,
      }));
      const waivers: DocRow[] = ((liens.data ?? []) as any[]).map((l) => ({
        id: l.id, label: l.title || l.waiver_no || "Lien waiver", sub: "Lien waiver", status: l.status, url: l.pdf_path,
      }));
      return { changeOrders, payApplications, waivers };
    },
  });

  const sections: Array<{ title: string; icon: typeof FileText; rows: DocRow[] }> = [
    { title: "Change Orders", icon: FileDiff, rows: data?.changeOrders ?? [] },
    { title: "Pay Applications", icon: ReceiptText, rows: data?.payApplications ?? [] },
    { title: "Lien Waivers", icon: ShieldCheck, rows: data?.waivers ?? [] },
  ];
  const total = sections.reduce((s, x) => s + x.rows.length, 0);

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <Link to="/owner-portal" className="text-sm text-muted-foreground hover:underline">← Owner dashboard</Link>
        <h1 className="text-3xl font-bold mt-2">Documents</h1>
        <p className="text-muted-foreground">Your project's change orders, pay applications and lien waivers — download anytime.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
        </div>
      ) : total === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No documents available yet.</CardContent></Card>
      ) : (
        sections.filter((s) => s.rows.length > 0).map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <section.icon className="h-4 w-4 text-[var(--apas-sapphire)]" /> {section.title}
                <Badge variant="outline" className="ml-1">{section.rows.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {section.rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.sub}{r.status ? ` · ${r.status}` : ""}</div>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 mr-1" /> Download
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
