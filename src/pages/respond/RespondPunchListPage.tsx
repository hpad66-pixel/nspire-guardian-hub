/**
 * Public, no-login page a subcontractor lands on from the punch list email.
 * /respond/punch/:token
 */
import { useParams } from "react-router-dom";
import { PunchRespondView } from "@/components/projects/PunchRespondView";

export default function RespondPunchListPage() {
  const { token } = useParams<{ token: string }>();
  if (!token) return null;
  return <PunchRespondView token={token} />;
}
