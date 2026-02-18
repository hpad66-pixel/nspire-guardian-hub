import { useState } from 'react';
import { Building, ArrowRight, ClipboardCheck, TreePine, FolderKanban, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WelcomeStepProps {
  onNext: (data: { workspaceName: string }) => void;
  isLoading?: boolean;
}

export function WelcomeStep({ onNext, isLoading: externalLoading }: WelcomeStepProps) {
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const isLoading = externalLoading || isLocalLoading;

  const handleNext = async () => {
    const trimmed = orgName.trim();
    if (!trimmed) {
      setError('Organization name is required');
      return;
    }
    setError('');
    setIsLocalLoading(true);
    await new Promise((r) => setTimeout(r, 150));
    onNext({ workspaceName: trimmed });
    setIsLocalLoading(false);
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center space-y-6 pb-4">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Building className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-bold">
            Welcome to APAS OS!
          </CardTitle>
          <CardDescription className="text-lg">
            Let's set up your workspace in just a few steps.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Organization name field */}
        <div className="space-y-2">
          <Label htmlFor="org-name" className="text-sm font-medium">
            Organization Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="org-name"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleNext();
              }
            }}
            placeholder="Acme Property Management"
            className="text-base"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            This becomes your workspace name and will appear across the platform.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid gap-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <TreePine className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold">Daily Grounds Inspections</h3>
              <p className="text-sm text-muted-foreground">
                Track exterior conditions and asset status every day
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">NSPIRE Compliance</h3>
              <p className="text-sm text-muted-foreground">
                Manage HUD inspections and track defect remediation
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <FolderKanban className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="font-semibold">Project Management</h3>
              <p className="text-sm text-muted-foreground">
                Coordinate capital improvements with your team
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={handleNext} className="px-8" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
