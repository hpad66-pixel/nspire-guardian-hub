/**
 * B1 · CompanyDrawer — side-sheet that shows a single organization's
 * profile (contact info, vendor number, insurance, trades) and links to
 * the directory entries where the org is referenced on this project.
 *
 * Users with edit rights can patch a subset of fields inline (name, kind,
 * email, phone, website, vendor number). Compliance fields (tax_id,
 * insurance_expiry, bonding_capacity) remain read-only until a proper
 * compliance surface is built.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization, useOrganizations } from "@/hooks/useDirectory";
import type { Organization } from "@/hooks/useDirectory";
import { useProjectDirectory } from "@/hooks/useProjectDirectory";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

const ORG_KINDS: Array<Organization["kind"]> = [
  "owner", "gc", "sub", "vendor", "consultant", "municipality", "other",
];

export function CompanyDrawer({
  organizationId, open, onOpenChange, projectId,
}: {
  organizationId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId?: string;
}) {
  const { data: org } = useOrganization(organizationId);
  const { update } = useOrganizations();

  const { data: trades = [] } = useQuery<Array<{ cost_code_id: string; code: string; description: string }>>({
    queryKey: ["organization-trades", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_trades" as any)
        .select("cost_code_id, cost_codes(code, description)")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return ((data ?? []) as any[]).map((row) => ({
        cost_code_id: row.cost_code_id,
        code: row.cost_codes?.code ?? "—",
        description: row.cost_codes?.description ?? "—",
      }));
    },
  });

  const { data: directoryEntries = [] } = useProjectDirectory(projectId ?? null);
  const projectReferences = directoryEntries.filter(
    (e) => e.organization_id === organizationId,
  );

  const [name, setName] = useState("");
  const [kind, setKind] = useState<Organization["kind"]>("vendor");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [vendorNumber, setVendorNumber] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setKind(org.kind);
    setEmail(org.email ?? "");
    setPhone(org.phone ?? "");
    setWebsite(org.website ?? "");
    setVendorNumber(org.vendor_number ?? "");
    setDirty(false);
  }, [org?.id, org?.updated_at, org]);

  async function handleSave() {
    if (!org) return;
    try {
      await update.mutateAsync({
        id: org.id,
        name: name.trim(),
        kind,
        email: email.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        vendor_number: vendorNumber.trim() || null,
      });
      toast.success("Organization saved");
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{org ? org.name : "Organization"}</SheetTitle>
          {org && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize">{org.kind}</Badge>
              {!org.is_active && <Badge variant="destructive">Inactive</Badge>}
              {org.vendor_number && (
                <Badge variant="secondary">Vendor #{org.vendor_number}</Badge>
              )}
            </div>
          )}
        </SheetHeader>

        {!org ? (
          <div className="py-8 text-sm text-muted-foreground text-center">
            Loading organization…
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input value={name}
                       onChange={(e) => { setName(e.target.value); setDirty(true); }} />
              </div>
              <div>
                <Label>Kind</Label>
                <Select value={kind}
                        onValueChange={(v) => { setKind(v as Organization["kind"]); setDirty(true); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORG_KINDS.map((k) => (
                      <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendor #</Label>
                <Input value={vendorNumber}
                       onChange={(e) => { setVendorNumber(e.target.value); setDirty(true); }} />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input type="email" value={email}
                       onChange={(e) => { setEmail(e.target.value); setDirty(true); }} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone}
                       onChange={(e) => { setPhone(e.target.value); setDirty(true); }} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={website}
                       onChange={(e) => { setWebsite(e.target.value); setDirty(true); }}
                       placeholder="https://…" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!dirty || update.isPending}>
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Compliance (read-only)</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Tax ID</div>
                  <div>{org.tax_id ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Insurance expiry</div>
                  <div>
                    {org.insurance_expiry
                      ? format(new Date(org.insurance_expiry), "PP")
                      : "—"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Bonding capacity</div>
                  <div>
                    {org.bonding_capacity_cents
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency", currency: "USD",
                        }).format(org.bonding_capacity_cents / 100)
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">
                Trades · {trades.length}
              </div>
              {trades.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No trade cost codes linked.
                </div>
              ) : (
                <div className="rounded-md border divide-y">
                  {trades.map((t) => (
                    <div key={t.cost_code_id} className="flex items-center gap-3 p-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground w-20">
                        {t.code}
                      </span>
                      <span>{t.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {projectId && (
              <div>
                <div className="text-sm font-medium mb-2">
                  On this project · {projectReferences.length}
                </div>
                {projectReferences.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    This company isn't referenced by any directory entry on the current project.
                  </div>
                ) : (
                  <div className="rounded-md border divide-y">
                    {projectReferences.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 p-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate">{r.role_label ?? "Team member"}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.user_id ? "User" : r.contact_id ? "Contact" : "External"}
                          </div>
                        </div>
                        {r.is_key_contact && <Badge>Key</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
