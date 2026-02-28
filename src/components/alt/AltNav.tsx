import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Compliance', href: '#compliance' },
  { label: 'Projects', href: '#projects' },
  { label: 'Pricing', href: '#pricing' },
];

export function AltNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(253,250,244,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--landing-border)' : 'none',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/home-alt" className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: 'var(--landing-ink)' }}
              >
                <span style={{ color: 'var(--landing-cream)', fontWeight: 800, fontSize: '13px', fontFamily: "var(--font-display)" }}>A</span>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: '18px', color: 'var(--landing-ink)', letterSpacing: '-0.01em' }}>
                APAS <span style={{ color: 'var(--apas-sapphire)' }}>OS</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontWeight: 600,
                    fontSize: '14px',
                    color: 'var(--landing-slate)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--landing-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--landing-slate)')}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/auth"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--landing-slate)',
                  padding: '8px 16px',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--landing-ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--landing-slate)')}
              >
                Log In
              </Link>
              <Link
                to="/auth"
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: '14px',
                  background: 'var(--landing-ink)',
                  color: 'var(--landing-cream)',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(26,22,16,0.2)',
                  transition: 'background 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--apas-sapphire)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--landing-ink)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Start Free Trial <ArrowRight size={14} />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button className="lg:hidden p-2" style={{ color: 'var(--landing-ink)' }} onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col"
            style={{ background: 'var(--landing-cream)' }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--landing-border)' }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: '18px', color: 'var(--landing-ink)' }}>APAS <span style={{ color: 'var(--apas-sapphire)' }}>OS</span></span>
              <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--landing-slate)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center px-8 gap-6">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setMobileOpen(false)}
                  style={{ fontFamily: "var(--font-display)", fontSize: '26px', fontWeight: 700, color: 'var(--landing-ink)', textDecoration: 'none' }}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex flex-col gap-3 pt-4">
                <Link to="/auth" onClick={() => setMobileOpen(false)}
                  style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '16px', textAlign: 'center', background: 'var(--landing-ink)', color: 'var(--landing-cream)', padding: '16px', borderRadius: '10px', textDecoration: 'none' }}>
                  Start Free Trial
                </Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)}
                  style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: '16px', textAlign: 'center', border: '1px solid var(--landing-border)', color: 'var(--landing-ink)', padding: '16px', borderRadius: '10px', textDecoration: 'none' }}>
                  Log In
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
