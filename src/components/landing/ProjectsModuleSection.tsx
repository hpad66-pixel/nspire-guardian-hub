import { motion } from 'framer-motion';
import { FolderKanban, FileQuestion, Package, Receipt, ShoppingCart, Sparkles, CheckCircle2, Circle } from 'lucide-react';

const features = [
  {
    icon: FolderKanban,
    title: 'Project Dashboard',
    description: 'Gantt view, milestones, timeline at a glance',
    color: 'hsl(262 83% 58%)',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.25)',
  },
  {
    icon: FileQuestion,
    title: 'RFI Management',
    description: 'Log, assign, and track every request for information',
    color: 'var(--apas-sapphire)',
    bg: 'rgba(29,111,232,0.12)',
    border: 'rgba(29,111,232,0.25)',
  },
  {
    icon: Package,
    title: 'Submittals',
    description: 'Track submittals through review and approval',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
  },
  {
    icon: Receipt,
    title: 'Change Orders',
    description: 'Manage scope changes with full audit trail',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
  },
  {
    icon: ShoppingCart,
    title: 'Procurement',
    description: 'Track materials and vendor orders',
    color: '#F43F5E',
    bg: 'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.25)',
  },
  {
    icon: Sparkles,
    title: 'AI Proposals',
    description: 'Generate professional project proposals in seconds',
    color: 'hsl(262 83% 58%)',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.25)',
  },
];

const timelineItems = [
  { label: 'Tear-off Complete', status: 'done' },
  { label: 'Underlayment', status: 'active' },
  { label: 'Shingles', status: 'pending' },
];

export function ProjectsModuleSection() {
  return (
    <section
      style={{ background: 'var(--apas-midnight)', padding: '100px 0', position: 'relative', overflow: 'hidden' }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--apas-grid) 1px, transparent 1px), linear-gradient(90deg, var(--apas-grid) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          opacity: 0.5,
        }}
      />
      {/* Violet glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">

        {/* Heading block */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 mb-6"
            style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '999px',
              padding: '5px 14px',
            }}
          >
            <span style={{ width: '6px', height: '6px', background: 'hsl(262 83% 58%)', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'hsl(262 83% 58%)', letterSpacing: '0.06em' }}>
              CONSTRUCTION PROJECT MANAGEMENT
            </span>
          </div>

          <h2
            style={{
              fontFamily: 'Instrument Serif',
              fontSize: 'clamp(28px, 4.5vw, 54px)',
              color: 'var(--apas-white)',
              lineHeight: 1.1,
              marginBottom: '20px',
            }}
          >
            Built for the PM Who Runs<br />
            <em style={{ color: 'hsl(262 83% 58%)' }}>Projects and Properties.</em>
          </h2>

          <p
            style={{
              fontFamily: 'DM Sans',
              fontSize: '18px',
              color: 'var(--apas-muted)',
              maxWidth: '580px',
              margin: '0 auto',
              lineHeight: 1.8,
            }}
          >
            Most PMs manage construction and compliance on the same day. APAS OS is the only platform that connects both — one login, one dashboard, complete visibility.
          </p>
        </motion.div>

        {/* 6-feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <div
                style={{
                  background: 'var(--apas-surface)',
                  border: '1px solid var(--apas-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  height: '100%',
                  transition: 'border-color 0.2s',
                }}
              >
                <div
                  style={{
                    height: '44px',
                    width: '44px',
                    borderRadius: '12px',
                    background: feature.bg,
                    border: `1px solid ${feature.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <feature.icon size={20} color={feature.color} />
                </div>
                <h3 style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '15px', color: 'var(--apas-white)', marginBottom: '6px' }}>
                  {feature.title}
                </h3>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom mock UI */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div
            style={{
              background: 'var(--apas-surface)',
              border: '1px solid var(--apas-border)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Project header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--apas-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <p style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '14px', color: 'var(--apas-white)' }}>
                Riverdale Roof Rehabilitation
              </p>
              <span
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '10px',
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: 'hsl(262 83% 58%)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}
              >
                In Progress
              </span>
            </div>

            {/* Metric pills */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--apas-border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: '42 days left', color: 'var(--apas-sapphire)', bg: 'rgba(29,111,232,0.12)', border: 'rgba(29,111,232,0.25)' },
                { label: '3 RFIs Open', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
                { label: '$127K remaining', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
              ].map((pill) => (
                <span
                  key={pill.label}
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                    color: pill.color,
                    background: pill.bg,
                    border: `1px solid ${pill.border}`,
                    padding: '4px 12px',
                    borderRadius: '999px',
                  }}
                >
                  {pill.label}
                </span>
              ))}
            </div>

            {/* Mini tab strip */}
            <div style={{ padding: '0 20px', borderBottom: '1px solid var(--apas-border)', display: 'flex', gap: '0' }}>
              {['Overview', 'Schedule', 'RFIs', 'Financials'].map((tab, i) => (
                <span
                  key={tab}
                  style={{
                    fontFamily: 'DM Sans',
                    fontSize: '12px',
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? 'var(--apas-white)' : 'var(--apas-muted)',
                    padding: '10px 14px',
                    borderBottom: i === 0 ? '2px solid hsl(262 83% 58%)' : '2px solid transparent',
                    cursor: 'default',
                  }}
                >
                  {tab}
                </span>
              ))}
            </div>

            {/* Timeline rows */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {timelineItems.map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {item.status === 'done' && <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />}
                  {item.status === 'active' && (
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'var(--apas-sapphire)',
                        flexShrink: 0,
                        boxShadow: '0 0 8px rgba(29,111,232,0.5)',
                      }}
                    />
                  )}
                  {item.status === 'pending' && <Circle size={16} color="var(--apas-muted)" style={{ flexShrink: 0 }} />}
                  <span
                    style={{
                      fontFamily: 'DM Sans',
                      fontSize: '13px',
                      color: item.status === 'done' ? '#10B981' : item.status === 'active' ? 'var(--apas-white)' : 'var(--apas-muted)',
                      fontWeight: item.status === 'active' ? 600 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                  {item.status === 'active' && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-sapphire)', marginLeft: 'auto' }}>
                      In Progress
                    </span>
                  )}
                  {item.status === 'pending' && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)', marginLeft: 'auto' }}>
                      Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
