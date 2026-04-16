import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { FileSpreadsheet, Phone, FileWarning } from 'lucide-react';

function Counter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 50;
    const dur = 1400;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setCount(Math.round(target * (step / steps)));
      if (step >= steps) clearInterval(iv);
    }, dur / steps);
    return () => clearInterval(iv);
  }, [inView, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

const problems = [
  {
    icon: FileWarning,
    title: 'Missed deadlines become enforcement actions',
    body: 'HUD inspections, fire safety certificates, elevator permits — each on different renewal cycles. One slip means fines, shutdowns, or liability.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Critical data lives in twelve different places',
    body: 'A leak is reported. Was the defect logged? Was a work order created? Did the sub receive it? Three phone calls to answer what should be one click.',
  },
  {
    icon: Phone,
    title: '"I thought someone else handled it"',
    body: 'Without timestamped records and photo evidence, you can\'t prove what happened, when, or by whom. In a dispute, that missing trail costs you.',
  },
];

const stats = [
  { value: 50000, prefix: '$', suffix: '+', label: 'Average HUD non-compliance penalty' },
  { value: 40, suffix: ' hrs', label: 'Wasted monthly on manual tracking' },
  { value: 3, suffix: '×', label: 'More likely to face enforcement' },
];

export function HomePainPoints() {
  return (
    <section className="relative py-28" style={{ background: '#FAFAF9' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-red-500/80 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>The Problem</p>
          <h2 className="text-[#0A0B0D] leading-tight mb-5" style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 46px)',
            letterSpacing: '-0.03em',
          }}>
            Your team works hard.<br />
            <span className="text-red-500">Your tools work against you.</span>
          </h2>
          <p className="text-[#71717A] max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', fontSize: '17px' }}>
            Most property and construction firms manage operations across 8–12 different tools. Nothing connects. The gaps between them are where problems — and liabilities — are born.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group rounded-2xl border border-[#E4E4E7] bg-white p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-5">
                <p.icon size={20} className="text-red-500" />
              </div>
              <h3 className="text-[#0A0B0D] font-semibold text-[16px] mb-3 leading-snug" style={{ fontFamily: 'Inter, sans-serif' }}>{p.title}</h3>
              <p className="text-[#71717A] text-[14px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{p.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="rounded-2xl p-10"
          style={{ background: '#0A0B0D' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-blue-400 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)' }}>
                  <Counter target={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <p className="text-white/40 text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
