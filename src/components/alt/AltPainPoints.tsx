import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { AlertOctagon, FolderOpen, Users } from 'lucide-react';

function AnimatedStat({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 60;
    const duration = 1800;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCount(Math.round(target * (step / steps)));
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

const painCards = [
  {
    icon: AlertOctagon,
    iconColor: '#DC2626',
    iconBg: 'rgba(220,38,38,0.08)',
    title: 'Missed deadlines become enforcement actions.',
    body: 'HUD inspections. Fire safety certificates. Stormwater permits. Elevator inspections. Each on a different renewal cycle, from a different agency. One expiration slips past and suddenly you\'re facing fines, shutdowns, or worse — liability in a legal proceeding you weren\'t prepared for.',
  },
  {
    icon: FolderOpen,
    iconColor: '#D97706',
    iconBg: 'rgba(217,119,6,0.08)',
    title: 'Critical information lives in filing cabinets.',
    body: 'A tenant reports a leak. Your inspector walked the grounds this morning. Did that defect get issued? Did the work order get created? Did the sub get the work order? If you need to make three phone calls to answer those questions, your operation has a problem.',
  },
  {
    icon: Users,
    iconColor: 'var(--apas-sapphire)',
    iconBg: 'rgba(29,111,232,0.08)',
    title: '"I thought someone else handled it."',
    body: 'Without timestamped records, photo evidence, and a clear chain of actions, you can\'t prove what happened, when, or by whom. In a dispute — with a tenant, an inspector, or a regulator — that missing paper trail costs you.',
  },
];

const stats = [
  { value: 50000, prefix: '$', suffix: '+', label1: 'Average HUD', label2: 'non-compliance penalty' },
  { value: 40, suffix: ' hrs/mo', label1: 'Wasted on', label2: 'manual tracking' },
  { value: 3, suffix: '×', label1: 'More likely to', label2: 'face enforcement' },
  { value: 1, suffix: '', label1: 'Platform to', label2: 'replace all of it' },
];

export function AltPainPoints() {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <section id="compliance" style={{ background: 'var(--landing-card)', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <div className="eyebrow mb-4" style={{ color: 'var(--apas-sapphire)' }}>The Cost of Doing Nothing</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 'clamp(28px, 4vw, 46px)', color: 'var(--landing-ink)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: '16px' }}>
            Your team works hard.<br />
            <span style={{ color: '#DC2626' }}>Your tools work against you.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: '18px', color: 'var(--landing-slate)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
            Most property and construction firms manage their operations across 6, 8, sometimes 12 different tools. Nothing talks to anything else. And the gaps between them are where problems — and liabilities — are born.
          </p>
        </motion.div>

        {/* Pain cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {painCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-60px' }}
              style={{
                background: 'var(--landing-card)',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid var(--landing-border)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(26,22,16,0.08)' }}
            >
              <div style={{ width: '44px', height: '44px', background: card.iconBg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <card.icon size={22} color={card.iconColor} />
              </div>
              <h3 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '17px', color: 'var(--landing-ink)', marginBottom: '12px', lineHeight: 1.3 }}>{card.title}</h3>
              <p style={{ fontFamily: "var(--font-editor)", fontSize: '14px', color: 'var(--landing-slate)', lineHeight: 1.75 }}>{card.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats bar */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          style={{
            background: 'var(--landing-ink)',
            borderRadius: '20px',
            padding: '48px 32px',
          }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--apas-sapphire)', marginBottom: '8px' }}>
                  <AnimatedStat target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  {stat.label1}<br />{stat.label2}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
