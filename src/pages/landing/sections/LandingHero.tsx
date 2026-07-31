import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, Phone, Mail, DollarSign, ListChecks, CheckCircle2 } from 'lucide-react';
import { C, F, Chip, CountUp, TypeText, CTA_PRIMARY, Serif } from '../shared';
import { DemoModal } from './DemoModal';

// ─── Scene shells ────────────────────────────────────────────────────────────
function SceneFrame({ icon, title, badge, children }: {
  icon: React.ReactNode; title: string; badge: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.035)', border: `1px solid ${C.lineOnDark}`,
      borderRadius: 18, padding: 22, height: 396, display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,163,90,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
            {icon}
          </div>
          <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, color: C.creamOnDark }}>{title}</span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.gold }}>{badge}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${C.lineOnDark}`, marginBottom: 8,
};
const rowLabel: React.CSSProperties = { fontFamily: F.sans, fontSize: 12.5, fontWeight: 600, color: C.dimOnDark };
const rowNum: React.CSSProperties = { fontFamily: F.mono, fontSize: 13.5, fontWeight: 700, color: C.creamOnDark };

// Scene A — the financial cascade reconciling
function SceneFinancials() {
  return (
    <SceneFrame icon={<DollarSign size={15} />} title="Prime Contract · Pay App #5" badge="Financials">
      <div style={rowStyle}>
        <span style={rowLabel}>Original contract</span>
        <span style={rowNum}><CountUp to={523061} prefix="$" duration={1.1} /></span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabel}>Approved change orders</span>
        <span style={{ ...rowNum, color: C.gold }}>+<CountUp to={231246} prefix="$" duration={1.3} /></span>
      </div>
      <div style={{ ...rowStyle, border: `1px solid rgba(196,163,90,0.4)`, background: 'rgba(196,163,90,0.08)' }}>
        <span style={{ ...rowLabel, color: C.creamOnDark }}>Revised contract</span>
        <span style={rowNum}><CountUp to={754307} prefix="$" duration={1.5} /></span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabel}>Billed to date · 96%</span>
        <span style={rowNum}><CountUp to={724135} prefix="$" duration={1.6} /></span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1 }}
        style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}
      >
        <Chip tone="emerald" dark><CheckCircle2 size={12} /> G702 / G703 reconciled to the penny</Chip>
      </motion.div>
    </SceneFrame>
  );
}

// Scene B — AI builds a punch list from a voice note
function ScenePunch() {
  const [step, setStep] = useState(0);
  const items = [
    'Regrade and re-sod north courtyard at Building 3',
    'Repair concrete walkway impacted by CO #9 work',
    'Replace damaged bollards — coordinate with Alex',
  ];
  return (
    <SceneFrame icon={<ListChecks size={15} />} title="AI Punch List Builder" badge="Field · AI">
      <div style={{ ...rowStyle, background: 'rgba(29,111,232,0.08)', border: '1px solid rgba(29,111,232,0.25)' }}>
        <span style={{ fontFamily: F.sans, fontSize: 12, color: C.dimOnDark, lineHeight: 1.5 }}>
          🎙️ <TypeText text={'"Walked the site — courtyard needs sod, the walkway by building three is cracked, and two bollards are down…"'} active speed={16} onDone={() => setStep(1)} />
        </span>
      </div>
      {items.map((item, i) => (
        <motion.div
          key={item}
          initial={{ opacity: 0, x: -14 }}
          animate={step >= 1 ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.25 + i * 0.35, duration: 0.4 }}
          style={rowStyle}
          onAnimationComplete={() => i === items.length - 1 && setStep(2)}
        >
          <span style={{ ...rowLabel, color: C.creamOnDark, fontSize: 12 }}>{item}</span>
          <CheckCircle2 size={14} color={C.emerald} style={{ flexShrink: 0 }} />
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={step >= 2 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3 }}
        style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}
      >
        <Chip tone="gold" dark>3 items drafted → you review → send to sub</Chip>
      </motion.div>
    </SceneFrame>
  );
}

// Scene C — the ElevenLabs voice agent takes a call
function SceneVoice() {
  const [line, setLine] = useState(0);
  const lines = [
    { who: 'Caller', text: 'Hi — there’s a leak under my kitchen sink in unit 204.' },
    { who: 'Agent', text: 'Sorry to hear that. Is water actively pooling right now?' },
    { who: 'Caller', text: 'Yes, slowly.' },
    { who: 'Agent', text: 'Creating an urgent work order for Unit 204 now.' },
  ];
  return (
    <SceneFrame icon={<Phone size={15} />} title="Voice Agent · Live Call" badge="ElevenLabs">
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16, height: 26, alignItems: 'center' }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <span key={i} style={{
            width: 4, borderRadius: 2, background: C.gold, height: 22,
            animation: `heroWave 1.1s ease-in-out ${i * 0.13}s infinite`,
          }} />
        ))}
        <style>{`@keyframes heroWave { 0%,100% { transform: scaleY(0.25); opacity: 0.5 } 50% { transform: scaleY(1); opacity: 1 } }`}</style>
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ marginBottom: 9, minHeight: 18, display: line >= i ? 'block' : 'none' }}>
          <span style={{ fontFamily: F.mono, fontSize: 10.5, color: l.who === 'Agent' ? C.gold : C.dimOnDark, marginRight: 8 }}>{l.who}</span>
          <span style={{ fontFamily: F.sans, fontSize: 12.5, color: C.creamOnDark }}>
            <TypeText text={l.text} active={line >= i} speed={20} onDone={() => setLine(v => Math.max(v, i + 1))} />
          </span>
        </div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={line >= 4 ? { opacity: 1, scale: 1 } : {}}
        style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}
      >
        <Chip tone="emerald" dark><CheckCircle2 size={12} /> MR-1042 created · Plumbing · Urgent</Chip>
      </motion.div>
    </SceneFrame>
  );
}

// Scene D — correspondence AI extracts what matters
function SceneCorrespondence() {
  const [done, setDone] = useState(false);
  return (
    <SceneFrame icon={<Mail size={15} />} title="Correspondence Intelligence" badge="Inbox · AI">
      <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <span style={{ fontFamily: F.sans, fontSize: 11.5, fontWeight: 700, color: C.creamOnDark }}>RE: Pay App #4 — retainage &amp; back-billing</span>
        <span style={{ fontFamily: F.sans, fontSize: 11.5, color: C.dimOnDark, lineHeight: 1.55 }}>
          <TypeText
            text={'"…we can release payment once the $95,000 back-billing question is resolved. Need your response before Aug 15…"'}
            active speed={14} onDone={() => setDone(true)}
          />
        </span>
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, margin: '12px 0 8px' }}>
        AI extracted
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { label: 'Ball in court: You', tone: 'rose' as const, d: 0 },
          { label: '$95,000 disputed', tone: 'gold' as const, d: 0.2 },
          { label: 'Deadline: Aug 15', tone: 'sapphire' as const, d: 0.4 },
          { label: '+ Suggested action item', tone: 'emerald' as const, d: 0.6 },
        ].map(chip => (
          <motion.span key={chip.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={done ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: chip.d, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Chip tone={chip.tone} dark>{chip.label}</Chip>
          </motion.span>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.9 }}
        style={{ ...rowStyle, marginTop: 14, background: 'rgba(196,163,90,0.07)', border: '1px solid rgba(196,163,90,0.3)' }}
      >
        <span style={{ fontFamily: F.sans, fontSize: 12, color: C.creamOnDark }}>Draft response letter ready for your review</span>
        <ArrowRight size={13} color={C.gold} />
      </motion.div>
    </SceneFrame>
  );
}

// ─── Rotating simulation ─────────────────────────────────────────────────────
const SCENES = [
  { key: 'fin', label: 'Financials', el: <SceneFinancials /> },
  { key: 'punch', label: 'AI Punch List', el: <ScenePunch /> },
  { key: 'voice', label: 'Voice Agent', el: <SceneVoice /> },
  { key: 'mail', label: 'Correspondence', el: <SceneCorrespondence /> },
];
const SCENE_MS = 7000;

function HeroSimulation() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => setIdx(i => (i + 1) % SCENES.length), SCENE_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ width: '100%', maxWidth: 480 }}
      aria-label="Animated product simulation: financials, AI punch list, voice agent, and correspondence intelligence"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={SCENES[idx].key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {SCENES[idx].el}
        </motion.div>
      </AnimatePresence>

      {/* Scene switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
        {SCENES.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { setIdx(i); setPaused(true); }}
            style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              color: i === idx ? '#171410' : C.dimOnDark,
              background: i === idx ? C.gold : 'rgba(255,255,255,0.05)',
              border: `1px solid ${i === idx ? C.gold : C.lineOnDark}`,
              padding: '5px 12px', borderRadius: 100, transition: 'all 0.25s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
export function LandingHero() {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <section id="top" style={{
      background: `radial-gradient(1100px 600px at 75% -10%, rgba(196,163,90,0.13), transparent 60%),
                   radial-gradient(900px 500px at 10% 110%, rgba(29,111,232,0.10), transparent 55%),
                   linear-gradient(180deg, ${C.obsidian} 0%, ${C.obsidian2} 100%)`,
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      paddingTop: 110, paddingBottom: 70, position: 'relative', overflow: 'hidden',
    }}>
      {/* faint grid texture */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, opacity: 0.35,
        backgroundImage: `linear-gradient(${C.lineOnDark} 1px, transparent 1px), linear-gradient(90deg, ${C.lineOnDark} 1px, transparent 1px)`,
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(900px 600px at 50% 30%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(900px 600px at 50% 30%, black, transparent)',
      }} />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', width: '100%', position: 'relative' }}>
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Copy */}
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 26,
                fontFamily: F.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: C.gold, border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(196,163,90,0.08)',
                padding: '7px 15px', borderRadius: 100,
              }}>
              <Sparkles size={12} /> The AI-native project operating system
            </motion.div>

            <h1 style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 'clamp(42px, 6vw, 72px)', color: C.creamOnDark, lineHeight: 1.04, letterSpacing: '-0.035em', margin: '0 0 26px' }}>
              {['Run the job.', 'Pass the audit.'].map((line, i) => (
                <motion.span key={line}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.14, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'block' }}
                >
                  {i === 1 ? <Serif>{line}</Serif> : line}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
              style={{ fontFamily: F.sans, fontSize: 18, color: C.dimOnDark, lineHeight: 1.7, maxWidth: 500, marginBottom: 34 }}
            >
              Contracts, pay apps, punch lists, correspondence, meetings, and client portals — one platform where
              every dollar reconciles, <strong style={{ color: C.creamOnDark, fontWeight: 600 }}>AI drafts the paperwork</strong>,
              and nothing goes out without your sign-off.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.5 }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 24 }}>
              <Link to="/auth" style={CTA_PRIMARY}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(196,163,90,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(196,163,90,0.35)'; }}>
                Start Free — No Card Required <ArrowRight size={16} />
              </Link>
              <button onClick={() => setShowDemo(true)} style={{
                fontFamily: F.sans, fontWeight: 600, fontSize: 15, color: C.creamOnDark,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 6px',
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.lineOnDark}`,
                  background: 'rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={13} fill={C.creamOnDark} color={C.creamOnDark} />
                </span>
                Watch the 3-minute demo
              </button>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
              style={{ fontFamily: F.mono, fontSize: 12, color: C.faint }}>
              14-day free trial · Setup in minutes · Works on any device
            </motion.p>
          </div>

          {/* Simulation */}
          <motion.div
            initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <HeroSimulation />
          </motion.div>
        </div>
      </div>

      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
    </section>
  );
}
