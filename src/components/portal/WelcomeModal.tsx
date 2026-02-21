import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, MessageCircle, FolderOpen } from 'lucide-react';
import type { CompanyBranding } from '@/hooks/useCompanyBranding';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  projectName?: string;
  branding: CompanyBranding | null;
  accentColor: string;
}

const FEATURES = [
  {
    icon: CheckCircle2,
    title: 'Track your project progress',
    desc: 'See milestones, timelines, and real-time updates from the job site.',
  },
  {
    icon: MessageCircle,
    title: 'Message the team directly',
    desc: 'Ask questions anytime. We respond within one business day.',
  },
  {
    icon: FolderOpen,
    title: 'Access all your documents',
    desc: 'Contracts, permits, reports and drawings — all in one secure place.',
  },
];

export function WelcomeModal({
  open,
  onClose,
  projectName,
  branding,
  accentColor,
}: WelcomeModalProps) {
  const companyName = branding?.company_name ?? 'Your Project Team';
  const logoUrl = branding?.logo_url ?? null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full" style={{ background: accentColor }} />

            <div className="p-8 flex flex-col gap-6">
              {/* Company identity */}
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={companyName} className="h-9 object-contain" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: accentColor }}
                  >
                    {companyName.charAt(0)}
                  </div>
                )}
                <span className="text-white font-semibold text-sm">{companyName}</span>
              </div>

              {/* Welcome copy */}
              <h1 className="text-2xl font-bold text-white leading-snug">
                Welcome to your project portal
              </h1>

              {/* Project badge */}
              {projectName && (
                <div
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium w-fit"
                  style={{
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}30`,
                    color: accentColor,
                  }}
                >
                  {projectName}
                </div>
              )}

              {/* Feature list */}
              <div className="flex flex-col gap-4">
                {FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${accentColor}15` }}
                    >
                      <Icon size={18} style={{ color: accentColor }} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold leading-snug">{title}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
                style={{ background: accentColor }}
              >
                Let's get started →
              </button>

              {/* Footer note */}
              <p className="text-center text-xs text-slate-500">
                You can always reach the team through the Messages tab.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
