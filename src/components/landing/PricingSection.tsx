import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, ChevronDown, Shield, Phone } from 'lucide-react';

const faqs = [
  {
    q: "Do I need the NSPIRE add-on if I'm not a HUD property?",
    a: "Not necessarily. NSPIRE Compliance is specifically for operators subject to HUD's inspection protocol (Section 8, public housing, HCV programs). If you manage market-rate properties or private construction projects only, you likely don't need it — Starter or Professional covers your operations completely.",
  },
  {
    q: "What's the difference between Daily Grounds and NSPIRE Compliance?",
    a: "Daily Grounds is your everyday property walkthrough — documenting conditions, logging issues, maintaining a visible operations record. NSPIRE Compliance is the formal HUD inspection suite — it follows the exact NSPIRE defect catalog, scoring methodology, and regulatory documentation requirements. Both are available; most HUD operators use both.",
  },
  {
    q: 'Is the AI Voice Agent truly unlimited calls?',
    a: "Yes. The Voice Agent add-on and Enterprise plan include unlimited standard call volume. Enterprise customers with over 50,000 calls/month have a dedicated capacity conversation — but there are no per-minute charges at any volume.",
  },
  {
    q: 'Can my field team use this offline at job sites?',
    a: "Yes. APAS OS is a Progressive Web App — install it from any browser on iPhone or Android. Inspections, photos, voice notes, and work orders all work offline. Data syncs automatically when you're back online. No app store required.",
  },
  {
    q: 'How fast can we get operational?',
    a: "Most solo operators are live within 2 hours. Firms migrating from existing systems typically go live in 48 hours using our CSV import tools. Professional and Enterprise customers get white-glove onboarding.",
  },
];

const tiers = [
  {
    name: 'Starter',
    priceMonthly: 179,
    priceAnnual: 149,
    priceLabel: null,
    priceSub: null,
    tagline: 'For solo operators and small teams ready to replace the spreadsheets',
    highlight: false,
    badge: null,
    cta: 'Start Free 14-Day Trial',
    features: [
      'Up to 3 properties / 100 units',
      'Up to 10 team members',
      'Unlimited photos & documents',
      'Daily grounds inspections + photo documentation',
      'Work order pipeline',
      'Permit tracking (unlimited)',
      'Team messaging',
      'Standard reports + CSV export',
      'Progressive Web App (offline capable)',
      '3-year data retention',
      'Email support (48-hr response)',
      '✦ NSPIRE Compliance Suite available as add-on (+$49/mo)',
      '✦ AI Voice Agent available as add-on (+$99/mo)',
    ],
  },
  {
    name: 'Professional',
    priceMonthly: 399,
    priceAnnual: 349,
    priceLabel: null,
    priceSub: null,
    tagline: 'For growing firms managing multiple properties and construction projects',
    highlight: true,
    badge: 'Most Popular',
    cta: 'Start Free 14-Day Trial',
    features: [
      'Everything in Starter, plus:',
      'Up to 10 properties / unlimited units',
      'Up to 25 team members',
      'Unlimited photos, videos & documents',
      'NSPIRE Compliance Suite included',
      'Full construction project management (Gantt, RFIs, submittals, change orders)',
      'AI proposal & report generation',
      'Training & certification module',
      'CRM / unlimited contacts',
      'Email integration (inbox, compose, reply)',
      'QR code asset management',
      'Advanced analytics (all report types)',
      'Property Archives vault (permanent retention)',
      'Priority support (4-hour response)',
      '✦ AI Voice Agent available as add-on (+$99/mo)',
    ],
  },
  {
    name: 'Enterprise',
    priceMonthly: null,
    priceAnnual: null,
    priceLabel: 'from $799/mo',
    priceSub: 'billed annually',
    tagline: 'Unlimited everything — properties, users, AI, storage, and calls',
    highlight: false,
    badge: null,
    cta: 'Talk to Sales',
    features: [
      'Everything in Professional, plus:',
      'Unlimited properties & units',
      'Unlimited users + custom role definitions',
      'Unlimited photos, videos & file storage',
      'Unlimited AI usage (proposals, reports, analysis)',
      'AI Voice Agent included (unlimited call volume)',
      'Unlimited contacts & CRM records',
      'White-label / custom domain',
      'Custom NSPIRE scoring configurations',
      'Dedicated Customer Success Manager',
      'SSO / SAML authentication',
      'API access for integrations',
      'SLA: 1-hour critical response',
      'On-site implementation support',
    ],
  },
];

