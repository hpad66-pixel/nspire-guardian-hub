import { useState } from "react";
import { useWebhookSubscriptions, useWebhookDeliveries } from "@/hooks/useApiClients";
import { useFeature } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

const AVAILABLE_EVENTS = [
  "commitment.created","commitment.updated","commitment.executed",
  "change_order.created","change_order.executed",
  "pay_app.submitted","pay_app.approved","pay_app.rejected",
  "rfi.created","rfi.responded","rfi.closed",
  "direct_cost.approved",
];

export default function WebhooksPage() {
  const { data: gated, isLoading: featLoading } = useFeature("webhooks");
  const { data: subs = [], create, remove } = useWebhookSubscriptions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: deliveries = [] } = useWebhookDeliveries(selectedId);

  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  if (featLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!gated) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Webhooks require Professional or Enterprise</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Event subscriptions aren't on your current plan.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/billing">Upgrade</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  async function handleCreate() {
    if (!url.trim() || events.length === 0) return;
    try {
      await create.mutateAsync({ url: url.trim(), events });
      setUrl("");
      setEvents([]);
      toast.success("Webhook subscription created");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function toggleEvent(e: string) {
    setEvents((cur) => cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]);
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground mt-1">
          Real-time event delivery with HMAC-SHA256 signature verification.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>New subscription</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>URL</Label>
            <Input placeholder="https://your-app.com/webhooks/procore-lite" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div>
            <Label>Events</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_EVENTS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEvent(e)}
                  className={`text-xs rounded-full border px-3 py-1 ${
                    events.includes(e) ? "bg-primary text-primary-foreground border-primary" : ""
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!url.trim() || events.length === 0 || create.isPending}>
            Subscribe
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Subscriptions</h2>
          {subs.length === 0 ? (
            <div className="text-muted-foreground">None.</div>
          ) : subs.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full text-left rounded-md border p-3 mb-1 ${selectedId === s.id ? "border-primary" : ""}`}
            >
              <div className="text-sm break-all">{s.url}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.events.length} events</div>
              {!s.is_active && <Badge variant="outline" className="mt-1">Disabled</Badge>}
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent deliveries</CardTitle>
              {selectedId && (
                <Button variant="destructive" size="sm" onClick={() => remove.mutateAsync(selectedId)}>
                  Disable
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedId ? (
                <div className="text-muted-foreground">Select a subscription.</div>
              ) : deliveries.length === 0 ? (
                <div className="text-muted-foreground">No deliveries yet.</div>
              ) : (
                <div className="divide-y text-sm">
                  {(deliveries as any[]).map((d) => (
                    <div key={d.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs">{d.event_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(d.created_at), "MMM d HH:mm")}
                          {d.attempt_no > 1 && ` · attempt ${d.attempt_no}`}
                        </div>
                      </div>
                      <Badge variant={
                        d.delivered_at ? "default" :
                        d.response_status >= 400 ? "destructive" : "outline"
                      }>
                        {d.delivered_at ? "Delivered" : d.response_status ? `HTTP ${d.response_status}` : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
