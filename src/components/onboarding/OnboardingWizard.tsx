import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WelcomeStep } from './WelcomeStep';
import { PropertyStep } from './PropertyStep';
import { TeamStep } from './TeamStep';
import { CompleteStep } from './CompleteStep';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type OnboardingStep = 'welcome' | 'property' | 'team' | 'complete';

type AppRole = Database['public']['Enums']['app_role'];

export interface OnboardingData {
  workspaceName?: string;
  workspaceId?: string;
  property?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    total_units: number;
    modules: {
      daily_grounds: boolean;
      nspire: boolean;
      projects: boolean;
    };
  };
  invitations?: {
    email: string;
    role: AppRole;
  }[];
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<OnboardingData>({});
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  // Called by WelcomeStep with { workspaceName }
  const handleWelcomeNext = async (welcomeData: { workspaceName: string }) => {
    if (!user) return;

    setIsCreatingWorkspace(true);
    try {
      // 1. Create the workspace
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: welcomeData.workspaceName,
          owner_user_id: user.id,
          plan: 'trial',
          status: 'trial',
        })
        .select('id, name, slug, plan, status')
        .single();

      if (wsError) throw wsError;

      // 2. Assign workspace to the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ workspace_id: workspace.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // 3. Promote user to 'owner' role (replaces default 'user' role)
      const { error: promoteError } = await supabase
        .rpc('promote_self_to_workspace_owner', { p_workspace_id: workspace.id });

      if (promoteError) {
        console.error('Failed to promote to owner:', promoteError);
        // Non-blocking — workspace was created successfully
      }

      // 4. Store in local state and advance
      setData((prev) => ({
        ...prev,
        workspaceName: welcomeData.workspaceName,
        workspaceId: workspace.id,
      }));
      setCurrentStep('property');
    } catch (err: any) {
      console.error('Failed to create workspace:', err);
      toast.error('Failed to create workspace. Please try again.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  // Called by subsequent steps with partial OnboardingData
  const handleNext = (stepData?: Partial<OnboardingData>) => {
    if (stepData) {
      setData((prev) => ({ ...prev, ...stepData }));
    }

    switch (currentStep) {
      case 'property':
        setCurrentStep('team');
        break;
      case 'team':
        setCurrentStep('complete');
        break;
      case 'complete':
        onComplete();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'property':
        setCurrentStep('welcome');
        break;
      case 'team':
        setCurrentStep('property');
        break;
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Skip setup
      </button>
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'welcome' && (
              <WelcomeStep
                onNext={handleWelcomeNext}
                isLoading={isCreatingWorkspace}
              />
            )}
            {currentStep === 'property' && (
              <PropertyStep
                onNext={handleNext}
                onBack={handleBack}
                initialData={data.property}
                workspaceId={data.workspaceId}
              />
            )}
            {currentStep === 'team' && (
              <TeamStep
                onNext={handleNext}
                onBack={handleBack}
                propertyName={data.property?.name}
                workspaceId={data.workspaceId}
              />
            )}
            {currentStep === 'complete' && (
              <CompleteStep
                data={data}
                onComplete={() => handleNext()}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
