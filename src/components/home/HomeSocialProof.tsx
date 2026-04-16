import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

function Counter({ target, suffix = '' }: { target: number | string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || typeof target !== 'number') return;
    const steps = 50;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setCount(Math.round((target as number) * (step / steps)));
      if (step >= steps) clearInterval(iv);
    }, 1400 / steps);
    return () => clearInterval(iv);
  }, [inView, target]);

  if (typeof target !== 'number') return <span ref={ref}>{target}</span>;
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const stats = [
  { value: 500, suffix: '+', label: 'Teams using APAS OS' },
  { value: '3.2M+', label: 'Documents managed' },
  { value: 99.7, suffix: '%', label: 'Uptime SLA' },
  { value: 48, suffix: ' hrs', label: 'Average onboarding' },
];

const testimonials = [
  {
    text: 'We manage 6 properties across 3 cities. APAS OS replaced four different tools and gave us a compliance dashboard we can show any HUD inspector.',
    author: 'Maria G.', role: 'Property Manager', color: '#3B82F6',
  },
  {
    text: 'The voice agent paid for itself in the first month. My team was getting maintenance calls at 11pm. Now the AI handles them and sends clean work orders by morning.',
    author: 'James W.', role: 'Superintendent', color: '#10B981',
  },
  {
    text: 'We run capital projects between $500K and $3M. Tracking RFIs and change orders in APAS OS is cleaner than Procore at a fraction of the price.',
    author: 'David R.', role: 'Construction Manager', color: '#F59E0B',
  },
];

export function HomeSocialProof() {
  return (
    <section className="py-28" style={{ background: '#0A0B0D' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-white mb-5" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 42px)', letterSpacing: '-0.03em' }}>
            Trusted by property managers and<br className="hidden md:block" /> construction professionals.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }} viewport={{ once: true }} className="text-center">
              <div className="text-blue-400 mb-2" style={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)' }}>
                {typeof s.value === 'number' ? <Counter target={s.value} suffix={s.suffix} /> : s.value}
              </div>
              <p className="text-white/30 text-[13px]" style={{ fontFamily: 'Inter' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl p-7 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => <span key={j} className="text-amber-400 text-[14px]">★</span>)}
              </div>
              <p className="text-white/50 text-[14px] leading-relaxed mb-6 italic" style={{ fontFamily: 'Inter' }}>"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${t.color}15` }}>
                  <span className="text-[12px] font-bold" style={{ color: t.color }}>{t.author.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div>
                  <p className="text-white/80 text-[14px] font-semibold" style={{ fontFamily: 'Inter' }}>{t.author}</p>
                  <p className="text-white/30 text-[12px]" style={{ fontFamily: 'Inter' }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