const addOns = [
  {
    icon: Shield,
    iconColor: '#10B981',
    iconBg: 'rgba(16,185,129,0.12)',
    iconBorder: 'rgba(16,185,129,0.25)',
    accentColor: '#10B981',
    name: 'NSPIRE Compliance Suite',
    price: '+$49/mo',
    description: 'Full HUD NSPIRE inspection engine. 80+ defect categories, life-threatening violation alerts, GPS-tagged photo evidence, NSPIRE score tracking. For any operator subject to HUD oversight.',
    includedIn: 'Professional, Enterprise',
  },
  {
    icon: Phone,
    iconColor: 'hsl(262 83% 58%)',
    iconBg: 'rgba(139,92,246,0.12)',
    iconBorder: 'rgba(139,92,246,0.25)',
    accentColor: 'hsl(262 83% 58%)',
    name: 'AI Voice Agent',
    price: '+$99/mo',
    description: '24/7 AI-powered call center. Handles tenant inquiries, work order intake, and appointment scheduling — without a human operator. Unlimited calls included.',
    includedIn: 'Enterprise',
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
            Priced for Field Operators.{' '}
            <em>Not Enterprise Procurement Committees.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '620px', margin: '0 auto 28px' }}>
            Procore starts at $375/mo. AppFolio at $280. Yardi won't even quote you without a sales call. We think field operators deserve better.
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
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
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
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'var(--apas-sapphire)', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, padding: '4px 14px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                  {tier.badge}
                </div>
              )}

              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{tier.name}</div>
              <div style={{ marginBottom: '8px' }}>
                {tier.priceLabel ? (
                  <div>
                    <span style={{ fontFamily: 'Instrument Serif', fontSize: '40px', color: 'var(--apas-white)', lineHeight: 1.2 }}>{tier.priceLabel}</span>
                    {tier.priceSub && <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--apas-muted)', marginTop: '4px' }}>{tier.priceSub}</p>}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-1">
                      <span style={{ fontFamily: 'Instrument Serif', fontSize: '52px', color: 'var(--apas-white)', lineHeight: 1 }}>
                        ${annual ? tier.priceAnnual : tier.priceMonthly}
                      </span>
                      <span style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--apas-muted)', paddingBottom: '10px' }}>/mo</span>
                    </div>
                    {annual && (
                      <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--apas-muted)', marginTop: '4px' }}>
                        Billed ${(tier.priceAnnual! * 12).toLocaleString()}/year
                      </p>
                    )}
                  </div>
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
                {tier.cta}
                <ArrowRight size={15} />
              </Link>

              <ul className="space-y-2.5">
                {tier.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2.5">
                    {f.startsWith('Everything') ? (
                      <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', fontStyle: 'italic' }}>{f}</span>
                    ) : f.startsWith('✦') ? (
                      <span style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--apas-muted)', lineHeight: 1.5, opacity: 0.7, fontStyle: 'italic' }}>{f}</span>
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

        {/* Add-ons section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-60px' }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h3 style={{ fontFamily: 'Instrument Serif', fontSize: '28px', color: 'var(--apas-white)', marginBottom: '8px' }}>Power-Up Any Plan</h3>
            <p style={{ fontFamily: 'DM Sans', fontSize: '15px', color: 'var(--apas-muted)' }}>Add specialized capabilities when your work demands it.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {addOns.map((addon) => (
              <div
                key={addon.name}
                style={{
                  background: 'var(--apas-surface)',
                  border: '1px solid var(--apas-border)',
                  borderLeft: `3px solid ${addon.accentColor}`,
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div style={{ height: '40px', width: '40px', borderRadius: '10px', background: addon.iconBg, border: `1px solid ${addon.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <addon.icon size={18} color={addon.iconColor} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '15px', color: 'var(--apas-white)' }}>{addon.name}</p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: addon.accentColor, fontWeight: 700 }}>{addon.price}</p>
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', lineHeight: 1.7 }}>{addon.description}</p>
                <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--apas-border)', color: 'var(--apas-muted)', padding: '3px 10px', borderRadius: '999px' }}>
                    Included free in: {addon.includedIn}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
          {['🔒  14-day free trial', 'No credit card required', 'Cancel anytime', 'Offline-capable PWA', '3-year retention', 'Row-level security'].map((item, i) => (
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
