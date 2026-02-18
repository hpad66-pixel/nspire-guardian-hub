import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle, AlertTriangle, XCircle, Zap } from 'lucide-react';

const words = ['Run Every Property.', 'Every Project.', 'From One Place.'];

function FloatingMockup() {
  return (
    <div className="relative" style={{ animation: 'altFloat 5s ease-in-out infinite' }}>
      <style>{`
        @keyframes altFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes altWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes altPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Main dashboard card */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 24px 48px rgba(15,23,42,0.12)',
        width: '420px',
        maxWidth: '100%',
        border: '1px solid #E2E8F0',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div style={{ width: '28px', height: '28px', background: '#2563EB', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>A</span>
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#1E3A5F' }}>Dashboard</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#94A3B8' }}>Feb 18, 2026</span>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'NSPIRE Score', value: '94.2%', trend: '↑', color: '#059669', bg: '#F0FDF4' },
            { label: 'Open Permits', value: '3', note: 'expiring', color: '#D97706', bg: '#FFFBEB' },
            { label: 'Work Orders', value: '7 open', note: '2 overdue', color: '#DC2626', bg: '#FFF5F5' },
          ].map((m) => (
            <div key={m.label} style={{ background: m.bg, borderRadius: '10px', padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '16px', color: m.color }}>{m.value} {m.trend && <span style={{ fontSize: '12px' }}>{m.trend}</span>}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#64748B', marginTop: '2px', lineHeight: 1.3 }}>{m.label}</div>
              {m.note && <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '9px', color: m.color, marginTop: '2px' }}>{m.note}</div>}
            </div>
          ))}
        </div>

        {/* Inspection row */}
        <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '11px', color: '#475569', marginBottom: '8px' }}>Daily Grounds Inspection · Completed 8:42 AM</div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Parking Lot A', ok: true },
              { label: 'Building Exterior', ok: true },
              { label: 'Playground', ok: false },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1" style={{
                background: item.ok ? '#F0FDF4' : '#FFF5F5',
                border: `1px solid ${item.ok ? '#86EFAC' : '#FECACA'}`,
                borderRadius: '6px',
                padding: '4px 8px',
              }}>
                {item.ok
                  ? <CheckCircle size={10} color="#059669" />
                  : <AlertTriangle size={10} color="#DC2626" />
                }
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: item.ok ? '#059669' : '#DC2626', fontWeight: 600 }}>{item.label}{!item.ok ? ' ⚠' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top-right popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        style={{
          position: 'absolute', top: '-16px', right: '-24px',
          background: '#fff', borderRadius: '12px', padding: '12px 14px',
          boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
          border: '1px solid #E2E8F0',
          zIndex: 3, minWidth: '200px',
        }}
      >
        <div className="flex items-start gap-2.5">
          <div style={{ width: '24px', height: '24px', background: '#EDE9FE', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={12} color="#7C3AED" />
          </div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '11px', color: '#1E3A5F' }}>AI Voice Agent</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#475569', marginTop: '2px' }}>New ticket from Unit 204B</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#7C3AED', marginTop: '1px' }}>"Leak under kitchen sink" · 2 min ago</div>
          </div>
        </div>
      </motion.div>

      {/* Bottom-left popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
        style={{
          position: 'absolute', bottom: '-16px', left: '-24px',
          background: '#fff', borderRadius: '12px', padding: '12px 14px',
          boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
          border: '1px solid #E2E8F0',
          zIndex: 3, minWidth: '196px',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '11px', color: '#1E3A5F' }}>Permit Alert</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#475569', marginTop: '2px' }}>Fire Safety Cert expires in 12 days</div>
          </div>
        </div>
      </motion.div>

      {/* Right-center popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        style={{
          position: 'absolute', top: '50%', right: '-32px', transform: 'translateY(-50%)',
          background: '#fff', borderRadius: '12px', padding: '10px 14px',
          boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
          border: '1px solid #E2E8F0',
          zIndex: 3,
        }}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#059669', fontWeight: 700 }}>Inspection Submitted ✓</div>
        </div>
      </motion.div>
    </div>
  );
}

export function AltHero() {
  return (
    <section style={{ background: 'linear-gradient(180deg, #EEF4FF 0%, #F8FAFC 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '80px' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 mb-6"
              style={{
                background: 'rgba(37,99,235,0.08)',
                color: '#2563EB',
                padding: '6px 14px',
                borderRadius: '100px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', display: 'inline-block', animation: 'altPulse 2s ease-in-out infinite' }} />
              For Property & Construction Professionals
            </motion.div>
            <style>{`@keyframes altPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

            {/* Headline */}
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 'clamp(38px, 5.5vw, 62px)', color: '#0F172A', lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '24px' }}>
              {words.map((line, i) => (
                <motion.span
                  key={line}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'block' }}
                >
                  {i === 1 ? <span style={{ color: '#2563EB' }}>{line}</span> : line}
                </motion.span>
              ))}
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', color: '#475569', lineHeight: 1.7, maxWidth: '480px', marginBottom: '36px' }}
            >
              APAS OS replaces the spreadsheets, the email chains, the paper checklists, and the filing cabinets that most firms still use. Inspections, compliance, work orders, projects, permits, and team communication — all in one platform.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-wrap gap-4 items-center mb-6"
            >
              <Link to="/auth" style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '15px',
                background: '#2563EB', color: '#fff',
                padding: '14px 28px', borderRadius: '10px',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                transition: 'all 0.2s',
                height: '52px',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Start Free — No Card Required <ArrowRight size={16} />
              </Link>
              <button style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '15px',
                color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                height: '52px', padding: '0 8px',
              }}>
                <Play size={16} fill="#2563EB" /> See a 3-Minute Demo
              </button>
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#94A3B8' }}
            >
              14-day free trial · Setup in 60 minutes · Works on any device
            </motion.p>
          </div>

          {/* Right: Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex justify-center items-center"
            style={{ paddingRight: '40px' }}
          >
            <FloatingMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
