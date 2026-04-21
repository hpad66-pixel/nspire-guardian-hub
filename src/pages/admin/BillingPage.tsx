import { useSubscription, usePublicPlans, useTenantInvoices } from "@/hooks/useSubscription";
import { PlanCard } from "@/components/billing/PlanCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openBillingPortal, startCheckout, type Plan } from "@/lib/billing";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BillingPage() {
  const { data: sub, isLoading: subLoading } = useSubscription();
  const { data: plans = [] } = usePublicPlans();
  const { data: invoices = [] } = useTenantInvoices();

  async function handleSelectPlan(plan: Plan) {
    try {
      const url = await startCheckout(plan.code);
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message || "Could not start checkout");
    }
  }

  async function handleManage() {
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message || "Could not open billing portal");
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your plan, seats, payment method, and invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current subscription</span>
            {sub && (
              <Badge
                variant={
                  sub.status === "active" || sub.status === "trialing"
                    ? "default"
                    : "destructive"
                }
                className="capitalize"
              >
                {sub.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : !sub ? (
            <div className="text-muted-foreground">No active subscription.</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div>
                Plan: <strong>{sub.plan_name}</strong>
              </div>
              <div>
                Seats: <strong>{sub.seats}</strong>
                {sub.seat_limit != null && <> / {sub.seat_limit}</>}
              </div>
              {sub.trial_end && sub.status === "trialing" && (
                <div>Trial ends: {format(new Date(sub.trial_end), "MMM d, yyyy")}</div>
              )}
              {sub.current_period_end && (
                <div>
                  Next renewal: {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                  {sub.cancel_at_period_end && " (cancels)"}
                </div>
              )}
              <div className="pt-3">
                <Button onClick={handleManage}>Manage subscription</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-3">Choose a plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              current={sub?.plan_code === p.code}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-muted-foreground">No invoices yet.</div>
          ) : (
            <div className="divide-y">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">
                      ${(inv.amount_paid_cents / 100).toFixed(2)}{" "}
                      <span className="uppercase text-xs text-muted-foreground">{inv.currency}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {inv.created_at && format(new Date(inv.created_at), "MMM d, yyyy")} · {inv.status}
                    </div>
                  </div>
                  {inv.hosted_invoice_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
