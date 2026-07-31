import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FileSpreadsheet, Mail, FileText, MessageSquare, HardDrive, StickyNote, Camera, Phone } from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal } from '../shared';

const TOOLS = [
  { icon: FileSpreadsheet, label: 'SOV_v7_FINAL(2).xlsx', scatter: { x: -170, y: -60, r: -9 } },
  { icon: Mail, label: '47-reply email chain', scatter: { x: 150, y: -90, r: 7 } },
  { icon: FileText, label: 'Scanned pay app PDF', scatter: { x: -120, y: 80, r: 5 } },
  { icon: MessageSquare, label: 'Texts from the field', scatter: { x: 190, y: 50, r: -6 } },
  { icon: HardDrive, label: 'Shared-drive chaos', scatter: { x: -40, y: -110, r: 3 } },
  { icon: StickyNote, label: 'Punch list on paper', scatter: { x: 60, y: 110, r: -8 } },
  { icon: Camera, label: 'Photos in 3 phones', scatter: { x: -200, y: 10, r: 8 } },
  { icon: Phone, label: 'Missed tenant calls', scatter: { x: 120, y: -30, r: -4 } },
];

export function ProblemSection() {
  const reduced = useReducedMotion();
  const [ordered, setOrdered] = useState(false);

  return (
    // overflow hidden: the pre-animation scatter transforms push cards past the viewport edge
    <section style={{ background: C.cream, padding: '110px 0 120px', overflow: 'hidden' }}>
      <div style={CONTAINER}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <Reveal><Eyebrow>The problem</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <SectionTitle style={{ margin: '22px 0 20px' }}>
                Your project lives in <Serif color={C.rose}>nine tools</Serif> that don&apos;t talk to each other.
              </SectionTitle>
            </Reveal>
            <Reveal delay={0.16}>
              <Sub>
                The schedule of values is in a spreadsheet. The change order is in an email. The punch list is on
                paper. The pay app is a PDF someone retyped. Every handoff is a chance for the numbers to stop
                matching — and at audit time, they never match.
              </Sub>
            </Reveal>
            <Reveal delay={0.24}>
              <ul style={{ margin: '26px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
                {[
                  'Double entry between estimating, accounting, and the field',
                  'Nobody can say whose court the ball is in',
                  'The paper trail exists — in eleven different places',
                ].map(li => (
                  <li key={li} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: F.sans, fontSize: 15, color: C.ink, fontWeight: 500 }}>
                    <span style={{ color: C.rose, fontWeight: 800, lineHeight: 1.5 }}>×</span> {li}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Chaos → order animation */}
          <motion.div
            onViewportEnter={() => setTimeout(() => setOrdered(true), reduced ? 0 : 700)}
            viewport={{ once: true, margin: '-120px' }}
            style={{ position: 'relative', minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Animation: scattered tools organizing into one platform"
          >
            {/* Target frame */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={ordered ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                position: 'absolute', inset: '6% 4%',
                border: `1.5px solid ${C.gold}`, borderRadius: 20,
                background: 'rgba(196,163,90,0.04)',
                boxShadow: '0 18px 50px rgba(26,23,20,0.08)',
              }}
            >
              <div style={{
                position: 'absolute', top: -13, left: 24, background: C.cream, padding: '0 10px',
                fontFamily: F.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.goldDeep, fontWeight: 500,
              }}>
                One platform · projOS
              </div>
            </motion.div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 210px))', gap: 12,
              position: 'relative', padding: 30,
            }}>
              {TOOLS.map((t, i) => {
                const Icon = t.icon;
                return (
                  <motion.div
                    key={t.label}
                    initial={false}
                    animate={ordered
                      ? { x: 0, y: 0, rotate: 0, opacity: 1 }
                      : { x: t.scatter.x, y: t.scatter.y, rotate: t.scatter.r, opacity: 0.9 }}
                    transition={{ type: 'spring', stiffness: 90, damping: 16, delay: ordered ? i * 0.06 : 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: C.card, border: `1px solid ${ordered ? C.line : '#E5D9D9'}`,
                      borderRadius: 12, padding: '12px 14px',
                      boxShadow: ordered ? '0 2px 8px rgba(26,23,20,0.05)' : '0 10px 24px rgba(26,23,20,0.12)',
                    }}
                  >
                    <Icon size={16} color={ordered ? C.goldDeep : C.rose} style={{ flexShrink: 0, transition: 'color 0.5s' }} />
                    <span style={{ fontFamily: F.sans, fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
