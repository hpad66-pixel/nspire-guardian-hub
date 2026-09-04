import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectTeamMembers } from "@/hooks/useProjectTeam";
import { useCardScanPilotAdmin } from "@/hooks/useCardScanPilotAdmin";

export function CardScanPilotAdminCard({ projectId }: { projectId: string }) {
  const { data: members = [], isLoading: membersLoading } = useProjectTeamMembers(projectId);
  const pilot = useCardScanPilotAdmin(projectId);
  const loading = membersLoading || pilot.isLoading;
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Camera className="h-4 w-4" />APAS CRM card-scan pilot</CardTitle><CardDescription>Enroll one administrator first, then up to four project team members. The database enforces those limits.</CardDescription></CardHeader>
    <CardContent>
      <div className="mb-4 flex gap-2 rounded-xl border border-border/60 bg-muted/35 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--apas-sapphire)]" /><span>Every person uses their own Proj OS login. Hostinger accounts are not application identities, and no participant receives Supabase or OCR credentials.</span></div>
      {loading ? <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading project members…</div>
        : pilot.error ? <p className="py-3 text-sm text-destructive">Assignments are unavailable. Confirm the card-intake migration has been applied.</p>
        : members.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Add a project team member before starting the pilot.</p>
        : <ul className="divide-y divide-border/60" aria-label="Card-scan pilot members">{members.map((member) => {
          const cohort = pilot.cohorts.get(member.user_id); const pending = pilot.pendingUserId === member.user_id;
          return <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{member.profile?.full_name || member.profile?.email || "Project team member"}</p>{member.profile?.email && member.profile.full_name && <p className="truncate text-xs text-muted-foreground">{member.profile.email}</p>}</div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={cohort ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "text-muted-foreground"}>{cohort === "admin" ? "Admin pilot" : cohort === "pilot" ? "Pilot" : "Off"}</Badge>{cohort ? <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => pilot.setEnrollment(member.user_id, cohort, false)}>{pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Disable</Button> : <><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => pilot.setEnrollment(member.user_id, "admin", true)}>Admin pilot</Button><Button type="button" size="sm" disabled={pending} onClick={() => pilot.setEnrollment(member.user_id, "pilot", true)}>Team pilot</Button></>}</div></li>;
        })}</ul>}
    </CardContent>
  </Card>;
}

