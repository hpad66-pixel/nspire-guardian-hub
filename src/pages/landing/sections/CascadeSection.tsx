import { motion } from 'framer-motion';
import { FileSignature, Layers, Receipt, GitBranch, PieChart, BadgeCheck } from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal, CountUp, Chip } from '../shared';

const STEPS = [
  {
    icon: FileSignature, title: 'Prime Contract', mono: 'PC-01 · executed',
    body: 'One contract of record — owner, terms, retainage, schedule.',
    num: { to: 523061, prefix: '$', label: 'original value' },
  },
  {
    icon: Layers, title: 'Schedule of Values', mono: '24 line items · cost-coded',
    body: 'Every line carries a cost code, so everything downstream aggregates itself.',
    num: { to: 24, label: 'SOV lines feeding every pay app' },
  },
  {
    icon: GitBranch, title: 'Change Orders', mono: 'CO #1–9 · signed',
    body: 'Quantity COs tie back to their base SOV line at the same unit price. No orphan math.',
    num: { to: 231246, prefix: '+$', label: 'approved & rolled into the contract' },
  },
  {
    icon: Receipt, title: 'Pay Application', mono: 'G702 / G703 · #5',
    body: 'Generated from the SOV plus approved COs — previous billings, retainage, and balance computed for you.',
    num: { to: 754307, prefix: '$', label: 'revised contract, automatically' },
  },
  {
    icon: PieChart, title: 'Budget & Cash Position', mono: 'live rollup',
    body: 'Billed, received, retainage held, owed to subs — reconciled in one view.',
    num: { to: 96, suffix: '%', label: 'billed to date, matched to the penny' },
  },
];

export function CascadeSection() {
  return (
    <section id="cascade" style={{
      background: `radial-gradient(900px 500px at 85% 0%, rgba(196,163,90,0.10), transparent 55%),
                   linear-gradient(180deg, ${C.obsidian2} 0%, ${C.obsidian} 100%)`,
      padding: '110px 0 120px',
    }}>
      <div style={CONTAINER}>
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-16 items-start">
          {/* Sticky copy */}
          <div className="lg:sticky" style={{ top: 110 }}>
            <Reveal><Eyebrow dark>The signature</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <SectionTitle dark style={{ margin: '22px 0 20px' }}>
                One financial chain, from contract to <Serif>the last penny.</Serif>
              </SectionTitle>
            </Reveal>
            <Reveal delay={0.16}>
              <Sub dark>
                Most software stores your numbers. projOS <em style={{ color: C.creamOnDark, fontStyle: 'normal', fontWeight: 600 }}>connects</em> them.
                Change an approved CO and the revised contract, the next pay app, and the budget rollup all update —
                because they were never separate numbers to begin with.
              </Sub>
            </Reveal>
            <Reveal delay={0.24}>
              <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Chip dark tone="gold"><BadgeCheck size={12} /> AIA-style G702 / G703</Chip>
                <Chip dark tone="gold">Lien waivers</Chip>
                <Chip dark tone="gold">Owner e-signature</Chip>
                <Chip dark tone="gold">Overbilling guard</Chip>
              </div>
            </Reveal>
          </div>

          {/* Cascade flow */}
          <div style={{ position: 'relative' }}>
            {/* Drawn line */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              style={{
                position: 'absolute', left: 21, top: 24, bottom: 40, width: 2,
                background: `linear-gradient(180deg, ${C.gold}, rgba(196,163,90,0.15))`,
                transformOrigin: 'top', borderRadius: 2,
              }}
              aria-hidden
            />
            <div style={{ display: 'grid', gap: 18 }}>
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <Reveal key={s.title} delay={i * 0.08} y={28}>
                    <div style={{ display: 'flex', gap: 18 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0, zIndex: 1,
                        background: C.obsidian2, border: '1px solid rgba(196,163,90,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 0 6px rgba(18,16,13,1)',
                      }}>
                        <Icon size={18} color={C.gold} />
                      </div>
                      <div style={{
                        flex: 1, background: C.cardOnDark, border: `1px solid ${C.lineOnDark}`,
                        borderRadius: 16, padding: '18px 20px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 17, color: C.creamOnDark }}>{s.title}</span>
                          <span style={{ fontFamily: F.mono, fontSize: 10.5, color: C.faint, letterSpacing: '0.06em' }}>{s.mono}</span>
                        </div>
                        <p style={{ fontFamily: F.sans, fontSize: 13.5, lineHeight: 1.6, color: C.dimOnDark, margin: '0 0 12px' }}>{s.body}</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.gold }}>
                            <CountUp to={s.num.to} prefix={s.num.prefix ?? ''} suffix={s.num.suffix ?? ''} />
                          </span>
                          <span style={{ fontFamily: F.sans, fontSize: 12, color: C.faint }}>{s.num.label}</span>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={0.35} y={16}>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 12, color: C.emerald, letterSpacing: '0.08em',
                  border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.08)',
                  padding: '9px 18px', borderRadius: 100,
                }}>
                  ✓ $523,061.00 + $231,246.23 = $754,307.23 — everywhere, always
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
