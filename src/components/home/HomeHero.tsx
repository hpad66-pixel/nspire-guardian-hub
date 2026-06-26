import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, X } from 'lucide-react';
import { triggerLogin } from '@/lib/loginModal';

const ease = [0.16, 1, 0.3, 1] as const;

export function HomeHero() {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#0A0B0D' }}>
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

      <div className="relative max-w-[1280px] mx-auto px-6 pt-32 pb-24 w-full">
        <div className="max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-medium tracking-wide text-white/50 uppercase" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em' }}>
              The Operating System for Property & Construction
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-white leading-[1.05] mb-6"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 72px)',
              letterSpacing: '-0.035em',
            }}
          >
            Run Every Property.{' '}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400 bg-clip-text text-transparent">
              Every Project.
            </span>
            <br />
            From One Place.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease }}
            className="text-white/40 max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(16px, 2vw, 19px)' }}
          >
            Proj OS replaces the spreadsheets, email chains, paper checklists, and filing cabinets.
            Inspections, compliance, work orders, projects, permits — all connected. All auditable.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <button
              onClick={triggerLogin}
              className="group flex items-center gap-2.5 bg-white text-black font-semibold text-[15px] px-8 py-4 rounded-full hover:bg-white/90 transition-all duration-200 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Start Free — No Card Required
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setShowDemo(true)}
              className="flex items-center gap-2.5 text-white/50 hover:text-white/80 font-medium text-[15px] px-6 py-4 transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                <Play size={12} fill="currentColor" />
              </div>
              Watch Demo
            </button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-[12px] text-white/20 tracking-wide"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            14-day trial · Setup in under an hour · Works on any device
          </motion.p>
        </div>

        {/* Floating dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
            {/* Mock browser chrome */}
            <div className="h-10 bg-white/[0.03] border-b border-white/[0.06] flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white/[0.04] rounded-md px-16 py-1 text-[11px] text-white/20" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  projos.ai
                </div>
              </div>
            </div>
            {/* Mock dashboard content */}
            <div className="bg-[#0D0E11] p-6 sm:p-8">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Open Issues', value: '12', color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: 'Active Projects', value: '8', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Work Orders', value: '24', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Compliance', value: '97%', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map(kpi => (
                  <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4 border border-white/[0.04]`}>
                    <p className="text-[10px] text-white/30 mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>{kpi.label}</p>
                    <p className={`text-xl font-bold ${kpi.color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2">
                    <div className="h-2 w-16 bg-white/[0.06] rounded" />
                    <div className="h-2 w-24 bg-white/[0.04] rounded" />
                    <div className="h-2 w-20 bg-white/[0.03] rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0A0B0D] to-transparent" />
          </div>
        </motion.div>
      </div>

      {/* Demo video modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8"
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              transition={{ ease, duration: 0.4 }}
              className="relative w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDemo(false)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm"
              >
                <X size={18} /> Close
              </button>
              <video
                src="/proj-os-demo.mp4"
                className="w-full rounded-xl shadow-2xl border border-white/10"
                controls autoPlay playsInline
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
