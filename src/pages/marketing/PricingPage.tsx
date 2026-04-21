import { usePublicPlans } from "@/hooks/useSubscription";
import { PlanCard } from "@/components/billing/PlanCard";
import { useNavigate } from "react-router-dom";

export default function PricingPage() {
  const { data: plans = [], isLoading } = usePublicPlans();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-6 py-16 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Pricing</h1>
        <p className="text-lg text-muted-foreground">
          Simple per-seat pricing. Upgrade, downgrade, or cancel anytime.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading plans…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onSelect={() => navigate("/auth?redirect=/admin/billing")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
