import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function AltFinalCTA() {
  return (
    <section style={{ background: 'var(--landing-ink)', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
        >
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 'clamp(28px, 5vw, 52px)',
            color: 'var(--landing-cream)',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            marginBottom: '20px',
            fontStyle: 'italic',
          }}>
            Stop managing your operation<br />across a dozen different tools.
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: '20px', color: 'rgba(253,250,244,0.6)', marginBottom: '40px', lineHeight: 1.65, maxWidth: '520px', margin: '0 auto 40px' }}>
            Start your free 14-day trial. No credit card. No setup fee. Most teams are up and running within 60 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/auth"
              className="flex items-center justify-center gap-2"
              style={{
                fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '16px',
                background: 'var(--apas-sapphire)', color: '#fff',
                padding: '16px 32px', borderRadius: '10px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(29,111,232,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1558C0'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--apas-sapphire)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <button style={{
              fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: '16px',
              background: 'transparent', color: 'var(--landing-cream)',
              padding: '16px 32px', borderRadius: '10px',
              border: '1px solid rgba(253,250,244,0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(253,250,244,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(253,250,244,0.2)'; }}
            >
              Book a 30-Min Demo
            </button>
          </div>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'rgba(253,250,244,0.3)', letterSpacing: '0.1em' }}>
            NSPIRE-COMPLIANT · 3-YEAR AUDIT RETENTION · ROW-LEVEL SECURITY · PROGRESSIVE WEB APP
          </p>
        </motion.div>
      </div>
    </section>
  );
}
