/**
 * Landing v3 — shared design tokens + motion primitives.
 * Marketing surface only; deliberately self-contained (no app CSS deps) so the
 * page renders identically regardless of app theme changes.
 */
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// ─── Palette (projOS brand: obsidian / cream / gold / sapphire) ──────────────
export const C = {
  obsidian: '#12100D',
  obsidian2: '#1A1714',
  creamOnDark: '#F5F1E8',
  dimOnDark: '#A39E92',
  lineOnDark: 'rgba(245,241,232,0.10)',
  cardOnDark: 'rgba(255,255,255,0.04)',
  cream: '#FDFCF9',
  card: '#FFFFFF',
  cardWarm: '#FAF8F4',
  ink: '#1A1714',
  dim: '#6E6A61',
  faint: '#96918A',
  line: '#E9E5DC',
  gold: '#C4A35A',
  goldDeep: '#A8873D',
  goldSoft: 'rgba(196,163,90,0.14)',
  sapphire: '#1D6FE8',
  sapphireSoft: 'rgba(29,111,232,0.10)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16,185,129,0.12)',
  amber: '#F59E0B',
  rose: '#F43F5E',
  roseSoft: 'rgba(244,63,94,0.10)',
};

export const F = {
  display: "'Instrument Serif', Georgia, serif",
  sans: "'Plus Jakarta Sans', -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ─── Reveal: fade-up on scroll into view ─────────────────────────────────────
export function Reveal({
  children, delay = 0, y = 24, style, className, once = true,
}: {
  children: ReactNode; delay?: number; y?: number; style?: CSSProperties; className?: string; once?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── CountUp: rolls a number up when scrolled into view ──────────────────────
export function CountUp({
  to, prefix = '', suffix = '', duration = 1.4, decimals = 0, style,
}: {
  to: number; prefix?: string; suffix?: string; duration?: number; decimals?: number; style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const [val, setVal] = useState(reduced ? to : 0);
  const started = useRef(false);

  const start = () => {
    if (started.current || reduced) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const fmt = val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <motion.span
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      onViewportEnter={start}
      viewport={{ once: true, margin: '-40px' }}
    >
      {prefix}{fmt}{suffix}
    </motion.span>
  );
}

// ─── TypeText: types a string while `active` ─────────────────────────────────
export function TypeText({
  text, active, speed = 24, onDone, style, cursor = false,
}: {
  text: string; active: boolean; speed?: number; onDone?: () => void; style?: CSSProperties; cursor?: boolean;
}) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) { setN(0); doneRef.current = false; return; }
    if (reduced) { setN(text.length); if (!doneRef.current) { doneRef.current = true; onDone?.(); } return; }
    setN(0); doneRef.current = false;
    const id = window.setInterval(() => {
      setN(prev => {
        if (prev >= text.length) {
          window.clearInterval(id);
          if (!doneRef.current) { doneRef.current = true; onDone?.(); }
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text]);

  return (
    <span style={style}>
      {text.slice(0, n)}
      {cursor && active && n < text.length && <span style={{ opacity: 0.6 }}>▍</span>}
    </span>
  );
}

// ─── Small atoms ─────────────────────────────────────────────────────────────
export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontFamily: F.mono, fontSize: 11, fontWeight: 500, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: C.gold,
      border: `1px solid ${dark ? 'rgba(196,163,90,0.35)' : 'rgba(196,163,90,0.45)'}`,
      background: dark ? 'rgba(196,163,90,0.08)' : C.goldSoft,
      padding: '6px 14px', borderRadius: 100,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, display: 'inline-block' }} />
      {children}
    </div>
  );
}

export function SectionTitle({
  children, dark = false, size = 'clamp(34px, 4.6vw, 52px)', style,
}: { children: ReactNode; dark?: boolean; size?: string; style?: CSSProperties }) {
  return (
    <h2 style={{
      fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: 1.08,
      letterSpacing: '-0.03em', color: dark ? C.creamOnDark : C.ink, margin: 0, ...style,
    }}>
      {children}
    </h2>
  );
}

/** Instrument Serif italic accent inside a headline. */
export function Serif({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily: F.display, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em', color: color ?? C.gold }}>
      {children}
    </span>
  );
}

export function Sub({ children, dark = false, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return (
    <p style={{
      fontFamily: F.sans, fontSize: 17, lineHeight: 1.7, maxWidth: 560,
      color: dark ? C.dimOnDark : C.dim, margin: 0, ...style,
    }}>
      {children}
    </p>
  );
}

export function Chip({
  children, tone = 'gold', dark = false,
}: { children: ReactNode; tone?: 'gold' | 'emerald' | 'sapphire' | 'rose' | 'neutral'; dark?: boolean }) {
  const map = {
    gold: { c: dark ? C.gold : C.goldDeep, bg: dark ? 'rgba(196,163,90,0.12)' : C.goldSoft, bd: 'rgba(196,163,90,0.35)' },
    emerald: { c: C.emerald, bg: C.emeraldSoft, bd: 'rgba(16,185,129,0.3)' },
    sapphire: { c: C.sapphire, bg: C.sapphireSoft, bd: 'rgba(29,111,232,0.25)' },
    rose: { c: C.rose, bg: C.roseSoft, bd: 'rgba(244,63,94,0.25)' },
    neutral: { c: dark ? C.dimOnDark : C.dim, bg: dark ? 'rgba(255,255,255,0.05)' : '#F2EFE9', bd: dark ? C.lineOnDark : C.line },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: F.sans, fontSize: 11.5, fontWeight: 700,
      color: map.c, background: map.bg, border: `1px solid ${map.bd}`,
      padding: '4px 10px', borderRadius: 7, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

export const CTA_PRIMARY: CSSProperties = {
  fontFamily: F.sans, fontWeight: 700, fontSize: 15,
  background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDeep} 100%)`,
  color: '#171410', padding: '15px 30px', borderRadius: 11,
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 9,
  boxShadow: '0 6px 22px rgba(196,163,90,0.35)', border: 'none', cursor: 'pointer',
};

export const CONTAINER: CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '0 24px' };
