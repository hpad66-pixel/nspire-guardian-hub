import { motion } from 'framer-motion';

const roles = [
  { title: 'Property Owner', icon: '🏛', tagline: 'Full visibility. Zero micromanagement.', body: 'Compliance, maintenance, capital projects, and financials — without having to ask anyone to pull a report.', border: '#0A0B0D' },
  { title: 'Property Manager', icon: '📋', tagline: 'One dashboard instead of twelve tabs.', body: 'See everything across all your properties in one place. No chasing emails, spreadsheets, or filing cabinets.', border: '#3B82F6' },
  { title: 'Superintendent', icon: '🔧', tagline: 'Your crew. Always in sync.', body: 'Assign work, track progress, log daily reports, manage change orders — from your phone on the job site.', border: '#F59E0B' },
  { title: 'Inspector', icon: '📷', tagline: 'Inspections that practically fill themselves out.', body: 'Walk, speak, photo, submit. The NSPIRE catalog guides you. The platform does the paperwork.', border: '#10B981' },
  { title: 'Project Manager', icon: '📊', tagline: 'Bid to closeout. Total control.', body: 'RFIs, submittals, change orders, punch lists, daily reports — one unified workspace for every project.', border: '#6366F1' },
];

export function HomeRoles() {
  return (
    <section className="py-28" style={{ background: '#FAFAF9' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-violet-500/80 mb-4" style={{ fontFamily: 'Inter' }}>Built For You</p>
          <h2 className="text-[#0A0B0D] mb-5" style={{
            fontFamily: 'Inter', fontWeight: 700,
            fontSize: 'clamp(26px, 4vw, 44px)',
            letterSpacing: '-0.03em', lineHeight: 1.1,
          }}>
            Built for the people who<br />keep buildings running.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {roles.slice(0, 3).map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-white border border-[#E4E4E7] p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ borderTop: `4px solid ${r.border}` }}
            >
              <div className="text-2xl mb-3">{r.icon}</div>
              <h3 className="text-[15px] font-bold text-[#0A0B0D] mb-1" style={{ fontFamily: 'Inter' }}>{r.title}</h3>
              <p className="text-[13px] font-semibold mb-3" style={{ fontFamily: 'Inter', color: r.border }}>"{r.tagline}"</p>
              <p className="text-[13px] text-[#71717A] leading-relaxed" style={{ fontFamily: 'Inter' }}>{r.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-5 md:w-2/3 mx-auto">
          {roles.slice(3).map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 + 0.25 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-white border border-[#E4E4E7] p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ borderTop: `4px solid ${r.border}` }}
            >
              <div className="text-2xl mb-3">{r.icon}</div>
              <h3 className="text-[15px] font-bold text-[#0A0B0D] mb-1" style={{ fontFamily: 'Inter' }}>{r.title}</h3>
              <p className="text-[13px] font-semibold mb-3" style={{ fontFamily: 'Inter', color: r.border }}>"{r.tagline}"</p>
              <p className="text-[13px] text-[#71717A] leading-relaxed" style={{ fontFamily: 'Inter' }}>{r.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
