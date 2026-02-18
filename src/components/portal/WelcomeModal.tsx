import { AnimatePresence, motion } from 'framer-motion';
import { House, MessageCircle, FolderOpen } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  projectName?: string;
  companyName: string;
  accentColor: string;
  logoUrl?: string | null;
}

const FEATURES = [
  {
    icon: House,
    text: 'Track progress — see milestones, timeline, and the latest updates from the job site.',
  },
  {
    icon: MessageCircle,
    text: 'Message the team — ask questions anytime. We respond within 1 business day.',
  },
  {
    icon: FolderOpen,
    text: 'Share and receive files — download contracts and reports, or upload documents for us.',
  },
];

export function WelcomeModal({
  open,
  onClose,
  projectName,
  companyName,
  accentColor,
  logoUrl,
}: WelcomeModalProps) {
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
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[420px] rounded-2xl p-7 space-y-6"
            style={{
              background: '#161B22',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Company logo / name */}
            <div className="flex flex-col items-center" style={{ minHeight: 60 }}>
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-10 w-auto object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: accentColor }}
                  />
                  <span className="text-sm font-semibold text-white">{companyName}</span>
                </div>
              )}
            </div>

            {/* Heading */}
            <div className="text-center space-y-3">
              <h1
                className="font-bold text-white leading-tight"
                style={{ fontSize: 22 }}
              >
                Welcome to your project portal
              </h1>

              {/* Project name chip */}
              {projectName && (
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    color: accentColor,
                    background: `${accentColor}22`,
                    border: `1px solid ${accentColor}44`,
                  }}
                >
                  {projectName}
                </span>
              )}
            </div>

            {/* Feature rows */}
            <div className="space-y-3">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: `${accentColor}20` }}
                  >
                    <Icon size={15} style={{ color: accentColor }} />
                  </div>
                  <p className="text-slate-400 leading-relaxed" style={{ fontSize: 13 }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
              style={{ background: accentColor }}
            >
              Let's get started →
            </button>

            {/* Footer hint */}
            <p className="text-center text-xs text-slate-500">
              You'll always be able to reach us through the Messages tab.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
