import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { triggerLogin } from '@/lib/loginModal';

export function HomeCTA() {
  return (
    <section className="relative py-28 overflow-hidden" style={{ background: '#0A0B0D' }}>
      {/* Gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.5) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}>
          <h2 className="text-white mb-5" style={{
            fontFamily: 'Inter', fontWeight: 700,
            fontSize: 'clamp(28px, 5vw, 52px)',
            letterSpacing: '-0.03em', lineHeight: 1.1,
          }}>
            Stop managing your operation<br />across a dozen different tools.
          </h2>
          <p className="text-white/35 max-w-md mx-auto mb-10 leading-relaxed" style={{ fontFamily: 'Inter', fontSize: '18px' }}>
            Start your free 14-day trial. No credit card. No setup fee. Most teams are running in under an hour.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={triggerLogin}
              className="group inline-flex items-center justify-center gap-2.5 bg-white text-black font-semibold text-[15px] px-8 py-4 rounded-full hover:bg-white/90 transition-all shadow-[0_0_40px_rgba(255,255,255,0.08)]"
              style={{ fontFamily: 'Inter' }}
            >
              Start Free Trial <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              className="inline-flex items-center justify-center font-medium text-[15px] text-white/50 hover:text-white/80 px-8 py-4 rounded-full border border-white/10 hover:border-white/20 transition-all"
              style={{ fontFamily: 'Inter' }}
            >
              Book a 30-Min Demo
            </button>
          </div>

          <p className="text-[12px] text-white/15" style={{ fontFamily: "'JetBrains Mono'" }}>
            NSPIRE-compliant · 3-year audit retention · Row-level security · Progressive Web App
          </p>
        </motion.div>
      </div>
    </section>
  );
}
