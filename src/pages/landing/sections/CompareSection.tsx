import { motion } from 'framer-motion';
import { Check, Minus } from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal } from '../shared';

type Cell = 'yes' | 'partial' | 'no';

const COLS = ['projOS', 'Procore', 'Buildertrend', 'AppFolio', 'Spreadsheets + email'];

const ROWS: { label: string; cells: Cell[] }[] = [
  { label: 'One connected financial cascade (contract → SOV → pay app → CO → budget)', cells: ['yes', 'partial', 'partial', 'no', 'no'] },
  { label: 'AI drafting built in — letters, minutes, punch lists, reports', cells: ['yes', 'partial', 'no', 'partial', 'no'] },
  { label: '24/7 conversational voice agent that files tickets', cells: ['yes', 'no', 'no', 'partial', 'no'] },
  { label: 'Human-in-the-loop by design — nothing auto-sends', cells: ['yes', 'yes', 'yes', 'partial', 'yes'] },
  { label: 'Client, sub, and owner portals with magic links', cells: ['yes', 'partial', 'partial', 'partial', 'no'] },
  { label: 'Construction + property + consulting in one platform', cells: ['yes', 'no', 'no', 'no', 'no'] },
  { label: 'Modular — turn modules on or off, priced accordingly', cells: ['yes', 'no', 'partial', 'no', 'yes'] },
  { label: 'Setup measured in days, not quarters', cells: ['yes', 'no', 'partial', 'partial', 'yes'] },
  { label: 'Complete audit trail on every action', cells: ['yes', 'yes', 'partial', 'partial', 'no'] },
];

function CellMark({ cell, hero }: { cell: Cell; hero: boolean }) {
  if (cell === 'yes') {
    return (
      <span style={{
        width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: hero ? `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})` : C.emeraldSoft,
      }}>
        <Check size={14} color={hero ? '#171410' : C.emerald} strokeWidth={3} />
      </span>
    );
  }
  if (cell === 'partial') {
    return <span style={{ fontFamily: F.mono, fontSize: 12, color: C.amber, fontWeight: 700 }}>±</span>;
  }
  return <Minus size={14} color="#C9C4BA" />;
}

export function CompareSection() {
  return (
    <section id="compare" style={{ background: C.cream, padding: '110px 0 120px' }}>
      <div style={CONTAINER}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Reveal><Eyebrow>How it compares</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <SectionTitle style={{ margin: '22px auto 18px', maxWidth: 720 }}>
              Point tools do a piece. <Serif>projOS does the job.</Serif>
            </SectionTitle>
          </Reveal>
          <Reveal delay={0.16}>
            <Sub style={{ margin: '0 auto', textAlign: 'center' }}>
              Enterprise suites price you out; property tools stop at the front office; spreadsheets stop matching.
            </Sub>
          </Reveal>
        </div>

        <Reveal y={28}>
          <div style={{ overflowX: 'auto', borderRadius: 20, border: `1px solid ${C.line}`, boxShadow: '0 18px 50px rgba(26,23,20,0.06)' }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'separate', borderSpacing: 0, background: C.card }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '18px 22px', fontFamily: F.mono, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, fontWeight: 500, borderBottom: `1px solid ${C.line}`, width: '34%' }}>
                    Capability
                  </th>
                  {COLS.map((col, i) => (
                    <th key={col} style={{
                      padding: '18px 12px', textAlign: 'center', borderBottom: `1px solid ${C.line}`,
                      fontFamily: F.sans, fontSize: 13, fontWeight: 800,
                      color: i === 0 ? C.goldDeep : C.dim,
                      background: i === 0 ? C.goldSoft : undefined,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, r) => (
                  <motion.tr
                    key={row.label}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: r * 0.05, duration: 0.4 }}
                  >
                    <td style={{ padding: '14px 22px', fontFamily: F.sans, fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.5, borderBottom: r < ROWS.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                      {row.label}
                    </td>
                    {row.cells.map((cell, i) => (
                      <td key={i} style={{
                        padding: '14px 12px', textAlign: 'center',
                        borderBottom: r < ROWS.length - 1 ? `1px solid ${C.line}` : 'none',
                        background: i === 0 ? C.goldSoft : undefined,
                      }}>
                        <CellMark cell={cell} hero={i === 0} />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p style={{ fontFamily: F.mono, fontSize: 10.5, color: C.faint, textAlign: 'center', marginTop: 18, letterSpacing: '0.03em' }}>
            ± = partial / add-on / limited. Category-level comparison based on publicly documented capabilities, July 2026.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
