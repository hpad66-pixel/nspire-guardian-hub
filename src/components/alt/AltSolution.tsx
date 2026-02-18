import { motion } from 'framer-motion';
import { ClipboardCheck, ShieldCheck, FolderKanban, Wrench, Mic, BarChart3 } from 'lucide-react';

const modules = [
  { icon: ClipboardCheck, color: '#059669', bg: '#F0FDF4', title: 'Inspections', desc: 'Daily grounds, NSPIRE unit inspections, voice dictation, GPS photo evidence.' },
  { icon: ShieldCheck, color: '#2563EB', bg: '#EFF6FF', title: 'Compliance & Permits', desc: 'HUD-ready audit trails, permit tracking, automatic deadline alerts.' },
  { icon: FolderKanban, color: '#7C3AED', bg: '#F5F3FF', title: 'Projects', desc: 'Capital projects from bid to closeout. Gantt, RFIs, submittals, change orders, punch lists.' },
  { icon: Wrench, color: '#D97706', bg: '#FFFBEB', title: 'Work Orders', desc: 'From defect to done. Auto-created from inspections, 5-stage pipeline, activity log.' },
  { icon: Mic, color: '#7C3AED', bg: '#F5F3FF', title: 'AI Voice Agent', desc: '24/7 AI call center. Tenants call, AI creates tickets, detects emergencies.' },
  { icon: BarChart3, color: '#0EA5E9', bg: '#F0F9FF', title: 'Reports & Analytics', desc: 'Portfolio dashboards, compliance rates, 9 report types, CSV export, printable PDFs.' },
];

export function AltSolution() {
  return (
    <section id="features" style={{ background: '#F8FAFC', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 46px)', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '16px' }}>
            One platform. Every workflow.<br /><span style={{ color: '#2563EB' }}>All connected.</span>
          </h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', color: '#475569', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
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
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.09)' }}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '28px 24px',
                border: '1px solid #E2E8F0',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
            >
              <div style={{ width: '44px', height: '44px', background: mod.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <mod.icon size={22} color={mod.color} />
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '8px' }}>{mod.title}</h3>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#475569', lineHeight: 1.65 }}>{mod.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Blockquote */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          style={{
            borderLeft: '3px solid #2563EB',
            paddingLeft: '32px',
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: '18px', color: '#1E3A5F', lineHeight: 1.75, fontStyle: 'italic' }}>
            "When an inspector logs a defect, a work order is created automatically. When a permit expires, an issue is triggered automatically. When a tenant calls the AI, a ticket is created automatically. That's what connected means."
          </p>
        </motion.div>
      </div>
    </section>
  );
}
