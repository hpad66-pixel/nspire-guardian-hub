import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCoSettings, type CoSettings } from "@/hooks/useCoSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save } from "lucide-react";

type Form = Partial<CoSettings>;

export default function ChangeOrderSettingsPage() {
  const { data, isLoading, save } = useCoSettings();
  const [form, setForm] = useState<Form>({});

  useEffect(() => { if (data) setForm(data); }, [data]);
  const set = (k: keyof CoSettings, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  async function onSave() {
    try {
      await save.mutateAsync({
        company_name: form.company_name ?? null,
        company_address: form.company_address ?? null,
        company_city: form.company_city ?? null,
        company_contact: form.company_contact ?? null,
        company_title: form.company_title ?? null,
        company_email: form.company_email ?? null,
        wordmark: form.wordmark ?? null,
        footer: form.footer ?? null,
        default_overhead_pct: Number(form.default_overhead_pct ?? 10),
        default_profit_pct: Number(form.default_profit_pct ?? 5),
      });
      toast.success("Change order settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-5">
      <div className="flex items-start gap-2">
        <Building2 className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Change Order Settings</h1>
          <p className="text-muted-foreground text-sm">Your company identity and defaults. These seed every new change order — each project's prime contract can still override.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Company (the "FROM" on your change orders)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Company name</Label><Input value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} placeholder="Your Company LLC" /></div>
          <div><Label>Address</Label><Input value={form.company_address ?? ""} onChange={(e) => set("company_address", e.target.value)} placeholder="123 Main St" /></div>
          <div><Label>City, State ZIP</Label><Input value={form.company_city ?? ""} onChange={(e) => set("company_city", e.target.value)} placeholder="City, ST 00000" /></div>
          <div><Label>Signatory name</Label><Input value={form.company_contact ?? ""} onChange={(e) => set("company_contact", e.target.value)} placeholder="Jane Smith, P.E." /></div>
          <div><Label>Signatory title</Label><Input value={form.company_title ?? ""} onChange={(e) => set("company_title", e.target.value)} placeholder="Principal" /></div>
          <div className="col-span-2"><Label>Company email</Label><Input type="email" value={form.company_email ?? ""} onChange={(e) => set("company_email", e.target.value)} placeholder="contact@yourcompany.com" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Branding & defaults</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Document wordmark</Label><Input value={form.wordmark ?? ""} onChange={(e) => set("wordmark", e.target.value)} placeholder="YOUR COMPANY" /></div>
          <div className="col-span-2"><Label>Footer line</Label><Input value={form.footer ?? ""} onChange={(e) => set("footer", e.target.value)} placeholder="Your Company  ·  Confidential  ·  Change Order Proposal" /></div>
          <div><Label>Default overhead %</Label><Input type="number" step="any" value={form.default_overhead_pct ?? 10} onChange={(e) => set("default_overhead_pct", e.target.value)} /></div>
          <div><Label>Default profit %</Label><Input type="number" step="any" value={form.default_profit_pct ?? 5} onChange={(e) => set("default_profit_pct", e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isLoading || save.isPending}><Save className="h-4 w-4 mr-1.5" />{save.isPending ? "Saving…" : "Save settings"}</Button>
      </div>
    </div>
  );
}
