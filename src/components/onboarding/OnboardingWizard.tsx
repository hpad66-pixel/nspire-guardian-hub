import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WelcomeStep } from './WelcomeStep';
import { PropertyStep } from './PropertyStep';
import { TeamStep } from './TeamStep';
import { CompleteStep } from './CompleteStep';
import type { Database } from '@/integrations/supabase/types';

export type OnboardingStep = 'welcome' | 'property' | 'team' | 'complete';

type AppRole = Database['public']['Enums']['app_role'];

export interface OnboardingData {
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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<OnboardingData>({});

  const handleNext = (stepData?: Partial<OnboardingData>) => {
    if (stepData) {
      setData((prev) => ({ ...prev, ...stepData }));
    }

    switch (currentStep) {
      case 'welcome':
        setCurrentStep('property');
        break;
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
              <WelcomeStep onNext={handleNext} />
            )}
            {currentStep === 'property' && (
              <PropertyStep
                onNext={handleNext}
                onBack={handleBack}
                initialData={data.property}
              />
            )}
            {currentStep === 'team' && (
              <TeamStep
                onNext={handleNext}
                onBack={handleBack}
                propertyName={data.property?.name}
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
