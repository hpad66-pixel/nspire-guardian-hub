import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wifi, Camera, Mic, Bell, Smartphone } from 'lucide-react';

export function AltPWA() {
  return (
    <section style={{ background: 'var(--landing-warm)', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <div style={{
              width: '240px',
              height: '480px',
              background: 'var(--landing-ink)',
              borderRadius: '36px',
              padding: '12px',
              boxShadow: '0 32px 64px rgba(26,22,16,0.2), 0 0 0 1px rgba(253,250,244,0.08)',
              position: 'relative',
              animation: 'altFloat 5s ease-in-out infinite',
            }}>
              <style>{`@keyframes altFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
              {/* Notch */}
              <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '80px', height: '6px', background: 'rgba(253,250,244,0.1)', borderRadius: '3px', zIndex: 10 }} />
              
              {/* Screen */}
              <div style={{ width: '100%', height: '100%', background: 'var(--landing-cream)', borderRadius: '26px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Status bar */}
                <div className="flex items-center justify-between px-4 pt-5 pb-2" style={{ background: 'var(--landing-ink)' }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: 'rgba(253,250,244,0.7)' }}>9:41</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: '11px', color: 'var(--landing-cream)' }}>APAS <span style={{ color: 'var(--apas-sapphire)' }}>OS</span></span>
                  <span style={{ fontSize: '10px', color: 'rgba(253,250,244,0.7)' }}>●●●</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: 'var(--landing-card)', borderRadius: '10px', padding: '12px', border: '1px solid var(--landing-border)' }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: '11px', color: 'var(--landing-ink)', marginBottom: '8px' }}>Daily Grounds · Parking Lot A</div>
                    {/* Waveform */}
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', marginBottom: '8px' }}>
                      {[6, 10, 14, 8, 12, 10, 14, 6, 10].map((h, i) => (
                        <div key={i} style={{ width: '4px', height: `${h}px`, background: 'var(--apas-sapphire)', borderRadius: '2px', animation: `altWave4 1s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
                      ))}
                      <style>{`@keyframes altWave4 { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }`}</style>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mic size={9} color="var(--apas-sapphire)" />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: 'var(--apas-sapphire)', fontWeight: 600, letterSpacing: '0.05em' }}>RECORDING…</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--landing-card)', borderRadius: '10px', padding: '10px', border: '1px solid var(--landing-border)' }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: 'var(--landing-muted)', marginBottom: '6px', letterSpacing: '0.1em' }}>ITEMS LOGGED</div>
                    {['Parking Lot ✓', 'Entry Gate ✓'].map(item => (
                      <div key={item} style={{ fontFamily: "var(--font-ui)", fontSize: '11px', color: '#059669', fontWeight: 600, marginBottom: '3px' }}>{item}</div>
                    ))}
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>Playground ⚠ 1 defect</div>
                  </div>

                  {/* Camera button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 'auto' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--apas-sapphire)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(29,111,232,0.35)' }}>
                      <Camera size={22} color="#fff" />
                    </div>
                  </div>
                </div>

                {/* Offline badge */}
                <div className="flex items-center justify-center gap-1.5 py-2" style={{ background: 'rgba(5,150,105,0.06)', borderTop: '1px solid rgba(5,150,105,0.15)' }}>
                  <Wifi size={10} color="#059669" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: '#059669', fontWeight: 700, letterSpacing: '0.08em' }}>OFFLINE MODE ACTIVE ✓</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
          >
            <span className="eyebrow" style={{ color: 'var(--apas-sapphire)', display: 'block', marginBottom: '12px' }}>Progressive Web App</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 'clamp(24px, 3.5vw, 38px)', color: 'var(--landing-ink)', letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: '16px' }}>
              Works on every device.<br />No app store required.
            </h2>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: '16px', color: 'var(--landing-slate)', lineHeight: 1.75, marginBottom: '28px' }}>
              APAS OS is a Progressive Web App. Install it in 10 seconds from any browser on iPhone, Android, tablet, or desktop. Works offline when you're in the field — syncs when you're back in range. Camera, GPS, voice — all available. No app to update, no version mismatches.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {[
                { icon: Wifi, text: 'Works offline in the field — sync when you\'re back in range', color: '#059669' },
                { icon: Camera, text: 'Full camera access for photo evidence with GPS tagging', color: 'var(--apas-sapphire)' },
                { icon: Mic, text: 'Voice dictation for inspection notes without removing gloves', color: '#7C3AED' },
                { icon: Bell, text: 'Push notifications for critical deadlines and approvals', color: '#D97706' },
                { icon: Smartphone, text: 'Install in 10 seconds — Add to Home Screen', color: '#DC2626' },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-3">
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: item.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={15} color={item.color} />
                  </div>
                  <span style={{ fontFamily: "var(--font-editor)", fontSize: '14px', color: 'var(--landing-slate)', lineHeight: 1.6, paddingTop: '6px' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/install" style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: '13px', color: 'var(--apas-sapphire)', border: '1px solid rgba(29,111,232,0.2)', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', background: 'rgba(29,111,232,0.05)' }}>
                📱 Install from Safari
              </Link>
              <Link to="/install" style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: '13px', color: 'var(--apas-sapphire)', border: '1px solid rgba(29,111,232,0.2)', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', background: 'rgba(29,111,232,0.05)' }}>
                🤖 Install from Chrome
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
