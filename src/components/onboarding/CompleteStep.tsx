import { useState } from 'react';
import { CheckCircle2, Building, Users, Loader2, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreateProperty } from '@/hooks/useProperties';
import { useCreateInvitation, useSendInvitation } from '@/hooks/useInvitations';
import { useCompleteOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';
import type { OnboardingData } from './OnboardingWizard';

interface CompleteStepProps {
  data: OnboardingData;
  onComplete: () => void;
}

export function CompleteStep({ data, onComplete }: CompleteStepProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const createProperty = useCreateProperty();
  const createInvitation = useCreateInvitation();
  const sendInvitation = useSendInvitation();
  const completeOnboarding = useCompleteOnboarding();

  const handleFinish = async () => {
    if (!data.property) {
      toast.error('Property data is missing');
      return;
    }

    setIsCreating(true);

    try {
      // Create the property
      const property = await createProperty.mutateAsync({
        name: data.property.name,
        address: data.property.address,
        city: data.property.city,
        state: data.property.state,
        zip_code: data.property.zip,
        total_units: data.property.total_units,
        nspire_enabled: data.property.modules.nspire,
        daily_grounds_enabled: data.property.modules.daily_grounds,
        projects_enabled: data.property.modules.projects,
        status: 'active',
        year_built: null,
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        mailing_address: null,
        mailing_city: null,
        mailing_state: null,
        mailing_zip: null,
      });

      // Send invitations
      if (data.invitations && data.invitations.length > 0) {
        for (const invite of data.invitations) {
          try {
            const invitation = await createInvitation.mutateAsync({
              email: invite.email,
              role: invite.role,
              property_id: property.id,
            });
            await sendInvitation.mutateAsync(invitation.id);
          } catch (err) {
            console.error('Failed to send invitation to:', invite.email, err);
          }
        }
      }

      // Mark onboarding as complete
      await completeOnboarding.mutateAsync();

      setIsDone(true);
      toast.success('Setup complete!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete setup');
      setIsCreating(false);
    }
  };

  if (isDone) {
    return (
      <Card className="border-0 shadow-2xl">
        <CardHeader className="text-center space-y-6 pb-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg animate-pulse">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">You're All Set!</CardTitle>
            <CardDescription className="text-lg">
              Your property is ready to go. Welcome to Glorieta Gardens!
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex justify-center pt-4 pb-8">
          <Button size="lg" onClick={onComplete} className="px-8">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">Ready to Go!</CardTitle>
          <CardDescription>
            Review your setup and click finish to get started
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="space-y-4">
          {/* Property summary */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{data.property?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {data.property?.address}, {data.property?.city}, {data.property?.state} {data.property?.zip}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs px-2 py-1 rounded-md bg-background border">
                    {data.property?.total_units} units
                  </span>
                  {data.property?.modules.daily_grounds && (
                    <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600">
                      Daily Grounds
                    </span>
                  )}
                  {data.property?.modules.nspire && (
                    <span className="text-xs px-2 py-1 rounded-md bg-blue-500/10 text-blue-600">
                      NSPIRE
                    </span>
                  )}
                  {data.property?.modules.projects && (
                    <span className="text-xs px-2 py-1 rounded-md bg-violet-500/10 text-violet-600">
                      Projects
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Team summary */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Team Invitations</h3>
                {data.invitations && data.invitations.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {data.invitations.map((invite) => (
                      <p key={invite.email} className="text-sm text-muted-foreground">
                        {invite.email} ({invite.role})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No team members to invite. You can add them later.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Finish button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleFinish}
            disabled={isCreating}
            className="px-8"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up...
              </>
            ) : (
              'Finish Setup'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
