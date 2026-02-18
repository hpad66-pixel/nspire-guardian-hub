import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

function Counter({ target, suffix = '' }: { target: number | string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || typeof target !== 'number') return;
    const steps = 50;
    const dur = 1600;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setCount(Math.round((target as number) * (step / steps)));
      if (step >= steps) clearInterval(iv);
    }, dur / steps);
    return () => clearInterval(iv);
  }, [inView, target]);

  if (typeof target !== 'number') return <span ref={ref}>{target}</span>;
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const stats = [
  { value: 500, suffix: '+', label1: 'Teams using', label2: 'APAS OS' },
  { value: '3.2M+', label1: 'Documents', label2: 'managed' },
  { value: 99.7, suffix: '%', label1: 'Uptime', label2: 'SLA' },
  { value: 48, suffix: ' hrs', label1: 'Average', label2: 'onboarding time' },
];

const testimonials = [
  {
    text: 'We manage 6 properties across 3 cities. APAS OS replaced four different tools we were paying for and gave us a compliance dashboard I can show any HUD inspector without preparation.',
    author: 'Maria G.',
    role: 'Property Manager',
    initials: 'MG',
    color: '#2563EB',
  },
  {
    text: 'The voice agent paid for itself in the first month. My team was getting maintenance calls at 11pm. Now the AI handles them and sends us a clean work order by morning.',
    author: 'James W.',
    role: 'Superintendent',
    initials: 'JW',
    color: '#059669',
  },
  {
    text: 'We run capital improvement projects between $500K and $3M. Tracking RFIs and change orders in APAS OS is cleaner than Procore and costs a fraction of the price.',
    author: 'David R.',
    role: 'Construction Manager',
    initials: 'DR',
    color: '#D97706',
  },
];

export function AltSocialProof() {
  return (
    <section style={{ background: '#F8FAFC', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 'clamp(24px, 4vw, 42px)', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Used by property managers, construction firms,<br className="hidden md:block" /> and compliance professionals.
          </h2>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', color: '#2563EB', marginBottom: '6px' }}>
                {typeof s.value === 'number' ? <Counter target={s.value} suffix={s.suffix} /> : s.value}
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#94A3B8', lineHeight: 1.5 }}>
                {s.label1}<br />{s.label2}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.09)' }}
              style={{
                background: '#fff', borderRadius: '16px', padding: '28px 24px',
                border: '1px solid #E2E8F0',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <span key={j} style={{ color: '#F59E0B', fontSize: '14px' }}>★</span>
                ))}
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#475569', lineHeight: 1.75, marginBottom: '20px', fontStyle: 'italic' }}>
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: t.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '13px', color: t.color }}>{t.initials}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>{t.author}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#94A3B8' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
