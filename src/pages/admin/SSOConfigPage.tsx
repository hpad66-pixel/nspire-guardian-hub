import { useState, useEffect } from "react";
import { useSsoConfig, useSsoLoginEvents } from "@/hooks/useSSO";
import { useFeature } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SSOConfigPage() {
  const { data: gated, isLoading: featLoading } = useFeature("sso");
  const { data: cfg, isLoading, upsert } = useSsoConfig();
  const { data: events = [] } = useSsoLoginEvents(25);

  const [form, setForm] = useState({
    idp_sso_url: "",
    idp_entity_id: "",
    idp_certificate: "",
    idp_metadata_xml: "",
    is_enforced: false,
    sp_entity_id: "",
    acs_url: "",
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        idp_sso_url: cfg.idp_sso_url ?? "",
        idp_entity_id: cfg.idp_entity_id ?? "",
        idp_certificate: cfg.idp_certificate ?? "",
        idp_metadata_xml: cfg.idp_metadata_xml ?? "",
        is_enforced: cfg.is_enforced,
        sp_entity_id: cfg.sp_entity_id ?? "",
        acs_url: cfg.acs_url ?? "",
      });
    }
  }, [cfg]);

  if (featLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!gated) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>SSO is an Enterprise feature</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>SAML 2.0 single sign-on is available on the Enterprise plan.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/billing">Upgrade</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  async function handleSave() {
    try {
      await upsert.mutateAsync({ provider: "saml", ...form });
      toast.success("SSO configuration saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Single Sign-On</h1>
        <p className="text-muted-foreground mt-1">
          Configure SAML 2.0 with Okta, Azure AD, OneLogin, or any compliant IdP.
        </p>
      </div>

      {!cfg && (
        <Alert>
          <AlertTitle>First-time setup</AlertTitle>
          <AlertDescription>
            Give these values to your IdP admin, then paste their metadata below.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Service Provider (your app)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>SP Entity ID</Label>
            <Input
              value={form.sp_entity_id}
              onChange={(e) => setForm({ ...form, sp_entity_id: e.target.value })}
              placeholder="urn:procore-lite:your-workspace"
            />
          </div>
          <div>
            <Label>Assertion Consumer Service (ACS) URL</Label>
            <Input
              value={form.acs_url}
              onChange={(e) => setForm({ ...form, acs_url: e.target.value })}
              placeholder="https://<project>.supabase.co/functions/v1/saml-acs?tenant=<slug>"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity Provider (IdP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>IdP SSO URL</Label>
            <Input
              value={form.idp_sso_url}
              onChange={(e) => setForm({ ...form, idp_sso_url: e.target.value })}
              placeholder="https://your-idp.okta.com/app/xxxxx/sso/saml"
            />
          </div>
          <div>
            <Label>IdP Entity ID</Label>
            <Input
              value={form.idp_entity_id}
              onChange={(e) => setForm({ ...form, idp_entity_id: e.target.value })}
            />
          </div>
          <div>
            <Label>IdP X.509 Certificate (PEM)</Label>
            <Textarea
              value={form.idp_certificate}
              onChange={(e) => setForm({ ...form, idp_certificate: e.target.value })}
              rows={6}
              className="font-mono text-xs"
              placeholder="-----BEGIN CERTIFICATE-----..."
            />
          </div>
          <div>
            <Label>Or paste full IdP metadata XML</Label>
            <Textarea
              value={form.idp_metadata_xml}
              onChange={(e) => setForm({ ...form, idp_metadata_xml: e.target.value })}
              rows={4}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enforcement</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            checked={form.is_enforced}
            onCheckedChange={(v) => setForm({ ...form, is_enforced: v })}
          />
          <div>
            <div className="font-medium">Require SSO for all users in this workspace</div>
            <div className="text-sm text-muted-foreground">
              Password login will be blocked. Only enable after a successful test login.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={upsert.isPending || isLoading}>
          Save configuration
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent SSO login attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-muted-foreground">No attempts yet.</div>
          ) : (
            <div className="divide-y">
              {events.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <Badge variant={ev.success ? "default" : "destructive"}>
                      {ev.success ? "OK" : "FAIL"}
                    </Badge>{" "}
                    <span className="text-muted-foreground ml-2">
                      {format(new Date(ev.occurred_at), "MMM d HH:mm")}
                    </span>
                    {ev.error && <span className="ml-2 text-destructive">{ev.error}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{ev.ip}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
