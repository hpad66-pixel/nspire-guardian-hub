import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal } from '../shared';

const MODULES = [
  'Financial cascade', 'Pay apps (G702/G703)', 'Change orders', 'RFIs & submittals',
  'Punch lists', 'Daily logs', 'Correspondence + AI', 'Meetings & minutes',
  'Action items', 'Client portals', 'Sub & owner portals', 'Scopes & invoicing',
  'Proposals', 'Environmental sampling', 'NSPIRE inspections', 'Daily grounds',
  'Equipment & safety', 'Portfolio cockpit',
];

const PACKAGES: { key: string; name: string; who: string; on: number[] }[] = [
  { key: 'construction', name: 'Construction', who: 'GCs & builders', on: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17] },
  { key: 'consulting', name: 'Consulting', who: 'Engineering & advisory', on: [6, 7, 8, 9, 11, 12, 17] },
  { key: 'consulting_env', name: 'Consulting + Environmental', who: 'Env. compliance firms', on: [6, 7, 8, 9, 11, 12, 13, 17] },
  { key: 'property', name: 'Property / nSpire', who: 'Property & HUD portfolios', on: [9, 14, 15, 16, 17] },
  { key: 'enterprise', name: 'Everything', who: 'Do-it-all operators', on: MODULES.map((_, i) => i) },
];

export function ModularSection() {
  const [pkg, setPkg] = useState(0);
  const active = new Set(PACKAGES[pkg].on);

  return (
    <section style={{ background: C.cardWarm, padding: '110px 0 120px', borderTop: `1px solid ${C.line}` }}>
      <div style={CONTAINER}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <Reveal><Eyebrow>Modular by design</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <SectionTitle style={{ margin: '22px auto 18px', maxWidth: 720 }}>
              Turn on what you run. <Serif>Pay for what you use.</Serif>
            </SectionTitle>
          </Reveal>
          <Reveal delay={0.16}>
            <Sub style={{ margin: '0 auto', textAlign: 'center', maxWidth: 620 }}>
              projOS is one platform sold as packages — a GC, a consulting firm, and a property manager each see a
              different product. Switch a package below and watch the platform reshape itself.
            </Sub>
          </Reveal>
        </div>

        {/* Package picker */}
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
            {PACKAGES.map((p, i) => (
              <button key={p.key} onClick={() => setPkg(i)} style={{
                fontFamily: F.sans, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                color: i === pkg ? '#171410' : C.dim,
                background: i === pkg ? `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})` : C.card,
                border: `1px solid ${i === pkg ? C.gold : C.line}`,
                boxShadow: i === pkg ? '0 4px 16px rgba(196,163,90,0.3)' : 'none',
                padding: '10px 20px', borderRadius: 100, transition: 'all 0.25s',
              }}>
                {p.name}
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, opacity: 0.75 }}>{p.who}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* Module grid */}
        <Reveal y={24}>
          <div style={{
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: 'clamp(20px, 3vw, 34px)',
            boxShadow: '0 18px 50px rgba(26,23,20,0.06)',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {MODULES.map((m, i) => {
                const on = active.has(i);
                return (
                  <motion.span
                    key={m}
                    animate={{
                      opacity: on ? 1 : 0.35,
                      scale: on ? 1 : 0.96,
                    }}
                    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      fontFamily: F.sans, fontSize: 13, fontWeight: 700,
                      color: on ? C.ink : C.faint,
                      background: on ? C.goldSoft : '#F4F1EB',
                      border: `1px solid ${on ? 'rgba(196,163,90,0.45)' : C.line}`,
                      padding: '9px 16px', borderRadius: 100,
                    }}
                  >
                    <motion.span animate={{ scale: on ? 1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      style={{ display: 'inline-flex' }}>
                      <Check size={13} color={C.goldDeep} strokeWidth={3} />
                    </motion.span>
                    {m}
                  </motion.span>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 26, fontFamily: F.mono, fontSize: 12, color: C.faint }}>
              {PACKAGES[pkg].on.length} of {MODULES.length} modules active — admins flip these live, per workspace, per property.
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 34 }}>
            <Link to="/pricing" style={{
              fontFamily: F.sans, fontWeight: 700, fontSize: 14.5, color: C.goldDeep, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              See package pricing <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
