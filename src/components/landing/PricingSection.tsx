import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Do I need different plans for different properties?',
    a: "No. Each plan covers multiple properties up to the stated limit. You have one account, one dashboard, one subscription — all your properties inside.",
  },
  {
    q: 'What happens if I exceed my property or user limits?',
    a: "We'll reach out before anything breaks. You can upgrade mid-cycle at a prorated cost. We don't lock you out of your data.",
  },
  {
    q: 'Is the AI Voice Agent really included — no per-minute charges?',
    a: 'The Voice Agent is included in Professional and Enterprise plans. Unlimited calls, no per-minute fees for standard usage. High-volume call centers (10,000+ calls/month) are covered under Enterprise.',
  },
  {
    q: 'Can my inspectors use it offline at remote sites?',
    a: 'Yes. APAS OS is a Progressive Web App. Install it from your browser on any phone. Inspections, photos, and voice notes work offline and sync automatically when you\'re back online.',
  },
  {
    q: 'How do I migrate from my existing system?',
    a: 'CSV imports for units, tenants, and contacts. Document bulk upload for existing files. Our onboarding team assists Professional and Enterprise customers. Most firms are operational within 48 hours.',
  },
];

const tiers = [
  {
    name: 'Starter',
    priceMonthly: 99,
    priceAnnual: 79,
    tagline: 'For solo operators and small property managers',
    highlight: false,
    features: [
      'Up to 3 properties / 50 units',
      'Up to 10 team members',
      'Daily grounds inspections + photo documentation',
      'NSPIRE compliance engine (full defect catalog)',
      'Work order pipeline',
      'Permit tracking (up to 20 active permits)',
      'Document center (50 GB storage)',
      'Team messaging',
      'Standard reports + CSV export',
      'Progressive Web App (mobile install)',
      '3-year data retention',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    priceMonthly: 249,
    priceAnnual: 199,
    tagline: 'For growing firms managing multiple properties',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Everything in Starter, plus:',
      'Up to 15 properties / 500 units',
      'Up to 40 team members',
      'AI Voice Agent (24/7, unlimited calls)',
      'Full project management (Gantt, RFIs, submittals, change orders)',
      'AI proposal generation',
      'Training & certification module',
      'CRM / contacts management',
      'Email integration (inbox, compose, reply)',
      'QR code scanning for asset management',
      'Advanced analytics (all 9 report types)',
      'Unlimited document storage',
      'Property Archives vault (permanent)',
      'Priority support (4-hour response)',
    ],
  },
  {
    name: 'Enterprise',
    priceMonthly: null,
    priceAnnual: null,
    tagline: 'For multi-portfolio firms with custom requirements',
    highlight: false,
    features: [
      'Everything in Professional, plus:',
      'Unlimited properties and units',
      'Unlimited users + custom role definitions',
      'Custom NSPIRE scoring configurations',
      'White-label / custom domain',
      'Dedicated Customer Success Manager',
      'Custom training & onboarding',
      'SSO / SAML authentication',
      'Custom data retention policies',
      'API access for integrations',
      'SLA: 1-hour critical response',
      'On-site implementation support',
    ],
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="pricing" style={{ background: 'var(--apas-deep)', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 4vw, 52px)', color: 'var(--apas-white)', lineHeight: 1.15, marginBottom: '16px' }}>
            Straightforward Pricing.{' '}
            <em>No Per-Unit Fees. No Per-Seat Surprises.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '620px', margin: '0 auto 28px' }}>
            We built this for operators who've been overcharged by legacy software. One monthly subscription. All modules included.
          </p>

          {/* Annual / Monthly Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span style={{ fontFamily: 'DM Sans', fontSize: '14px', color: annual ? 'var(--apas-muted)' : 'var(--apas-white)' }}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              style={{
                width: '52px', height: '28px', borderRadius: '999px',
                background: annual ? 'var(--apas-sapphire)' : 'rgba(255,255,255,0.12)',
                position: 'relative', transition: 'background 0.3s', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', background: 'white',
                position: 'absolute', top: '3px',
                left: annual ? '27px' : '3px',
                transition: 'left 0.3s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }} />
            </button>
            <span style={{ fontFamily: 'DM Sans', fontSize: '14px', color: annual ? 'var(--apas-white)' : 'var(--apas-muted)' }}>
              Annual
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10B981', borderRadius: '4px', padding: '2px 6px', marginLeft: '6px' }}>Save 20%</span>
            </span>
          </div>
        </motion.div>

        {/* Tier Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-16">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-40px' }}
              style={{
                background: tier.highlight ? 'var(--apas-surface)' : 'rgba(255,255,255,0.025)',
                borderRadius: '20px',
                padding: '32px',
                border: tier.highlight ? '2px solid rgba(29,111,232,0.4)' : '1px solid var(--apas-border)',
                boxShadow: tier.highlight ? '0 0 0 1px rgba(29,111,232,0.1), 0 24px 60px rgba(29,111,232,0.12)' : 'none',
                position: 'relative',
              }}
            >
              {tier.badge && (
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'var(--apas-amber)', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, padding: '4px 14px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                  {tier.badge}
                </div>
              )}

              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{tier.name}</div>
              <div style={{ marginBottom: '8px' }}>
                {tier.priceMonthly ? (
                  <div className="flex items-end gap-1">
                    <span style={{ fontFamily: 'Instrument Serif', fontSize: '52px', color: 'var(--apas-white)', lineHeight: 1 }}>
                      ${annual ? tier.priceAnnual : tier.priceMonthly}
                    </span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', paddingBottom: '10px' }}>/mo</span>
                  </div>
                ) : (
                  <span style={{ fontFamily: 'Instrument Serif', fontSize: '40px', color: 'var(--apas-white)', lineHeight: 1.2 }}>Custom Pricing</span>
                )}
                {tier.priceMonthly && annual && (
                  <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--apas-muted)', marginTop: '4px' }}>
                    Billed ${(tier.priceAnnual! * 12).toLocaleString()}/year
                  </p>
                )}
              </div>
              <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', marginBottom: '24px', lineHeight: 1.6 }}>{tier.tagline}</p>

              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 w-full mb-8"
                style={{
                  fontFamily: 'DM Sans', fontWeight: 600, fontSize: '15px',
                  background: tier.highlight ? 'var(--apas-sapphire)' : 'rgba(255,255,255,0.06)',
                  color: 'var(--apas-white)',
                  padding: '14px', borderRadius: '12px',
                  border: tier.highlight ? 'none' : '1px solid var(--apas-border)',
                  boxShadow: tier.highlight ? '0 0 30px rgba(29,111,232,0.3)' : 'none',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
              >
                {tier.priceMonthly ? 'Start Free 14-Day Trial' : 'Contact Sales'}
                <ArrowRight size={15} />
              </Link>

              <ul className="space-y-2.5">
                {tier.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2.5">
                    {f.startsWith('Everything') ? (
                      <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', fontStyle: 'italic' }}>{f}</span>
                    ) : (
                      <>
                        <Check size={14} style={{ color: tier.highlight ? 'var(--apas-sapphire)' : '#10B981', marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', lineHeight: 1.5 }}>{f}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
          {['🔒  14-day free trial', 'No credit card required', 'Cancel anytime', 'All plans include NSPIRE compliance engine', '3-year retention', 'Row-level security'].map((item, i) => (
            <span key={i} style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)' }}>{item}</span>
          ))}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-60px' }}
          className="max-w-3xl mx-auto"
        >
          <h3 style={{ fontFamily: 'Instrument Serif', fontSize: '32px', color: 'var(--apas-white)', textAlign: 'center', marginBottom: '28px' }}>Common Questions</h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--apas-surface)',
                  borderRadius: '12px',
                  border: openFaq === i ? '1px solid rgba(29,111,232,0.3)' : '1px solid var(--apas-border)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex items-center justify-between w-full text-left"
                  style={{ padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: '15px', color: 'var(--apas-white)' }}>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    style={{ color: 'var(--apas-muted)', flexShrink: 0, marginLeft: '12px', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div style={{ padding: '0 22px 18px', borderLeft: '3px solid var(--apas-sapphire)', marginLeft: '22px' }}>
                        <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', lineHeight: 1.8 }}>{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
