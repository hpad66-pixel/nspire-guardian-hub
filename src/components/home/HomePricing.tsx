import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Star } from 'lucide-react';

const starterFeatures = ['Up to 3 properties / 100 units', 'Up to 10 team members', 'Unlimited photos & documents', 'Daily inspections + photo documentation', 'NSPIRE compliance engine (full catalog)', 'Work order pipeline', 'Unlimited permit tracking', 'Team messaging', 'Reports & CSV export', 'Progressive Web App (offline capable)', 'Email support (48-hr response)'];
const proFeatures = ['Everything in Starter, plus:', 'Up to 10 properties / unlimited units', 'Up to 25 team members', 'AI Voice Agent — 24/7 tenant call center', 'Full project management (Gantt, RFIs, COs)', 'AI proposal & report generation', 'Training & certification module', 'Email integration', 'QR code asset management', 'Priority support (4-hour response)'];
const enterpriseFeatures = ['Everything in Professional, plus:', 'Unlimited properties, units & users', 'Unlimited AI usage', 'White-label / custom domain', 'SSO / SAML authentication', 'Dedicated Customer Success Manager', 'API access for integrations', '1-hour SLA response'];

const faqs = [
  { q: 'Do I need separate plans for multiple properties?', a: 'No. Each plan covers multiple properties up to the stated limit. One account, one dashboard, one subscription.' },
  { q: 'Is the AI Voice Agent included?', a: 'Yes, in Professional and Enterprise. Unlimited calls, no per-minute fees for standard usage.' },
  { q: 'Can my inspectors use it offline?', a: 'Yes. APAS OS is a PWA. Install from any browser. Inspections, photos, and voice notes work offline and sync automatically.' },
  { q: 'What happens after the trial?', a: 'Choose a plan or your account pauses — data stays intact for 30 days. No surprise charges.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E4E4E7]">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-4 text-left">
        <span className="text-[15px] font-semibold text-[#0A0B0D] pr-4" style={{ fontFamily: 'Inter' }}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-[#A1A1AA] shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-[14px] text-[#71717A] leading-relaxed pb-4 pl-0 border-l-2 border-blue-500 ml-0 pl-4" style={{ fontFamily: 'Inter' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HomePricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-28" style={{ background: '#fff' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-blue-500/80 mb-4" style={{ fontFamily: 'Inter' }}>Pricing</p>
          <h2 className="text-[#0A0B0D] mb-4" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 44px)', letterSpacing: '-0.03em' }}>
            Honest pricing. Everything included.
          </h2>
          <p className="text-[#71717A] max-w-lg mx-auto mb-8" style={{ fontFamily: 'Inter', fontSize: '17px' }}>
            No per-unit fees. No per-seat surprises. One subscription covers your whole team.
          </p>

          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F4F4F5]">
            <button onClick={() => setAnnual(false)} className={`text-[13px] font-semibold px-5 py-2 rounded-full transition-all ${!annual ? 'bg-white shadow-sm text-[#0A0B0D]' : 'text-[#A1A1AA]'}`} style={{ fontFamily: 'Inter' }}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`text-[13px] font-semibold px-5 py-2 rounded-full transition-all flex items-center gap-2 ${annual ? 'bg-white shadow-sm text-[#0A0B0D]' : 'text-[#A1A1AA]'}`} style={{ fontFamily: 'Inter' }}>
              Annual <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">-20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {/* Starter */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}
            className="rounded-2xl bg-white border border-[#E4E4E7] p-7 flex flex-col">
            <h3 className="text-[18px] font-bold text-[#0A0B0D] mb-1" style={{ fontFamily: 'Inter' }}>Starter</h3>
            <p className="text-[13px] text-[#A1A1AA] mb-5" style={{ fontFamily: 'Inter' }}>Up to 3 properties · 10 users</p>
            <div className="mb-6">
              <span className="text-[40px] font-bold text-[#0A0B0D]" style={{ fontFamily: "'JetBrains Mono'" }}>${annual ? '149' : '179'}</span>
              <span className="text-[14px] text-[#A1A1AA]">/mo</span>
              {annual && <div className="text-[12px] text-[#A1A1AA] mt-1">billed annually</div>}
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {starterFeatures.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-[13px] text-[#71717A]" style={{ fontFamily: 'Inter' }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth" className="block text-center text-[14px] font-semibold bg-[#F4F4F5] text-[#0A0B0D] py-3.5 rounded-xl hover:bg-[#E4E4E7] transition-colors" style={{ fontFamily: 'Inter' }}>
              Start Free Trial
            </Link>
          </motion.div>

          {/* Professional */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} viewport={{ once: true }}
            className="rounded-2xl bg-white border-2 border-blue-500 p-7 flex flex-col relative shadow-[0_8px_32px_rgba(59,130,246,0.12)]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Star size={10} fill="white" /> Most Popular
            </div>
            <h3 className="text-[18px] font-bold text-[#0A0B0D] mb-1" style={{ fontFamily: 'Inter' }}>Professional</h3>
            <p className="text-[13px] text-[#A1A1AA] mb-5" style={{ fontFamily: 'Inter' }}>Up to 10 properties · 25 users</p>
            <div className="mb-6">
              <span className="text-[40px] font-bold text-blue-600" style={{ fontFamily: "'JetBrains Mono'" }}>${annual ? '349' : '399'}</span>
              <span className="text-[14px] text-[#A1A1AA]">/mo</span>
              {annual && <div className="text-[12px] text-[#A1A1AA] mt-1">billed annually</div>}
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {proFeatures.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={14} className={f.startsWith('Everything') ? 'text-[#A1A1AA] shrink-0 mt-0.5' : 'text-emerald-500 shrink-0 mt-0.5'} />
                  <span className={`text-[13px] ${f.startsWith('Everything') ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`} style={{ fontFamily: 'Inter' }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth" className="block text-center text-[14px] font-semibold bg-blue-500 text-white py-3.5 rounded-xl hover:bg-blue-600 transition-colors shadow-[0_4px_14px_rgba(59,130,246,0.3)]" style={{ fontFamily: 'Inter' }}>
              Start Free Trial
            </Link>
          </motion.div>

          {/* Enterprise */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} viewport={{ once: true }}
            className="rounded-2xl p-7 flex flex-col" style={{ background: '#0A0B0D', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-[18px] font-bold text-white mb-1" style={{ fontFamily: 'Inter' }}>Enterprise</h3>
            <p className="text-[13px] text-white/40 mb-5" style={{ fontFamily: 'Inter' }}>Unlimited everything</p>
            <div className="mb-6">
              <span className="text-[30px] font-bold text-blue-400" style={{ fontFamily: "'JetBrains Mono'" }}>from $799/mo</span>
              <div className="text-[12px] text-white/30 mt-1">billed annually · custom pricing</div>
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {enterpriseFeatures.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={14} className={f.startsWith('Everything') ? 'text-white/30 shrink-0 mt-0.5' : 'text-blue-400 shrink-0 mt-0.5'} />
                  <span className={`text-[13px] ${f.startsWith('Everything') ? 'text-white/30' : 'text-white/60'}`} style={{ fontFamily: 'Inter' }}>{f}</span>
                </li>
              ))}
            </ul>
            <a href="mailto:sales@apas.ai" className="block text-center text-[14px] font-semibold text-blue-400 py-3.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors" style={{ fontFamily: 'Inter' }}>
              Talk to Sales →
            </a>
          </motion.div>
        </div>

        <p className="text-center text-[12px] text-[#A1A1AA] mb-12" style={{ fontFamily: "'JetBrains Mono'" }}>
          14-day free trial on all plans · No credit card required · Cancel anytime
        </p>

        <div className="max-w-[680px] mx-auto">
          {faqs.map(f => <FAQItem key={f.q} {...f} />)}
        </div>
      </div>
    </section>
  );
}
