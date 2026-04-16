import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs: { q: string; a: string }[] = [
  {
    q: 'How is Build Space OS different from Yardi or AppFolio?',
    a: 'Legacy suites were built before smartphones. Build Space OS is mobile-first, includes an AI voice agent, ships NSPIRE-compliant inspections out of the box, and replaces five to ten standalone tools with one connected data model. You can be running inspections in days — not a six-month implementation.',
  },
  {
    q: 'Is it really HUD NSPIRE compliant?',
    a: 'Yes. The inspection engine ships with the full HUD NSPIRE defect catalog, severity scoring, 24-hour severe defect alerts, and REAC-ready reports. Your inspectors follow the exact protocol auditors expect — and every finding has a photo, a timestamp, and an attributable user.',
  },
  {
    q: 'Does it work offline on a property walkthrough?',
    a: 'Yes. Build Space OS is a Progressive Web App with an offline queue. Inspectors keep working in basements, stairwells, and on sites with no signal. Every change is captured locally and syncs automatically the moment connectivity returns.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Most customers are running inspections and work orders within two weeks. We ship an import wizard for properties, units, and assets; a guided invite flow for your team; and templated NSPIRE, daily-grounds, and safety checklists you can start using on day one.',
  },
  {
    q: 'What about data security and tenant isolation?',
    a: 'Every workspace is isolated at the database row level. Role-based access controls span eleven roles from admin to subcontractor, with a full audit trail. Data is encrypted in transit and at rest, and enterprise customers can request SSO and custom retention policies.',
  },
  {
    q: 'Can we white-label client and inspector portals?',
    a: 'Yes. The Client Portal module generates branded, token-based views for owners, regulators, and HUD auditors. They see only what you share — no login headaches — with your logo, your colors, and your subdomain.',
  },
  {
    q: 'How does pricing work?',
    a: 'One predictable subscription per workspace with unlimited team members on the core modules. Paid add-ons (Credentials, Training, Safety, Equipment, Client Portals) are toggled per workspace when you need them. No per-seat traps, no integration surcharges.',
  },
  {
    q: 'Can I migrate from my existing tools?',
    a: 'Yes. We provide CSV imports for properties, units, residents, assets, and permits, plus direct migration paths from common legacy suites. Our team will map your existing fields and run a test migration before cutover so nothing is lost.',
  },
];

export function HomeFAQ() {
  return (
    <section
      id="faq"
      className="relative overflow-hidden py-28"
      style={{ background: '#0A0B0D' }}
    >
      {/* subtle ambient */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-0 h-[420px] w-[640px] opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(139,92,246,0.14), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[880px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          className="mb-12 text-center"
        >
          <p
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-blue-400/80"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Answers
          </p>
          <h2
            className="mb-5 text-white"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            Questions, answered.
          </h2>
          <p
            className="mx-auto max-w-xl leading-relaxed text-white/40"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px' }}
          >
            Everything teams usually ask before switching. Click any question
            to expand.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true, margin: '-80px' }}
        >
          <Accordion
            type="single"
            collapsible
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
          >
            {faqs.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`q-${i}`}
                className="border-b border-white/[0.05] last:border-b-0 data-[state=open]:bg-white/[0.015]"
              >
                <AccordionTrigger
                  className="px-6 py-5 text-left text-[15px] font-semibold text-white/90 hover:text-white hover:no-underline [&[data-state=open]>svg]:text-blue-400"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.012em',
                  }}
                >
                  {item.q}
                </AccordionTrigger>
                <AccordionContent
                  className="px-6 pb-6 text-[14px] leading-relaxed text-white/55"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Soft closer */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-10 text-center text-[13px] text-white/35"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Still have questions?{' '}
          <a
            href="mailto:sales@apas.ai"
            className="text-blue-400/80 transition-colors hover:text-blue-300"
          >
            Talk to our team →
          </a>
        </motion.p>
      </div>
    </section>
  );
}
