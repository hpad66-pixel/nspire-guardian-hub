import { useTemplateGrants, type PermissionTemplateGrant } from "@/hooks/usePermissionTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const MODULES = [
  "rfis","submittals","punch","daily_log","meetings",
  "drawings","specs","photos","documents","schedule","incidents",
  "prime_contract","commitments","change_events","change_orders",
  "direct_costs","budget","reports","admin","cost_codes",
  "distribution_lists","permission_templates",
];
const ACTIONS = ["view","create","edit","delete","approve"] as const;
const LEVELS: Array<PermissionTemplateGrant["level"]> = ["none","read","standard","admin"];

export function PermissionTemplateEditor({
  templateId,
  readOnly = false,
}: {
  templateId: string;
  readOnly?: boolean;
}) {
  const { data: grants = [], isLoading, setGrant } = useTemplateGrants(templateId);

  const lookup = new Map<string, PermissionTemplateGrant["level"]>();
  for (const g of grants) lookup.set(`${g.module}:${g.action}`, g.level);

  async function handleChange(module: string, action: string, level: PermissionTemplateGrant["level"]) {
    try {
      await setGrant.mutateAsync({ module, action, level });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (isLoading) return <div className="text-muted-foreground">Loading grants…</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">Module</TableHead>
            {ACTIONS.map((a) => (
              <TableHead key={a} className="capitalize">{a}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {MODULES.map((module) => (
            <TableRow key={module}>
              <TableCell className="font-mono text-sm">{module}</TableCell>
              {ACTIONS.map((action) => {
                const level = lookup.get(`${module}:${action}`) ?? "none";
                return (
                  <TableCell key={action}>
                    <Select
                      value={level}
                      disabled={readOnly}
                      onValueChange={(v) => handleChange(module, action, v as any)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
