import { Link } from 'react-router-dom';

const cols = [
  {
    title: 'Platform',
    links: ['Features', 'Compliance', 'Projects', 'Pricing', 'AI Voice Agent', 'Security'],
  },
  {
    title: 'For Teams',
    links: ['Property Managers', 'Owners', 'Superintendents', 'Inspectors', 'Subcontractors', 'Consultants'],
  },
  {
    title: 'Company',
    links: ['About APAS.AI', 'The Systems Lens', 'Contact Us', 'Privacy Policy', 'Terms of Service'],
  },
];

export function AltFooter() {
  return (
    <footer style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '64px 0 32px' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div style={{ width: '28px', height: '28px', background: '#2563EB', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>A</span>
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '18px', color: '#1E3A5F', letterSpacing: '-0.02em' }}>
                APAS<span style={{ color: '#2563EB' }}>OS</span>
              </span>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#64748B', lineHeight: 1.65, marginBottom: '8px' }}>Property operations, built right.</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#2563EB' }}>apasos.ai</p>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#64748B', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8" style={{ borderTop: '1px solid #E2E8F0' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94A3B8' }}>
            © 2026 APAS.AI · All rights reserved · apasos.ai
          </p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#CBD5E1' }}>
            Built by APAS Labs
          </p>
        </div>
      </div>
    </footer>
  );
}
