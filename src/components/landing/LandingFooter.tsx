import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';

const footerLinks = {
  Platform: ['Features', 'Pricing', 'Security', 'AI Voice Agent', 'Roadmap'],
  'For Your Team': ['Property Managers', 'Owners', 'Superintendents', 'Inspectors', 'Subcontractors'],
  Company: ['About APAS.AI', 'The Systems Lens', 'Contact', 'Privacy Policy', 'Terms of Service'],
};

export function LandingFooter() {
  return (
    <>
      {/* Pre-footer CTA */}
      <section style={{ background: 'var(--apas-surface)', padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(var(--apas-grid) 1px, transparent 1px), linear-gradient(90deg, var(--apas-grid) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(29,111,232,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: '-80px' }}
          >
            <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 5vw, 56px)', color: 'var(--apas-white)', lineHeight: 1.15, marginBottom: '24px' }}>
              The Last Platform You'll Ever Evaluate.
            </h2>
            <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '680px', margin: '0 auto 16px', lineHeight: 1.8 }}>
              You've seen what APAS OS can do. The question isn't whether you need it. The question is how long you'll keep paying the cost of not having it — in compliance risk, in wasted time, in enforcement actions you could have prevented, in liability you don't need.
            </p>
            <p style={{ fontFamily: 'DM Sans', fontSize: '16px', color: 'var(--apas-muted)', maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.8 }}>
              Start your free trial today. No credit card. No commitment. Setup in under 60 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2"
                style={{
                  fontFamily: 'DM Sans', fontWeight: 700, fontSize: '18px',
                  background: 'var(--apas-sapphire)', color: 'white',
                  padding: '18px 36px', borderRadius: '14px',
                  boxShadow: '0 0 50px rgba(29,111,232,0.35)',
                  textDecoration: 'none',
                }}
              >
                Start Free 14-Day Trial <ArrowRight size={18} />
              </Link>
              <button
                className="flex items-center justify-center gap-2"
                style={{
                  fontFamily: 'DM Sans', fontWeight: 600, fontSize: '16px',
                  border: '1px solid rgba(255,255,255,0.15)', color: 'var(--apas-white)',
                  padding: '18px 36px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                }}
              >
                <Mail size={16} /> Book a 30-Minute Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer proper */}
      <footer style={{ background: 'var(--apas-midnight)', borderTop: '1px solid var(--apas-border)', padding: '64px 0 32px' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-16">
            {/* Brand column */}
            <div>
              <div className="flex items-center gap-1.5 mb-4">
                <span style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: '22px', color: 'var(--apas-white)' }}>APAS</span>
                <span style={{ width: '5px', height: '5px', background: 'var(--apas-sapphire)', borderRadius: '1px', transform: 'rotate(45deg)', display: 'inline-block' }} />
                <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '22px', color: 'var(--apas-white)' }}>OS</span>
              </div>
              <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', lineHeight: 1.7, marginBottom: '8px' }}>Property Operations. Engineered.</p>
              <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--apas-muted)', marginBottom: '4px' }}>Built on APAS.AI infrastructure intelligence</p>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-sapphire)' }}>apasos.lovable.app</p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([col, links]) => (
              <div key={col}>
                <p style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '13px', color: 'var(--apas-white)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>{col}</p>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--apas-white)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--apas-muted)')}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: '1px solid var(--apas-border)' }}>
            <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)' }}>
              © 2026 APAS.AI · apasos.lovable.app · All rights reserved
            </p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>
              Powered by APAS Labs
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
