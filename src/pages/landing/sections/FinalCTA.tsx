import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { C, F, CONTAINER, Reveal, Serif, CTA_PRIMARY } from '../shared';
import { DemoModal } from './DemoModal';

export function FinalCTA() {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <section style={{
      background: `radial-gradient(900px 500px at 50% 120%, rgba(196,163,90,0.18), transparent 60%),
                   linear-gradient(180deg, ${C.obsidian} 0%, ${C.obsidian2} 100%)`,
      padding: '130px 0 140px', textAlign: 'center',
    }}>
      <div style={CONTAINER}>
        <Reveal>
          <h2 style={{
            fontFamily: F.sans, fontWeight: 800, fontSize: 'clamp(36px, 5.4vw, 64px)',
            color: C.creamOnDark, letterSpacing: '-0.035em', lineHeight: 1.06, margin: '0 auto 22px', maxWidth: 820,
          }}>
            Your next pay app could <Serif>reconcile itself.</Serif>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={{ fontFamily: F.sans, fontSize: 17, color: C.dimOnDark, lineHeight: 1.7, maxWidth: 540, margin: '0 auto 40px' }}>
            Bring one project. Sync the inbox, load the contract, and watch the cascade take over.
            If it doesn&apos;t pay for itself by the first billing cycle, walk away.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to="/auth" style={{ ...CTA_PRIMARY, fontSize: 16, padding: '17px 34px' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              Start Free — No Card Required <ArrowRight size={17} />
            </Link>
            <button onClick={() => setShowDemo(true)} style={{
              fontFamily: F.sans, fontWeight: 600, fontSize: 15, color: C.creamOnDark,
              background: 'none', border: `1px solid ${C.lineOnDark}`, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 9, padding: '15px 26px', borderRadius: 11,
            }}>
              <Play size={14} fill={C.creamOnDark} color={C.creamOnDark} /> Watch the demo
            </button>
          </div>
        </Reveal>
        <Reveal delay={0.26}>
          <p style={{ fontFamily: F.mono, fontSize: 12, color: C.faint, marginTop: 26 }}>
            14-day trial · Your data exports anytime · Setup in minutes
          </p>
        </Reveal>
      </div>
      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer style={{ background: C.obsidian2, borderTop: `1px solid ${C.lineOnDark}`, padding: '36px 0' }}>
      <div style={{ ...CONTAINER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 12, color: '#171410' }}>P</span>
          </div>
          <span style={{ fontFamily: F.sans, fontWeight: 400, fontSize: 15, color: C.creamOnDark }}>
            proj<span style={{ fontWeight: 800 }}>OS</span>
          </span>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.faint, marginLeft: 8 }}>Run the job. Pass the audit.</span>
        </div>
        <nav style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {[
            { label: 'Pricing', to: '/pricing' },
            { label: 'Sign in', to: '/auth' },
            { label: 'Start free', to: '/auth' },
          ].map(l => (
            <Link key={l.label} to={l.to} style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.dimOnDark, textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.faint }}>
          © {new Date().getFullYear()} projOS · projos.ai
        </span>
      </div>
    </footer>
  );
}
