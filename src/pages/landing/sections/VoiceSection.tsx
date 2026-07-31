import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Phone, Play, RotateCcw, Mic, CheckCircle2, AudioLines } from 'lucide-react';
import { C, F, CONTAINER, Eyebrow, SectionTitle, Serif, Sub, Reveal, Chip, TypeText } from '../shared';

const CALL: { who: 'Caller' | 'Agent'; text: string }[] = [
  { who: 'Agent', text: 'Glorieta Gardens maintenance line — how can I help you tonight?' },
  { who: 'Caller', text: 'Hi, there’s a leak under my kitchen sink. I’m in unit 204.' },
  { who: 'Agent', text: 'Sorry about that. Is water actively pooling, or is it a slow drip?' },
  { who: 'Caller', text: 'It’s pooling — I put a bucket under it.' },
  { who: 'Agent', text: 'Understood. I’m logging an urgent plumbing work order for Unit 204 right now, and the on-call tech will be notified. Anything else?' },
  { who: 'Caller', text: 'No, that’s it. Thank you!' },
];

function Waveform({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 30 }} aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{
          width: 4, height: 24, borderRadius: 2, background: C.gold,
          transformOrigin: 'center',
          animation: active ? `voiceWave 1.05s ease-in-out ${i * 0.11}s infinite` : 'none',
          transform: active ? undefined : 'scaleY(0.25)', opacity: active ? 1 : 0.45,
        }} />
      ))}
      <style>{`@keyframes voiceWave { 0%,100% { transform: scaleY(0.2); opacity: 0.5 } 50% { transform: scaleY(1); opacity: 1 } }`}</style>
    </div>
  );
}

function CallSimulator() {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(-1);
  const done = line >= CALL.length;

  const start = () => { setLine(0); setPlaying(true); };
  const reset = () => { setLine(-1); setPlaying(false); };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.035)', border: `1px solid ${C.lineOnDark}`, borderRadius: 20,
      overflow: 'hidden', backdropFilter: 'blur(8px)',
    }}>
      {/* Phone header */}
      <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.lineOnDark}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={14} color={C.emerald} />
          </div>
          <div>
            <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13.5, color: C.creamOnDark }}>Incoming call · 11:47 PM</div>
            <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.faint }}>after-hours · answered in 1 ring</div>
          </div>
        </div>
        <Waveform active={playing && !done} />
      </div>

      {/* Transcript */}
      <div style={{ padding: '20px 24px', minHeight: 280 }}>
        {line < 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 16 }}>
            <button onClick={start} style={{
              width: 64, height: 64, borderRadius: '50%', cursor: 'pointer',
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(196,163,90,0.4)',
            }} aria-label="Play call simulation">
              <Play size={22} fill="#171410" color="#171410" style={{ marginLeft: 3 }} />
            </button>
            <span style={{ fontFamily: F.sans, fontSize: 13.5, fontWeight: 600, color: C.dimOnDark }}>Play a 30-second simulated call</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 11 }}>
            {CALL.map((l, i) => (
              <div key={i} style={{ display: line >= i ? 'flex' : 'none', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: F.mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', flexShrink: 0,
                  color: l.who === 'Agent' ? C.gold : C.dimOnDark, width: 46, paddingTop: 3, textTransform: 'uppercase',
                }}>
                  {l.who}
                </span>
                <span style={{ fontFamily: F.sans, fontSize: 13.5, lineHeight: 1.6, color: l.who === 'Agent' ? C.creamOnDark : C.dimOnDark }}>
                  <TypeText text={l.text} active={line >= i} speed={reduced ? 0 : 17}
                    onDone={() => setLine(v => Math.max(v, i + 1))} />
                </span>
              </div>
            ))}
            <AnimatePresence>
              {line >= 5 && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  style={{
                    marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)',
                    borderRadius: 12, padding: '13px 16px',
                  }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: C.emerald }}>
                    <CheckCircle2 size={15} /> Work order MR-1042 created — mid-call
                  </span>
                  <span style={{ fontFamily: F.mono, fontSize: 10.5, color: C.faint }}>Unit 204 · Plumbing · Urgent · on-call notified</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '13px 22px', borderTop: `1px solid ${C.lineOnDark}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: F.mono, fontSize: 10.5, color: C.faint, letterSpacing: '0.06em' }}>
          SIMULATION — the live agent runs on ElevenLabs Conversational AI
        </span>
        {line >= 0 && (
          <button onClick={reset} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: C.dimOnDark,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.lineOnDark}`,
            padding: '6px 13px', borderRadius: 100,
          }}>
            <RotateCcw size={12} /> Replay
          </button>
        )}
      </div>
    </div>
  );
}

export function VoiceSection() {
  return (
    <section id="voice" style={{
      background: `radial-gradient(1000px 550px at 15% 0%, rgba(196,163,90,0.10), transparent 55%),
                   linear-gradient(180deg, ${C.obsidian} 0%, ${C.obsidian2} 100%)`,
      padding: '110px 0 120px',
    }}>
      <div style={CONTAINER}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Simulator first on desktop for visual rhythm */}
          <Reveal y={30} className="order-2 lg:order-1">
            <CallSimulator />
          </Reveal>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <Reveal><Eyebrow dark>Voice · powered by ElevenLabs</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <SectionTitle dark style={{ margin: '22px 0 20px' }}>
                Your projects <Serif>answer the phone</Serif> now.
              </SectionTitle>
            </Reveal>
            <Reveal delay={0.16}>
              <Sub dark>
                A conversational voice agent — built on ElevenLabs — takes tenant and field calls 24/7, asks the
                follow-up questions a dispatcher would, and files the work order <em style={{ color: C.creamOnDark, fontStyle: 'normal', fontWeight: 600 }}>while
                the caller is still on the line</em>. Every call transcribed, every ticket traceable.
              </Sub>
            </Reveal>
            <Reveal delay={0.24}>
              <div style={{ marginTop: 28, display: 'grid', gap: 14 }}>
                {[
                  { icon: Phone, title: 'After-hours intake, handled', body: 'No more 7 AM voicemail triage — urgent issues become dispatched tickets overnight.' },
                  { icon: Mic, title: 'A mic on every field', body: 'Dictate RFIs, punch walks, daily logs, and meeting notes. ElevenLabs Scribe transcribes; AI structures.' },
                  { icon: AudioLines, title: 'Voice-first assistant', body: 'Ask your project questions out loud — grounded answers from your own contracts and financials.' },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(196,163,90,0.12)', border: '1px solid rgba(196,163,90,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={C.gold} />
                    </div>
                    <div>
                      <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15, color: C.creamOnDark, marginBottom: 3 }}>{title}</div>
                      <div style={{ fontFamily: F.sans, fontSize: 13.5, lineHeight: 1.6, color: C.dimOnDark }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div style={{ marginTop: 26, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Chip dark tone="gold">ElevenLabs Conversational AI</Chip>
                <Chip dark tone="gold">Scribe transcription</Chip>
                <Chip dark tone="neutral">Tickets created mid-call</Chip>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
