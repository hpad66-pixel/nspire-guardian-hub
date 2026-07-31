import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  DollarSign, HardHat, Mail, CalendarCheck, ListTodo, Share2, ShieldCheck, BarChart3, Check,
} from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal, Chip } from '../shared';

// ─── Mini-mockup building blocks ─────────────────────────────────────────────
const mkRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
  background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 14px',
};
const mkLabel: React.CSSProperties = { fontFamily: F.sans, fontSize: 12.5, fontWeight: 600, color: C.ink };
const mkNum: React.CSSProperties = { fontFamily: F.mono, fontSize: 12.5, fontWeight: 700, color: C.ink };

function Stagger({ children }: { children: React.ReactNode[] }) {
  return (
    <>
      {children.map((child, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.09, duration: 0.35 }}>
          {child}
        </motion.div>
      ))}
    </>
  );
}

function Bar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  return (
    <div style={{ height: 7, borderRadius: 4, background: '#F0EDE6', overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', borderRadius: 4, background: color }} />
    </div>
  );
}

// ─── Per-module mockups ──────────────────────────────────────────────────────
const MOCKUPS: Record<string, () => JSX.Element> = {
  financials: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={mkRow}><span style={mkLabel}>Prime contract · revised</span><span style={mkNum}>$754,307.23</span></div>
        <div style={mkRow}><span style={mkLabel}>Pay App #5 · G702/G703</span><Chip tone="emerald"><Check size={11} /> Signed &amp; sent</Chip></div>
        <div style={mkRow}><span style={mkLabel}>CO #9 · quantity overrun</span><Chip tone="gold">Approved · +$12,480</Chip></div>
        <div style={{ ...mkRow, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={mkLabel}>Budget vs billed</span><span style={{ ...mkNum, color: C.emerald }}>96%</span>
          </div>
          <Bar pct={96} color={C.emerald} delay={0.5} />
        </div>
      </Stagger>
    </div>
  ),
  field: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={mkRow}><span style={mkLabel}>RFI-014 · footing depth</span><Chip tone="sapphire">Answered · 2d</Chip></div>
        <div style={mkRow}><span style={mkLabel}>SUB-008 · rebar shop drawings</span><Chip tone="emerald">Approved</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Punch · Building 3 courtyard</span><Chip tone="gold">17 open · sub notified</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Daily log · Jul 31</span><Chip tone="neutral">📷 12 photos · reviewed</Chip></div>
      </Stagger>
    </div>
  ),
  correspondence: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={mkRow}><span style={mkLabel}>Gmail thread synced · 47 messages</span><Chip tone="neutral">Auto</Chip></div>
        <div style={{ ...mkRow, flexWrap: 'wrap' }}>
          <span style={{ ...mkLabel, width: '100%' }}>AI thread intelligence</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip tone="rose">Ball in court: You</Chip>
            <Chip tone="gold">$95,000 disputed</Chip>
            <Chip tone="sapphire">Due Aug 15</Chip>
          </div>
        </div>
        <div style={mkRow}><span style={mkLabel}>Branded letter · drafted by AI</span><Chip tone="emerald">Your review → send</Chip></div>
      </Stagger>
    </div>
  ),
  meetings: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={mkRow}><span style={mkLabel}>Progress Meeting · Jul 29</span><Chip tone="neutral">🎙️ Raw notes captured</Chip></div>
        <div style={mkRow}><span style={mkLabel}>AI Polish → branded minutes</span><Chip tone="gold">10 sections structured</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Action items extracted</span><Chip tone="sapphire">6 assigned</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Finalized &amp; locked</span><Chip tone="emerald">🔒 Distributed to 8</Chip></div>
      </Stagger>
    </div>
  ),
  actions: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={mkRow}><span style={mkLabel}>☑ Resolve back-billing question</span><Chip tone="rose">Overdue</Chip></div>
        <div style={mkRow}><span style={mkLabel}>☑ Submit sod schedule to owner</span><Chip tone="gold">This week</Chip></div>
        <div style={mkRow}><span style={mkLabel}>☐ Close out CO #9 punch items</span><Chip tone="neutral">Aug 12</Chip></div>
        <div style={{ ...mkRow, background: C.goldSoft, border: '1px solid rgba(196,163,90,0.4)' }}>
          <span style={mkLabel}>2 selected → AI client report</span><Chip tone="gold">Draft ready</Chip>
        </div>
      </Stagger>
    </div>
  ),
  portals: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={mkRow}><span style={mkLabel}>Client portal · magic link</span><Chip tone="emerald">No login needed</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Sub portal · punch response</span><Chip tone="sapphire">14 / 17 accepted</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Owner portal · pay app approval</span><Chip tone="gold">Pending signature</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Vendor · G702 submission link</span><Chip tone="neutral">+ lien waiver</Chip></div>
      </Stagger>
    </div>
  ),
  compliance: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={mkRow}><span style={mkLabel}>NSPIRE readiness score</span><span style={{ ...mkNum, color: C.emerald }}>94.2 ▲</span></div>
        <div style={mkRow}><span style={mkLabel}>Daily grounds · structured checklists</span><Chip tone="emerald">Done 8:42 AM</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Environmental sampling · Site B</span><Chip tone="rose">1 exceedance flagged</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Safety · OSHA recordkeeping</span><Chip tone="neutral">0 open incidents</Chip></div>
      </Stagger>
    </div>
  ),
  reports: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Stagger>
        <div style={{ ...mkRow, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <span style={mkLabel}>Billed by month</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 54 }}>
            {[35, 55, 42, 70, 62, 88, 96].map((h, i) => (
              <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ flex: 1, borderRadius: 4, background: i === 6 ? C.gold : '#E3DCCB' }} />
            ))}
          </div>
        </div>
        <div style={mkRow}><span style={mkLabel}>Branded financial report</span><Chip tone="gold">PDF · letterhead</Chip></div>
        <div style={mkRow}><span style={mkLabel}>Margin reconciliation</span><Chip tone="emerald">Prime ↔ sub matched</Chip></div>
      </Stagger>
    </div>
  ),
};

