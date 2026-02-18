import { motion } from 'framer-motion';
import { 
  ClipboardCheck, Shield, FileText, Wrench, MessageSquare, BarChart3, Phone, Users, FolderOpen
} from 'lucide-react';

const modules = [
  { icon: ClipboardCheck, label: 'Inspections', color: '#10B981' },
  { icon: Shield, label: 'NSPIRE', color: '#1D6FE8' },
  { icon: FileText, label: 'Permits', color: '#8B5CF6' },
  { icon: Wrench, label: 'Work Orders', color: '#F59E0B' },
  { icon: Phone, label: 'AI Voice', color: '#8B5CF6' },
  { icon: FolderOpen, label: 'Documents', color: '#F59E0B' },
  { icon: Users, label: 'Team RBAC', color: '#1D6FE8' },
  { icon: MessageSquare, label: 'Messaging', color: '#F43F5E' },
  { icon: BarChart3, label: 'Analytics', color: '#06B6D4' },
];

export function PlatformOverview() {
  return (
    <section style={{ background: 'var(--apas-midnight)', padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--apas-grid) 1px, transparent 1px), linear-gradient(90deg, var(--apas-grid) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 4.5vw, 52px)', color: 'var(--apas-white)', lineHeight: 1.1, marginBottom: '20px' }}>
            One OS.{' '}
            <em style={{ color: 'var(--apas-sapphire)' }}>Every System.</em>{' '}
            All Connected.
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '680px', margin: '0 auto', lineHeight: 1.8 }}>
            Every inspection auto-creates issues. Every issue auto-creates work orders. Every permit expiry triggers an alert. Every action leaves an audit trail.
          </p>
        </motion.div>

        {/* Module node grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 max-w-5xl mx-auto mb-16">
          {modules.map((mod, index) => (
            <motion.div
              key={mod.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="flex flex-col items-center gap-2 group cursor-default"
            >
              <div
                style={{
                  height: '60px',
                  width: '60px',
                  borderRadius: '16px',
                  background: `${mod.color}18`,
                  border: `1px solid ${mod.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.25s ease',
                  boxShadow: `0 0 0 0 ${mod.color}40`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = `${mod.color}28`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${mod.color}30`;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = `${mod.color}18`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 0 ${mod.color}40`;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <mod.icon size={22} color={mod.color} />
              </div>
              <span style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 600, color: 'var(--apas-muted)', textAlign: 'center', lineHeight: 1.3 }}>{mod.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="flex justify-center"
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '16px',
              background: 'var(--apas-surface)',
              border: '1px solid var(--apas-border)',
              borderRadius: '999px',
              padding: '14px 28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--apas-white)' }}>Every action. Every decision. Every defect.</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--apas-muted)' }}>Timestamped, attributed, and retrievable.</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
