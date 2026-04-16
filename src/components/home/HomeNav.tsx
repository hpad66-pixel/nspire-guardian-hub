import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';

const navLinks = [
  { label: 'Platform', href: '#platform' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Install', href: '/install' },
];

export function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(10,11,13,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'saturate(180%) blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
              <span className="text-white font-extrabold text-sm tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>A</span>
            </div>
            <span className="text-[17px] font-bold tracking-tight text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              APAS<span className="text-blue-400">OS</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] font-medium text-white/50 hover:text-white transition-colors duration-200"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/auth"
              className="text-[13px] font-medium text-white/60 hover:text-white px-4 py-2 transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Log In
            </Link>
            <Link
              to="/auth"
              className="text-[13px] font-semibold text-white bg-white/10 hover:bg-white/15 px-5 py-2.5 rounded-full transition-all duration-200 flex items-center gap-2 border border-white/10 hover:border-white/20"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Get Started <ArrowRight size={13} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="lg:hidden p-2 text-white/70 hover:text-white transition-colors" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
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
            style={{ background: '#0A0B0D' }}
          >
            <div className="flex items-center justify-between px-6 h-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                APAS<span className="text-blue-400">OS</span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white p-2">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center px-8 gap-8">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setMobileOpen(false)}
                  className="text-3xl font-bold text-white/90 hover:text-white transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col gap-3 pt-8">
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="text-center font-semibold text-[15px] bg-white text-black py-4 rounded-xl"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Get Started Free
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="text-center font-medium text-[15px] border border-white/15 text-white/80 py-4 rounded-xl"
                  style={{ fontFamily: 'Inter, sans-serif' }}
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
