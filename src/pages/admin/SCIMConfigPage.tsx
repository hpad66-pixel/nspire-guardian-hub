import { useState } from "react";
import { useScimTokens } from "@/hooks/useSSO";
import { useFeature } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { Lock, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SCIMConfigPage() {
  const { data: gated, isLoading: featLoading } = useFeature("scim");
  const { data: tokens = [], create, revoke } = useScimTokens();
  const [newName, setNewName] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (featLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!gated) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>SCIM provisioning is an Enterprise feature</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Automatic user provisioning via SCIM 2.0 requires the Enterprise plan.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/billing">Upgrade</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const { raw } = await create.mutateAsync({ name: newName.trim() });
      setJustCreated(raw);
      setNewName("");
      toast.success("SCIM token created — copy it now, it won't be shown again");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleCopy() {
    if (!justCreated) return;
    await navigator.clipboard.writeText(justCreated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const projectRef = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? "<project-ref>";
  const usersUrl = `https://${projectRef}.supabase.co/functions/v1/scim-users/Users`;
  const groupsUrl = `https://${projectRef}.supabase.co/functions/v1/scim-groups/Groups`;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SCIM Provisioning</h1>
        <p className="text-muted-foreground mt-1">
          Automatic user provisioning via SCIM 2.0. Works with Okta, Azure AD, OneLogin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs">
          <div>Users: <span className="text-primary">{usersUrl}</span></div>
          <div>Groups: <span className="text-primary">{groupsUrl}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Okta production"
              />
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim() || create.isPending}>
              Generate
            </Button>
          </div>
          {justCreated && (
            <Alert>
              <AlertTitle>Copy this token now — it will not be shown again</AlertTitle>
              <AlertDescription className="flex items-center gap-2 mt-2">
                <code className="flex-1 font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                  {justCreated}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active tokens</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-muted-foreground">No tokens yet.</div>
          ) : (
            <div className="divide-y">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono">{t.token_prefix}…</span>
                      {" · "}
                      created {format(new Date(t.created_at), "MMM d, yyyy")}
                      {t.last_used_at && <> · last used {format(new Date(t.last_used_at), "MMM d HH:mm")}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.revoked_at ? (
                      <Badge variant="outline">Revoked</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => revoke.mutateAsync(t.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
