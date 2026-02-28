import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Star } from 'lucide-react';

const starterFeatures = ['Up to 3 properties / 100 units', 'Up to 10 team members', 'Unlimited photos & documents', 'Daily inspections + photo documentation', 'NSPIRE compliance engine (full catalog)', 'Work order pipeline', 'Unlimited permit tracking', 'Team messaging', 'Reports & CSV export', 'Progressive Web App (offline capable)', '3-year data retention', 'Email support (48-hr response)'];
const proFeatures = ['Everything in Starter, plus:', 'Up to 10 properties / unlimited units', 'Up to 25 team members', 'Unlimited photos, videos & documents', 'AI Voice Agent — 24/7 tenant call center', 'Full project management (Gantt, RFIs, change orders, closeout)', 'AI proposal & report generation', 'Training & certification module', 'Unlimited CRM contacts', 'Email integration', 'QR code asset management', 'Property Archives vault (permanent storage)', 'Priority support (4-hour response)'];
const enterpriseFeatures = ['Everything in Professional, plus:', 'Unlimited properties & units', 'Unlimited users & team members', 'Unlimited photos, videos & file storage', 'Unlimited AI usage', 'AI Voice Agent (unlimited call volume)', 'White-label / custom domain', 'Custom NSPIRE configurations', 'SSO / SAML authentication', 'Dedicated Customer Success Manager', 'API access for integrations', '1-hour SLA response'];

const faqs = [
  { q: 'Do I need separate plans for multiple properties?', a: 'No. Each plan covers multiple properties up to the stated limit. You have one account, one dashboard, one subscription — all your properties inside.' },
  { q: 'Is the AI Voice Agent really included with no per-call fees?', a: 'The Voice Agent is included in Professional and Enterprise plans. Unlimited calls, no per-minute fees for standard usage. High-volume call centers (10,000+ calls/month) are covered under Enterprise.' },
  { q: 'Can my inspectors use it offline in the field?', a: 'Yes. APAS OS is a Progressive Web App. Install it from your browser on any phone. Inspections, photos, and voice notes work offline and sync automatically when you\'re back online.' },
  { q: 'How do I move my existing data in?', a: 'CSV imports for units, tenants, and contacts. Document bulk upload for existing files. Our onboarding team assists Professional and Enterprise customers. Most firms are operational within 48 hours.' },
  { q: 'What happens at the end of my trial?', a: 'You choose a plan or your account pauses — your data stays intact for 30 days. No surprise charges. No locked exports. You can download everything at any time.' },
];

