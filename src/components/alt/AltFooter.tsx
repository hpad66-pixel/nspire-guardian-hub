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
    links: ['About Proj OS', 'The Systems Lens', 'Contact Us', 'Privacy Policy', 'Terms of Service'],
  },
];

export function AltFooter() {
  return (
    <footer style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '64px 0 32px' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-baseline gap-0 mb-4">
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: '20px', color: '#1E3A5F', letterSpacing: '-0.03em' }}>Proj</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: '20px', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #C4A35A 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginLeft: '2px' }}>OS</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(30,58,95,0.4)', marginLeft: '2px' }}>.ai</span>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#64748B', lineHeight: 1.65, marginBottom: '8px' }}>Property operations, built right.</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#2563EB' }}>projos.ai</p>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <a
                      href={link.toLowerCase().includes('contact') ? 'mailto:hardeep@apas.ai' : '/login'}
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
            © 2026 Proj OS · All rights reserved · projos.ai
          </p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#CBD5E1' }}>
            Powered by Proj OS
          </p>
        </div>
      </div>
    </footer>
  );
}