// ─── Module definitions ──────────────────────────────────────────────────────
const MODULES = [
  {
    key: 'financials', icon: DollarSign, label: 'Financials',
    outcome: 'The entire money trail — one chain, no retyping.',
    bullets: ['Prime contracts, SOV, commitments, and change orders in one cascade', 'AIA-style G702/G703 pay apps generated from the SOV', 'Payments, retainage, and cash position tracked to the penny'],
  },
  {
    key: 'field', icon: HardHat, label: 'Field',
    outcome: 'RFIs, submittals, punch, and daily logs — without the clipboard.',
    bullets: ['Voice-dictated daily reports with captioned site photos', 'Ball-in-court tracking on every open item', 'Punch lists sent to subs with public response links'],
  },
  {
    key: 'correspondence', icon: Mail, label: 'Correspondence',
    outcome: 'Your inbox, finally attached to your project.',
    bullets: ['Per-project Gmail sync with full thread history', 'AI extracts commitments, deadlines, and dollar amounts', 'Branded letters drafted by AI, sent after your review'],
  },
  {
    key: 'meetings', icon: CalendarCheck, label: 'Meetings',
    outcome: 'From messy notes to distributed minutes in one pass.',
    bullets: ['AI turns raw notes into structured, branded minutes', 'Action items extracted and assigned automatically', 'Finalize-and-lock with supervisor unlock approvals'],
  },
  {
    key: 'actions', icon: ListTodo, label: 'Action Items',
    outcome: 'One list that survives the meeting.',
    bullets: ['Everything due, grouped by date, across every source', 'Select any subset → AI writes the client status report', 'Synced from meetings, correspondence, and the field'],
  },
  {
    key: 'portals', icon: Share2, label: 'Portals',
    outcome: 'Clients, subs, and owners see exactly what you choose.',
    bullets: ['Magic-link client portals — zero login friction', 'Subs respond to punch lists and submit pay apps online', 'Owners approve pay apps with a signature trail'],
  },
  {
    key: 'compliance', icon: ShieldCheck, label: 'Compliance',
    outcome: 'Inspection-ready every day, not just audit week.',
    bullets: ['NSPIRE / HUD inspection scoring and defect catalogs', 'Environmental sampling with automatic exceedance flags', 'Credentials, training, safety, and equipment tracking'],
  },
  {
    key: 'reports', icon: BarChart3, label: 'Reports',
    outcome: 'Board-ready numbers on your letterhead, on demand.',
    bullets: ['Branded financial, progress, and safety reports', 'Margin reconciliation between prime and sub contracts', 'Portfolio cockpit with cross-project risk and health'],
  },
];

