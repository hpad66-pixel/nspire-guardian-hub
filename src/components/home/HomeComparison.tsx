import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';

type Mark = 'yes' | 'no' | 'partial';

interface Row {
  label: string;
  sub?: string;
  apas: Mark;
  legacy: Mark;
  sheets: Mark;
}

const rows: Row[] = [
  {
    label: 'Unified data model',
    sub: 'Properties, units, issues, work orders & inspections in one database',
    apas: 'yes', legacy: 'partial', sheets: 'no',
  },
  {
    label: 'HUD NSPIRE-compliant inspections',
    sub: 'Built-in defect catalog, severity scoring & REAC reports',
    apas: 'yes', legacy: 'partial', sheets: 'no',
  },
  {
    label: 'AI voice agent for tenant calls',
    sub: 'Auto-creates issues & work orders from real conversations',
    apas: 'yes', legacy: 'no', sheets: 'no',
  },
  {
    label: 'Mobile-first PWA with offline',
    sub: 'Works in a basement, a stairwell, a van — syncs when back online',
    apas: 'yes', legacy: 'partial', sheets: 'no',
  },
  {
    label: 'Credential & license wallet',
    sub: 'Track expiry, share verified cards with inspectors & clients',
    apas: 'yes', legacy: 'no', sheets: 'partial',
  },
  {
    label: 'White-labeled client portals',
    sub: 'Branded views for owners, regulators & HUD auditors',
    apas: 'yes', legacy: 'partial', sheets: 'no',
  },
  {
    label: 'Role-based access & audit trail',
    sub: 'Every field change timestamped, every action attributable',
    apas: 'yes', legacy: 'yes', sheets: 'no',
  },
  {
    label: 'Setup in days — not quarters',
    sub: 'Onboard a full property portfolio without consultants',
    apas: 'yes', legacy: 'no', sheets: 'partial',
  },
  {
    label: 'One predictable subscription',
    sub: 'No per-seat traps, no integration surcharges, no surprises',
    apas: 'yes', legacy: 'no', sheets: 'partial',
  },
];

function MarkCell({ mark }: { mark: Mark }) {
  if (mark === 'yes') {
    return (
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
        <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
      </div>
    );
  }
  if (mark === 'partial') {
    return (
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/12 ring-1 ring-amber-400/25">
        <Minus className="h-3.5 w-3.5 text-amber-400" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-400/20">
      <X className="h-3.5 w-3.5 text-rose-400/80" strokeWidth={2.5} />
    </div>
  );
}

export function HomeComparison() {
  return (
    <section
      id="comparison"
      className="relative overflow-hidden py-28"
      style={{ background: '#0A0B0D' }}
    >
      {/* Ambient gradient orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[860px] -translate-x-1/2 -translate-y-1/3 opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(29,111,232,0.18), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[1120px] px-6">
        {/* Eyebrow + heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <p
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-blue-400/80"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            vs. The Old Way
          </p>
          <h2
            className="mb-5 text-white"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            One platform that replaces{' '}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              ten
            </span>
            .
          </h2>
          <p
            className="mx-auto max-w-xl leading-relaxed text-white/40"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '17px' }}
          >
            See how Build OS compares to legacy property software and the
            spreadsheet-plus-point-solutions stack most teams run today.
          </p>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          viewport={{ once: true, margin: '-80px' }}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
        >
          {/* Header row */}
          <div
            className="grid items-center gap-4 border-b border-white/[0.06] px-6 py-5 md:grid-cols-[1.6fr_1fr_1fr_1fr]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <div className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30 md:block">
              Capability
            </div>
            {/* Build OS — highlighted column */}
            <div className="relative rounded-lg bg-gradient-to-br from-blue-500/15 to-violet-500/10 px-3 py-2 text-center ring-1 ring-blue-400/30">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                Recommended
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-white tracking-tight">
                Build OS
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Legacy PM Suite
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-white/70 tracking-tight">
                Yardi · AppFolio
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                The DIY stack
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-white/70 tracking-tight">
                Sheets + 10 apps
              </p>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.05]">
            {rows.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                viewport={{ once: true }}
                className="grid items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02] md:grid-cols-[1.6fr_1fr_1fr_1fr]"
              >
                <div>
                  <p
                    className="text-[14px] font-semibold text-white/90 tracking-tight"
                    style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.012em' }}
                  >
                    {row.label}
                  </p>
                  {row.sub && (
                    <p
                      className="mt-0.5 text-[12.5px] leading-relaxed text-white/45"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {row.sub}
                    </p>
                  )}
                </div>
                <div className="flex justify-center">
                  <MarkCell mark={row.apas} />
                </div>
                <div className="flex justify-center">
                  <MarkCell mark={row.legacy} />
                </div>
                <div className="flex justify-center">
                  <MarkCell mark={row.sheets} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Legend */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-6 text-[12px] text-white/40"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <span className="inline-flex items-center gap-2">
            <MarkCell mark="yes" /> Included
          </span>
          <span className="inline-flex items-center gap-2">
            <MarkCell mark="partial" /> Partial / add-on
          </span>
          <span className="inline-flex items-center gap-2">
            <MarkCell mark="no" /> Not supported
          </span>
        </div>
      </div>
    </section>
  );
}
