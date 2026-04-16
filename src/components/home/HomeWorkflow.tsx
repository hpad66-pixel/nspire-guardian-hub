import { motion } from 'framer-motion';
import { Camera, AlertTriangle, Wrench, CheckCircle, ArrowRight } from 'lucide-react';

const steps = [
  { icon: Camera, label: 'Defect Found', desc: 'Inspector photographs issue during walkthrough', color: '#EF4444', bg: 'bg-red-500/10' },
  { icon: AlertTriangle, label: 'Issue Created', desc: 'Auto-logged with GPS, timestamp, and severity', color: '#F59E0B', bg: 'bg-amber-500/10' },
  { icon: Wrench, label: 'Work Order', desc: 'Automatically assigned to the right team member', color: '#3B82F6', bg: 'bg-blue-500/10' },
  { icon: CheckCircle, label: 'Resolved', desc: 'Photo proof, sign-off, audit trail — all captured', color: '#10B981', bg: 'bg-emerald-500/10' },
];

export function HomeWorkflow() {
  return (
    <section className="relative py-28 overflow-hidden" style={{ background: '#FAFAF9' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-emerald-500/80 mb-4" style={{ fontFamily: 'Inter' }}>Automation</p>
          <h2 className="text-[#0A0B0D] mb-5" style={{
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 46px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            From defect to done.{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">Automatically.</span>
          </h2>
          <p className="text-[#71717A] max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter', fontSize: '17px' }}>
            No manual handoffs. No lost paperwork. Every step is connected, timestamped, and auditable.
          </p>
        </motion.div>

        {/* Workflow steps */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                viewport={{ once: true }}
                className="flex-1 rounded-2xl bg-white border border-[#E4E4E7] p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center mx-auto mb-4`}>
                  <step.icon size={22} color={step.color} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#0A0B0D] mb-2" style={{ fontFamily: 'Inter' }}>{step.label}</h3>
                <p className="text-[13px] text-[#A1A1AA] leading-relaxed" style={{ fontFamily: 'Inter' }}>{step.desc}</p>
              </motion.div>
              {i < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.12 + 0.3 }}
                  viewport={{ once: true }}
                  className="hidden md:flex items-center"
                >
                  <ArrowRight size={16} className="text-[#D4D4D8]" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
