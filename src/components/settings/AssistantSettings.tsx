/**
 * AssistantSettings — Settings → Assistant. Enables the floating AI financial
 * assistant (voice + chat over the project's live financials). Per-browser
 * preference (useAssistantEnabled).
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Mic, ShieldCheck, BarChart3 } from "lucide-react";
import { useAssistantEnabled } from "@/hooks/useAssistantEnabled";

export function AssistantSettings() {
  const [enabled, setEnabled] = useAssistantEnabled();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--apas-sapphire)]" /> AI Financial Assistant
        </CardTitle>
        <CardDescription>
          A chat + voice assistant that answers questions about a project's contract, billings, change
          orders, cash flow, retainage and subcontractors — grounded in your live data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="assistant-toggle" className="text-base">Enable assistant</Label>
            <p className="text-sm text-muted-foreground">
              Shows a floating assistant button on project pages. Off by default.
            </p>
          </div>
          <Switch id="assistant-toggle" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="flex items-start gap-2"><Mic className="h-4 w-4 mt-0.5 text-[var(--apas-sapphire)]" />
            <span><strong>Ask by voice</strong> or text — e.g. "What's my cash position?"</span></div>
          <div className="flex items-start gap-2"><BarChart3 className="h-4 w-4 mt-0.5 text-[var(--apas-sapphire)]" />
            <span><strong>Grounded in data</strong> — pulls real figures, never invents numbers.</span></div>
          <div className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-[var(--apas-sapphire)]" />
            <span><strong>Read-only & private</strong> — it can't change anything; tenant-scoped.</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
