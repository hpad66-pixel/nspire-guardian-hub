/**
 * G4 · WebhookDeliveriesPage
 *
 * /settings/api/webhooks/:id/deliveries
 *
 * Last 100 delivery attempts for a webhook, with status,
 * latency, event type, and a manual Redeliver button.
 */
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { format, formatDistance } from "date-fns";
import { toast } from "sonner";
import { useWebhookDeliveries } from "@/hooks/useWebhookDeliveries";
import { useFeature } from "@/hooks/useSubscription";

function statusVariant(code: number | null) {
  if (code === null) return "outline" as const;
  if (code >= 200 && code < 300) return "default" as const;
  if (code >= 400) return "destructive" as const;
  return "secondary" as const;
}

function latencyMs(created_at: string, delivered_at: string | null): string {
  if (!delivered_at) return "—";
  const ms = new Date(delivered_at).getTime() - new Date(created_at).getTime();
  return `${ms} ms`;
}

export default function WebhookDeliveriesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: hasFeature, isLoading: featLoading } = useFeature("webhooks");
  const { data: deliveries = [], isLoading, redeliver, refetch } =
    useWebhookDeliveries(id ?? null, 100);

  if (featLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!hasFeature) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <p className="text-muted-foreground">
          Webhooks aren&apos;t available on your current plan.{" "}
          <Link to="/admin/billing" className="underline">Upgrade</Link>.
        </p>
      </div>
    );
  }

  async function handleRedeliver(deliveryId: string) {
    try {
      await redeliver.mutateAsync(deliveryId);
      toast.success("Redelivery queued");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Redeliver failed");
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings/api/webhooks">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Webhooks
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Delivery log</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading deliveries…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-muted-foreground">No deliveries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2">When</th>
                  <th className="text-left py-2">Event</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Latency</th>
                  <th className="text-left py-2">Attempt</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b last:border-b-0">
                    <td className="py-2 font-mono text-xs">
                      {format(new Date(d.created_at), "yyyy-MM-dd HH:mm:ss")}
                      <div className="text-muted-foreground">
                        {formatDistance(new Date(d.created_at), new Date(), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="py-2 font-mono text-xs">{d.event_type}</td>
                    <td className="py-2">
                      <Badge variant={statusVariant(d.response_status)}>
                        {d.response_status ?? "pending"}
                      </Badge>
                    </td>
                    <td className="py-2 font-mono text-xs">
                      {latencyMs(d.created_at, d.delivered_at)}
                    </td>
                    <td className="py-2 font-mono text-xs">{d.attempt_no}</td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRedeliver(d.id)}
                        disabled={redeliver.isPending}
                      >
                        Redeliver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
