import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, AlertTriangle, Clock } from 'lucide-react';

const capabilities = [
  'Full NSPIRE defect catalog (Health & Safety, Moderate, Low)',
  'Life-threatening violation alerts with 24-hour resolution timer',
  'GPS + timestamp + photo evidence per defect',
  'NSPIRE score tracking across your portfolio',
];

export function NspireShowcase() {
  return (
    <section
      style={{
        background: 'var(--apas-deep)',
        padding: '100px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 50%, rgba(29,111,232,0.07) 0%, transparent 60%), radial-gradient(ellipse at 20% 50%, rgba(244,63,94,0.05) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: '-80px' }}
          >
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 mb-6"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '999px',
                padding: '5px 14px',
              }}
            >
              <span style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#10B981', letterSpacing: '0.06em' }}>
                NSPIRE COMPLIANCE SUITE · ADD-ON MODULE
              </span>
            </div>

            {/* Headline */}
            <h2
              style={{
                fontFamily: 'Instrument Serif',
                fontSize: 'clamp(28px, 4vw, 50px)',
                color: 'var(--apas-white)',
                lineHeight: 1.1,
                marginBottom: '20px',
              }}
            >
              The Only Field Software<br />
              Built Around{' '}
              <span style={{ color: 'var(--apas-sapphire)' }}>HUD's NSPIRE Standard.</span>
            </h2>

            {/* Subtext */}
            <p
              style={{
                fontFamily: 'DM Sans',
                fontSize: '17px',
                color: 'var(--apas-muted)',
                lineHeight: 1.8,
                marginBottom: '32px',
              }}
            >
              80+ defect categories. Life-threatening violations auto-escalated in 24 hours. GPS-tagged photos. Voice-captured findings. Complete audit trail for every inspection — outside, inside, and unit-level.{' '}
              <span style={{ color: 'var(--apas-white)', fontWeight: 500 }}>When HUD walks in, you walk in ready.</span>
            </p>

            {/* Capability bullets */}
            <ul className="flex flex-col gap-3 mb-10">
              {capabilities.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div
                    style={{
                      marginTop: '3px',
                      height: '18px',
                      width: '18px',
                      borderRadius: '50%',
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={11} color="#10B981" strokeWidth={3} />
                  </div>
                  <span style={{ fontFamily: 'DM Sans', fontSize: '15px', color: 'var(--apas-muted)', lineHeight: 1.6 }}>{item}</span>
                </li>
              ))}
            </ul>

            {/* Callout box */}
            <div
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '14px',
                padding: '20px 24px',
                marginBottom: '32px',
              }}
            >
              <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', lineHeight: 1.7 }}>
                <span style={{ color: '#F59E0B', fontWeight: 700 }}>One unresolved HUD finding costs an average of $50,000+.</span>{' '}
                One month of NSPIRE Suite costs less than a coffee per day.
              </p>
            </div>

            {/* CTA */}
            <Link
              to="/auth"
              className="inline-flex items-center gap-2"
              style={{
                fontFamily: 'DM Sans',
                fontWeight: 700,
                fontSize: '16px',
                background: '#10B981',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '12px',
                textDecoration: 'none',
                boxShadow: '0 0 30px rgba(16,185,129,0.3)',
              }}
            >
              Add NSPIRE to Your Plan <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* RIGHT — Mock inspection UI card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: '-80px' }}
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
              {/* Card header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--apas-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '14px', color: 'var(--apas-white)' }}>NSPIRE Inspection · Unit 4B</p>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)', marginTop: '2px' }}>Oak Ridge Apartments · Today</p>
                </div>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '10px',
                    background: 'rgba(29,111,232,0.15)',
                    border: '1px solid rgba(29,111,232,0.3)',
                    color: 'var(--apas-sapphire)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                  }}
                >
                  In Progress
                </span>
              </div>

              {/* Area rows */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--apas-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Outside Areas', status: 'All clear', dot: '#10B981' },
                  { label: 'Inside Common', status: 'All clear', dot: '#10B981' },
                  { label: 'Unit 4B', status: '2 defects found', dot: '#F59E0B' },
                ].map((area) => (
                  <div key={area.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.dot, flexShrink: 0, boxShadow: `0 0 6px ${area.dot}` }} />
                      <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>{area.label}</span>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: area.dot }}>{area.status}</span>
                  </div>
                ))}
              </div>

              {/* Defect row */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--apas-border)', background: 'rgba(244,63,94,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <AlertTriangle size={15} color="#F43F5E" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#F43F5E', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Damaged HVAC Filter
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', background: 'rgba(244,63,94,0.2)', color: '#F43F5E', padding: '2px 8px', borderRadius: '4px' }}>H&S</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#F59E0B' }}>
                      <Clock size={10} /> 24hr
                    </span>
                  </div>
                </div>
              </div>

              {/* NSPIRE score bar */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--apas-white)' }}>NSPIRE Score</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 700, color: 'var(--apas-sapphire)' }}>94.2</span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'var(--apas-border)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '94.2%' }}
                    transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                    style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, var(--apas-sapphire), #10B981)' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)' }}>0</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#10B981' }}>Passing threshold: 60</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)' }}>100</span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
