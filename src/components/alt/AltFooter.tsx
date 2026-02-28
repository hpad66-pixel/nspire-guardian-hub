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
    <footer style={{ background: 'var(--landing-ink)', borderTop: '1px solid rgba(253,250,244,0.08)', padding: '64px 0 32px' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div style={{ width: '28px', height: '28px', background: 'var(--apas-sapphire)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px', fontFamily: "var(--font-display)" }}>A</span>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: '18px', color: 'var(--landing-cream)', letterSpacing: '-0.01em' }}>
                APAS <span style={{ color: 'var(--apas-sapphire)' }}>OS</span>
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: '13px', color: 'rgba(253,250,244,0.5)', lineHeight: 1.65, marginBottom: '8px' }}>Property operations, built right.</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'var(--apas-sapphire)', letterSpacing: '0.05em' }}>apasos.ai</p>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <p className="eyebrow" style={{ color: 'rgba(253,250,244,0.35)', marginBottom: '16px' }}>{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{ fontFamily: "var(--font-ui)", fontSize: '14px', color: 'rgba(253,250,244,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--landing-cream)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(253,250,244,0.5)')}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8" style={{ borderTop: '1px solid rgba(253,250,244,0.08)' }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: '13px', color: 'rgba(253,250,244,0.35)' }}>
            © 2026 APAS.AI · All rights reserved · apasos.ai
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: 'rgba(253,250,244,0.2)', letterSpacing: '0.05em' }}>
            Built by APAS Labs
          </p>
        </div>
      </div>
    </footer>
  );
}
