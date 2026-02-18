import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'AI Voice Agent', href: '#voice-agent' },
  { label: 'Compliance', href: '#compliance' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'For Teams', href: '#roles' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(10,12,18,0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: '22px', color: 'var(--apas-white)', letterSpacing: '-0.02em' }}>APAS</span>
                <span style={{ width: '5px', height: '5px', background: 'var(--apas-sapphire)', borderRadius: '1px', transform: 'rotate(45deg)', display: 'inline-block', margin: '0 1px' }} />
                <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '22px', color: 'var(--apas-white)', letterSpacing: '-0.02em' }}>OS</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                <span style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px #10B981', animation: 'pulse 2s infinite' }} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)', letterSpacing: '0.05em' }}>Platform Live</span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{ fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 500, color: 'var(--apas-muted)', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--apas-white)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--apas-muted)')}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA Row */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/auth"
                style={{ fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 500, color: 'var(--apas-muted)', padding: '8px 16px', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--apas-white)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--apas-muted)')}
              >
                Log In
              </Link>
              <Link
                to="/auth"
                className="flex items-center gap-2"
                style={{
                  fontFamily: 'DM Sans', fontWeight: 600, fontSize: '14px',
                  background: 'var(--apas-sapphire)', color: 'var(--apas-white)',
                  padding: '10px 20px', borderRadius: '10px',
                  boxShadow: '0 0 20px var(--apas-sapphire-glow)',
                  transition: 'all 0.2s',
                }}
              >
                Start Free Trial <ArrowRight size={14} />
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="lg:hidden p-2"
              style={{ color: 'var(--apas-white)' }}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col"
            style={{ background: 'var(--apas-midnight)' }}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <span style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: '22px', color: 'var(--apas-white)' }}>APAS OS</span>
              <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--apas-muted)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center px-8 gap-8">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setMobileOpen(false)}
                  style={{ fontFamily: 'DM Sans', fontSize: '28px', fontWeight: 600, color: 'var(--apas-white)' }}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3 pt-4"
              >
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontFamily: 'DM Sans', fontWeight: 600, fontSize: '16px', textAlign: 'center',
                    background: 'var(--apas-sapphire)', color: 'var(--apas-white)',
                    padding: '14px', borderRadius: '12px',
                  }}
                >
                  Start Free Trial
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontFamily: 'DM Sans', fontWeight: 500, fontSize: '16px', textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'var(--apas-white)',
                    padding: '14px', borderRadius: '12px',
                  }}
                >
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
