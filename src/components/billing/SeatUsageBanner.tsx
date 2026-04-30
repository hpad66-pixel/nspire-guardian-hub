import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

/** Banner shown on the Users/Invite page when seat limit is near/over. */
export function SeatUsageBanner({ currentSeats }: { currentSeats: number }) {
  const { data: sub } = useSubscription();
  if (!sub || sub.seat_limit == null) return null;

  const remaining = sub.seat_limit - currentSeats;
  if (remaining > 2) return null;

  const atLimit = remaining <= 0;

  return (
    <Alert variant={atLimit ? "destructive" : "default"} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {atLimit ? "Seat limit reached" : `${remaining} seat${remaining === 1 ? "" : "s"} remaining`}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          You're on the <strong>{sub.plan_name}</strong> plan ({currentSeats}/{sub.seat_limit} seats used).
        </span>
        <Button asChild size="sm" variant={atLimit ? "secondary" : "outline"}>
          <Link to="/admin/billing">Upgrade</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
