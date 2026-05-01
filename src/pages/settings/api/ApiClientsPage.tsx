import { useState } from "react";
import { useApiClients } from "@/hooks/useApiClients";
import { useFeature } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreateApiClientDialog, type MintedApiClient } from "@/components/settings/api/CreateApiClientDialog";
import { RevealSecretOnceDialog } from "@/components/settings/api/RevealSecretOnceDialog";
import { UpgradeRequired } from "@/components/portal/UpgradeRequired";

export default function ApiClientsPage() {
  const { data: gated, isLoading: featLoading } = useFeature("api");
  const { data: clients = [], revoke, refetch } = useApiClients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [minted, setMinted] = useState<MintedApiClient | null>(null);

  if (featLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  // Plan gate -- super admin bypasses via the can_use_feature() OR is_super_admin() clause.
  if (!gated) {
    return <UpgradeRequired feature="api" featureLabel="Public API" />;
  }

  function handleMinted(m: MintedApiClient) {
    setMinted(m);
    setDialogOpen(false);
    refetch();
    toast.success("Client created — copy the secret now");
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Clients</h1>
          <p className="text-muted-foreground mt-1">
            OAuth2 client credentials for machine-to-machine integrations.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create client
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active clients</CardTitle></CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-muted-foreground">
              No clients yet. Click <strong>Create client</strong> to mint one.
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div className={c.is_active ? "" : "opacity-50"}>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono mr-2">{c.client_id}</span>
                      {c.rate_limit} req/min · created{" "}
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                      {c.revoked_at ? (
                        <>
                          {" · "}
                          <span className="text-[var(--apas-rose)]">
                            revoked {format(new Date(c.revoked_at), "MMM d, yyyy")}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(c.scopes ?? []).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    {c.is_active ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutateAsync(c.id).then(() => refetch())}
                      >
                        Revoke
                      </Button>
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

      {/* Create flow -- uses the api-key-mint edge function (Rule 10: server-side secret). */}
      <CreateApiClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onMinted={handleMinted}
      />

      {/* One-time-reveal of the plaintext secret. Closing destroys the only copy. */}
      <RevealSecretOnceDialog
        open={minted !== null}
        onClose={() => setMinted(null)}
        title="API client created"
        description="Copy the client secret now — you won't see it again."
        secret={minted?.client_secret ?? ""}
        identifier={minted ? { label: "client_id", value: minted.client_id } : undefined}
      />
    </div>
  );
}
