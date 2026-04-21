import type { Plan } from "@/lib/billing";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const FEATURE_LABELS: Record<string, string> = {
  sso: "SAML SSO",
  scim: "SCIM provisioning",
  api: "Public REST API",
  webhooks: "Outbound webhooks",
  subcontractor_portal: "Subcontractor portal",
  owner_portal: "Owner portal",
  reporting_advanced: "Advanced reporting",
  custom_workflows: "Custom workflows",
};

export function PlanCard({
  plan,
  current = false,
  onSelect,
}: {
  plan: Plan;
  current?: boolean;
  onSelect?: (plan: Plan) => void;
}) {
  const isContactSales = plan.code === "enterprise" && !plan.stripe_price_id;
  const price =
    plan.price_cents === 0 && isContactSales
      ? "Contact sales"
      : `$${(plan.price_cents / 100).toFixed(0)}/seat/${plan.billing_interval}`;

  const includedFeatures = Object.entries(plan.features)
    .filter(([, v]) => v === true)
    .map(([k]) => FEATURE_LABELS[k] ?? k);

  return (
    <Card className={current ? "border-primary ring-2 ring-primary/20" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          {current && <Badge>Current plan</Badge>}
        </div>
        <div className="text-3xl font-bold mt-2">{price}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {plan.seat_limit == null
            ? "Unlimited seats"
            : `Up to ${plan.seat_limit} seat${plan.seat_limit === 1 ? "" : "s"}`}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {includedFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>{f}</span>
            </li>
          ))}
          {includedFeatures.length === 0 && (
            <li className="text-muted-foreground">Core construction management</li>
          )}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onSelect?.(plan)}
          variant={current ? "outline" : "default"}
          disabled={current || isContactSales}
          className="w-full"
        >
          {current ? "Current" : isContactSales ? "Contact sales" : `Choose ${plan.name}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
