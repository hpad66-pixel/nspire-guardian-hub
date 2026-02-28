import { motion } from 'framer-motion';
import { ClipboardCheck, ShieldCheck, FolderKanban, Wrench, Mic, BarChart3 } from 'lucide-react';

const modules = [
  { icon: ClipboardCheck, color: '#059669', title: 'Inspections', desc: 'Daily grounds, NSPIRE unit inspections, voice dictation, GPS photo evidence.' },
  { icon: ShieldCheck, color: 'var(--apas-sapphire)', title: 'Compliance & Permits', desc: 'HUD-ready audit trails, permit tracking, automatic deadline alerts.' },
  { icon: FolderKanban, color: '#7C3AED', title: 'Projects', desc: 'Capital projects from bid to closeout. Gantt, RFIs, submittals, change orders, punch lists.' },
  { icon: Wrench, color: '#D97706', title: 'Work Orders', desc: 'From defect to done. Auto-created from inspections, 5-stage pipeline, activity log.' },
  { icon: Mic, color: '#7C3AED', title: 'AI Voice Agent', desc: '24/7 AI call center. Tenants call, AI creates tickets, detects emergencies.' },
  { icon: BarChart3, color: '#0EA5E9', title: 'Reports & Analytics', desc: 'Portfolio dashboards, compliance rates, 9 report types, CSV export, printable PDFs.' },
];

export function AltSolution() {
  return (
    <section id="features" style={{ background: 'var(--landing-warm)', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <div className="eyebrow mb-4" style={{ color: 'var(--apas-sapphire)' }}>The Platform</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 'clamp(28px, 4vw, 46px)', color: 'var(--landing-ink)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: '16px' }}>
            One platform. Every workflow.<br /><em style={{ color: 'var(--apas-sapphire)', fontStyle: 'italic' }}>All connected.</em>
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: '18px', color: 'var(--landing-slate)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
            APAS OS is not another point solution. It's the operating layer for your entire property and construction operation — where every action is linked, every record is searchable, and nothing falls through the cracks.
          </p>
        </motion.div>

        {/* Module grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-40px' }}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(26,22,16,0.07)' }}
              style={{
                background: 'var(--landing-card)',
                borderRadius: '16px',
                padding: '28px 24px',
                border: '1px solid var(--landing-border)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
            >
              <div style={{ width: '44px', height: '44px', background: `${mod.color}12`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <mod.icon size={22} color={mod.color} />
              </div>
              <h3 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '16px', color: 'var(--landing-ink)', marginBottom: '8px' }}>{mod.title}</h3>
              <p style={{ fontFamily: "var(--font-editor)", fontSize: '14px', color: 'var(--landing-slate)', lineHeight: 1.65 }}>{mod.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Blockquote */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="pull-quote"
          style={{ maxWidth: '680px', margin: '0 auto' }}
        >
          <p>
            "When an inspector logs a defect, a work order is created automatically. When a permit expires, an issue is triggered automatically. When a tenant calls the AI, a ticket is created automatically. That's what connected means."
          </p>
        </motion.div>
      </div>
    </section>
  );
}
