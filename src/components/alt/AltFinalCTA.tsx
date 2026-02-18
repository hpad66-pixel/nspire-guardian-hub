import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function AltFinalCTA() {
  return (
    <section style={{ background: '#0F172A', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
        >
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(28px, 5vw, 52px)',
            color: '#F1F5F9',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '20px',
          }}>
            Stop managing your operation<br />across a dozen different tools.
          </h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', color: 'rgba(241,245,249,0.7)', marginBottom: '40px', lineHeight: 1.65, maxWidth: '520px', margin: '0 auto 40px' }}>
            Start your free 14-day trial. No credit card. No setup fee. Most teams are up and running within 60 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/auth"
              className="flex items-center justify-center gap-2"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '16px',
                background: '#fff', color: '#0F172A',
                padding: '16px 32px', borderRadius: '10px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <button style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '16px',
              background: 'transparent', color: '#F1F5F9',
              padding: '16px 32px', borderRadius: '10px',
              border: '1px solid rgba(241,245,249,0.25)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(241,245,249,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(241,245,249,0.25)'; }}
            >
              Book a 30-Min Demo
            </button>
          </div>

          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(241,245,249,0.35)', letterSpacing: '0.02em' }}>
            NSPIRE-compliant · 3-year audit retention · Row-level security · Progressive Web App
          </p>
        </motion.div>
      </div>
    </section>
  );
}
