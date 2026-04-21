import { useState } from "react";
import { useApiClients } from "@/hooks/useApiClients";
import { useFeature } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

const AVAILABLE_SCOPES = [
  "read:projects","read:commitments","write:commitments",
  "read:change-orders","read:rfis","read:budget",
  "write:direct-costs","read:pay-apps",
];

export default function ApiClientsPage() {
  const { data: gated, isLoading: featLoading } = useFeature("api");
  const { data: clients = [], create, revoke } = useApiClients();
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [justCreated, setJustCreated] = useState<{ client_id: string; client_secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (featLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!gated) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Public API is not on this plan</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Upgrade to Professional or Enterprise to use the REST API.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/billing">Upgrade</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  async function handleCreate() {
    if (!name.trim() || selectedScopes.length === 0) return;
    try {
      const creds = await create.mutateAsync({ name: name.trim(), scopes: selectedScopes });
      setJustCreated(creds);
      setName("");
      setSelectedScopes([]);
      toast.success("Client created — copy the secret now");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScope(s: string) {
    setSelectedScopes((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Clients</h1>
        <p className="text-muted-foreground mt-1">OAuth2 client credentials for machine-to-machine integrations.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New client</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input placeholder="Sage ERP integration" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Scopes</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_SCOPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleScope(s)}
                  className={`text-xs rounded-full border px-3 py-1 ${
                    selectedScopes.includes(s) ? "bg-primary text-primary-foreground border-primary" : ""
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!name.trim() || selectedScopes.length === 0 || create.isPending}>
            Create client
          </Button>
        </CardContent>
      </Card>

      {justCreated && (
        <Alert>
          <AlertTitle>Copy the client secret now — it will not be shown again</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">client_id</span>
              <code className="flex-1 font-mono text-xs bg-muted px-2 py-1 rounded">{justCreated.client_id}</code>
              <Button size="sm" variant="outline" onClick={() => handleCopy(justCreated.client_id)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">client_secret</span>
              <code className="flex-1 font-mono text-xs bg-muted px-2 py-1 rounded break-all">{justCreated.client_secret}</code>
              <Button size="sm" variant="outline" onClick={() => handleCopy(justCreated.client_secret)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Active clients</CardTitle></CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-muted-foreground">No clients yet.</div>
          ) : (
            <div className="divide-y">
              {clients.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono mr-2">{c.client_id}</span>
                      {c.rate_limit} req/min · created {format(new Date(c.created_at), "MMM d, yyyy")}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.scopes.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                  <div>
                    {c.is_active ? (
                      <Button size="sm" variant="destructive" onClick={() => revoke.mutateAsync(c.id)}>Revoke</Button>
                    ) : (
                      <Badge variant="outline">Revoked</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
