import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CalendarCheck, ListChecks, FileBarChart2, Radar, Scale, Receipt } from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal, Chip, TypeText } from '../shared';

type Demo =
  | { kind: 'chips'; chips: { label: string; tone: 'gold' | 'emerald' | 'sapphire' | 'rose' | 'neutral' }[] }
  | { kind: 'type'; text: string };

const CARDS: { icon: typeof Mail; title: string; body: string; demo: Demo }[] = [
  {
    icon: Mail, title: 'Thread Intelligence',
    body: 'Reads every synced email thread and surfaces whose court the ball is in, what’s owed, and when it’s due.',
    demo: { kind: 'chips', chips: [
      { label: 'Ball in court: Owner', tone: 'rose' },
      { label: '$95,000 at stake', tone: 'gold' },
      { label: 'Reply by Aug 15', tone: 'sapphire' },
    ] },
  },
  {
    icon: CalendarCheck, title: 'Meeting Minutes',
    body: 'Paste raw notes or a transcript — get structured, branded minutes with numbered sections and owners.',
    demo: { kind: 'type', text: '§3 Schedule — sod installation moved to Aug 8, owner to confirm irrigation shutoff…' },
  },
  {
    icon: ListChecks, title: 'Punch List Builder',
    body: 'Speak a site walk. AI drafts the punch items, locations, and priorities — you review and send to the sub.',
    demo: { kind: 'chips', chips: [
      { label: '3 items drafted', tone: 'gold' },
      { label: 'Building 3 · courtyard', tone: 'neutral' },
      { label: 'Sent after review', tone: 'emerald' },
    ] },
  },
  {
    icon: FileBarChart2, title: 'Client Status Reports',
    body: 'Check the action items you want covered — AI writes a grounded, client-ready narrative from only those items.',
    demo: { kind: 'type', text: 'Two items are active this week: courtyard restoration is 60% complete, and the CO #9 walkway…' },
  },
  {
    icon: Radar, title: 'Risk Radar',
    body: 'Scans each project’s financials, schedule, and open items to flag what’s drifting before it becomes a claim.',
    demo: { kind: 'chips', chips: [
      { label: '30 days past target', tone: 'rose' },
      { label: 'Retainage exposure ↑', tone: 'gold' },
      { label: '2 unanswered RFIs', tone: 'sapphire' },
    ] },
  },
  {
    icon: Scale, title: 'CaseIQ',
    body: 'Drop in a consent order or regulatory case file — get obligations, deadlines, and a compliance posture readout.',
    demo: { kind: 'chips', chips: [
      { label: '14 obligations found', tone: 'gold' },
      { label: '3 due this quarter', tone: 'rose' },
      { label: 'Progress report drafted', tone: 'emerald' },
    ] },
  },
];

function CardDemo({ demo, active }: { demo: Demo; active: boolean }) {
  if (demo.kind === 'type') {
    return (
      <div style={{
        fontFamily: F.mono, fontSize: 11.5, lineHeight: 1.6, color: C.dim,
        background: C.cardWarm, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', minHeight: 58,
      }}>
        <TypeText text={demo.text} active={active} speed={18} cursor />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, minHeight: 58, alignContent: 'flex-start' }}>
      {demo.chips.map((chip, i) => (
        <motion.span key={chip.label}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={active ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.15 + i * 0.18, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </motion.span>
      ))}
    </div>
  );
}

export function AISection() {
  const [seen, setSeen] = useState(false);
  return (
    <section id="ai" style={{ background: C.cream, padding: '110px 0 120px' }}>
      <div style={CONTAINER}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Reveal><Eyebrow>Applied AI</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <SectionTitle style={{ margin: '22px auto 18px', maxWidth: 780 }}>
              AI that does the paperwork <Serif>you keep putting off.</Serif>
            </SectionTitle>
          </Reveal>
          <Reveal delay={0.16}>
            <Sub style={{ margin: '0 auto', textAlign: 'center', maxWidth: 640 }}>
              Not a chatbot bolted on the side — AI wired into every workflow, grounded in your project&apos;s real
              contracts, emails, and numbers.
            </Sub>
          </Reveal>
        </div>

        <motion.div
          onViewportEnter={() => setSeen(true)}
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.title} delay={i * 0.07} y={22}>
                <div style={{
                  background: C.card, border: `1px solid ${C.line}`, borderRadius: 18,
                  padding: '24px 24px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: 14,
                  boxShadow: '0 6px 24px rgba(26,23,20,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, background: C.goldSoft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={17} color={C.goldDeep} />
                    </div>
                    <h3 style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 17, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>
                      {card.title}
                    </h3>
                  </div>
                  <p style={{ fontFamily: F.sans, fontSize: 13.5, lineHeight: 1.6, color: C.dim, margin: 0, flex: 1 }}>
                    {card.body}
                  </p>
                  <CardDemo demo={card.demo} active={seen} />
                </div>
              </Reveal>
            );
          })}
        </motion.div>

        <Reveal delay={0.3}>
          <div style={{
            marginTop: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            fontFamily: F.mono, fontSize: 12, color: C.faint,
          }}>
            <Receipt size={13} color={C.goldDeep} />
            Every AI call is metered in your usage ledger — cost by model, project, and client. No surprise bills.
          </div>
        </Reveal>
      </div>
    </section>
  );
}