function FeatureItem({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check size={14} color={muted ? 'var(--landing-muted)' : '#059669'} style={{ flexShrink: 0, marginTop: '3px' }} />
      <span style={{ fontFamily: "var(--font-editor)", fontSize: '13px', color: muted ? 'var(--landing-muted)' : 'var(--landing-slate)', lineHeight: 1.6 }}>{text}</span>
    </li>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--landing-border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: '15px', color: 'var(--landing-ink)' }}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} color="var(--landing-slate)" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', borderLeft: '2px solid var(--apas-sapphire)', paddingLeft: '16px', marginBottom: '16px' }}
          >
            <p style={{ fontFamily: "var(--font-editor)", fontSize: '14px', color: 'var(--landing-slate)', lineHeight: 1.7 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AltPricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" style={{ background: 'var(--landing-cream)', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="eyebrow mb-4" style={{ color: 'var(--apas-sapphire)' }}>Simple Pricing</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 'clamp(26px, 4vw, 44px)', color: 'var(--landing-ink)', letterSpacing: '-0.01em', marginBottom: '14px' }}>
            Honest pricing. Everything included.
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: '18px', color: 'var(--landing-slate)', maxWidth: '500px', margin: '0 auto 28px', lineHeight: 1.7 }}>
            No per-unit fees. No per-seat surprises. One subscription covers your whole team and all your properties within the plan.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-xl" style={{ background: 'var(--landing-warm)' }}>
            <button
              onClick={() => setAnnual(false)}
              style={{
                fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: '14px',
                padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: !annual ? 'var(--landing-card)' : 'transparent',
                color: !annual ? 'var(--landing-ink)' : 'var(--landing-muted)',
                boxShadow: !annual ? '0 1px 4px rgba(26,22,16,0.06)' : 'none',
                transition: 'all 0.2s',
              }}
            >Monthly</button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: '14px',
                padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: annual ? 'var(--landing-card)' : 'transparent',
                color: annual ? 'var(--landing-ink)' : 'var(--landing-muted)',
                boxShadow: annual ? '0 1px 4px rgba(26,22,16,0.06)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              Annual
              <span style={{ background: 'var(--apas-gold-bg)', color: 'var(--apas-gold)', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', fontFamily: "var(--font-mono)" }}>-20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Starter */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            style={{ background: 'var(--landing-card)', borderRadius: '16px', padding: '32px', border: '1px solid var(--landing-border)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: '18px', color: 'var(--landing-ink)', marginBottom: '4px' }}>Starter</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'var(--landing-muted)', marginBottom: '20px', letterSpacing: '0.05em' }}>UP TO 3 PROPERTIES · 10 USERS</div>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '40px', color: 'var(--landing-ink)' }}>${annual ? '149' : '179'}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: '14px', color: 'var(--landing-muted)' }}>/mo</span>
              {annual && <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'var(--landing-muted)', marginTop: '2px', letterSpacing: '0.03em' }}>billed annually</div>}
            </div>
            <ul className="flex flex-col gap-2 flex-1 mb-8">
              {starterFeatures.map(f => <FeatureItem key={f} text={f} />)}
            </ul>
            <Link to="/auth" style={{ display: 'block', textAlign: 'center', fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '14px', background: 'var(--landing-warm)', color: 'var(--landing-ink)', padding: '14px', borderRadius: '10px', textDecoration: 'none', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--landing-border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--landing-warm)')}>
              Start Free Trial
            </Link>
          </motion.div>

          {/* Professional — featured */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            style={{
              background: 'var(--landing-card)', borderRadius: '16px', padding: '32px',
              border: '2px solid var(--apas-sapphire)',
              boxShadow: '0 8px 32px rgba(29,111,232,0.12)',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
              transform: 'scale(1.02)',
            }}
          >
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'var(--apas-sapphire)', color: '#fff', fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '10px', padding: '4px 14px', borderRadius: '100px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.1em' }}>
              <Star size={11} fill="#fff" /> MOST POPULAR
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: '18px', color: 'var(--landing-ink)', marginBottom: '4px' }}>Professional</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'var(--landing-muted)', marginBottom: '20px', letterSpacing: '0.05em' }}>UP TO 10 PROPERTIES · 25 USERS</div>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '40px', color: 'var(--apas-sapphire)' }}>${annual ? '349' : '399'}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: '14px', color: 'var(--landing-muted)' }}>/mo</span>
              {annual && <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'var(--landing-muted)', marginTop: '2px', letterSpacing: '0.03em' }}>billed annually</div>}
            </div>
            <ul className="flex flex-col gap-2 flex-1 mb-8">
              {proFeatures.map(f => <FeatureItem key={f} text={f} muted={f.startsWith('Everything')} />)}
            </ul>
            <Link to="/auth" style={{ display: 'block', textAlign: 'center', fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '14px', background: 'var(--apas-sapphire)', color: '#fff', padding: '14px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(29,111,232,0.25)', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1558C0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--apas-sapphire)')}>
              Start Free Trial
            </Link>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            style={{ background: 'var(--landing-ink)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(253,250,244,0.1)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: '18px', color: 'var(--landing-cream)', marginBottom: '4px' }}>Enterprise</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'rgba(253,250,244,0.4)', marginBottom: '20px', letterSpacing: '0.05em' }}>UNLIMITED EVERYTHING</div>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '30px', color: 'var(--apas-sapphire)' }}>from $799/mo</span>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'rgba(253,250,244,0.35)', marginTop: '4px', letterSpacing: '0.03em' }}>billed annually · custom for large portfolios</div>
            </div>
            <ul className="flex flex-col gap-2 flex-1 mb-8">
              {enterpriseFeatures.map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check size={14} color={f.startsWith('Everything') ? 'rgba(253,250,244,0.3)' : 'var(--apas-sapphire)'} style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span style={{ fontFamily: "var(--font-editor)", fontSize: '13px', color: f.startsWith('Everything') ? 'rgba(253,250,244,0.3)' : 'rgba(253,250,244,0.7)', lineHeight: 1.6 }}>{f}</span>
                </li>
              ))}
            </ul>
            <a href="mailto:sales@apas.ai" style={{ display: 'block', textAlign: 'center', fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '14px', background: 'transparent', color: 'var(--apas-sapphire)', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid rgba(29,111,232,0.3)', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,111,232,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Talk to Sales →
            </a>
          </motion.div>
        </div>

        {/* Trust line */}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'var(--landing-muted)', textAlign: 'center', marginBottom: '48px', letterSpacing: '0.1em' }}>
          14-DAY FREE TRIAL ON ALL PLANS · NO CREDIT CARD REQUIRED · CANCEL ANYTIME
        </p>

        {/* FAQ */}
        <div className="max-w-[680px] mx-auto">
          {faqs.map(f => <FAQItem key={f.q} {...f} />)}
        </div>
      </div>
    </section>
  );
}
