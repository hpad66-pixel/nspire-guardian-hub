import { motion } from 'framer-motion';
import { DollarSign, Clock, ShieldAlert, FileWarning, TrendingDown, Scale } from 'lucide-react';

const stats = [
  {
    icon: DollarSign,
    value: '$50K+',
    label: 'Average cost of a single HUD non-compliance finding',
    color: '#F43F5E',
    accent: 'rgba(244,63,94,0.12)',
    borderColor: 'rgba(244,63,94,0.25)',
  },
  {
    icon: Clock,
    value: '40 hrs/mo',
    label: 'Wasted every month on spreadsheets, emails, and paper forms',
    color: '#F59E0B',
    accent: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  {
    icon: ShieldAlert,
    value: '3×',
    label: 'More likely to face enforcement without digital audit trails',
    color: 'var(--apas-sapphire)',
    accent: 'rgba(29,111,232,0.12)',
    borderColor: 'rgba(29,111,232,0.25)',
  },
];

const painPoints = [
  {
    icon: FileWarning,
    title: 'NSPIRE & HUD Compliance Risk',
    description: 'HUD inspections don\'t forgive paper-based systems. 80+ defect categories. Life-threatening violations must be resolved in 24 hours. One unresolved finding cascades into enforcement that costs far more than the repair.',
    accent: 'rgba(244,63,94,0.08)',
    accentBorder: 'rgba(244,63,94,0.2)',
    iconColor: '#F43F5E',
  },
  {
    icon: TrendingDown,
    title: 'Operational Black Holes',
    description: 'Your team completed an inspection. Did the defects get issued? Did the work orders get created? Did the sub get notified? Without a connected system, you don\'t know — until a regulator asks.',
    accent: 'rgba(245,158,11,0.08)',
    accentBorder: 'rgba(245,158,11,0.2)',
    iconColor: '#F59E0B',
  },
  {
    icon: Scale,
    title: 'No Accountability, No Defense',
    description: 'Without timestamped records, GPS-tagged photos, and complete audit trails, you can\'t prove what was done, when, or by whom. In a dispute — with a tenant, inspector, or regulator — that gap is everything.',
    accent: 'rgba(29,111,232,0.08)',
    accentBorder: 'rgba(29,111,232,0.2)',
    iconColor: 'var(--apas-sapphire)',
  },
];

export function ValueProposition() {
  return (
    <section id="value" style={{ background: 'var(--apas-deep)', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 4.5vw, 54px)', color: 'var(--apas-white)', lineHeight: 1.1, marginBottom: '20px' }}>
            The Silent Killer in Property Operations<br />
            <em style={{ color: 'var(--apas-muted)' }}>Isn't Neglect. It's Fragmentation.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.8 }}>
            Property management isn't just about collecting rent. It's about protecting a multi-million dollar asset from risks that compound daily.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-20">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <div
                style={{
                  background: stat.accent,
                  border: `1px solid ${stat.borderColor}`,
                  borderRadius: '18px',
                  padding: '36px 28px',
                  textAlign: 'center',
                }}
              >
                <div style={{ height: '52px', width: '52px', borderRadius: '14px', background: stat.accent, border: `1px solid ${stat.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <stat.icon size={24} color={stat.color} />
                </div>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: '12px' }}>{stat.value}</p>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', lineHeight: 1.7 }}>{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pain point cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {painPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <div
                style={{
                  background: 'var(--apas-surface)',
                  border: `1px solid var(--apas-border)`,
                  borderRadius: '20px',
                  padding: '32px',
                  height: '100%',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ height: '52px', width: '52px', borderRadius: '14px', background: point.accent, border: `1px solid ${point.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <point.icon size={24} color={point.iconColor} />
                </div>
                <h3 style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '18px', color: 'var(--apas-white)', marginBottom: '12px' }}>{point.title}</h3>
                <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', lineHeight: 1.8 }}>{point.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
