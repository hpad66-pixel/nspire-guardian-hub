/**
 * G3 · UpgradeRequired
 *
 * Rendered in place of a portal page when the workspace's plan
 * does not include the required feature. URL is preserved so
 * the upgrade-and-return flow lands the user back here.
 */
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UpgradeRequiredProps {
  feature: string;
  /** Optional override for the human-readable feature name. */
  featureLabel?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  subcontractor_portal: 'Subcontractor Portal',
  owner_portal: 'Owner Portal',
  api: 'Public API',
  webhooks: 'Webhooks',
  sso: 'Single Sign-On',
  scim: 'SCIM Provisioning',
};

export function UpgradeRequired({ feature, featureLabel }: UpgradeRequiredProps) {
  const navigate = useNavigate();
  const label = featureLabel ?? FEATURE_LABELS[feature] ?? feature;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <CardTitle>{label} requires an upgrade</CardTitle>
          <CardDescription>
            Your current plan doesn&apos;t include {label}. Upgrade to unlock
            this portal for your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            onClick={() => navigate('/admin/billing')}
            className="w-full"
          >
            View plans &amp; upgrade
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default UpgradeRequired;
