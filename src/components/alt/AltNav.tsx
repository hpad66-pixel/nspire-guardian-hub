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
          background: scrolled ? 'rgba(248,250,252,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid #E2E8F0' : 'none',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/home-alt" className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: '#2563EB' }}
              >
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>A</span>
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '18px', color: '#1E3A5F', letterSpacing: '-0.02em' }}>
                APAS<span style={{ color: '#2563EB' }}>OS</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#475569',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1E3A5F')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#475569',
                  padding: '8px 16px',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1E3A5F')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                Log In
              </Link>
              <Link
                to="/auth"
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: '14px',
                  background: '#2563EB',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                  transition: 'background 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Start Free Trial <ArrowRight size={14} />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button className="lg:hidden p-2" style={{ color: '#1E3A5F' }} onClick={() => setMobileOpen(true)}>
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
            style={{ background: '#F8FAFC' }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '18px', color: '#1E3A5F' }}>APAS<span style={{ color: '#2563EB' }}>OS</span></span>
              <button onClick={() => setMobileOpen(false)} style={{ color: '#475569' }}>
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
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 700, color: '#1E3A5F', textDecoration: 'none' }}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex flex-col gap-3 pt-4">
                <Link to="/auth" onClick={() => setMobileOpen(false)}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '16px', textAlign: 'center', background: '#2563EB', color: '#fff', padding: '16px', borderRadius: '10px', textDecoration: 'none' }}>
                  Start Free Trial
                </Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '16px', textAlign: 'center', border: '1px solid #E2E8F0', color: '#1E3A5F', padding: '16px', borderRadius: '10px', textDecoration: 'none' }}>
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
