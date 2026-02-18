import { motion } from 'framer-motion';

const timeline = [
  {
    quarter: 'Q4 2024',
    status: 'done',
    title: 'Foundation',
    items: ['Core property management', 'Daily inspections', 'NSPIRE engine', 'Work orders'],
  },
  {
    quarter: 'Q1 2025',
    status: 'done',
    title: 'Intelligence Layer',
    items: ['AI Voice Agent', 'Document Center', 'Property Archives', 'Project Management'],
  },
  {
    quarter: 'Q2 2025',
    status: 'done',
    title: 'Operations Hub',
    items: ['Training & Certification', 'CRM', 'Email Integration', 'QR Scanning', 'RBAC Complete'],
  },
  {
    quarter: 'Q3 2025',
    status: 'inprogress',
    title: 'Performance & Scale',
    items: ['Advanced Analytics', 'AI Proposal Generation', 'Offline Mobile Hardening', 'Bulk Import Tools'],
  },
  {
    quarter: 'Q4 2025',
    status: 'planned',
    title: 'Predictive Intelligence',
    items: ['Predictive Maintenance AI', 'Vendor Marketplace', 'Accounting Integration (QuickBooks/Xero)'],
  },
  {
    quarter: '2026',
    status: 'future',
    title: 'Platform Expansion',
    items: ['RegOS API Layer', 'Government Contractor Module', 'Carbon & ESG Reporting'],
  },
];

const statusStyles: Record<string, { dot: string; label: string; color: string }> = {
  done: { dot: '#10B981', label: '✅ Complete', color: '#10B981' },
  inprogress: { dot: '#F59E0B', label: '🔄 In Progress', color: '#F59E0B' },
  planned: { dot: '#8B5CF6', label: '🔮 Planned', color: '#8B5CF6' },
  future: { dot: '#1D6FE8', label: '🔮 2026', color: '#1D6FE8' },
};

export function RoadmapSection() {
  return (
    <section style={{ background: 'var(--apas-surface)', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 4vw, 52px)', color: 'var(--apas-white)', lineHeight: 1.15, marginBottom: '16px' }}>
            We're Shipping. <em>Every Month.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '640px', margin: '0 auto' }}>
            APAS OS is live and growing. New features ship every 30 days, informed by the operators and managers who use the platform daily.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {timeline.map((item, i) => {
            const s = statusStyles[item.status];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, margin: '-40px' }}
                style={{
                  background: 'var(--apas-deep)',
                  borderRadius: '14px',
                  padding: '24px',
                  border: `1px solid ${s.color}25`,
                  borderTop: `3px solid ${s.color}`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600, color: s.color }}>{item.quarter}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)', background: `${s.color}15`, borderRadius: '4px', padding: '2px 7px' }}>{s.label}</span>
                </div>
                <h4 style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '16px', color: 'var(--apas-white)', marginBottom: '12px' }}>{item.title}</h4>
                <ul className="space-y-1.5">
                  {item.items.map((feat) => (
                    <li key={feat} style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ color: s.color, marginTop: '2px', flexShrink: 0 }}>›</span> {feat}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: '20px', color: 'var(--apas-muted)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.7 }}>
            "Every feature on the roadmap comes from a real problem a real property manager told us they have. That's the only filter we use."
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            style={{
              fontFamily: 'DM Sans', fontWeight: 600, fontSize: '14px',
              padding: '12px 24px', borderRadius: '10px',
              border: '1px solid rgba(29,111,232,0.3)', color: '#1D6FE8',
              background: 'rgba(29,111,232,0.08)', cursor: 'pointer',
            }}
          >
            Request a Feature
          </button>
          <button
            style={{
              fontFamily: 'DM Sans', fontWeight: 600, fontSize: '14px',
              padding: '12px 24px', borderRadius: '10px',
              border: '1px solid var(--apas-border)', color: 'var(--apas-white)',
              background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
            }}
          >
            Join the Beta Program
          </button>
        </div>
      </div>
    </section>
  );
}
