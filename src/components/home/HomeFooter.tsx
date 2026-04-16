import { Link } from 'react-router-dom';

const cols = [
  { title: 'Platform', links: ['Features', 'Compliance', 'Projects', 'Pricing', 'AI Voice Agent', 'Security'] },
  { title: 'For Teams', links: ['Property Managers', 'Owners', 'Superintendents', 'Inspectors', 'Project Managers'] },
  { title: 'Company', links: ['About APAS.AI', 'Contact Us', 'Privacy Policy', 'Terms of Service'] },
];

export function HomeFooter() {
  return (
    <footer className="border-t border-white/[0.04] py-16" style={{ background: '#0A0B0D' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
                <span className="text-white font-extrabold text-[12px]" style={{ fontFamily: 'Inter' }}>A</span>
              </div>
              <span className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Inter' }}>
                APAS<span className="text-blue-400">OS</span>
              </span>
            </div>
            <p className="text-[13px] text-white/30 leading-relaxed mb-3" style={{ fontFamily: 'Inter' }}>
              The operating system for property & construction professionals.
            </p>
            <p className="text-[12px] text-blue-400" style={{ fontFamily: "'JetBrains Mono'" }}>build.apas.ai</p>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.1em] mb-4" style={{ fontFamily: 'Inter' }}>{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-white/30 hover:text-white/60 transition-colors" style={{ fontFamily: 'Inter' }}>{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-white/[0.04]">
          <p className="text-[12px] text-white/20" style={{ fontFamily: 'Inter' }}>© 2026 APAS.AI · All rights reserved</p>
          <p className="text-[11px] text-white/10" style={{ fontFamily: "'JetBrains Mono'" }}>Built by APAS Labs</p>
        </div>
      </div>
    </footer>
  );
}
