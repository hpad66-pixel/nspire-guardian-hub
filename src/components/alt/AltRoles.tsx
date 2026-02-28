import { motion } from 'framer-motion';

const roles = [
  { title: 'Property Owner', border: 'var(--landing-ink)', icon: '🏛', tagline: 'Full visibility. Zero micromanagement.', body: 'Know your properties are protected — compliance, maintenance, capital projects, and financials — without having to ask anyone to pull a report.' },
  { title: 'Property Manager', border: 'var(--apas-sapphire)', icon: '📋', tagline: 'One dashboard instead of twelve tabs.', body: 'See everything across all your properties in one place. Manage your day without chasing emails, spreadsheets, or filing cabinets.' },
  { title: 'Superintendent', border: '#D97706', icon: '🔧', tagline: 'Your crew. Always in sync.', body: 'Assign work, track progress, log daily reports, manage change orders, and close out projects — from your phone on the job site.' },
  { title: 'Inspector', border: '#059669', icon: '📷', tagline: 'Inspections that practically fill themselves out.', body: 'Walk, speak, photo, submit. The NSPIRE catalog guides you. The platform does the paperwork.' },
  { title: 'Subcontractor', border: '#7C3AED', icon: '🤝', tagline: 'Clear assignments. No phone tag.', body: 'Know exactly what you\'re expected to do, when, and for which property. Training resources available when you need them.' },
];

export function AltRoles() {
  return (
    <section style={{ background: 'var(--landing-warm)', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="eyebrow mb-4" style={{ color: 'var(--apas-sapphire)' }}>Built for Your Role</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 'clamp(26px, 4vw, 44px)', color: 'var(--landing-ink)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: '14px' }}>
            Built for the people who keep buildings running.
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: '18px', color: 'var(--landing-slate)', maxWidth: '540px', margin: '0 auto', lineHeight: 1.7 }}>
            From solo owner-operators to multi-portfolio management companies. If you touch property, compliance, or construction — this is your platform.
          </p>
        </motion.div>

        {/* 3+2 grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {roles.slice(0, 3).map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(26,22,16,0.07)' }}
              style={{
                background: 'var(--landing-card)',
                borderRadius: '16px',
                padding: '28px 24px',
                border: '1px solid var(--landing-border)',
                borderTop: `5px solid ${r.border}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{r.icon}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: '15px', color: 'var(--landing-ink)', marginBottom: '4px' }}>{r.title}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: '13px', color: r.border, marginBottom: '10px', fontStyle: 'italic' }}>"{r.tagline}"</div>
              <p style={{ fontFamily: "var(--font-editor)", fontSize: '13px', color: 'var(--landing-slate)', lineHeight: 1.7 }}>{r.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-5 md:w-2/3 mx-auto">
          {roles.slice(3).map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 + 0.25 }}
              viewport={{ once: true }}
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(26,22,16,0.07)' }}
              style={{
                background: 'var(--landing-card)',
                borderRadius: '16px',
                padding: '28px 24px',
                border: '1px solid var(--landing-border)',
                borderTop: `5px solid ${r.border}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{r.icon}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: '15px', color: 'var(--landing-ink)', marginBottom: '4px' }}>{r.title}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: '13px', color: r.border, marginBottom: '10px', fontStyle: 'italic' }}>"{r.tagline}"</div>
              <p style={{ fontFamily: "var(--font-editor)", fontSize: '13px', color: 'var(--landing-slate)', lineHeight: 1.7 }}>{r.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
