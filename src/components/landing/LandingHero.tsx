import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Sun, FolderKanban, Mic } from 'lucide-react';

const words1 = ['Run', 'the', 'Job.'];
const words2 = ['Pass', 'the', 'Audit.'];

export function LandingHero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      style={{ background: 'var(--apas-midnight)' }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--apas-grid) 1px, transparent 1px), linear-gradient(90deg, var(--apas-grid) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(29,111,232,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Floating status cards */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Card 1 — top-left: Project */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="absolute top-[22%] left-[5%] hidden xl:block"
        >
          <div style={{ background: 'var(--apas-surface)', border: '1px solid var(--apas-border)', borderRadius: '16px', padding: '14px 18px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-3">
              <div style={{ height: '38px', width: '38px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FolderKanban size={18} color="#8B5CF6" />
              </div>
              <div>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--apas-white)' }}>Project: Roof Replacement</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>On schedule · 3 RFIs open</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2 — top-right: NSPIRE Score */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="absolute top-[26%] right-[4%] hidden xl:block"
        >
          <div style={{ background: 'var(--apas-surface)', border: '1px solid var(--apas-border)', borderRadius: '16px', padding: '14px 18px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-3">
              <div style={{ height: '38px', width: '38px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="#10B981" />
              </div>
              <div>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--apas-white)' }}>NSPIRE Score</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#10B981' }}>94.2 — Audit Ready</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3 — bottom-left: Daily Grounds */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.0 }}
          className="absolute bottom-[32%] left-[6%] hidden xl:block"
        >
          <div style={{ background: 'var(--apas-surface)', border: '1px solid var(--apas-border)', borderRadius: '16px', padding: '14px 18px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-3">
              <div style={{ height: '38px', width: '38px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sun size={18} color="#F59E0B" />
              </div>
              <div>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--apas-white)' }}>Daily Grounds</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>Completed 8:42 AM</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 4 — bottom-right: AI Voice Agent */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-[36%] right-[5%] hidden xl:block"
        >
          <div style={{ background: 'var(--apas-surface)', border: '1px solid var(--apas-border)', borderRadius: '16px', padding: '14px 18px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-3">
              <div style={{ height: '38px', width: '38px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={18} color="#8B5CF6" />
              </div>
              <div>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--apas-white)' }}>AI Voice Agent</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>12 calls handled today</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        {/* Eyebrow pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 mb-10"
          style={{
            background: 'rgba(29,111,232,0.12)',
            border: '1px solid rgba(29,111,232,0.3)',
            borderRadius: '999px',
            padding: '6px 16px',
          }}
        >
          <span style={{ width: '7px', height: '7px', background: 'var(--apas-sapphire)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px var(--apas-sapphire)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--apas-sapphire)', letterSpacing: '0.04em' }}>For Construction PMs · Property Operators · Compliance Officers</span>
        </motion.div>

        {/* H1 — word-by-word */}
        <h1 style={{ fontFamily: 'Instrument Serif', lineHeight: 0.95, marginBottom: '28px', letterSpacing: '-0.02em' }}>
          {/* Line 1: "Run the Job." — all white */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 16px', fontSize: 'clamp(56px, 10vw, 96px)', marginBottom: '4px' }}>
            {words1.map((word, i) => (
              <motion.span
                key={word + i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ color: 'var(--apas-white)', display: 'inline-block' }}
              >
                {word}
              </motion.span>
            ))}
          </div>
          {/* Line 2: "Pass" white, "the Audit." sapphire */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 16px', fontSize: 'clamp(56px, 10vw, 96px)' }}>
            {words2.map((word, i) => (
              <motion.span
                key={word + i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.46 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ color: i === 0 ? 'var(--apas-white)' : 'var(--apas-sapphire)', display: 'inline-block' }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        </h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          style={{ fontFamily: 'DM Sans', fontSize: 'clamp(16px, 2.2vw, 21px)', color: 'var(--apas-muted)', maxWidth: '680px', margin: '0 auto 40px', lineHeight: 1.8 }}
        >
          You're managing projects, running inspections, chasing permits, and tracking work orders — on the same day.{' '}
          <span style={{ color: 'var(--apas-white)', fontWeight: 600 }}>APAS OS connects every piece so nothing slips through the cracks.</span>
        </motion.p>

        {/* CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            to="/auth"
            className="flex items-center gap-2"
            style={{
              fontFamily: 'DM Sans', fontWeight: 700, fontSize: '17px',
              background: 'var(--apas-sapphire)',
              color: 'white',
              padding: '16px 32px',
              borderRadius: '12px',
              boxShadow: '0 0 40px rgba(29,111,232,0.4)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Start Free Trial <ArrowRight size={17} />
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2"
            style={{
              fontFamily: 'DM Sans', fontWeight: 600, fontSize: '16px',
              color: 'var(--apas-white)',
              padding: '16px 32px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            See Every Feature
          </a>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)', letterSpacing: '0.04em' }}
        >
          {['Construction PM Suite', 'NSPIRE Compliance', 'HUD Audit-Ready', 'Offline-Capable PWA', '9-Level RBAC', 'AI Voice Agent'].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span style={{ width: '6px', height: '6px', background: 'var(--apas-sapphire)', borderRadius: '2px', display: 'inline-block', transform: 'rotate(45deg)' }} />
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div style={{ width: '24px', height: '40px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }}
          />
        </div>
      </motion.div>
    </section>
  );
}