const TOUR_MS = 5200;

export function PlatformTour() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [userDriven, setUserDriven] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced || userDriven || !inView) return;
    const id = window.setInterval(() => setIdx(i => (i + 1) % MODULES.length), TOUR_MS);
    return () => window.clearInterval(id);
  }, [reduced, userDriven, inView]);

  const mod = MODULES[idx];
  const Mock = MOCKUPS[mod.key];

  return (
    <section id="tour" style={{ background: C.cardWarm, padding: '110px 0 120px', borderTop: `1px solid ${C.line}` }}>
      <div style={CONTAINER}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Reveal><Eyebrow>The platform</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <SectionTitle style={{ margin: '22px auto 18px', maxWidth: 760 }}>
              Everything the job needs. <Serif>Nothing it doesn&apos;t.</Serif>
            </SectionTitle>
          </Reveal>
          <Reveal delay={0.16}>
            <Sub style={{ margin: '0 auto', textAlign: 'center' }}>
              Eight connected workspaces sharing one source of truth — click through, or just watch.
            </Sub>
          </Reveal>
        </div>

        <motion.div
          onViewportEnter={() => setInView(true)}
          onViewportLeave={() => setInView(false)}
          viewport={{ margin: '-100px' }}
          className="grid lg:grid-cols-[300px_1fr] gap-8 items-start"
        >
          {/* Tab rail */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2" role="tablist" aria-label="Platform modules">
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              const active = i === idx;
              return (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setIdx(i); setUserDriven(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left',
                    fontFamily: F.sans, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    color: active ? C.ink : C.dim,
                    background: active ? C.card : 'transparent',
                    border: `1px solid ${active ? C.gold : 'transparent'}`,
                    boxShadow: active ? '0 4px 16px rgba(26,23,20,0.06)' : 'none',
                    borderRadius: 12, padding: '13px 16px', transition: 'all 0.25s', position: 'relative', overflow: 'hidden',
                  }}
                >
                  <Icon size={16} color={active ? C.goldDeep : C.faint} />
                  {m.label}
                  {active && !userDriven && !reduced && (
                    <motion.span
                      key={`bar-${idx}`}
                      initial={{ width: 0 }} animate={{ width: '100%' }}
                      transition={{ duration: TOUR_MS / 1000, ease: 'linear' }}
                      style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: C.gold, opacity: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Stage */}
          <div style={{
            background: C.cream, border: `1px solid ${C.line}`, borderRadius: 20,
            padding: 'clamp(22px, 3.5vw, 40px)', minHeight: 430,
            boxShadow: '0 18px 50px rgba(26,23,20,0.06)',
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={mod.key}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="grid md:grid-cols-2 gap-8 items-start"
              >
                <div>
                  <h3 style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', color: C.ink, margin: '0 0 16px', lineHeight: 1.25 }}>
                    {mod.outcome}
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
                    {mod.bullets.map(b => (
                      <li key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: F.sans, fontSize: 14.5, lineHeight: 1.55, color: C.dim }}>
                        <Check size={15} color={C.goldDeep} style={{ flexShrink: 0, marginTop: 3 }} /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div><Mock /></div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
