import { motion } from 'framer-motion';
import { Building2, Briefcase, HardHat, ClipboardCheck, Wrench } from 'lucide-react';

const roles = [
  {
    icon: Building2,
    title: 'Property Owner',
    value: 'Complete portfolio oversight. No surprises.',
    description: 'You own the asset. You carry the liability. APAS OS gives you visibility into every inspection, open issue, permit expiry, and maintenance dollar — without having to ask anyone.',
    color: '#8B5CF6',
  },
  {
    icon: Briefcase,
    title: 'Property Manager',
    value: 'One source of truth. Total operational control.',
    description: 'You\'re responsible for everything but can\'t be everywhere. One dashboard replaces the spreadsheets, email chains, paper logs, and filing cabinets.',
    color: '#1D6FE8',
  },
  {
    icon: HardHat,
    title: 'Superintendent',
    value: 'Field command center. Nothing falls through.',
    description: 'Assign work orders, track crews, log daily reports, manage change orders, and keep projects on schedule — all from your phone.',
    color: '#F59E0B',
  },
  {
    icon: ClipboardCheck,
    title: 'Inspector',
    value: '45-minute inspections. Zero paperwork.',
    description: 'Walk the grounds with your phone. Speak your findings. Take photos. NSPIRE defect catalog is built in — the platform guides you through every inspection.',
    color: '#10B981',
  },
  {
    icon: Wrench,
    title: 'Subcontractor / Vendor',
    value: 'Clear instructions. Fast communication.',
    description: 'Clear work order assignments. Easy communication with the PM team. Training resources and safety documentation always accessible.',
    color: '#F43F5E',
  },
];

export function RoleValueSection() {
  return (
    <section id="roles" style={{ background: 'var(--apas-midnight)', padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
      {/* Grid bg */}
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
            Who APAS OS Is Built For
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.8 }}>
            From solo owner-operators to multi-portfolio firms. If you touch property, compliance, or construction — this is your platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {roles.map((role, index) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className={index === 4 ? 'md:col-span-2 lg:col-span-1 lg:col-start-2' : ''}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--apas-surface)',
                  border: '1px solid var(--apas-border)',
                  borderRadius: '20px',
                  padding: '32px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${role.color}35`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px ${role.color}20`;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--apas-border)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ height: '52px', width: '52px', borderRadius: '14px', background: `${role.color}18`, border: `1px solid ${role.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <role.icon size={24} color={role.color} />
                </div>
                <h3 style={{ fontFamily: 'Instrument Serif', fontSize: '22px', color: 'var(--apas-white)', marginBottom: '8px' }}>{role.title}</h3>
                <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', lineHeight: 1.8, marginBottom: '20px' }}>{role.description}</p>
                <div style={{ borderTop: `1px solid ${role.color}25`, paddingTop: '16px' }}>
                  <p style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: role.color }}>{role.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
