import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, KeyRound, Trash2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useFeature } from "@/hooks/useSubscription";
import { useWebhooks, type Webhook } from "@/hooks/useWebhooks";
import { CreateWebhookDialog } from "@/components/settings/api/CreateWebhookDialog";
import { RotateSecretDialog } from "@/components/settings/api/RotateSecretDialog";
import { RevealSecretOnceDialog } from "@/components/settings/api/RevealSecretOnceDialog";
import { UpgradeRequired } from "@/components/portal/UpgradeRequired";

export default function WebhooksPage() {
  const { data: gated, isLoading: featLoading } = useFeature("webhooks");
  const { data: webhooks = [], remove, refetch } = useWebhooks();

  const [createOpen, setCreateOpen] = useState(false);
  const [rotateId, setRotateId] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  if (featLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!gated) {
    return <UpgradeRequired feature="webhooks" featureLabel="Webhooks" />;
  }

  function handleCreated(w: Webhook) {
    setCreateOpen(false);
    refetch();
    if (w.secret) {
      setCreatedSecret(w.secret);
    }
  }

  async function handleRemove(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success("Webhook disabled");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Disable failed");
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Real-time event delivery with HMAC-SHA256 signed payloads.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add webhook
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-muted-foreground">
              No webhooks yet. Click <strong>Add webhook</strong> to subscribe to events.
            </div>
          ) : (
            <div className="divide-y">
              {webhooks.map((w) => (
                <div key={w.id} className="py-3 flex items-center justify-between gap-4">
                  <div className={w.is_active ? "" : "opacity-50"}>
                    <div className="font-medium break-all">{w.name ?? w.url}</div>
                    <div className="text-xs text-muted-foreground break-all">{w.url}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {w.events.length} event{w.events.length === 1 ? "" : "s"} · created{" "}
                      {format(new Date(w.created_at), "MMM d, yyyy")}
                      {!w.is_active && <span className="ml-2 text-[var(--apas-rose)]">disabled</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {w.events.map((ev) => (
                        <Badge key={ev} variant="outline" className="text-xs font-mono">
                          {ev}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      title="View delivery log"
                    >
                      <Link to={`/settings/api/webhooks/${w.id}/deliveries`}>
                        Deliveries <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRotateId(w.id)}
                      disabled={!w.is_active}
                      title="Rotate signing secret"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemove(w.id)}
                      disabled={!w.is_active || remove.isPending}
                      title="Disable webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateWebhookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <RotateSecretDialog
        open={rotateId !== null}
        webhookId={rotateId}
        onClose={() => setRotateId(null)}
      />

      <RevealSecretOnceDialog
        open={createdSecret !== null}
        onClose={() => setCreatedSecret(null)}
        title="Webhook signing secret"
        description="Use this secret to verify the x-signature header on incoming deliveries."
        secret={createdSecret ?? ""}
      />
    </div>
  );
}
