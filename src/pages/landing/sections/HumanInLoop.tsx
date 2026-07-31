import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, PenLine, SendHorizonal, Lock, GitPullRequestArrow, ScrollText, Receipt } from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal, Chip, TypeText } from '../shared';

const STEP_MS = [3400, 3000, 2600, 2400]; // draft → review → send → hold

export function HumanInLoop() {
  const reduced = useReducedMotion();
  const [inView, setInView] = useState(false);
  const [step, setStep] = useState(0); // 0 draft, 1 review, 2 sent, 3 hold-then-loop

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setStep(2); return; }
    const id = window.setTimeout(() => setStep(s => (s + 1) % 4), STEP_MS[step]);
    return () => window.clearTimeout(id);
  }, [inView, step, reduced]);

  const statusPill = step >= 2
    ? { label: 'Sent · logged', color: C.emerald, bg: C.emeraldSoft, bd: 'rgba(16,185,129,0.3)' }
    : step === 1
      ? { label: 'Your review', color: C.sapphire, bg: C.sapphireSoft, bd: 'rgba(29,111,232,0.25)' }
      : { label: 'AI draft', color: C.goldDeep, bg: C.goldSoft, bd: 'rgba(196,163,90,0.4)' };

  return (
    <section style={{ background: C.cardWarm, padding: '110px 0 120px', borderTop: `1px solid ${C.line}` }}>
      <div style={CONTAINER}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <Reveal><Eyebrow>Human in the loop</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <SectionTitle style={{ margin: '22px 0 20px' }}>
                AI drafts. <Serif>You decide.</Serif>
              </SectionTitle>
            </Reveal>
            <Reveal delay={0.16}>
              <Sub>
                Nothing in projOS auto-sends. Every letter, every set of minutes, every punch list and pay app the AI
                produces lands as a <strong style={{ color: C.ink, fontWeight: 700 }}>draft in front of a human</strong> —
                editable, attributable, and logged. That&apos;s not a limitation. On a construction contract, it&apos;s
                the whole point.
              </Sub>
            </Reveal>
            <Reveal delay={0.24}>
              <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
                {[
                  { icon: GitPullRequestArrow, text: 'Approval workflows — pay apps, COs, and unlocks route to the right signer' },
                  { icon: Lock, text: 'Finalize & lock — minutes and signed documents can’t be silently edited' },
                  { icon: ScrollText, text: 'Full audit trail — every create, update, and send is on the activity log' },
                  { icon: Receipt, text: 'AI usage ledger — every model call metered by project and client' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color={C.goldDeep} />
                    </div>
                    <span style={{ fontFamily: F.sans, fontSize: 14, lineHeight: 1.55, color: C.dim, paddingTop: 4 }}>{text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Draft → review → send simulation */}
          <motion.div
            onViewportEnter={() => setInView(true)}
            viewport={{ once: true, margin: '-100px' }}
          >
            <div style={{
              background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 18px 50px rgba(26,23,20,0.08)',
            }}>
              {/* Doc header */}
              <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13.5, color: C.ink }}>
                  Letter — RE: Back-billing resolution
                </span>
                <motion.span
                  key={statusPill.label}
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: F.sans, fontSize: 11, fontWeight: 800, color: statusPill.color,
                    background: statusPill.bg, border: `1px solid ${statusPill.bd}`,
                    padding: '4px 12px', borderRadius: 100,
                  }}
                >
                  {statusPill.label}
                </motion.span>
              </div>

              {/* Doc body */}
              <div style={{ padding: '22px 24px', minHeight: 200, fontFamily: F.sans, fontSize: 13.5, lineHeight: 1.75, color: C.ink }}>
                <span style={{ color: C.dim }}>Dear Mr. Sullivan, </span>
                <TypeText
                  active={inView}
                  speed={12}
                  text="Following our July 29 progress meeting, we are writing to close out the open back-billing question on Pay Application #4. Our records reflect the disputed amount as "
                />
                {step >= 1 ? (
                  <>
                    <motion.del initial={{ opacity: 1 }} animate={{ opacity: 0.45 }}
                      style={{ color: C.rose, textDecorationColor: C.rose }}>
                      approximately $95,000
                    </motion.del>{' '}
                    <motion.strong
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                      style={{ color: C.sapphire, background: C.sapphireSoft, borderRadius: 4, padding: '0 4px', fontWeight: 700 }}
                    >
                      $95,000.00 per the attached reconciliation
                    </motion.strong>
                    <span>, and we propose releasing undisputed amounts immediately.</span>
                  </>
                ) : (
                  <span style={{ color: C.faint }}>approximately $95,000…</span>
                )}
              </div>

              {/* Footer rail */}
              <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.line}`, background: C.cardWarm, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {[
                    { icon: Sparkles, label: 'AI drafts', on: true },
                    { icon: PenLine, label: 'You edit', on: step >= 1 },
                    { icon: SendHorizonal, label: 'You send', on: step >= 2 },
                  ].map(({ icon: Icon, label, on }) => (
                    <span key={label} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontFamily: F.sans, fontSize: 12, fontWeight: 700,
                      color: on ? C.ink : C.faint, transition: 'color 0.4s',
                    }}>
                      <Icon size={13} color={on ? C.goldDeep : C.faint} /> {label}
                    </span>
                  ))}
                </div>
                {step >= 2 && (
                  <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Chip tone="emerald">On your letterhead · in the audit log</Chip>
                  </motion.span>
                )}
              </div>
            </div>
            <p style={{ fontFamily: F.mono, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 14 }}>
              Simulation of the actual review flow — nothing sends without a human.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
