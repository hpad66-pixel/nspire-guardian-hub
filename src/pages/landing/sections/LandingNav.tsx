import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { C, F } from '../shared';

const LINKS = [
  { label: 'Platform', href: '#tour' },
  { label: 'Financials', href: '#cascade' },
  { label: 'AI', href: '#ai' },
  { label: 'Voice', href: '#voice' },
  { label: 'Compare', href: '#compare' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(18,16,13,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.lineOnDark}` : '1px solid transparent',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(196,163,90,0.4)',
          }}>
            <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 14, color: '#171410' }}>P</span>
          </div>
          <span style={{ fontFamily: F.sans, fontWeight: 400, fontSize: 18, color: C.creamOnDark, letterSpacing: '-0.01em' }}>
            proj<span style={{ fontWeight: 800 }}>OS</span>
          </span>
        </a>

        {/* Center links (desktop) */}
        <nav className="hidden lg:flex" style={{ gap: 28 }}>
          {LINKS.map(l => (
            <a key={l.href} href={l.href} style={{
              fontFamily: F.sans, fontSize: 13.5, fontWeight: 600, color: C.dimOnDark,
              textDecoration: 'none', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = C.creamOnDark)}
              onMouseLeave={e => (e.currentTarget.style.color = C.dimOnDark)}
            >
              {l.label}
            </a>
          ))}
          <Link to="/pricing" style={{ fontFamily: F.sans, fontSize: 13.5, fontWeight: 600, color: C.dimOnDark, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.creamOnDark)}
            onMouseLeave={e => (e.currentTarget.style.color = C.dimOnDark)}
          >
            Pricing
          </Link>
        </nav>

        {/* Right CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link to="/auth" className="hidden sm:inline" style={{ fontFamily: F.sans, fontSize: 13.5, fontWeight: 600, color: C.creamOnDark, textDecoration: 'none' }}>
            Sign in
          </Link>
          <Link to="/auth" style={{
            fontFamily: F.sans, fontWeight: 700, fontSize: 13.5,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, color: '#171410',
            padding: '9px 18px', borderRadius: 9, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 3px 14px rgba(196,163,90,0.3)',
          }}>
            Start Free <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
