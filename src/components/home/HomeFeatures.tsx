import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Mic, Wrench, FolderKanban, Users, Shield, Smartphone } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

/* ── Feature Mockup Cards ── */

function InspectionMockup() {
  return (
    <div className="rounded-2xl bg-white border border-[#E4E4E7] p-5 shadow-lg max-w-[340px] w-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-semibold text-[#0A0B0D]" style={{ fontFamily: 'Inter' }}>Daily Grounds Inspection</span>
        <span className="text-[10px] text-[#A1A1AA] font-medium" style={{ fontFamily: "'JetBrains Mono'" }}>8:42 AM</span>
      </div>
      {[
        { label: 'Parking Lot A', ok: true },
        { label: 'Building Exterior', ok: true },
        { label: 'Playground', ok: false },
      ].map(item => (
        <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#F4F4F5] last:border-0">
          <span className="text-[13px] text-[#3F3F46]" style={{ fontFamily: 'Inter' }}>{item.label}</span>
          {item.ok ? <CheckCircle size={15} className="text-emerald-500" /> : <AlertTriangle size={15} className="text-red-500" />}
        </div>
      ))}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex gap-[2px] items-end">
          {[8, 12, 6, 16, 10, 14, 8].map((h, i) => (
            <div key={i} className="w-1 rounded-sm bg-blue-500" style={{ height: `${h}px`, animation: `wave 1.2s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <span className="text-[11px] font-medium text-blue-500" style={{ fontFamily: 'Inter' }}>Voice recording…</span>
        <span className="ml-auto text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded">1 defect → WO</span>
      </div>
      <style>{`@keyframes wave { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }`}</style>
    </div>
  );
}

function VoiceAgentMockup() {
  return (
    <div className="rounded-2xl p-5 max-w-[340px] w-full" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[13px] font-semibold text-purple-200" style={{ fontFamily: 'Inter' }}>AI Voice Agent · Live</span>
      </div>
      <div className="flex gap-[3px] items-end justify-center mb-4 h-8">
        {[12, 20, 28, 16, 24, 18, 28, 14].map((h, i) => (
          <div key={i} className="w-[5px] rounded-sm bg-purple-400/60" style={{ height: `${h}px`, animation: `wave 1s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <div className="rounded-xl bg-white/[0.08] p-3 space-y-2">
        <p className="text-[11px] text-white/40" style={{ fontFamily: 'Inter' }}>Tenant</p>
        <p className="text-[13px] text-purple-200" style={{ fontFamily: 'Inter' }}>"Leak under my kitchen sink, Unit 204B"</p>
        <p className="text-[11px] text-white/40 mt-2" style={{ fontFamily: 'Inter' }}>Build Space AI</p>
        <p className="text-[13px] text-emerald-300" style={{ fontFamily: 'Inter' }}>"Got it. Ticket created, your team has been notified."</p>
      </div>
      <div className="flex gap-2 mt-3">
        {[{ label: 'Plumbing', c: 'text-purple-300' }, { label: 'Medium', c: 'text-amber-300' }, { label: 'Created ✓', c: 'text-emerald-300' }].map(b => (
          <span key={b.label} className={`text-[10px] font-semibold ${b.c} bg-white/[0.08] px-2 py-0.5 rounded`} style={{ fontFamily: 'Inter' }}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

function ProjectMockup() {
  return (
    <div className="rounded-2xl bg-white border border-[#E4E4E7] p-5 shadow-lg max-w-[340px] w-full">
      <div className="mb-1 text-[13px] font-semibold text-[#0A0B0D]" style={{ fontFamily: 'Inter' }}>Roof Replacement · Building C</div>
      <div className="text-[12px] text-[#A1A1AA] mb-3" style={{ fontFamily: 'Inter' }}>60% complete</div>
      <div className="h-1.5 bg-[#F4F4F5] rounded-full mb-4">
        <div className="h-full rounded-full w-[60%]" style={{ background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)' }} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[{ label: 'Daily Reports', val: '12' }, { label: 'Open RFIs', val: '3' }, { label: 'Change Orders', val: '$45K' }].map(m => (
          <div key={m.label} className="bg-[#FAFAF9] rounded-lg p-2 text-center">
            <div className="text-[14px] font-bold text-[#0A0B0D]" style={{ fontFamily: "'JetBrains Mono'" }}>{m.val}</div>
            <div className="text-[9px] text-[#A1A1AA]" style={{ fontFamily: 'Inter' }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Feature Sections ── */

interface Feature {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  body: string;
  bullets: string[];
  mockup: React.ReactNode;
  flip: boolean;
}

const features: Feature[] = [
  {
    eyebrow: 'Daily Operations',
    eyebrowColor: '#10B981',
    title: 'Inspections that take 45 minutes, not 4 hours.',
    body: 'Walk your property with your phone. Speak your findings. Take GPS-tagged photos. When you find a defect, a work order is created before you leave the room.',
    bullets: ['Voice dictation in English and Spanish', 'GPS + timestamped photo evidence', 'Automatic work order creation from defects', 'NSPIRE defect catalog (80+ items)', 'Supervisor review with one-tap approval', 'Auto-generated PDF inspection reports'],
    mockup: <InspectionMockup />,
    flip: false,
  },
  {
    eyebrow: 'AI-Powered',
    eyebrowColor: '#A855F7',
    title: 'Your 24/7 AI maintenance call center.',
    body: 'Tenants call at 2am. The AI answers naturally, captures the issue, verifies the unit, classifies the request, and creates a work order — all before your superintendent\'s phone rings.',
    bullets: ['Natural AI conversation in multiple languages', 'Emergency detection: fire, flood, gas → instant alerts', 'Auto-created work orders with transcripts', 'Complete call recordings and audit trails', 'Tickets flow directly into work order queue'],
    mockup: <VoiceAgentMockup />,
    flip: true,
  },
  {
    eyebrow: 'Project Management',
    eyebrowColor: '#6366F1',
    title: 'Capital projects. Total visibility. Bid to closeout.',
    body: 'Milestones, daily site reports, RFI tracking, submittal logs, change order approvals, punch lists, safety logs, and closeout documentation — all in one place.',
    bullets: ['Gantt charts and milestone timelines', 'Daily reports with photos and voice dictation', 'Formal RFI workflow with numbering', 'Change order approvals with budget tracking', 'Punch list with digital sign-off', 'AI-powered proposal generation'],
    mockup: <ProjectMockup />,
    flip: false,
  },
];

function FeatureCheck({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
      <span className="text-[14px] text-[#71717A] leading-relaxed" style={{ fontFamily: 'Inter' }}>{text}</span>
    </li>
  );
}

export function HomeFeatures() {
  return (
    <section id="features" className="py-28" style={{ background: '#fff' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-blue-500/80 mb-4" style={{ fontFamily: 'Inter' }}>Features</p>
          <h2 className="text-[#0A0B0D]" style={{
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 46px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            Every feature built around a real problem.
          </h2>
        </motion.div>

        <div className="flex flex-col gap-28">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
              viewport={{ once: true, margin: '-60px' }}
              className={`flex flex-col lg:flex-row items-center gap-16 ${feat.flip ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className="flex-1 space-y-6">
                <span className="text-[12px] font-semibold tracking-[0.08em] uppercase" style={{ fontFamily: 'Inter', color: feat.eyebrowColor }}>{feat.eyebrow}</span>
                <h3 className="text-[#0A0B0D] leading-snug" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.02em' }}>{feat.title}</h3>
                <p className="text-[#71717A] leading-relaxed" style={{ fontFamily: 'Inter', fontSize: '16px' }}>{feat.body}</p>
                <ul className="space-y-2">
                  {feat.bullets.map(b => <FeatureCheck key={b} text={b} />)}
                </ul>
              </div>
              <div className="flex-1 flex justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  {feat.mockup}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
