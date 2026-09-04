import { Bot, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentPilotAdmin } from "@/hooks/useAgentPilotAdmin";
import { useProjectTeamMembers } from "@/hooks/useProjectTeam";

export function AgentPilotAdminCard({ projectId }: { projectId: string }) {
  const { data: members = [], isLoading: membersLoading } = useProjectTeamMembers(projectId);
  const pilot = useAgentPilotAdmin(projectId);
  const loading = membersLoading || pilot.isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" aria-hidden="true" />
          Project Agent pilot
        </CardTitle>
        <CardDescription>
          Enable the read-only Agent for named members of this project. Disabling access immediately revokes their active Agent sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2 rounded-xl border border-border/60 bg-muted/35 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--apas-sapphire)]" aria-hidden="true" />
          <span>Each enabled member receives only <strong className="text-foreground">read project tasks</strong>. Writes, memory saving, and business-card scanning remain off.</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading project members…</div>
        ) : pilot.error ? (
          <p className="py-3 text-sm text-destructive">Agent pilot assignments are unavailable. Confirm the Agent foundation migration has been applied.</p>
        ) : members.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Add a team member to this project before enabling the Agent.</p>
        ) : (
          <ul className="divide-y divide-border/60" aria-label="Project Agent pilot members">
            {members.map((member) => {
              const enabled = pilot.entitlements.get(member.user_id) === true;
              const pending = pilot.pendingUserId === member.user_id;
              return (
                <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.profile?.full_name || member.profile?.email || "Project team member"}</p>
                    {member.profile?.email && member.profile.full_name && <p className="truncate text-xs text-muted-foreground">{member.profile.email}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
                      {enabled ? "Enabled" : "Off"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant={enabled ? "outline" : "default"}
                      disabled={pending}
                      onClick={() => pilot.setEnabled(member.user_id, !enabled)}
                    >
                      {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      {enabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
